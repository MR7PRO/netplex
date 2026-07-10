import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, PackageCheck, Truck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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

  const start = async () => {
    if (!user) return;
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

  return (
    <Card className="border-green-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5 text-green-600" /> ضمان الاستلام
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
        {deal && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span>الحالة</span>
              <Badge>{deal.status}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>المبلغ المتفق عليه</span>
              <span className="font-semibold">₪{deal.agreed_price_ils.toLocaleString("he-IL")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2 rounded ${deal.seller_confirmed_shipped_at ? "bg-green-100 dark:bg-green-950/30" : "bg-muted"}`}>
                <Truck className="h-4 w-4 inline ml-1" />
                {deal.seller_confirmed_shipped_at ? "تم التسليم" : "بانتظار البائع"}
              </div>
              <div className={`p-2 rounded ${deal.buyer_confirmed_received_at ? "bg-green-100 dark:bg-green-950/30" : "bg-muted"}`}>
                <PackageCheck className="h-4 w-4 inline ml-1" />
                {deal.buyer_confirmed_received_at ? "تم الاستلام" : "بانتظار المشتري"}
              </div>
            </div>
            {deal.status === "completed" && (
              <div className="p-2 rounded bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm text-center">
                <CheckCircle2 className="h-4 w-4 inline ml-1" /> اكتملت الصفقة
              </div>
            )}
            <div className="flex gap-2">
              {isSeller && !deal.seller_confirmed_shipped_at && (
                <Button onClick={confirmShipped} disabled={busy} className="flex-1" variant="outline">
                  أكّد التسليم
                </Button>
              )}
              {!isSeller && !deal.buyer_confirmed_received_at && (
                <Button onClick={confirmReceived} disabled={busy} className="flex-1 btn-brand">
                  أكّد الاستلام
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DealActions;
