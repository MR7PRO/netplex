import React from "react";
import { BadgeCheck, TrendingUp, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListingBadgesProps {
  verifiedSeller?: boolean;
  fairPrice?: boolean;
  hotDeal?: boolean;
  className?: string;
  compact?: boolean;
}

export const ListingBadges: React.FC<ListingBadgesProps> = ({
  verifiedSeller,
  fairPrice,
  hotDeal,
  className,
  compact = false,
}) => {
  const badges = [
    {
      show: verifiedSeller,
      icon: BadgeCheck,
      label: compact ? "" : "بائع موثق",
      ariaLabel: "بائع موثق",
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      show: fairPrice,
      icon: Scale,
      label: compact ? "" : "سعر عادل",
      ariaLabel: "سعر عادل",
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      show: hotDeal,
      icon: TrendingUp,
      label: compact ? "" : "صفقة رائجة",
      ariaLabel: "صفقة رائجة",
      className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    },
  ];

  const visibleBadges = badges.filter((b) => b.show);
  if (visibleBadges.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visibleBadges.map((badge, index) => (
        <div
          key={index}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
            badge.className
          )}
          aria-label={badge.ariaLabel}
        >
          <badge.icon className="h-3 w-3" />
          {badge.label && <span>{badge.label}</span>}
        </div>
      ))}
    </div>
  );
};

export default ListingBadges;
