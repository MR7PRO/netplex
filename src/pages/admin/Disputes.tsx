import React, { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface Row {
  id: string;
  title: string;
  status: "pending" | "under_review" | "resolved" | "rejected";
  amount_ils: number | null;
  created_at: string;
  buyer_id: string;
  seller_id: string;
}

const statusLabel: Record<string, string> = {
  pending: "قيد الانتظار",
  under_review: "قيد المراجعة",
  resolved: "تم الحل",
  rejected: "مرفوضة",
};

const AdminDisputes: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("disputes").select("*").order("created_at", { ascending: false });
    if (filter === "open") q = q.in("status", ["pending", "under_review"]);
    const { data } = await q;
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            النزاعات والشكاوى
          </h1>
          <div className="flex gap-2">
            <Button size="sm" variant={filter === "open" ? "default" : "outline"} onClick={() => setFilter("open")}>المفتوحة</Button>
            <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>الكل</Button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد شكاوى</CardContent></Card>
        ) : (
          <div className="space-y-2">
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
                    <Badge variant={r.status === "resolved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                      {statusLabel[r.status]}
                    </Badge>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDisputes;
