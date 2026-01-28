import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/layout/Layout";
import ListingCard from "@/components/listings/ListingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Star, 
  MapPin, 
  ShieldCheck, 
  Calendar, 
  Package, 
  MessageCircle,
  ArrowLeft,
  User,
  LogIn
} from "lucide-react";
import { useSellerWhatsapp } from "@/hooks/useSellerWhatsapp";

const SellerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Get seller WhatsApp (only for authenticated users)
  const { whatsapp: sellerWhatsapp, isAuthenticated } = useSellerWhatsapp(id);

  // Fetch seller details
  const { data: seller, isLoading: loadingSeller } = useQuery({
    queryKey: ["seller", id],
    queryFn: async () => {
      const { data: sellerData, error: sellerError } = await supabase
        .from("sellers")
        .select("*")
        .eq("id", id)
        .single();
      
      if (sellerError) throw sellerError;

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", sellerData.user_id)
        .single();

      return { ...sellerData, profile: profileData };
    },
    enabled: !!id,
  });

  // Fetch seller's listings
  const { data: listings, isLoading: loadingListings } = useQuery({
    queryKey: ["seller-listings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", id)
        .eq("status", "available")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch seller's reviews
  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ["seller-reviews", id],
    queryFn: async () => {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("seller_id", id)
        .order("created_at", { ascending: false });
      
      if (reviewsError) throw reviewsError;

      // Fetch reviewer profiles
      const reviewerIds = [...new Set(reviewsData.map(r => r.reviewer_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", reviewerIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      return reviewsData.map(review => ({
        ...review,
        reviewer: profilesMap.get(review.reviewer_id) || null
      }));
    },
    enabled: !!id,
  });

  const averageRating = reviews?.length 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long'
    });
  };

  if (loadingSeller) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-48 w-full rounded-xl mb-6" />
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!seller) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">البائع غير موجود</h1>
          <p className="text-muted-foreground mb-6">
            لم نتمكن من العثور على هذا البائع
          </p>
          <Button asChild>
            <Link to="/">العودة للرئيسية</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const profile = seller.profile as { name: string; avatar_url: string | null } | null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Seller Header */}
        <Card className="mb-8 overflow-hidden">
          <div className="bg-gradient-to-l from-primary/10 to-transparent p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.name || seller.shop_name || "البائع"}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-background shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-lg">
                    <User className="h-12 w-12 md:h-16 md:w-16 text-primary" />
                  </div>
                )}
                {seller.verified && (
                  <div className="absolute -bottom-1 -left-1 bg-success text-success-foreground rounded-full p-1.5">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-right">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-2 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {seller.shop_name || profile?.name || "بائع"}
                  </h1>
                  {seller.verified && (
                    <Badge className="bg-success text-success-foreground">
                      <ShieldCheck className="h-3 w-3 ml-1" />
                      موثق
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {seller.type === "shop" ? "متجر" : "فرد"}
                  </Badge>
                </div>

                {seller.bio && (
                  <p className="text-muted-foreground mb-4 max-w-xl">
                    {seller.bio}
                  </p>
                )}

                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {seller.region}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    عضو منذ {formatDate(seller.created_at || "")}
                  </span>
                  {averageRating && (
                    <span className="flex items-center gap-1 text-warning">
                      <Star className="h-4 w-4 fill-current" />
                      {averageRating} ({reviews?.length} تقييم)
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Button */}
              {isAuthenticated && sellerWhatsapp ? (
                <Button 
                  size="lg"
                  className="btn-brand"
                  onClick={() => window.open(`https://wa.me/${sellerWhatsapp.replace(/\D/g, "")}`, '_blank')}
                >
                  <MessageCircle className="h-5 w-5 ml-2" />
                  تواصل واتساب
                </Button>
              ) : !isAuthenticated ? (
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth")}
                >
                  <LogIn className="h-5 w-5 ml-2" />
                  سجل الدخول للتواصل
                </Button>
              ) : null}
            </div>
          </div>

          {/* Stats */}
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {listings?.length || 0}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">منتج متاح</div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {reviews?.length || 0}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">تقييم</div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {seller.trust_score || 0}%
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">نسبة الثقة</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seller's Listings */}
        <section className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            منتجات البائع
          </h2>
          
          {loadingListings ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : listings && listings.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  price={listing.price_ils}
                  image={listing.images?.[0]}
                  region={listing.region}
                  condition={listing.condition || undefined}
                  viewCount={listing.view_count || 0}
                  featured={listing.featured || false}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">لا توجد منتجات متاحة حالياً</p>
            </Card>
          )}
        </section>

        {/* Reviews Section */}
        <section>
          <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
            <Star className="h-6 w-6 text-warning" />
            التقييمات والمراجعات
          </h2>

          {loadingReviews ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => {
                const reviewer = review.reviewer as { name: string; avatar_url: string | null } | null;
                return (
                  <Card key={review.id} className="p-4">
                    <div className="flex gap-4">
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
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{reviewer?.name || "مستخدم"}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(review.created_at || "")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${
                                i < review.rating 
                                  ? "text-warning fill-current" 
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">لا توجد تقييمات بعد</p>
            </Card>
          )}
        </section>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة للرئيسية
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default SellerPage;
