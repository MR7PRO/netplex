import React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSavedListing } from "@/hooks/useSavedListing";

interface Props {
  listingId: string;
  className?: string;
}

export const QuickFavoriteButton: React.FC<Props> = ({ listingId, className }) => {
  const { isSaved, loading, toggle } = useSavedListing(listingId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      disabled={loading}
      aria-label={isSaved ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      title={isSaved ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      className={cn(
        "absolute top-2 left-2 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all shadow-sm",
        isSaved
          ? "bg-primary text-primary-foreground scale-110"
          : "bg-background/85 text-muted-foreground hover:bg-primary/10 hover:text-primary",
        className
      )}
    >
      <Heart className={cn("h-4 w-4 transition-transform", isSaved && "fill-current")} />
    </button>
  );
};
