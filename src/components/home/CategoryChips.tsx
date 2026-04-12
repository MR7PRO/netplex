import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 px-1">
      <Link to="/search">
        <Badge variant="secondary" className="whitespace-nowrap px-4 py-1.5 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
          الكل
        </Badge>
      </Link>
      {categories.map((cat) => (
        <Link key={cat.id} to={`/search?category=${cat.slug}`}>
          <Badge variant="outline" className="whitespace-nowrap px-4 py-1.5 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors">
            {cat.name_ar}
          </Badge>
        </Link>
      ))}
    </div>
  );
};
