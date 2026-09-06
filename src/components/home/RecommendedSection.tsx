import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ListingCard from "@/components/listings/ListingCard";
import { ListingCardSkeleton } from "@/components/listings/ListingCardSkeleton";
import { useRecommendations } from "@/hooks/useRecommendations";
import { recommendationReasonLabel } from "@/lib/recommendations";

export const RecommendedSection: React.FC = () => {
  const { items, isLoading, isError, personalized } = useRecommendations(8);

  if (isError) return null;
  if (!isLoading && items.length === 0) return null;

  return (
    <section className="py-10 md:py-14" aria-labelledby="recommended-heading">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-2">
          <h2
            id="recommended-heading"
            className="text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2"
          >
            <Sparkles className="h-6 w-6 text-primary" />
            مقترحة لك
          </h2>
          <Button variant="ghost" asChild>
            <Link to="/search">عرض الكل</Link>
          </Button>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mb-6">
          {personalized
            ? "اخترناها حسب ما شاهدته وحفظته والبائعين اللي بتتابعهم"
            : "الأكثر رواجاً من بائعين موثّقين — سجّل دخولك لاقتراحات أدق"}
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            <ListingCardSkeleton count={8} />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {items.map((l) => {
              const reason = recommendationReasonLabel(l.reason, l.reason_value);
              return (
                <div key={l.id} className="flex flex-col gap-1.5">
                  <ListingCard
                    id={l.id}
                    title={l.title}
                    price={Number(l.price_ils)}
                    image={l.images?.[0]}
                    region={l.region}
                    condition={l.condition || undefined}
                    viewCount={l.view_count || 0}
                    featured={l.featured || false}
                    verifiedSeller={!!l.seller_verified}
                    discountPercent={l.discount_percent}
                    discountEndAt={l.discount_end_at}
                    stockQuantity={l.stock_quantity}
                  />
                  {reason && (
                    <span className="inline-flex items-center gap-1 text-[11px] md:text-xs text-muted-foreground px-1 line-clamp-1">
                      <Sparkles className="h-3 w-3 text-primary shrink-0" />
                      {reason}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendedSection;
