import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BadgeCheck, Store } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const VerifiedSellersSection: React.FC = () => {
  const { data: sellers, isLoading } = useQuery({
    queryKey: ["verified-sellers-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sellers_public")
        .select("id, user_id, shop_name, region, trust_score, verified, logo_url")
        .eq("verified", true)
        .order("trust_score", { ascending: false, nullsFirst: false })
        .limit(12);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!isLoading && (!sellers || sellers.length === 0)) return null;

  return (
    <section className="py-10 md:py-14">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <BadgeCheck className="h-6 w-6 text-primary" />
            بائعون موثّقون
          </h2>
        </div>

        <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 shrink-0 w-[88px] md:w-[104px]">
                  <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full" />
                  <Skeleton className="w-16 h-3" />
                </div>
              ))
            : sellers!.map((s) => (
                <Link
                  key={s.id || s.user_id}
                  to={`/seller/${s.user_id}`}
                  className="group flex flex-col items-center gap-2 shrink-0 w-[88px] md:w-[104px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
                >
                  <div className="relative">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/10 to-secondary border-2 border-border group-hover:border-primary transition-all duration-300 group-hover:scale-105 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md">
                      {(s as any).logo_url ? (
                        <img
                          src={(s as any).logo_url}
                          alt={s.shop_name || "متجر"}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Store className="h-8 w-8 md:h-10 md:w-10 text-primary/70" />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -left-1 bg-background rounded-full p-0.5">
                      <BadgeCheck className="h-5 w-5 text-primary fill-primary/20" />
                    </div>
                  </div>
                  <span className="text-xs md:text-sm font-medium text-center line-clamp-1 group-hover:text-primary transition-colors">
                    {s.shop_name || "متجر"}
                  </span>
                  {s.region && (
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{s.region}</span>
                  )}
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
};

export default VerifiedSellersSection;
