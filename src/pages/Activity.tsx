import React, { useEffect, useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ListingCard from "@/components/listings/ListingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { Heart, Clock, HandCoins, AlertTriangle, ChevronLeft } from "lucide-react";
import { format } from "date-fns";

interface SavedRow {
  id: string;
  listing: {
    id: string;
    title: string;
    price_ils: number;
    images: string[] | null;
    region: string;
    condition: string | null;
    view_count: number | null;
    featured: boolean | null;
  };
}

interface OfferRow {
  id: string;
  listing_id: string;
  offer_price_ils: number;
  message: string | null;
  status: string;
  created_at: string;
  listing?: { title: string };
}

interface DisputeRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

const offerStatusLabel: Record<string, string> = {
  pending: "قيد الانتظار",
  accepted: "مقبول",
  rejected: "مرفوض",
  countered: "عرض مقابل",
};

const disputeStatusLabel: Record<string, string> = {
  pending: "قيد الانتظار",
  under_review: "قيد المراجعة",
  resolved: "تم الحل",
  rejected: "مرفوض",
};

const Activity: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items: recent } = useRecentlyViewed();

  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [s, o, d] = await Promise.all([
        supabase
          .from("saved_listings")
          .select("id, listing:listings!saved_listings_listing_id_fkey(id, title, price_ils, images, region, condition, view_count, featured)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("offers")
          .select("id, listing_id, offer_price_ils, message, status, created_at, listing:listings!offers_listing_id_fkey(title)")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("disputes")
          .select("id, title, status, created_at")
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setSaved((s.data as unknown as SavedRow[]) || []);
      setOffers((o.data as unknown as OfferRow[]) || []);
      setDisputes((d.data as unknown as DisputeRow[]) || []);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-5xl" dir="rtl">
        <h1 className="text-2xl font-bold mb-6">نشاطي</h1>

        <Tabs defaultValue="saved" className="w-full">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="saved" className="gap-1.5"><Heart className="h-4 w-4" /> المحفوظة</TabsTrigger>
            <TabsTrigger value="recent" className="gap-1.5"><Clock className="h-4 w-4" /> آخر مشاهدة</TabsTrigger>
            <TabsTrigger value="offers" className="gap-1.5"><HandCoins className="h-4 w-4" /> عروضي</TabsTrigger>
            <TabsTrigger value="disputes" className="gap-1.5"><AlertTriangle className="h-4 w-4" /> شكاواي</TabsTrigger>
          </TabsList>

          <TabsContent value="saved">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
              </div>
            ) : saved.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد منتجات محفوظة</CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {saved.map((s) => (
                  <ListingCard
                    key={s.id}
                    id={s.listing.id}
                    title={s.listing.title}
                    price={s.listing.price_ils}
                    image={s.listing.images?.[0] || undefined}
                    region={s.listing.region}
                    condition={s.listing.condition || undefined}
                    viewCount={s.listing.view_count || 0}
                    featured={s.listing.featured || false}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent">
            {recent.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">لم تشاهد أي منتجات بعد</CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {recent.map((r) => (
                  <ListingCard
                    key={r.id}
                    id={r.id}
                    title={r.title}
                    price={r.price}
                    image={r.image || undefined}
                    region={r.region}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="offers">
            {offers.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">لم تقدم أي عروض بعد</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {offers.map((o) => (
                  <Link key={o.id} to={`/listing/${o.listing_id}`}>
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{o.listing?.title || "منتج"}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(o.created_at), "yyyy-MM-dd HH:mm")} • عرضك ₪{o.offer_price_ils}
                          </p>
                          {o.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">"{o.message}"</p>}
                        </div>
                        <Badge variant={o.status === "accepted" ? "default" : o.status === "rejected" ? "destructive" : "secondary"}>
                          {offerStatusLabel[o.status] || o.status}
                        </Badge>
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="disputes">
            {disputes.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                لا توجد شكاوى
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {disputes.map((d) => (
                  <Link key={d.id} to={`/disputes/${d.id}`}>
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{d.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(d.created_at), "yyyy-MM-dd HH:mm")}</p>
                        </div>
                        <Badge variant={d.status === "resolved" ? "default" : d.status === "rejected" ? "destructive" : "secondary"}>
                          {disputeStatusLabel[d.status] || d.status}
                        </Badge>
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Activity;
