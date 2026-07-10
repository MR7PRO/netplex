import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gavel, Clock, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Auction {
  id: string;
  seller_id: string;
  starting_price_ils: number;
  current_bid_ils: number | null;
  min_increment_ils: number;
  bid_count: number;
  ends_at: string;
  status: string;
  winner_user_id: string | null;
}

interface Props {
  listingId: string;
  sellerId: string;
  fallbackPrice: number;
  ownerUserId?: string | null;
}

function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "منتهي";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} يوم ${h % 24} ساعة`;
  if (h > 0) return `${h} ساعة ${m} دقيقة`;
  return `${m} دقيقة`;
}

const AuctionSection: React.FC<Props> = ({ listingId, sellerId, fallbackPrice, ownerUserId }) => {
  const { user } = useAuth();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [bid, setBid] = useState("");
  const [placing, setPlacing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [days, setDays] = useState("3");
  const [start, setStart] = useState(String(fallbackPrice || 0));
  const [step, setStep] = useState("10");
  const isOwner = !!user && !!ownerUserId && user.id === ownerUserId;

  const load = async () => {
    const { data } = await supabase.from("auctions").select("*").eq("listing_id", listingId).maybeSingle();
    setAuction((data as Auction) || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`auction-${listingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions", filter: `listing_id=eq.${listingId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [listingId]);

  const create = async () => {
    setCreating(true);
    const ends = new Date(Date.now() + Number(days) * 86400000).toISOString();
    const { error } = await supabase.from("auctions").insert({
      listing_id: listingId,
      seller_id: sellerId,
      starting_price_ils: Number(start),
      min_increment_ils: Number(step),
      ends_at: ends,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء المزاد");
    load();
  };

  const placeBid = async () => {
    if (!user) return toast.error("سجّل الدخول أولاً");
    const amt = Number(bid);
    if (!amt || amt <= 0) return toast.error("قيمة غير صحيحة");
    setPlacing(true);
    const { data, error } = await supabase.rpc("place_bid", { p_auction_id: auction!.id, p_amount: amt });
    setPlacing(false);
    if (error) return toast.error(error.message);
    const res = data as any;
    if (!res?.ok) return toast.error(res?.error || "فشلت المزايدة");
    toast.success("تمت المزايدة!");
    setBid("");
  };

  if (loading) return null;

  if (!auction) {
    if (!isOwner) return null;
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gavel className="h-5 w-5" /> حوّل منتجك إلى مزاد
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">سعر البداية ₪</label>
              <Input value={start} onChange={(e) => setStart(e.target.value)} type="number" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">أدنى زيادة ₪</label>
              <Input value={step} onChange={(e) => setStep(e.target.value)} type="number" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">المدة (أيام)</label>
              <Input value={days} onChange={(e) => setDays(e.target.value)} type="number" />
            </div>
          </div>
          <Button onClick={create} disabled={creating} className="w-full btn-brand">
            {creating ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Gavel className="h-4 w-4 ml-2" />}
            بدء المزاد
          </Button>
        </CardContent>
      </Card>
    );
  }

  const ended = new Date(auction.ends_at).getTime() <= Date.now() || auction.status !== "active";
  const minNext = (auction.current_bid_ils ?? auction.starting_price_ils - auction.min_increment_ils) + auction.min_increment_ils;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Gavel className="h-5 w-5 text-primary" /> مزاد مباشر</span>
          <Badge variant={ended ? "secondary" : "default"}>
            <Clock className="h-3 w-3 ml-1" /> {timeLeft(auction.ends_at)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">أعلى مزايدة</span>
          <span className="font-bold text-lg text-primary">
            ₪{(auction.current_bid_ils ?? auction.starting_price_ils).toLocaleString("he-IL")}
          </span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span><TrendingUp className="h-3 w-3 inline ml-1" /> {auction.bid_count} مزايدة</span>
          <span>الحد التالي: ₪{minNext}</span>
        </div>
        {!ended && !isOwner && (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={`أدنى ₪${minNext}`}
              value={bid}
              onChange={(e) => setBid(e.target.value)}
              dir="ltr"
            />
            <Button onClick={placeBid} disabled={placing} className="btn-brand">
              {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : "زايد"}
            </Button>
          </div>
        )}
        {ended && (
          <div className="text-center text-sm text-muted-foreground p-2 bg-muted rounded">
            انتهى المزاد {auction.winner_user_id ? "— يوجد فائز" : "— بدون مزايدات"}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuctionSection;
