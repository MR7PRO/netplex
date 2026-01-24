import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, MessageCircle, Share2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Layout from "@/components/layout/Layout";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

const CartPage: React.FC = () => {
  const { items, removeItem, clearCart, totalPrice } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateWhatsAppMessage = () => {
    if (items.length === 0) return "";

    let message = "مرحباً، أنا مهتم بالمنتجات التالية:\n\n";
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.title} - ${formatPrice(item.price_ils)}\n`;
    });
    message += `\nالمجموع: ${formatPrice(totalPrice)}`;
    return message;
  };

  const handleShare = async () => {
    const message = generateWhatsAppMessage();
    
    if (navigator.share) {
      await navigator.share({
        title: "قائمة مشترياتي من نت بلكس",
        text: message,
      });
    } else {
      await navigator.clipboard.writeText(message);
      toast({ title: "تم نسخ القائمة" });
    }
  };

  // Group items by seller
  const itemsBySeller = items.reduce((acc, item) => {
    const key = item.seller_name;
    if (!acc[key]) {
      acc[key] = {
        items: [],
        whatsapp: item.seller_whatsapp,
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { items: typeof items; whatsapp: string | null }>);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          سلة الاستفسارات
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">السلة فارغة</h3>
            <p className="text-muted-foreground mb-6">
              أضف منتجات للسلة للتواصل مع البائعين
            </p>
            <Button onClick={() => navigate("/search")} className="btn-brand">
              تصفح المنتجات
            </Button>
          </div>
        ) : (
          <>
            {/* Items grouped by seller */}
            <div className="space-y-6">
              {Object.entries(itemsBySeller).map(([sellerName, { items: sellerItems, whatsapp }]) => (
                <div key={sellerName} className="rounded-xl border bg-card overflow-hidden">
                  <div className="bg-muted px-4 py-3 flex items-center justify-between">
                    <h3 className="font-medium">{sellerName}</h3>
                    {whatsapp && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600"
                        asChild
                      >
                        <a
                          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                            `مرحباً، أنا مهتم بـ:\n${sellerItems.map((i) => `- ${i.title}`).join("\n")}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="h-4 w-4 ml-1" />
                          واتساب
                        </a>
                      </Button>
                    )}
                  </div>
                  <div className="divide-y">
                    {sellerItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                            <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/listing/${item.id}`}
                            className="font-medium line-clamp-1 hover:text-primary"
                          >
                            {item.title}
                          </Link>
                          <p className="text-primary font-semibold">
                            {formatPrice(item.price_ils)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-6" />

            {/* Summary */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground">
                  المجموع ({items.length} منتج)
                </span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(totalPrice)}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                هذه سلة استفسارات وليست طلب شراء. تواصل مع البائعين للاتفاق على التفاصيل.
              </p>

              <div className="flex gap-2">
                <Button onClick={handleShare} variant="outline" className="flex-1">
                  <Share2 className="h-4 w-4 ml-2" />
                  مشاركة القائمة
                </Button>
                <Button
                  variant="ghost"
                  onClick={clearCart}
                  className="text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 text-center">
              <Link to="/search" className="text-primary hover:underline text-sm">
                <ArrowRight className="h-4 w-4 inline ml-1" />
                متابعة التصفح
              </Link>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default CartPage;
