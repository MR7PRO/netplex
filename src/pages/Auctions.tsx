import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gavel, Clock } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { SignedImage } from "@/components/SignedImage";

interface Row {
  id: string;
  listing_id: string;
  current_bid_ils: number | null;
  starting_price_ils: number;
  bid_count: number;
  ends_at: string;
  listings: { title: string; images: string[]; region: string } | null;
}

function timeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "منتهي";
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d} يوم`;
  return `${h} ساعة`;
}

const Auctions: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("auctions")
        .select("id, listing_id, current_bid_ils, starting_price_ils, bid_count, ends_at, listings(title, images, region)")
        .eq("status", "active")
        .gt("ends_at", new Date().toISOString())
        .order("ends_at", { ascending: true })
        .limit(60);
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <Layout>
      <SEO title="المزادات — NetPlex" description="زايد على منتجات مميزة في غزة" />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Gavel className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">المزادات النشطة</h1>
        </div>
        {loading && <p className="text-center text-muted-foreground py-12">جاري التحميل...</p>}
        {!loading && rows.length === 0 && (
          <p className="text-center text-muted-foreground py-12">لا توجد مزادات نشطة حالياً</p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {rows.map((r) => (
            <Link to={`/listing/${r.listing_id}`} key={r.id}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-muted relative">
                  {r.listings?.images?.[0] && (
                    <SignedImage src={r.listings.images[0]} alt={r.listings.title} className="w-full h-full object-cover" />
                  )}
                  <Badge className="absolute top-2 right-2 bg-primary">
                    <Clock className="h-3 w-3 ml-1" /> {timeLeft(r.ends_at)}
                  </Badge>
                </div>
                <CardContent className="p-3 space-y-1">
                  <p className="font-medium text-sm line-clamp-1">{r.listings?.title}</p>
                  <p className="text-lg font-bold text-primary">
                    ₪{(r.current_bid_ils ?? r.starting_price_ils).toLocaleString("he-IL")}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.bid_count} مزايدة · {r.listings?.region}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Auctions;
