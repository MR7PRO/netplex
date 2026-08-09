import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";

interface Deal {
  id: string;
  status: string;
  agreed_price_ils: number;
  created_at: string;
  listing_id: string;
  listings: { title: string } | null;
}

const Deals: React.FC = () => {
  const { user, seller } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const orFilter = seller
        ? `buyer_id.eq.${user.id},seller_id.eq.${seller.id}`
        : `buyer_id.eq.${user.id}`;
      const { data } = await supabase
        .from("deals")
        .select("id, status, agreed_price_ils, created_at, listing_id, listings(title)")
        .or(orFilter)
        .order("created_at", { ascending: false });
      setDeals((data as any) || []);
      setLoading(false);
    })();
  }, [user, seller]);

  return (
    <Layout>
      <SEO title="صفقاتي — NetPlex" description="متابعة ضمان الاستلام" />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">صفقاتي</h1>
        </div>
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-4 flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-2 text-left">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && deals.length === 0 && (
          <EmptyState
            icon={ShieldCheck}
            title="لا توجد صفقات بعد"
            description="ابدأ بتصفّح المنتجات، وعند الاتفاق مع البائع افتح ضمان الاستلام لمتابعة الصفقة خطوة بخطوة."
            actionLabel="تصفّح المنتجات"
            actionTo="/search"
          />
        )}
        <div className="space-y-3">
          {deals.map((d) => (
            <Link to={`/listing/${d.listing_id}`} key={d.id}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{d.listings?.title || "منتج"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString("ar")}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-primary">₪{d.agreed_price_ils.toLocaleString("he-IL")}</p>
                    <Badge variant={d.status === "completed" ? "default" : "secondary"}>{d.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Deals;
