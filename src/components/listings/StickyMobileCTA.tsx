import React from "react";
import { ShoppingCart, MessageCircle, Check, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/constants";
import { haptic } from "@/lib/haptics";

interface Props {
  price: number;
  originalPrice?: number;
  whatsappLink?: string | null;
  inCart: boolean;
  onAddToCart: () => void;
}

/**
 * Always-visible price bar with ONE primary action (WhatsApp).
 * Cart stays as a compact secondary icon button to keep the decision simple.
 */
export const StickyMobileCTA: React.FC<Props> = ({
  price,
  originalPrice,
  whatsappLink,
  inCart,
  onAddToCart,
}) => {
  return (
    <div
      className="fixed bottom-14 md:bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur-md shadow-lg pb-[env(safe-area-inset-bottom)]"
      role="region"
      aria-label="السعر والإجراء الأساسي"
    >
      {whatsappLink && (
        <div className="border-b bg-amber-500/10">
          <div className="container mx-auto px-3 md:px-4">
            <p className="flex items-center justify-center gap-1.5 py-1 text-[11px] md:text-xs text-amber-700 dark:text-amber-400 text-center">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>لا تدفع أي مبلغ مقدماً — افحص المنتج وجهاً لوجه قبل الدفع.</span>
              <Link to="/safety" className="underline underline-offset-2 shrink-0">
                نصائح الأمان
              </Link>
            </p>
          </div>
        </div>
      )}
      <div className="container mx-auto px-3 md:px-4">
        <div className="flex items-center gap-3 py-2 md:py-3">
          <div className="flex flex-col leading-tight shrink-0">
            {originalPrice && originalPrice > price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="text-base md:text-xl font-bold text-primary">
              {formatPrice(price)}
            </span>
          </div>

          <div className="flex-1 flex items-center gap-2 justify-end">
            {whatsappLink ? (
              <Button
                asChild
                size="lg"
                className="flex-1 md:flex-none md:min-w-[240px] h-12 bg-green-600 hover:bg-green-700 text-white"
              >
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => haptic("medium")}
                >
                  <MessageCircle className="h-5 w-5 ml-2" />
                  تواصل عبر واتساب
                </a>
              </Button>
            ) : (
              <Button
                onClick={() => {
                  haptic("medium");
                  onAddToCart();
                }}
                disabled={inCart}
                size="lg"
                className="btn-brand flex-1 md:flex-none md:min-w-[240px] h-12"
              >
                {inCart ? (
                  <><Check className="h-5 w-5 ml-2" />في السلة</>
                ) : (
                  <><ShoppingCart className="h-5 w-5 ml-2" />أضف للسلة</>
                )}
              </Button>
            )}

            {whatsappLink && (
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0"
                aria-label={inCart ? "في السلة" : "أضف للسلة"}
                disabled={inCart}
                onClick={() => {
                  haptic("light");
                  onAddToCart();
                }}
              >
                {inCart ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickyMobileCTA;
