import React from "react";
import { Clock, Zap } from "lucide-react";
import { getRelativeTime } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  /** Last known activity timestamp (e.g. last published listing) */
  lastActiveAt?: string | null;
  verified?: boolean | null;
  trustScore?: number | null;
  className?: string;
}

/**
 * Trust line on the product page: expected reply speed + last seller activity.
 * Purely presentational — derived from data already loaded on the page.
 */
export const SellerResponsiveness: React.FC<Props> = ({
  lastActiveAt,
  verified,
  trustScore,
  className,
}) => {
  const score = trustScore ?? 0;
  const replyText =
    verified && score >= 70
      ? "يرد عادة خلال ساعة"
      : score >= 40
      ? "يرد عادة خلال بضع ساعات"
      : "يرد عادة خلال 24 ساعة";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
        className
      )}
    >
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
        <Zap className="h-3.5 w-3.5" />
        {replyText}
      </span>
      {lastActiveAt && (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          آخر ظهور للبائع {getRelativeTime(lastActiveAt)}
        </span>
      )}
    </div>
  );
};

export default SellerResponsiveness;
