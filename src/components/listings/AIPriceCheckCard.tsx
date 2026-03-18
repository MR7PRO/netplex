import React from "react";
import { Bot, TrendingDown, Scale, TrendingUp, Loader2 } from "lucide-react";
import { usePriceStats, getPriceLabel, type PriceLabel } from "@/hooks/usePriceStats";
import { formatPrice } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AIPriceCheckCardProps {
  price: number;
  brand: string | null;
  model: string | null;
  condition: string | null;
}

const verdictConfig: Record<Exclude<PriceLabel, "unknown">, { label: string; icon: typeof Scale; color: string }> = {
  great_deal: { label: "صفقة ممتازة", icon: TrendingDown, color: "text-emerald-600 dark:text-emerald-400" },
  fair: { label: "سعر عادل", icon: Scale, color: "text-blue-600 dark:text-blue-400" },
  high: { label: "أعلى من السوق", icon: TrendingUp, color: "text-orange-600 dark:text-orange-400" },
};

export const AIPriceCheckCard: React.FC<AIPriceCheckCardProps> = ({ price, brand, model, condition }) => {
  const { data: stats, isLoading } = usePriceStats(brand, model, condition);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">جارٍ تحليل السعر...</span>
      </div>
    );
  }

  if (!stats || stats.sample_count < 3 || !stats.price_median) return null;

  const label = getPriceLabel(price, stats);
  if (label === "unknown") return null;

  const cfg = verdictConfig[label];
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
          <span className={cn("text-xs font-bold", cfg.color)}>{cfg.label}</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">
          متوسط السوق {formatPrice(stats.price_median)} · من {stats.sample_count} إعلان
        </p>
      </div>
    </div>
  );
};

export default AIPriceCheckCard;
