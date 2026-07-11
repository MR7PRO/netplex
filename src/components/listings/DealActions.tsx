import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Deal {
  id: string;
  status: string;
  agreed_price_ils: number;
  buyer_id: string;
  seller_id: string;
  seller_confirmed_shipped_at: string | null;
  buyer_confirmed_received_at: string | null;
}

interface Props {
  listingId: string;
  sellerId: string;
  sellerUserId?: string | null;
  price: number;
}

// Step index: 0 = open, 1 = seller ships, 2 = buyer receives, 3 = completed
const STEPS = [
  { key: "open", label: "فتح الضمان", icon: FilePlus2 },
  { key: "shipped", label: "تأكيد التسليم", icon: Truck },
  { key: "received", label: "تأكيد الاستلام", icon: PackageCheck },
  { key: "completed", label: "إكمال الصفقة", icon: CheckCircle2 },
];

const currentStep = (d: Deal | null): number => {
  if (!d) return 0;
  if (d.status === "completed") return 3;
  if (d.buyer_confirmed_received_at) return 3;
  if (d.seller_confirmed_shipped_at) return 2;
  return 1;
};

const statusLabel = (s: string) =>
  ({
    pending: "بانتظار التسليم",
    shipped: "تم التسليم للمشتري",
    delivered: "بانتظار تأكيد الاستلام",
    completed: "مكتملة ✅",
    cancelled: "ملغاة",
    disputed: "قيد النزاع",
  } as Record<string, string>)[s] || s;

const DealActions: React.FC<Props> = ({ listingId, sellerId, sellerUserId, price }) => {
  const { user } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const isSeller = !!user && !!sellerUserId && user.id === sellerUserId;
  const canStart = !!user && !isSeller;

  const load = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("deals")
      .select("*")
      .eq("listing_id", listingId)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${sellerId}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setDeal((data as Deal) || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user, listingId]);

  const locked = !!deal && ["cancelled", "disputed", "completed"].includes(deal.status);

  const start = async () => {
    if (!user) return;
    if (deal) return toast.error("يوجد ضمان مفتوح مسبقاً");
    setBusy(true);
    const { data, error } = await supabase
      .from("deals")
      .insert({ listing_id: listingId, seller_id: sellerId, buyer_id: user.id, agreed_price_ils: price })
      .select("*")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setDeal(data as Deal);
    toast.success("تم فتح ضمان الاستلام");
  };

  const confirmShipped = async () => {
    if (!deal) return;
    if (!isSeller) return toast.error("البائع فقط يقدر يأكد التسليم");
    if (deal.seller_confirmed_shipped_at) return toast.info("سبق وأكّدت التسليم");
    if (locked) return toast.error("الصفقة مقفلة");
    setBusy(true);
    const { error } = await supabase
      .from("deals")
      .update({ seller_confirmed_shipped_at: new Date().toISOString() })
      .eq("id", deal.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم تأكيد التسليم للمشتري");
    load();
  };

  const confirmReceived = async () => {
    if (!deal) return;
    if (isSeller) return toast.error("المشتري فقط يقدر يأكد الاستلام");
    if (!deal.seller_confirmed_shipped_at)
      return toast.error("لازم البائع يأكد التسليم أولاً");
    if (deal.buyer_confirmed_received_at) return toast.info("سبق وأكّدت الاستلام");
    if (locked) return toast.error("الصفقة مقفلة");
    setBusy(true);
    const { error } = await supabase
      .from("deals")
      .update({ buyer_confirmed_received_at: new Date().toISOString() })
      .eq("id", deal.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم تأكيد الاستلام — شكراً!");
    load();
  };

  if (loading || !user) return null;

  const step = currentStep(deal);

  return (
    <Card className="border-green-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" /> ضمان الاستلام
          </span>
          {deal && (
            <Badge variant={deal.status === "completed" ? "default" : "secondary"}>
              {statusLabel(deal.status)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stepper */}
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
                      (done || active) ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </span>
                </li>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 mt-4 rounded transition-colors",
                      i < step ? "bg-green-600" : "bg-muted"
                    )}
                  />
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

        {!deal && isSeller && (
          <p className="text-xs text-muted-foreground text-center">
            بانتظار المشتري لفتح ضمان استلام على منتجك.
          </p>
        )}

        {deal && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span>المبلغ المتفق عليه</span>
              <span className="font-semibold">₪{deal.agreed_price_ils.toLocaleString("he-IL")}</span>
            </div>

            {deal.status === "completed" && (
              <div className="p-2 rounded bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm text-center">
                <CheckCircle2 className="h-4 w-4 inline ml-1" /> اكتملت الصفقة
              </div>
            )}

            {!locked && (
              <div className="flex gap-2">
                {isSeller && (
                  <Button
                    onClick={confirmShipped}
                    disabled={busy || !!deal.seller_confirmed_shipped_at}
                    className="flex-1"
                    variant="outline"
                  >
                    <Truck className="h-4 w-4 ml-1" />
                    {deal.seller_confirmed_shipped_at ? "تم التسليم" : "أكّد التسليم"}
                  </Button>
                )}
                {!isSeller && (
                  <Button
                    onClick={confirmReceived}
                    disabled={
                      busy ||
                      !!deal.buyer_confirmed_received_at ||
                      !deal.seller_confirmed_shipped_at
                    }
                    className="flex-1 btn-brand"
                    title={
                      !deal.seller_confirmed_shipped_at
                        ? "لازم البائع يأكد التسليم أولاً"
                        : undefined
                    }
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DealActions;
