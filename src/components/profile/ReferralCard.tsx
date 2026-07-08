import React, { useEffect, useState } from "react";
import { Gift, Copy, Share2, Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const ReferralCard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState<string>("");
  const [points, setPoints] = useState<number>(0);
  const [alreadyRedeemed, setAlreadyRedeemed] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("referral_code, promo_points, referred_by")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setCode(data.referral_code || "");
        setPoints(data.promo_points || 0);
        setAlreadyRedeemed(!!data.referred_by);
      }
      setFetching(false);
    })();
  }, [user]);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    toast({ title: "تم نسخ الرمز ✓" });
  };

  const shareOnWhatsApp = () => {
    const url = `${window.location.origin}?ref=${code}`;
    const text = `انضم لسوق NetPlex واحصل على نقاط ترويج مجانية 🎁\nاستخدم رمز الدعوة: ${code}\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const redeem = async () => {
    if (!inputCode.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("redeem_referral_code", {
      p_code: inputCode.trim(),
    });
    setLoading(false);
    const result = data as { ok?: boolean; error?: string; points_awarded?: number } | null;
    if (error || !result?.ok) {
      toast({
        title: "تعذر استخدام الرمز",
        description: result?.error || error?.message || "حاول لاحقاً",
        variant: "destructive",
      });
    } else {
      toast({ title: `🎉 حصلت على ${result.points_awarded} نقطة!` });
      setPoints((p) => p + (result.points_awarded || 0));
      setAlreadyRedeemed(true);
      setInputCode("");
    }
  };

  if (!user || fetching) return null;

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold">برنامج الإحالة</h3>
          <p className="text-xs text-muted-foreground">
            رصيدك: <span className="font-bold text-primary">{points}</span> نقطة ترويج
          </p>
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">رمز الدعوة الخاص فيك</label>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono font-bold tracking-widest text-center">
            {code}
          </div>
          <Button type="button" variant="outline" size="icon" onClick={copyCode} aria-label="نسخ">
            <Copy className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" onClick={shareOnWhatsApp} aria-label="مشاركة">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          كل صديق يستخدم رمزك بيعطيك 100 نقطة، وهو بياخذ 50 نقطة.
        </p>
      </div>

      {!alreadyRedeemed && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            <Ticket className="h-3 w-3 inline ml-1" />
            عندك رمز دعوة من صديق؟
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="أدخل الرمز"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="font-mono tracking-widest text-center"
              maxLength={12}
            />
            <Button type="button" onClick={redeem} disabled={loading || !inputCode.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
              استخدام
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralCard;
