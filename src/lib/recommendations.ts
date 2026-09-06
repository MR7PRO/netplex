// Personalized recommendation data layer (client side diversification).
// Scoring happens server-side in the `get_recommendations` RPC; here we only
// re-rank for diversity (seller / category / price band) and map reasons to copy.

export type RecommendationReason =
  | "followed_seller"
  | "viewed_brand"
  | "viewed_category"
  | "popular_in_region"
  | "verified_seller"
  | "good_price"
  | "fresh"
  | "trending";

export interface RecommendedListing {
  id: string;
  title: string;
  price_ils: number;
  condition: string | null;
  region: string;
  images: string[] | null;
  view_count: number | null;
  save_count: number | null;
  featured: boolean | null;
  brand: string | null;
  model: string | null;
  category_id: string | null;
  seller_id: string;
  seller_verified: boolean | null;
  discount_percent: number | null;
  discount_end_at: string | null;
  stock_quantity: number | null;
  score: number;
  reason: RecommendationReason;
  reason_value: string | null;
}

const MAX_PER_SELLER = 2;
const MAX_PER_CATEGORY = 4;
const MAX_PER_PRICE_BAND = 4;

function priceBand(price: number): string {
  if (price < 200) return "xs";
  if (price < 1000) return "s";
  if (price < 3000) return "m";
  if (price < 8000) return "l";
  return "xl";
}

/**
 * Greedy diversification: walk candidates by score and skip items that would
 * over-represent a seller, category or price band. A second pass back-fills
 * from the skipped items so we always return `limit` when possible.
 */
export function diversifyRecommendations(
  candidates: RecommendedListing[],
  limit: number
): RecommendedListing[] {
  const picked: RecommendedListing[] = [];
  const skipped: RecommendedListing[] = [];
  const sellerCount = new Map<string, number>();
  const catCount = new Map<string, number>();
  const bandCount = new Map<string, number>();

  for (const c of candidates) {
    if (picked.length >= limit) break;
    const cat = c.category_id ?? "none";
    const band = priceBand(Number(c.price_ils));
    const s = sellerCount.get(c.seller_id) ?? 0;
    const k = catCount.get(cat) ?? 0;
    const b = bandCount.get(band) ?? 0;
    if (s >= MAX_PER_SELLER || k >= MAX_PER_CATEGORY || b >= MAX_PER_PRICE_BAND) {
      skipped.push(c);
      continue;
    }
    sellerCount.set(c.seller_id, s + 1);
    catCount.set(cat, k + 1);
    bandCount.set(band, b + 1);
    picked.push(c);
  }

  for (const c of skipped) {
    if (picked.length >= limit) break;
    const s = sellerCount.get(c.seller_id) ?? 0;
    if (s >= MAX_PER_SELLER + 1) continue; // hard cap on same-seller repetition
    sellerCount.set(c.seller_id, s + 1);
    picked.push(c);
  }

  return picked;
}

/** Short Arabic explanation shown on the card. */
export function recommendationReasonLabel(
  reason: RecommendationReason,
  value: string | null
): string | null {
  switch (reason) {
    case "followed_seller":
      return "من بائع تتابعه";
    case "viewed_brand":
      return value ? `لأنك شاهدت منتجات ${value}` : "مشابه لما شاهدته";
    case "viewed_category":
      return value ? `لأنك تصفّحت ${value}` : "من قسم يهمّك";
    case "popular_in_region":
      return value ? `رائج في ${value}` : "رائج في منطقتك";
    case "verified_seller":
      return "من بائع موثّق";
    case "good_price":
      return "سعر منافس";
    case "fresh":
      return "أُضيف حديثاً";
    case "trending":
      return "رائج الآن";
    default:
      return null;
  }
}
