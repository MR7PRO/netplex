import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowRight, MapPin, Calendar, Eye, Heart, Share2, Flag, 
  Phone, MessageCircle, ShoppingCart, Check, Shield, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, getRegionLabel, getConditionLabel, getRelativeTime } from "@/lib/constants";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price_ils: number;
  condition: string | null;
  region: string;
  images: string[];
  brand: string | null;
  model: string | null;
  view_count: number | null;
  save_count: number | null;
  featured: boolean | null;
  created_at: string | null;
  published_at: string | null;
  seller_id: string;
}

interface Seller {
  id: string;
  shop_name: string | null;
  bio: string | null;
  region: string;
  verified: boolean | null;
  trust_score: number | null;
  whatsapp: string | null;
  user_id: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
  reviewer: {
    name: string;
    avatar_url: string | null;
  } | null;
}

const ListingDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, isInCart } = useCart();
  const { toast } = useToast();

  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Fetch listing details
  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;

      setLoading(true);
      const { data: listingData, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !listingData) {
        console.error("Error fetching listing:", error);
        navigate("/404");
        return;
      }

      setListing(listingData as Listing);

      // Fetch seller
      const { data: sellerData } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", listingData.seller_id)
        .single();

      if (sellerData) {
        setSeller(sellerData as Seller);

        // Fetch reviews for this seller
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select(`
            id, rating, comment, created_at,
            reviewer:profiles_public!reviews_reviewer_id_fkey(name, avatar_url)
          `)
          .eq("seller_id", sellerData.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (reviewsData) {
          setReviews(reviewsData as unknown as Review[]);
        }
      }

      // Check if saved
      if (user) {
        const { data: savedData } = await supabase
          .from("saved_listings")
          .select("id")
          .eq("listing_id", id)
          .eq("user_id", user.id)
          .single();

        setIsSaved(!!savedData);
      }

      // Increment view count
      await supabase
        .from("listings")
        .update({ view_count: (listingData.view_count || 0) + 1 })
        .eq("id", id);

      setLoading(false);
    };

    fetchListing();
  }, [id, user, navigate]);

  const handleSave = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (isSaved) {
      await supabase
        .from("saved_listings")
        .delete()
        .eq("listing_id", id)
        .eq("user_id", user.id);
      setIsSaved(false);
      toast({ title: "تمت الإزالة من المحفوظات" });
    } else {
      await supabase
        .from("saved_listings")
        .insert({ listing_id: id!, user_id: user.id });
      setIsSaved(true);
      toast({ title: "تمت الإضافة للمحفوظات" });
    }
  };

  const handleAddToCart = () => {
    if (!listing || !seller) return;
    addItem({
      id: listing.id,
      title: listing.title,
      price_ils: listing.price_ils,
      image: listing.images?.[0] || null,
      seller_name: seller.shop_name || "بائع",
      seller_whatsapp: seller.whatsapp,
    });
    toast({ title: "تمت الإضافة للسلة" });
  };

  const handleSubmitOffer = async () => {
    if (!user || !listing) {
      navigate("/auth");
      return;
    }

    const price = parseFloat(offerPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: "يرجى إدخال سعر صحيح", variant: "destructive" });
      return;
    }

    setSubmittingOffer(true);
    const { error } = await supabase.from("offers").insert({
      listing_id: listing.id,
      buyer_id: user.id,
      offer_price_ils: price,
      message: offerMessage || null,
    });

    if (error) {
      toast({ title: "حدث خطأ", description: "يرجى المحاولة لاحقاً", variant: "destructive" });
    } else {
      toast({ title: "تم إرسال العرض بنجاح" });
      setOfferDialogOpen(false);
      setOfferPrice("");
      setOfferMessage("");
    }
    setSubmittingOffer(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: listing?.title,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "تم نسخ الرابط" });
    }
  };

  const whatsappLink = seller?.whatsapp
    ? `https://wa.me/${seller.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`مرحباً، أنا مهتم بـ: ${listing?.title}`)}`
    : null;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!listing) return null;

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">الرئيسية</Link>
          <ArrowRight className="h-3 w-3" />
          <Link to="/search" className="hover:text-foreground">تصفح</Link>
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground line-clamp-1">{listing.title}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            {listing.images && listing.images.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {listing.images.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-square rounded-xl overflow-hidden bg-muted">
                        <img
                          src={image}
                          alt={`${listing.title} - ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {listing.images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
            ) : (
              <div className="aspect-square rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                لا توجد صور
              </div>
            )}

            {/* Thumbnail strip */}
            {listing.images && listing.images.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {listing.images.map((image, index) => (
                  <div
                    key={index}
                    className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 border-transparent hover:border-primary cursor-pointer"
                  >
                    <img src={image} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Title & Price */}
            <div>
              {listing.featured && (
                <Badge className="mb-2 bg-primary text-primary-foreground">منتج مميز</Badge>
              )}
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{listing.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {getRegionLabel(listing.region)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {listing.published_at ? getRelativeTime(listing.published_at) : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {listing.view_count || 0}
                </span>
              </div>
              <p className="text-3xl font-bold text-primary">
                {formatPrice(listing.price_ils)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleAddToCart}
                disabled={isInCart(listing.id)}
                className="btn-brand flex-1"
              >
                {isInCart(listing.id) ? (
                  <>
                    <Check className="h-4 w-4 ml-2" />
                    في السلة
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 ml-2" />
                    أضف للسلة
                  </>
                )}
              </Button>

              <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    قدم عرضك
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>قدم عرض سعر</DialogTitle>
                    <DialogDescription>
                      السعر المطلوب: {formatPrice(listing.price_ils)}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">عرضك (₪)</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">رسالة (اختياري)</label>
                      <Textarea
                        placeholder="أضف رسالة للبائع..."
                        value={offerMessage}
                        onChange={(e) => setOfferMessage(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handleSubmitOffer} 
                      className="w-full btn-brand"
                      disabled={submittingOffer}
                    >
                      {submittingOffer ? "جاري الإرسال..." : "إرسال العرض"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Contact */}
            <div className="flex gap-2">
              {whatsappLink && (
                <Button asChild variant="outline" className="flex-1 text-green-600 border-green-600 hover:bg-green-50">
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 ml-2" />
                    واتساب
                  </a>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleSave}>
                <Heart className={`h-5 w-5 ${isSaved ? "fill-primary text-primary" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            <Separator />

            {/* Details */}
            <div className="space-y-3">
              <h3 className="font-semibold">التفاصيل</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {listing.condition && (
                  <div className="flex justify-between p-2 bg-muted rounded-lg">
                    <span className="text-muted-foreground">الحالة</span>
                    <span className="font-medium">{getConditionLabel(listing.condition)}</span>
                  </div>
                )}
                {listing.brand && (
                  <div className="flex justify-between p-2 bg-muted rounded-lg">
                    <span className="text-muted-foreground">الماركة</span>
                    <span className="font-medium">{listing.brand}</span>
                  </div>
                )}
                {listing.model && (
                  <div className="flex justify-between p-2 bg-muted rounded-lg">
                    <span className="text-muted-foreground">الموديل</span>
                    <span className="font-medium">{listing.model}</span>
                  </div>
                )}
              </div>
            </div>

            {listing.description && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">الوصف</h3>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {listing.description}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Seller Info */}
            {seller && (
              <div className="p-4 rounded-xl border bg-card">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {seller.shop_name?.[0] || "B"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{seller.shop_name || "بائع"}</h4>
                      {seller.verified && (
                        <span className="trust-badge-verified">
                          <Shield className="h-3 w-3" />
                          موثق
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getRegionLabel(seller.region)}
                    </p>
                    {reviews.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-4 w-4 text-warning fill-warning" />
                        <span className="font-medium">{avgRating.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">
                          ({reviews.length} تقييم)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {seller.bio && (
                  <p className="mt-3 text-sm text-muted-foreground">{seller.bio}</p>
                )}
              </div>
            )}

            {/* Report */}
            <Button variant="ghost" className="text-muted-foreground" size="sm">
              <Flag className="h-4 w-4 ml-2" />
              إبلاغ عن هذا الإعلان
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ListingDetailsPage;
