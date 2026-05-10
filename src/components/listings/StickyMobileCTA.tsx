import React from "react";
import { ShoppingCart, MessageCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/constants";

interface Props {
  price: number;
  originalPrice?: number;
  whatsappLink?: string | null;
  inCart: boolean;
  onAddToCart: () => void;
}

export const StickyMobileCTA: React.FC<Props> = ({
  price,
  originalPrice,
  whatsappLink,
  inCart,
  onAddToCart,
}) => {
  return (
    <div
      className="md:hidden fixed bottom-14 inset-x-0 z-30 border-t bg-background/95 backdrop-blur-md shadow-lg pb-[env(safe-area-inset-bottom)]"
      role="region"
      aria-label="إجراءات سريعة"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex flex-col leading-tight shrink-0">
          {originalPrice && originalPrice > price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
          <span className="text-base font-bold text-primary">{formatPrice(price)}</span>
        </div>
        <div className="flex-1 flex gap-2">
          {whatsappLink && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="flex-1 h-11 text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
            >
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 ml-1" />
                واتساب
              </a>
            </Button>
          )}
          <Button
            onClick={onAddToCart}
            disabled={inCart}
            size="sm"
            className="btn-brand flex-1 h-11"
          >
            {inCart ? (
              <><Check className="h-4 w-4 ml-1" />في السلة</>
            ) : (
              <><ShoppingCart className="h-4 w-4 ml-1" />أضف للسلة</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StickyMobileCTA;
