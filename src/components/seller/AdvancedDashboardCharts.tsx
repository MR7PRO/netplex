import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, MessageCircle, Eye, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMedianPrices } from "@/hooks/useMedianPrices";
import { getMedianPriceKey } from "@/lib/ranking";
import { formatPrice } from "@/lib/constants";
import { Link } from "react-router-dom";

interface Listing {
  id: string;
  title: string;
  price_ils: number;
  view_count: number | null;
  save_count: number | null;
  whatsapp_click_count?: number | null;
  brand?: string | null;
  model?: string | null;
  status: string;
  published_at: string | null;
}

interface Props {
  sellerId: string;
  listings: Listing[];
}

export const AdvancedDashboardCharts: React.FC<Props> = ({ sellerId, listings }) => {
  // Fetch listing_events for last 30 days for monthly time-series
  const { data: events } = useQuery({
    queryKey: ["seller-events-monthly", sellerId],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const ids = listings.map((l) => l.id);
      if (!ids.length) return [];
      const { data } = await supabase
        .from("listing_events")
        .select("event_type, created_at, listing_id")
        .in("listing_id", ids)
        .gte("created_at", since.toISOString());
      return data || [];
    },
    enabled: listings.length > 0,
  });

  const { data: medianPrices } = useMedianPrices();

  // Build daily series
  const dailySeries = useMemo(() => {
    const map: Record<string, { day: string; views: number; saves: number; clicks: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map[key] = { day: key.slice(5), views: 0, saves: 0, clicks: 0 };
    }
    for (const e of events || []) {
      const key = (e.created_at || "").slice(0, 10);
      if (!map[key]) continue;
      if (e.event_type === "view") map[key].views++;
      else if (e.event_type === "save") map[key].saves++;
      else if (e.event_type === "whatsapp_click") map[key].clicks++;
    }
    return Object.values(map);
  }, [events]);

  // Conversion rates per listing (clicks / views)
  const conversionData = useMemo(() => {
    return listings
      .filter((l) => (l.view_count || 0) > 0)
      .map((l) => ({
        name: l.title.slice(0, 20),
        rate: Math.round(((l.whatsapp_click_count || 0) / (l.view_count || 1)) * 100),
        views: l.view_count || 0,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 8);
  }, [listings]);

  // Quality alerts: low-performance + over-priced
  const alerts = useMemo(() => {
    const items: Array<{ id: string; title: string; type: "low_perf" | "overpriced" | "stale"; detail: string }> = [];
    const now = Date.now();
    for (const l of listings) {
      if (l.status !== "available") continue;
      const ageDays = l.published_at ? (now - new Date(l.published_at).getTime()) / 86400000 : 0;

      // Low performance: published > 7 days, < 5 views
      if (ageDays > 7 && (l.view_count || 0) < 5) {
        items.push({ id: l.id, title: l.title, type: "low_perf", detail: `${l.view_count || 0} مشاهدة في ${Math.round(ageDays)} يوم` });
      }
      // Stale: > 30 days, no clicks
      if (ageDays > 30 && (l.whatsapp_click_count || 0) === 0) {
        items.push({ id: l.id, title: l.title, type: "stale", detail: "لا تواصل منذ النشر — جرب تحسين العنوان أو الصور" });
      }
      // Over-priced
      const key = getMedianPriceKey(l.brand || null, l.model || null);
      const median = key && medianPrices ? medianPrices[key] : null;
      if (median && l.price_ils > median * 1.3) {
        items.push({ id: l.id, title: l.title, type: "overpriced", detail: `أعلى من سعر السوق بـ ${Math.round(((l.price_ils / median) - 1) * 100)}% (المتوسط ${formatPrice(median)})` });
      }
    }
    return items.slice(0, 10);
  }, [listings, medianPrices]);

  const totals = useMemo(() => {
    const views = listings.reduce((s, l) => s + (l.view_count || 0), 0);
    const saves = listings.reduce((s, l) => s + (l.save_count || 0), 0);
    const clicks = listings.reduce((s, l) => s + (l.whatsapp_click_count || 0), 0);
    return {
      views, saves, clicks,
      saveRate: views ? Math.round((saves / views) * 100) : 0,
      conversionRate: views ? Math.round((clicks / views) * 100) : 0,
    };
  }, [listings]);

  return (
    <div className="space-y-6 mb-8">
      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">معدل الحفظ</span>
              <Heart className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold mt-1">{totals.saveRate}%</p>
            <p className="text-xs text-muted-foreground">{totals.saves} حفظ من {totals.views} مشاهدة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">معدل التحويل</span>
              <MessageCircle className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold mt-1">{totals.conversionRate}%</p>
            <p className="text-xs text-muted-foreground">{totals.clicks} تواصل واتساب</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">إجمالي المشاهدات</span>
              <Eye className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold mt-1">{totals.views}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">تنبيهات الجودة</span>
              <AlertTriangle className={`h-4 w-4 ${alerts.length > 0 ? "text-warning" : "text-muted-foreground"}`} />
            </div>
            <p className="text-2xl font-bold mt-1">{alerts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">آخر 30 يوماً</CardTitle>
          <CardDescription>المشاهدات / الحفظ / نقرات الواتساب</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{
            views: { label: "مشاهدات", color: "hsl(var(--primary))" },
            saves: { label: "حفظ", color: "hsl(var(--warning))" },
            clicks: { label: "واتساب", color: "hsl(var(--success))" },
          }} className="h-[260px] w-full">
            <ResponsiveContainer>
              <LineChart data={dailySeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="views" stroke="var(--color-views)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="saves" stroke="var(--color-saves)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicks" stroke="var(--color-clicks)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Conversion per product */}
      {conversionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">أعلى منتجاتك تحويلاً</CardTitle>
            <CardDescription>نسبة التواصل من إجمالي المشاهدات</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ rate: { label: "معدل التحويل %", color: "hsl(var(--primary))" } }} className="h-[260px] w-full">
              <ResponsiveContainer>
                <BarChart data={conversionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="rate" fill="var(--color-rate)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Quality alerts */}
      {alerts.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              تنبيهات لتحسين الأداء
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a, i) => (
              <Link key={i} to={`/listing/${a.id}`} className="block p-3 rounded-lg border hover:border-warning transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-1 text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{a.detail}</p>
                  </div>
                  <Badge variant="outline" className="border-warning text-warning shrink-0">
                    {a.type === "low_perf" && <><TrendingDown className="h-3 w-3 ml-1" />أداء ضعيف</>}
                    {a.type === "stale" && "راكد"}
                    {a.type === "overpriced" && <><TrendingUp className="h-3 w-3 ml-1" />سعر مرتفع</>}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
