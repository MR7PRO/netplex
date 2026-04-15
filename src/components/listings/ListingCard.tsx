import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Eye, Star, GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingBadges } from "@/components/listings/ListingBadges";
import { useCompare } from "@/contexts/CompareContext";

interface ListingCardProps {
  id: string;
  title: string;
  price: number;
  image?: string;
  region: string;
  condition?: string;
  viewCount?: number;
  featured?: boolean;
  className?: string;
  sellerRating?: number;
  // Badge props
  verifiedSeller?: boolean;
  fairPrice?: boolean;
  hotDeal?: boolean;
}

const conditionLabels: Record<string, string> = {
  new: "جديد",
  like_new: "شبه جديد",
  good: "جيد",
  fair: "مقبول",
  poor: "مستعمل",
};

export const ListingCard: React.FC<ListingCardProps> = ({
  id,
  title,
  price,
  image,
  region,
  condition,
  viewCount,
  featured,
  className,
  sellerRating,
  verifiedSeller,
  fairPrice,
  hotDeal,
}) => {
  const { signedUrl, loading: imageLoading } = useSignedImageUrl(image);
  const { addItem, removeItem, isComparing, isFull } = useCompare();

  const comparing = isComparing(id);
  const hasBadges = verifiedSeller || fairPrice || hotDeal;

  return (
    <Link to={`/listing/${id}`}>
      <Card
        className={cn(
          "group overflow-hidden card-hover border-border/50",
          featured && "ring-2 ring-primary/50",
          className
        )}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {imageLoading ? (
            <Skeleton className="h-full w-full" />
          ) : signedUrl ? (
            <img
              src={signedUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-muted-foreground">لا توجد صورة</span>
            </div>
          )}
          
          {featured && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
              مميز
            </Badge>
          )}
          
          {condition && (
            <Badge variant="secondary" className="absolute top-2 left-2">
              {conditionLabels[condition] || condition}
            </Badge>
          )}

          {/* Compare toggle */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (comparing) {
                removeItem(id);
              } else {
                addItem({
                  id,
                  title,
                  price_ils: price,
                  condition: condition || null,
                  region,
                  brand: null,
                  model: null,
                  image: image || null,
                  sellerVerified: verifiedSeller,
                });
              }
            }}
            disabled={!comparing && isFull}
            className={cn(
              "absolute bottom-2 left-2 p-1.5 rounded-full transition-colors",
              comparing
                ? "bg-primary text-primary-foreground"
                : "bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground",
              !comparing && isFull && "opacity-50 cursor-not-allowed"
            )}
            title={comparing ? "إزالة من المقارنة" : "أضف للمقارنة"}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
          </button>
        </div>
        
        <CardContent className="p-3">
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
            {title}
          </h3>
          
          {/* Listing Badges */}
          {hasBadges && (
            <ListingBadges
              verifiedSeller={verifiedSeller}
              fairPrice={fairPrice}
              hotDeal={hotDeal}
              className="mb-2"
              compact
            />
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">
              ₪{price.toLocaleString()}
            </span>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {viewCount !== undefined && viewCount > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {viewCount}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{region}</span>
            </div>
            {sellerRating !== undefined && sellerRating > 0 && (
              <div className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-primary text-primary" />
                <span className="text-foreground font-medium">{sellerRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ListingCard;
