import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Gavel, ImageIcon, ShieldCheck, Flame, Heart, Download, MoreHorizontal, ChevronUp } from "lucide-react";

const PRIMARY = [
  { to: "/search", label: "المزادات", icon: Gavel, tone: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", href: "/auctions" },
  { to: "/image-search", label: "بحث بالصورة", icon: ImageIcon, tone: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  { to: "/deals", label: "صفقاتي", icon: ShieldCheck, tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { to: "/daily-deals", label: "صفقات اليوم", icon: Flame, tone: "text-primary", bg: "bg-primary/10" },
];

const SECONDARY = [
  { to: "/following", label: "متابعاتي", icon: Heart, tone: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10" },
  { to: "/install", label: "تثبيت", icon: Download, tone: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
];

const Shortcut: React.FC<{ to: string; label: string; icon: React.ElementType; tone: string; bg: string }> = ({
  to,
  label,
  icon: Icon,
  tone,
  bg,
}) => (
  <Link
    to={to}
    className="group flex flex-col items-center gap-2 min-w-[84px] md:min-w-0 p-3 rounded-xl bg-card border hover:border-primary/50 hover:shadow-md transition-all"
  >
    <div className={`h-11 w-11 rounded-full ${bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
      <Icon className={`h-5 w-5 ${tone}`} />
    </div>
    <span className="text-xs font-medium text-center whitespace-nowrap">{label}</span>
  </Link>
);

export const FeatureShortcuts: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2 md:mx-0 md:px-0 md:grid md:grid-cols-5"
      role="navigation"
      aria-label="اختصارات المزايا"
    >
      {PRIMARY.map((s) => (
        <Shortcut key={s.label} {...s} to={(s as any).href || s.to} />
      ))}

      {expanded &&
        SECONDARY.map((s) => <Shortcut key={s.label} {...s} />)}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="group flex flex-col items-center gap-2 min-w-[84px] md:min-w-0 p-3 rounded-xl bg-card border hover:border-primary/50 hover:shadow-md transition-all"
      >
        <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <span className="text-xs font-medium text-center whitespace-nowrap">
          {expanded ? "أقل" : "المزيد"}
        </span>
      </button>
    </div>
  );
};

export default FeatureShortcuts;
