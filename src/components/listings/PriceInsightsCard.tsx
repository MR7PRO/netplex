import React from "react";
import { TrendingDown, TrendingUp, Scale, BarChart3, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PriceStats, PriceLabel, getPriceLabel } from "@/hooks/usePriceStats";
import { formatPrice } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PriceInsightsCardProps {
  price: number;
  stats: PriceStats;
  loading?: boolean;
}

const labelConfig: Record<Exclude<PriceLabel, "unknown">, { label: string; icon: typeof TrendingDown; className: string }> = {
  great_deal: {
    label: "صفقة ممتازة",
    icon: TrendingDown,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  fair: {
    label: "سعر عادل",
    icon: Scale,
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  high: {
    label: "أعلى من السوق",
    icon: TrendingUp,
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
};

export const PriceInsightsCard: React.FC<PriceInsightsCardProps> = ({ price, stats, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (stats.sample_count < 3 || !stats.price_p25 || !stats.price_p75 || !stats.price_median) {
    return null; // Not enough data
  }

  const label = getPriceLabel(price, stats);
  if (label === "unknown") return null;

  const config = labelConfig[label];
  const Icon = config.icon;

  // Calculate position on the bar (clamped 0-100%)
  const rangeMin = stats.price_min!;
  const rangeMax = stats.price_max!;
  const totalRange = rangeMax - rangeMin;
  const pricePosition = totalRange > 0 ? Math.max(0, Math.min(100, ((price - rangeMin) / totalRange) * 100)) : 50;
  const p25Pos = totalRange > 0 ? ((stats.price_p25 - rangeMin) / totalRange) * 100 : 25;
  const p75Pos = totalRange > 0 ? ((stats.price_p75 - rangeMin) / totalRange) * 100 : 75;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          تحليل السعر
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px] text-xs">
                بناءً على {stats.sample_count} إعلان مشابه خلال آخر 30 يوم
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Label badge */}
        <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", config.className)}>
          <Icon className="h-3.5 w-3.5" />
          {config.label}
        </div>

        {/* Price bar visualization */}
        <div className="space-y-2">
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            {/* Fair range highlight */}
            <div
              className="absolute top-0 h-full bg-primary/15 rounded-full"
              style={{ left: `${p25Pos}%`, width: `${p75Pos - p25Pos}%` }}
            />
            {/* Price indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-sm"
              style={{ left: `calc(${pricePosition}% - 6px)` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{formatPrice(rangeMin)}</span>
            <span>{formatPrice(rangeMax)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-muted">
            <span className="text-muted-foreground block">متوسط السوق</span>
            <span className="font-semibold">{formatPrice(stats.price_median)}</span>
          </div>
          <div className="p-2 rounded-lg bg-muted">
            <span className="text-muted-foreground block">النطاق العادل</span>
            <span className="font-semibold">{formatPrice(stats.price_p25)} – {formatPrice(stats.price_p75)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceInsightsCard;
