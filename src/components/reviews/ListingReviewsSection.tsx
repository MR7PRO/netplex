import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, User, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ReviewImage } from "@/components/reviews/ReviewImage";

interface Props {
  listingId: string;
  sellerId: string;
}

export const ListingReviewsSection: React.FC<Props> = ({ listingId, sellerId }) => {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["listing-reviews", listingId, sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id, listing_id, images")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;

      const ids = [...new Set((data || []).map((r) => r.reviewer_id))];
      const { data: profs } = ids.length
        ? await supabase
            .from("profiles_public")
            .select("id, name, avatar_url")
            .in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      return (data || []).map((r) => ({ ...r, reviewer: map.get(r.reviewer_id) }));
    },
  });

  const onThisProduct = (reviews || []).filter((r) => r.listing_id === listingId);
  const others = (reviews || []).filter((r) => r.listing_id !== listingId);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        تعليقات الزبائن
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (reviews || []).length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          <Star className="h-10 w-10 mx-auto mb-2 opacity-50" />
          لسا ما في تعليقات. كون أول واحد يقيّم هاد البائع.
        </Card>
      ) : (
        <div className="space-y-4">
          {onThisProduct.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground">
                تعليقات على هاد المنتج ({onThisProduct.length})
              </h3>
              {onThisProduct.map((r: any) => (
                <ReviewItem key={r.id} review={r} fmt={fmt} />
              ))}
            </>
          )}
          {others.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground pt-2">
                تعليقات على منتجات تانية للبائع
              </h3>
              {others.slice(0, 5).map((r: any) => (
                <ReviewItem key={r.id} review={r} fmt={fmt} />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
};

const ReviewItem: React.FC<{ review: any; fmt: (d: string) => string }> = ({ review, fmt }) => {
  const reviewer = review.reviewer as { name: string; avatar_url: string | null } | null;
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        {reviewer?.avatar_url ? (
          <img
            src={reviewer.avatar_url}
            alt={reviewer.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">{reviewer?.name || "مستخدم"}</span>
            <span className="text-xs text-muted-foreground">
              {fmt(review.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < review.rating ? "text-warning fill-current" : "text-muted-foreground"
                }`}
              />
            ))}
          </div>
          {review.comment && (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{review.comment}</p>
          )}
          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {(review.images as string[]).map((p, i) => (
                <ReviewImage key={i} path={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ListingReviewsSection;
