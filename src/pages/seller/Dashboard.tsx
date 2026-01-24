import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Package, Plus, Eye, Clock, CheckCircle, XCircle, 
  TrendingUp, MessageSquare, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getRelativeTime } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";

type SubmissionStatus = Database["public"]["Enums"]["submission_status"];
type ListingStatus = Database["public"]["Enums"]["listing_status"];

interface Submission {
  id: string;
  title: string;
  price_ils: number;
  images: string[];
  status: SubmissionStatus;
  created_at: string | null;
  admin_notes: string | null;
}

interface Listing {
  id: string;
  title: string;
  price_ils: number;
  images: string[];
  status: ListingStatus;
  view_count: number | null;
  save_count: number | null;
  published_at: string | null;
}

interface Offer {
  id: string;
  offer_price_ils: number;
  message: string | null;
  status: string;
  created_at: string | null;
  listing: {
    title: string;
    price_ils: number;
  } | null;
  buyer: {
    name: string;
  } | null;
}

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, seller } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stats, setStats] = useState({
    totalListings: 0,
    pendingSubmissions: 0,
    totalViews: 0,
    pendingOffers: 0,
  });

  // Check auth
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!seller) {
      navigate("/sell/new");
    }
  }, [user, seller, navigate]);

  // Fetch data
  useEffect(() => {
    if (!seller) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch submissions
      const { data: submissionsData } = await supabase
        .from("submissions")
        .select("id, title, price_ils, images, status, created_at, admin_notes")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false });

      if (submissionsData) {
        setSubmissions(submissionsData as Submission[]);
      }

      // Fetch listings
      const { data: listingsData } = await supabase
        .from("listings")
        .select("id, title, price_ils, images, status, view_count, save_count, published_at")
        .eq("seller_id", seller.id)
        .order("published_at", { ascending: false });

      if (listingsData) {
        setListings(listingsData as Listing[]);
      }

      // Fetch offers on my listings
      const { data: offersData } = await supabase
        .from("offers")
        .select(`
          id, offer_price_ils, message, status, created_at,
          listing:listings!inner(title, price_ils),
          buyer:profiles_public!offers_buyer_id_fkey(name)
        `)
        .in("listing_id", listingsData?.map(l => l.id) || [])
        .order("created_at", { ascending: false });

      if (offersData) {
        setOffers(offersData as unknown as Offer[]);
      }

      // Calculate stats
      setStats({
        totalListings: listingsData?.filter(l => l.status === "available").length || 0,
        pendingSubmissions: submissionsData?.filter(s => s.status === "pending").length || 0,
        totalViews: listingsData?.reduce((sum, l) => sum + (l.view_count || 0), 0) || 0,
        pendingOffers: offersData?.filter(o => o.status === "pending").length || 0,
      });

      setLoading(false);
    };

    fetchData();
  }, [seller]);

  const handleOfferAction = async (offerId: string, action: "accepted" | "rejected") => {
    const { error } = await supabase
      .from("offers")
      .update({ status: action })
      .eq("id", offerId);

    if (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } else {
      toast({ title: action === "accepted" ? "تم قبول العرض" : "تم رفض العرض" });
      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status: action } : o))
      );
    }
  };

  const getSubmissionStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-warning text-warning">قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="bg-success text-success-foreground">تم النشر</Badge>;
      case "rejected":
        return <Badge variant="destructive">مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getListingStatusBadge = (status: ListingStatus) => {
    switch (status) {
      case "available":
        return <Badge className="bg-success text-success-foreground">متاح</Badge>;
      case "reserved":
        return <Badge className="border-warning text-warning" variant="outline">محجوز</Badge>;
      case "sold":
        return <Badge variant="secondary">مباع</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!seller) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">لوحة البائع</h1>
          <Button onClick={() => navigate("/sell/new")} className="btn-brand">
            <Plus className="h-4 w-4 ml-2" />
            أضف منتج
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                منتجاتي النشطة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalListings}</p>
            </CardContent>
          </Card>
          <Card className={stats.pendingSubmissions > 0 ? "border-warning" : ""}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                قيد المراجعة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.pendingSubmissions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                المشاهدات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalViews}</p>
            </CardContent>
          </Card>
          <Card className={stats.pendingOffers > 0 ? "border-primary" : ""}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                عروض جديدة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.pendingOffers}</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="listings" className="space-y-4">
            <TabsList>
              <TabsTrigger value="listings">منتجاتي ({listings.length})</TabsTrigger>
              <TabsTrigger value="submissions">
                طلباتي
                {stats.pendingSubmissions > 0 && (
                  <Badge className="mr-2 h-5 w-5 p-0 flex items-center justify-center bg-warning text-warning-foreground">
                    {stats.pendingSubmissions}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="offers">
                العروض
                {stats.pendingOffers > 0 && (
                  <Badge className="mr-2 h-5 w-5 p-0 flex items-center justify-center">
                    {stats.pendingOffers}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Listings Tab */}
            <TabsContent value="listings">
              {listings.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">لا توجد منتجات</h3>
                  <p className="text-muted-foreground mb-4">أضف أول منتج لك الآن</p>
                  <Button onClick={() => navigate("/sell/new")} className="btn-brand">
                    <Plus className="h-4 w-4 ml-2" />
                    أضف منتج
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.map((listing) => (
                    <Link
                      key={listing.id}
                      to={`/listing/${listing.id}`}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:border-primary transition-colors"
                    >
                      {listing.images?.[0] && (
                        <img
                          src={listing.images[0]}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium line-clamp-1">{listing.title}</h3>
                        <p className="text-primary font-semibold">
                          {formatPrice(listing.price_ils)}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {listing.view_count || 0}
                          </span>
                          <span>
                            {listing.published_at ? getRelativeTime(listing.published_at) : ""}
                          </span>
                        </div>
                      </div>
                      {getListingStatusBadge(listing.status)}
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Submissions Tab */}
            <TabsContent value="submissions">
              {submissions.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">لا توجد طلبات</h3>
                  <p className="text-muted-foreground mb-4">أضف منتجاً ليظهر هنا</p>
                  <Button onClick={() => navigate("/sell/new")} className="btn-brand">
                    <Plus className="h-4 w-4 ml-2" />
                    أضف منتج
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                    >
                      {submission.images?.[0] && (
                        <img
                          src={submission.images[0]}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium line-clamp-1">{submission.title}</h3>
                        <p className="text-primary font-semibold">
                          {formatPrice(submission.price_ils)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {submission.created_at ? getRelativeTime(submission.created_at) : ""}
                        </p>
                        {submission.admin_notes && submission.status === "rejected" && (
                          <p className="text-xs text-destructive mt-1">
                            السبب: {submission.admin_notes}
                          </p>
                        )}
                      </div>
                      {getSubmissionStatusBadge(submission.status)}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Offers Tab */}
            <TabsContent value="offers">
              {offers.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">لا توجد عروض</h3>
                  <p className="text-muted-foreground">ستظهر العروض هنا عندما يقدمها المشترون</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium line-clamp-1">
                            {offer.listing?.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            من: {offer.buyer?.name}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <div>
                              <p className="text-xs text-muted-foreground">السعر الأصلي</p>
                              <p className="font-medium">
                                {formatPrice(offer.listing?.price_ils || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">العرض</p>
                              <p className="font-semibold text-primary">
                                {formatPrice(offer.offer_price_ils)}
                              </p>
                            </div>
                          </div>
                          {offer.message && (
                            <p className="text-sm mt-2 p-2 bg-muted rounded">
                              {offer.message}
                            </p>
                          )}
                        </div>

                        {offer.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOfferAction(offer.id, "rejected")}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="btn-brand"
                              onClick={() => handleOfferAction(offer.id, "accepted")}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            variant={offer.status === "accepted" ? "default" : "secondary"}
                            className={offer.status === "accepted" ? "bg-success" : ""}
                          >
                            {offer.status === "accepted" ? "مقبول" : "مرفوض"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {offer.created_at ? getRelativeTime(offer.created_at) : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default SellerDashboard;
