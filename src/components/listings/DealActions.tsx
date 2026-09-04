import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Loader2,
  PackageCheck,
  Truck,
  CheckCircle2,
  FilePlus2,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  type Deal,
  getDealRole,
  isDealLocked,
  dealStep,
  dealStatusLabel,
  dealStatusVariant,
  dealPermissions,
  dealNextAction,
  openDeal,
  confirmShipped as doConfirmShipped,
  confirmReceived as doConfirmReceived,
  formatILS,
} from "@/lib/deals";

interface Props {
  listingId: string;
  sellerId: string;
  sellerUserId?: string | null;
  price: number;
}

const STEPS = [
  { key: "open", label: "فتح الضمان", icon: FilePlus2 },
  { key: "shipped", label: "تأكيد التسليم", icon: Truck },
  { key: "received", label: "تأكيد الاستلام", icon: PackageCheck },
  { key: "completed", label: "إكمال الصفقة", icon: CheckCircle2 },
];

const DealActions: React.FC<Props> = ({ listingId, sellerId, sellerUserId, price }) => {
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const isSellerOfListing = !!user && !!sellerUserId && user.id === sellerUserId;
  const canStart = !!user && !isSellerOfListing;

  const load = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    // RLS restricts rows to the buyer/seller of the deal; we just narrow by listing.
    const { data } = await supabase
      .from("deals")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setDeal((data as Deal) || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, listingId]);

  const start = async () => {
    if (!user) return;
    if (deal) return toast.error("يوجد ضمان مفتوح مسبقاً");
    setBusy(true);
    const { deal: created, error } = await openDeal({ listingId, sellerId, buyerId: user.id, price });
    setBusy(false);
    if (error) return toast.error(error);
    setDeal(created);
    toast.success("تم فتح ضمان الاستلام");
  };

  const run = async (fn: () => Promise<{ error: string | null }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast.error(error);
    toast.success(ok);
    load();
  };

  if (loading || !user) return null;

  const role = deal ? getDealRole(deal, user.id, isSellerOfListing ? deal.seller_id : null) : "none";
  const perms = deal ? dealPermissions(deal, role) : null;
  const locked = !!deal && isDealLocked(deal);
  const step = dealStep(deal);

  return (
    <Card className="border-green-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" /> ضمان الاستلام
          </span>
          {deal && <Badge variant={dealStatusVariant(deal.status)}>{dealStatusLabel(deal.status)}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="flex items-start justify-between gap-1" aria-label="مراحل الضمان">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const Icon = done ? Check : s.icon;
            return (
              <React.Fragment key={s.key}>
                <li className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-colors",
                      done && "bg-green-600 border-green-600 text-white",
                      active && !done && "border-primary text-primary bg-primary/10 animate-pulse",
                      !done && !active && "border-muted text-muted-foreground"
                    )}
                    aria-current={active ? "step" : undefined}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] text-center leading-tight",
                      done || active ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </li>
                {i < STEPS.length - 1 && (
                  <div className={cn("h-0.5 flex-1 mt-4 rounded transition-colors", i < step ? "bg-green-600" : "bg-muted")} />
                )}
              </React.Fragment>
            );
          })}
        </ol>

        {!deal && canStart && (
          <>
            <p className="text-xs text-muted-foreground">
              افتح ضمان استلام. البائع يأكد التسليم، وأنت تأكد الاستلام لإتمام الصفقة.
            </p>
            <Button onClick={start} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <ShieldCheck className="h-4 w-4 ml-2" />}
              فتح ضمان استلام
            </Button>
          </>
        )}

        {!deal && isSellerOfListing && (
          <p className="text-xs text-muted-foreground text-center">بانتظار المشتري لفتح ضمان استلام على منتجك.</p>
        )}

        {deal && perms && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span>المبلغ المتفق عليه</span>
              <span className="font-semibold">{formatILS(deal.agreed_price_ils)}</span>
            </div>
            <p className="text-xs text-muted-foreground">الخطوة التالية: {dealNextAction(deal, role)}</p>

            {deal.status === "completed" && (
              <div className="p-2 rounded bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm text-center">
                <CheckCircle2 className="h-4 w-4 inline ml-1" /> اكتملت الصفقة
              </div>
            )}

            {!locked && (
              <div className="flex gap-2">
                {role === "seller" && (
                  <Button
                    onClick={() => run(() => doConfirmShipped(deal.id), "تم تأكيد التسليم للمشتري")}
                    disabled={busy || !perms.canConfirmShipped}
                    className="flex-1"
                    variant="outline"
                  >
                    <Truck className="h-4 w-4 ml-1" />
                    {deal.seller_confirmed_shipped_at ? "تم التسليم" : "أكّد التسليم"}
                  </Button>
                )}
                {role === "buyer" && (
                  <Button
                    onClick={() => run(() => doConfirmReceived(deal.id), "تم تأكيد الاستلام — شكراً!")}
                    disabled={busy || !perms.canConfirmReceived}
                    className="flex-1 btn-brand"
                    title={!deal.seller_confirmed_shipped_at ? "لازم البائع يأكد التسليم أولاً" : undefined}
                  >
                    <PackageCheck className="h-4 w-4 ml-1" />
                    {deal.buyer_confirmed_received_at
                      ? "تم الاستلام"
                      : !deal.seller_confirmed_shipped_at
                      ? "بانتظار تأكيد البائع"
                      : "أكّد الاستلام"}
                  </Button>
                )}
              </div>
            )}

            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link to={`/deals/${deal.id}`}>
                <ExternalLink className="h-4 w-4 ml-1" /> تفاصيل الصفقة الكاملة
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DealActions;
