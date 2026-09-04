import { supabase } from "@/integrations/supabase/client";

/**
 * Centralized deal (ضمان الاستلام) domain logic.
 * Server-side triggers (deals_guard_update / deals_auto_complete / disputes_mark_deal)
 * are the source of truth — everything here only mirrors those rules for UX.
 */

export type DealStatus = "pending" | "shipped" | "delivered" | "completed" | "cancelled" | "disputed";

export interface Deal {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_id: string;
  agreed_price_ils: number;
  status: DealStatus;
  seller_confirmed_shipped_at: string | null;
  buyer_confirmed_received_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DealRole = "buyer" | "seller" | "none";

export const getDealRole = (deal: Pick<Deal, "buyer_id" | "seller_id">, userId?: string | null, sellerId?: string | null): DealRole => {
  if (!userId) return "none";
  if (deal.buyer_id === userId) return "buyer";
  if (sellerId && deal.seller_id === sellerId) return "seller";
  return "none";
};

export const isDealLocked = (deal: Pick<Deal, "status">) =>
  ["cancelled", "disputed", "completed"].includes(deal.status);

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  pending: "بانتظار التسليم",
  shipped: "تم التسليم للمشتري",
  delivered: "بانتظار تأكيد الاستلام",
  completed: "مكتملة",
  cancelled: "ملغاة",
  disputed: "قيد النزاع",
};

export const dealStatusLabel = (s: string) => DEAL_STATUS_LABEL[s as DealStatus] || s;

export type DealStatusTone = "default" | "secondary" | "destructive" | "outline";
export const dealStatusVariant = (s: string): DealStatusTone => {
  if (s === "completed") return "default";
  if (s === "cancelled") return "outline";
  if (s === "disputed") return "destructive";
  return "secondary";
};

export type DealTab = "active" | "completed" | "disputed" | "cancelled";
export const dealTab = (s: string): DealTab => {
  if (s === "completed") return "completed";
  if (s === "disputed") return "disputed";
  if (s === "cancelled") return "cancelled";
  return "active";
};

/** Step index for the visual stepper: 0 open, 1 seller ships, 2 buyer receives, 3 completed */
export const dealStep = (d: Pick<Deal, "status" | "seller_confirmed_shipped_at" | "buyer_confirmed_received_at"> | null): number => {
  if (!d) return 0;
  if (d.status === "completed" || d.buyer_confirmed_received_at) return 3;
  if (d.seller_confirmed_shipped_at) return 2;
  return 1;
};

/** Human "what happens next" label, role-aware */
export const dealNextAction = (d: Deal, role: DealRole): string => {
  switch (d.status) {
    case "completed":
      return "اكتملت الصفقة";
    case "cancelled":
      return "تم إلغاء الصفقة";
    case "disputed":
      return "قيد مراجعة الأدمن";
    case "pending":
      return role === "seller" ? "أكّد تسليم المنتج" : "بانتظار تأكيد البائع";
    case "shipped":
    case "delivered":
      return role === "buyer" ? "أكّد الاستلام" : "بانتظار تأكيد المشتري";
    default:
      return "";
  }
};

/** Mirror of server guards: which actions are allowed for this party right now */
export const dealPermissions = (d: Deal, role: DealRole) => {
  const locked = isDealLocked(d);
  return {
    canConfirmShipped: role === "seller" && !locked && !d.seller_confirmed_shipped_at,
    canConfirmReceived: role === "buyer" && !locked && !!d.seller_confirmed_shipped_at && !d.buyer_confirmed_received_at,
    canCancel: (role === "buyer" || role === "seller") && d.status === "pending",
    canOpenDispute: role === "buyer" && !["cancelled", "disputed"].includes(d.status),
    canReview: role === "buyer" && d.status === "completed",
  };
};

export interface TimelineEvent {
  key: string;
  label: string;
  at: string | null;
  done: boolean;
  tone?: "ok" | "warn" | "danger";
}

export const dealTimeline = (d: Deal): TimelineEvent[] => {
  const events: TimelineEvent[] = [
    { key: "created", label: "تم فتح ضمان الاستلام", at: d.created_at, done: true, tone: "ok" },
    { key: "shipped", label: "أكّد البائع التسليم", at: d.seller_confirmed_shipped_at, done: !!d.seller_confirmed_shipped_at, tone: "ok" },
    { key: "received", label: "أكّد المشتري الاستلام", at: d.buyer_confirmed_received_at, done: !!d.buyer_confirmed_received_at, tone: "ok" },
  ];
  if (d.status === "cancelled") {
    events.push({ key: "cancelled", label: "تم إلغاء الصفقة", at: d.updated_at, done: true, tone: "danger" });
  } else if (d.status === "disputed") {
    events.push({ key: "disputed", label: "تم فتح نزاع", at: d.updated_at, done: true, tone: "warn" });
  } else {
    events.push({ key: "completed", label: "اكتملت الصفقة", at: d.completed_at, done: d.status === "completed", tone: "ok" });
  }
  return events;
};

// ---------- Transitions (all enforced server-side by triggers) ----------

type Result = { error: string | null };

const wrap = async (p: PromiseLike<{ error: { message: string } | null }>): Promise<Result> => {
  const { error } = await p;
  return { error: error ? error.message : null };
};

export const openDeal = async (args: { listingId: string; sellerId: string; buyerId: string; price: number }) => {
  const { data, error } = await supabase
    .from("deals")
    .insert({ listing_id: args.listingId, seller_id: args.sellerId, buyer_id: args.buyerId, agreed_price_ils: args.price })
    .select("*")
    .single();
  return { deal: (data as Deal | null) ?? null, error: error ? error.message : null };
};

export const confirmShipped = (dealId: string) =>
  wrap(supabase.from("deals").update({ seller_confirmed_shipped_at: new Date().toISOString() }).eq("id", dealId));

export const confirmReceived = (dealId: string) =>
  wrap(supabase.from("deals").update({ buyer_confirmed_received_at: new Date().toISOString() }).eq("id", dealId));

export const cancelDeal = (dealId: string) =>
  wrap(supabase.from("deals").update({ status: "cancelled" }).eq("id", dealId));

export const fetchDeal = async (dealId: string) => {
  const { data, error } = await supabase.from("deals").select("*").eq("id", dealId).maybeSingle();
  return { deal: (data as Deal | null) ?? null, error: error ? error.message : null };
};

export const formatILS = (n: number) => `₪${Number(n).toLocaleString("he-IL")}`;
export const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" }) : "—";
