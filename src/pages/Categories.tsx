import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Smartphone, Home, Car, Shirt, Dumbbell, BookOpen, Briefcase, Package, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";

const ICON_MAP: Record<string, React.ElementType> = {
  electronics: Smartphone,
  fashion: Shirt,
  "home-garden": Home,
  vehicles: Car,
  sports: Dumbbell,
  books: BookOpen,
  services: Briefcase,
  other: Package,
};

const CategoriesPage: React.FC = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories-with-count"],
    queryFn: async () => {
      const { data: cats } = await supabase
        .from("categories")
        .select("id, slug, name_ar, icon")
        .is("parent_id", null)
        .order("sort_order");

      if (!cats) return [];

      // Get counts per category
      const countsPromises = cats.map(async (cat) => {
        const { count } = await supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("status", "available")
          .eq("category_id", cat.id);
        return { ...cat, count: count || 0 };
      });

      return Promise.all(countsPromises);
    },
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">تصفح الأقسام</h1>
        <p className="text-muted-foreground text-center mb-8">اختر القسم الذي تبحث فيه</p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {categories?.map((cat) => {
              const Icon = ICON_MAP[cat.slug] || Package;
              return (
                <Link
                  key={cat.id}
                  to={`/search?category=${cat.slug}`}
                  className="group flex flex-col items-center p-6 rounded-xl bg-card border card-hover text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <span className="font-semibold text-sm mb-1">{cat.name_ar}</span>
                  <span className="text-xs text-muted-foreground">{cat.count} منتج</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CategoriesPage;
