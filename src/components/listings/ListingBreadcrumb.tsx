import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  categoryId?: string | null;
  title: string;
}

/** Breadcrumb: الرئيسية / الأقسام / {القسم} / {المنتج} */
export const ListingBreadcrumb: React.FC<Props> = ({ categoryId, title }) => {
  const { data: category } = useQuery({
    queryKey: ["breadcrumb-category", categoryId],
    enabled: !!categoryId,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("name, slug")
        .eq("id", categoryId!)
        .maybeSingle();
      return data;
    },
  });

  return (
    <nav aria-label="مسار التنقل" className="mb-6">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        <li>
          <Link to="/" className="hover:text-foreground transition-colors">الرئيسية</Link>
        </li>
        <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <li>
          <Link to="/categories" className="hover:text-foreground transition-colors">الأقسام</Link>
        </li>
        {category && (
          <>
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <li>
              <Link
                to={`/search?category=${category.slug}`}
                className="hover:text-foreground transition-colors"
              >
                {category.name}
              </Link>
            </li>
          </>
        )}
        <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <li className="text-foreground font-medium line-clamp-1 max-w-[50vw]">{title}</li>
      </ol>
    </nav>
  );
};

export default ListingBreadcrumb;
