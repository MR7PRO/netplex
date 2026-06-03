import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Smartphone,
  Shirt,
  Home,
  Car,
  Dumbbell,
  BookOpen,
  Briefcase,
  Package,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  electronics: Smartphone,
  fashion: Shirt,
  "home-garden": Home,
  vehicles: Car,
  sports: Dumbbell,
  books: BookOpen,
  services: Briefcase,
  other: Package,
};

export const CategoryChips: React.FC = () => {
  const { data: categories } = useQuery({
    queryKey: ["categories-chips"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, slug, name_ar")
        .is("parent_id", null)
        .order("sort_order");
      return data || [];
    },
  });

  if (!categories?.length) return null;

  const baseClass =
    "flex flex-col items-center justify-center gap-1.5 shrink-0 w-[76px] md:w-[88px] py-3 px-2 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[76px]";

  return (
    <div className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
      <Link to="/search" className={baseClass} aria-label="جميع الأقسام">
        <LayoutGrid className="h-6 w-6 text-primary" />
        <span className="text-xs font-medium">الكل</span>
      </Link>
      {categories.map((cat) => {
        const Icon = ICONS[cat.slug] || Package;
        return (
          <Link
            key={cat.id}
            to={`/search?category=${cat.slug}`}
            className={baseClass}
            aria-label={cat.name_ar}
          >
            <Icon className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium text-center line-clamp-1">{cat.name_ar}</span>
          </Link>
        );
      })}
    </div>
  );
};
