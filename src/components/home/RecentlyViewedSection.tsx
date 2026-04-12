import React from "react";
import { Clock } from "lucide-react";
import ListingCard from "@/components/listings/ListingCard";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";

export const RecentlyViewedSection: React.FC = () => {
  const { items } = useRecentlyViewed();

  if (items.length === 0) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg md:text-xl font-bold">شاهدتها مؤخراً</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.slice(0, 5).map((item) => (
            <ListingCard
              key={item.id}
              id={item.id}
              title={item.title}
              price={item.price}
              image={item.image || undefined}
              region={item.region}
              viewCount={0}
              featured={false}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
