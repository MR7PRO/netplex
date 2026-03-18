import React from "react";
import { TrendingDown, Scale, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Verdict = "great" | "fair" | "high";

interface PriceVerdictChipProps {
  verdict: Verdict;
  className?: string;
}

const config: Record<Verdict, { label: string; icon: typeof Scale; bg: string; text: string }> = {
  great: {
    label: "صفقة ممتازة",
    icon: TrendingDown,
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  fair: {
    label: "سعر عادل",
    icon: Scale,
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  high: {
    label: "أعلى من السوق",
    icon: TrendingUp,
    bg: "bg-orange-500/10 border-orange-500/30",
    text: "text-orange-600 dark:text-orange-400",
  },
};

/**
 * Parses AI response text and extracts verdict keywords.
 */
export function extractVerdict(text: string): Verdict | null {
  const lower = text.toLowerCase();
  if (
    lower.includes("صفقة ممتازة") ||
    lower.includes("great deal") ||
    lower.includes("سعر ممتاز")
  )
    return "great";
  if (
    lower.includes("سعر عادل") ||
    lower.includes("fair") ||
    lower.includes("سعر مناسب") ||
    lower.includes("سعر معقول")
  )
    return "fair";
  if (
    lower.includes("أعلى من السوق") ||
    lower.includes("سعر مرتفع") ||
    lower.includes("high") ||
    lower.includes("غالي")
  )
    return "high";
  return null;
}

export const PriceVerdictChip: React.FC<PriceVerdictChipProps> = ({ verdict, className }) => {
  const c = config[verdict];
  const Icon = c.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold animate-in fade-in-0 zoom-in-95 duration-300",
        c.bg,
        c.text,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {c.label}
    </span>
  );
};

export default PriceVerdictChip;
