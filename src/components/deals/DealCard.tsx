import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingBag, Store } from "lucide-react";
import SignedImage from "@/components/SignedImage";
import {
  type Deal,
  type DealRole,
  dealStatusLabel,
  dealStatusVariant,
  dealNextAction,
  formatILS,
} from "@/lib/deals";
import { cn } from "@/lib/utils";

export interface DealWithListing extends Deal {
  listings: { title: string; images: string[] | null } | null;
}

const DealCard: React.FC<{ deal: DealWithListing; role: DealRole }> = ({ deal, role }) => {
  const img = deal.listings?.images?.[0];
  const next = dealNextAction(deal, role);
  const actionable =
    (role === "seller" && deal.status === "pending") ||
    (role === "buyer" && (deal.status === "shipped" || deal.status === "delivered"));

  return (
    <Link to={`/deals/${deal.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
            {img ? (
              <SignedImage path={img} alt={deal.listings?.title || "منتج"} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                <ShoppingBag className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium truncate">{deal.listings?.title || "منتج"}</p>
              <Badge variant="outline" className="text-[10px] gap-1">
                {role === "seller" ? <Store className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                {role === "seller" ? "أنا البائع" : "أنا المشتري"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(deal.created_at).toLocaleDateString("ar", { dateStyle: "medium" })}
            </p>
            <p className={cn("text-xs mt-1", actionable ? "text-primary font-semibold" : "text-muted-foreground")}>
              {next}
            </p>
          </div>
          <div className="text-left shrink-0 space-y-1">
            <p className="font-bold text-primary">{formatILS(deal.agreed_price_ils)}</p>
            <Badge variant={dealStatusVariant(deal.status)}>{dealStatusLabel(deal.status)}</Badge>
          </div>
          <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
        </CardContent>
      </Card>
    </Link>
  );
};

export default DealCard;
