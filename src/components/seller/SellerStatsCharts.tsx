import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface SellerStatsChartsProps {
  listings: Array<{
    title: string;
    view_count: number | null;
    save_count: number | null;
    whatsapp_click_count?: number | null;
  }>;
}

export const SellerStatsCharts: React.FC<SellerStatsChartsProps> = ({ listings }) => {
  if (listings.length === 0) return null;

  const chartData = listings
    .slice(0, 10)
    .map((l) => ({
      name: l.title.length > 15 ? l.title.slice(0, 15) + "…" : l.title,
      مشاهدات: l.view_count || 0,
      حفظ: l.save_count || 0,
      واتساب: (l as any).whatsapp_click_count || 0,
    }));

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">إحصائيات المنتجات</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ right: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis type="number" />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="مشاهدات" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              <Bar dataKey="حفظ" fill="hsl(var(--primary) / 0.5)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
