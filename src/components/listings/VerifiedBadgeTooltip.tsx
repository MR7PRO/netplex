import React from "react";
import { ShieldCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  /** Small pill style used inside cards */
  size?: "sm" | "md";
  className?: string;
  label?: string;
}

/**
 * "موثّق" badge with a tap/hover explanation so buyers understand
 * what verification actually means on NetPlex.
 */
export const VerifiedBadgeTooltip: React.FC<Props> = ({
  size = "md",
  className,
  label = "بائع موثّق",
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label={`${label} — اضغط لمعرفة معنى التوثيق`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
            className
          )}
        >
          <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-right" dir="rtl">
        <p className="text-sm font-semibold mb-1">شو يعني "موثّق"؟</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pr-4">
          <li>تم التحقق من هوية البائع ورقم تواصله من فريق NetPlex.</li>
          <li>متجره مراجَع، ومنتجاته تمر على موافقة الإدارة قبل النشر.</li>
          <li>سجّل تقييمات حقيقية من مشترين سابقين.</li>
        </ul>
        <p className="text-[11px] text-muted-foreground mt-2">
          التوثيق ما بضمن السلعة — دايماً افحص المنتج وجهاً لوجه قبل الدفع.
        </p>
      </PopoverContent>
    </Popover>
  );
};

export default VerifiedBadgeTooltip;
