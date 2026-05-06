import React, { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ChevronLeft } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { format } from "date-fns";

interface DisputeRow {
  id: string;
  title: string;
  status: "pending" | "under_review" | "resolved" | "rejected";
  amount_ils: number | null;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
}

const statusLabel: Record<string, string> = {
  pending: "قيد الانتظار",
  under_review: "قيد المراجعة",
  resolved: "تم الحل",
  rejected: "مرفوضة",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  under_review: "outline",
  resolved: "default",
  rejected: "destructive",
};

const Disputes: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });
      setRows((data || []) as DisputeRow[]);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-primary" />
          شكاواي
        </h1>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            لا توجد شكاوى. يمكنك فتح شكوى من صفحة المنتج عند الحاجة.
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Link key={r.id} to={`/disputes/${r.id}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}
                        {r.amount_ils ? ` • ₪${r.amount_ils}` : ""}
                      </p>
                    </div>
                    <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Disputes;
