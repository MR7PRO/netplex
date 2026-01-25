import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import { Skeleton } from "@/components/ui/skeleton";
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
}) => {
  const { signedUrl, loading: imageLoading } = useSignedImageUrl(image);

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
        </div>
        
        <CardContent className="p-3">
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
            {title}
          </h3>
          
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
          
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{region}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ListingCard;
