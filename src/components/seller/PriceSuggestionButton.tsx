import React, { useState } from "react";
import { Wand2, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/constants";

interface Props {
  brand?: string;
  model?: string;
  condition?: string;
  onSuggest: (price: number) => void;
}

export const PriceSuggestionButton: React.FC<Props> = ({ brand, model, condition, onSuggest }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    median: number; min: number; max: number; count: number;
  } | null>(null);
  const { toast } = useToast();

  const handleClick = async () => {
    if (!brand || !model) {
      toast({
        title: "أدخل الماركة والموديل أولاً",
        description: "لازم نعرف الماركة والموديل حتى نقارن الأسعار",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_price_stats", {
        p_brand: brand,
        p_model: model,
        p_condition: (condition as any) || null,
      });

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;

      if (!row || row.sample_count < 3 || !row.price_median) {
        toast({
          title: "ما في بيانات كافية",
          description: "لسا ما في إعلانات كتيرة لنفس الماركة والموديل، حط سعر يناسبك.",
        });
        setStats(null);
      } else {
        setStats({
          median: Number(row.price_median),
          min: Number(row.price_p25 || row.price_min),
          max: Number(row.price_p75 || row.price_max),
          count: row.sample_count,
        });
        onSuggest(Math.round(Number(row.price_median)));
        toast({ title: "✨ تم اقتراح السعر بناءً على السوق" });
      }
    } catch (e) {
      toast({ title: "تعذر جلب اقتراح السعر", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className="gap-2 w-full"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-primary" />}
        اقترح لي سعر مناسب
      </Button>

      {stats && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-primary">
            <TrendingUp className="h-3.5 w-3.5" />
            متوسط السوق: {formatPrice(stats.median)}
          </div>
          <p className="text-muted-foreground">
            النطاق العادل: {formatPrice(stats.min)} – {formatPrice(stats.max)} · من {stats.count} إعلان خلال 30 يوم
          </p>
        </div>
      )}
    </div>
  );
};

export default PriceSuggestionButton;
