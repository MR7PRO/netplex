// Listing ranking algorithm
// rank = 0.35*trust + 0.20*quality + 0.15*recency + 0.20*price_fair + 0.10*engagement + featured_bonus

export interface RankingInput {
  // Trust factors
  sellerTrustScore: number; // 0-100
  sellerVerified: boolean;
  
  // Quality factors
  title: string;
  description: string | null;
  images: string[];
  brand: string | null;
  model: string | null;
  condition: string | null;
  
  // Recency
  publishedAt: string | null;
  createdAt: string | null;
  
  // Engagement
  viewCount: number;
  saveCount: number;
  whatsappClickCount: number;
  
  // Price fairness
  price: number;
  medianPrice: number | null; // Median for same brand+model in last 30 days
  
  // Featured
  featured: boolean;
}

export interface RankingResult {
  score: number;
  badges: {
    verifiedSeller: boolean;
    fairPrice: boolean;
    hotDeal: boolean;
  };
  components: {
    trust: number;
    quality: number;
    recency: number;
    priceFair: number;
    engagement: number;
    featuredBonus: number;
  };
}

// Constants for ranking weights
const WEIGHTS = {
  trust: 0.35,
  quality: 0.20,
  recency: 0.15,
  priceFair: 0.20,
  engagement: 0.10,
  featuredBonus: 0.15,
} as const;

// Verified seller bonus (added to trust score)
const VERIFIED_BONUS = 10;

// Anti-spam thresholds
const MAX_VIEWS_PER_DAY = 100; // Suspicious if more than this per day since creation
const MAX_SAVES_RATIO = 0.5; // Save rate shouldn't exceed 50% of views

/**
 * Calculate trust score (0-1)
 * Based on seller trust_score + verified bonus
 */
function calculateTrustScore(trustScore: number, verified: boolean): number {
  const baseScore = Math.min(100, Math.max(0, trustScore));
  const bonus = verified ? VERIFIED_BONUS : 0;
  return Math.min(1, (baseScore + bonus) / 100);
}

/**
 * Calculate quality score (0-1)
 * Based on listing completeness and image count
 */
function calculateQualityScore(
  title: string,
  description: string | null,
  images: string[],
  brand: string | null,
  model: string | null,
  condition: string | null
): number {
  let score = 0;
  const maxPoints = 6;
  
  // Title quality (required, so always has some value)
  if (title.length > 10) score += 1;
  
  // Description
  if (description) {
    if (description.length > 50) score += 1;
    else if (description.length > 20) score += 0.5;
  }
  
  // Images (up to 2 points)
  const imageCount = images?.length || 0;
  if (imageCount >= 3) score += 2;
  else if (imageCount >= 2) score += 1.5;
  else if (imageCount >= 1) score += 1;
  
  // Brand/Model (product specifics)
  if (brand) score += 0.5;
  if (model) score += 0.5;
  
  // Condition specified
  if (condition) score += 0.5;
  
  return Math.min(1, score / maxPoints);
}

/**
 * Calculate recency score (0-1)
 * Exponential decay over 30 days
 */
function calculateRecencyScore(publishedAt: string | null, createdAt: string | null): number {
  const date = publishedAt || createdAt;
  if (!date) return 0.5; // Default for missing date
  
  const now = Date.now();
  const publishedDate = new Date(date).getTime();
  const daysSincePublished = (now - publishedDate) / (1000 * 60 * 60 * 24);
  
  // Exponential decay: half-life of 15 days
  return Math.exp(-daysSincePublished / 30);
}

/**
 * Calculate engagement score (0-1) with anti-spam throttling
 * Based on views, saves, and whatsapp clicks
 */
function calculateEngagementScore(
  viewCount: number,
  saveCount: number,
  whatsappClickCount: number,
  publishedAt: string | null,
  createdAt: string | null
): number {
  const views = Math.max(0, viewCount || 0);
  const saves = Math.max(0, saveCount || 0);
  const clicks = Math.max(0, whatsappClickCount || 0);
  
  // Calculate days since creation for anti-spam
  const date = publishedAt || createdAt;
  let daysSinceCreation = 1;
  if (date) {
    daysSinceCreation = Math.max(1, (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Anti-spam: Check if view rate is suspicious
  const viewsPerDay = views / daysSinceCreation;
  const adjustedViews = viewsPerDay > MAX_VIEWS_PER_DAY 
    ? MAX_VIEWS_PER_DAY * daysSinceCreation 
    : views;
  
  // Anti-spam: Check save ratio
  const saveRatio = views > 0 ? saves / views : 0;
  const adjustedSaves = saveRatio > MAX_SAVES_RATIO 
    ? views * MAX_SAVES_RATIO 
    : saves;
  
  // Logarithmic scale for each metric
  const viewScore = Math.min(1, Math.log(adjustedViews + 1) / Math.log(1001)); // Max at ~1000 views
  const saveScore = Math.min(1, Math.log(adjustedSaves + 1) / Math.log(101)); // Max at ~100 saves
  const clickScore = Math.min(1, Math.log(clicks + 1) / Math.log(51)); // Max at ~50 clicks
  
  // Weight engagement types
  return (viewScore * 0.4) + (saveScore * 0.35) + (clickScore * 0.25);
}

/**
 * Calculate price fairness score (0-1)
 * Compares to median price for same brand+model
 */
function calculatePriceFairScore(price: number, medianPrice: number | null): { score: number; isFair: boolean } {
  if (!medianPrice || medianPrice <= 0) {
    // No comparison data available, neutral score
    return { score: 0.5, isFair: false };
  }
  
  const priceRatio = price / medianPrice;
  
  // Price within 10% of median is "fair"
  const isFair = priceRatio >= 0.9 && priceRatio <= 1.1;
  
  // Score calculation:
  // - At median (ratio = 1.0): score = 1.0
  // - 20% below median: score = 0.8
  // - 20% above median: score = 0.6
  // - 50% above median: score = 0.3
  
  if (priceRatio <= 1.0) {
    // At or below median - good!
    return { score: Math.min(1, 0.8 + (1 - priceRatio) * 0.4), isFair };
  } else {
    // Above median - penalize
    const penalty = Math.min(0.7, (priceRatio - 1) * 0.7);
    return { score: Math.max(0.2, 1 - penalty), isFair };
  }
}

/**
 * Determine if listing is a "hot deal"
 * High engagement relative to age
 */
function isHotDeal(
  viewCount: number,
  saveCount: number,
  publishedAt: string | null,
  createdAt: string | null
): boolean {
  const date = publishedAt || createdAt;
  if (!date) return false;
  
  const daysSincePublished = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
  
  // Hot deal criteria:
  // - Less than 7 days old
  // - High save-to-view ratio (>15%)
  // - Minimum engagement thresholds
  const views = viewCount || 0;
  const saves = saveCount || 0;
  
  if (daysSincePublished > 7) return false;
  if (views < 10) return false;
  
  const saveRatio = saves / views;
  return saveRatio > 0.15 && saves >= 3;
}

/**
 * Calculate full ranking score and badges
 */
export function calculateListingRank(input: RankingInput): RankingResult {
  const trust = calculateTrustScore(input.sellerTrustScore, input.sellerVerified);
  const quality = calculateQualityScore(
    input.title,
    input.description,
    input.images,
    input.brand,
    input.model,
    input.condition
  );
  const recency = calculateRecencyScore(input.publishedAt, input.createdAt);
  const engagement = calculateEngagementScore(
    input.viewCount,
    input.saveCount,
    input.whatsappClickCount,
    input.publishedAt,
    input.createdAt
  );
  const { score: priceFair, isFair: fairPrice } = calculatePriceFairScore(input.price, input.medianPrice);
  const featuredBonus = input.featured ? WEIGHTS.featuredBonus : 0;
  
  const score = 
    (WEIGHTS.trust * trust) +
    (WEIGHTS.quality * quality) +
    (WEIGHTS.recency * recency) +
    (WEIGHTS.priceFair * priceFair) +
    (WEIGHTS.engagement * engagement) +
    featuredBonus;
  
  return {
    score,
    badges: {
      verifiedSeller: input.sellerVerified,
      fairPrice: fairPrice && input.medianPrice !== null,
      hotDeal: isHotDeal(input.viewCount, input.saveCount, input.publishedAt, input.createdAt),
    },
    components: {
      trust,
      quality,
      recency,
      priceFair,
      engagement,
      featuredBonus,
    },
  };
}

/**
 * Get median price for brand+model combinations
 * To be called server-side or via RPC
 */
export interface MedianPriceMap {
  [key: string]: number; // "brand|model" -> median price
}

export function getMedianPriceKey(brand: string | null, model: string | null): string | null {
  if (!brand && !model) return null;
  return `${(brand || '').toLowerCase().trim()}|${(model || '').toLowerCase().trim()}`;
}
