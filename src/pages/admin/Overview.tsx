import { useState, useEffect } from "react";
import { 
  Package, Users, FileText, Clock, TrendingUp, AlertTriangle,
  CheckCircle, XCircle, BarChart3
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { formatPrice, getRelativeTime } from "@/lib/constants";

interface Stats {
  totalListings: number;
  activeListings: number;
  totalSellers: number;
  verifiedSellers: number;
  pendingSubmissions: number;
  pendingReports: number;
  totalOffers: number;
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    created_at: string;
  }>;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    totalListings: 0,
    activeListings: 0,
    totalSellers: 0,
    verifiedSellers: 0,
    pendingSubmissions: 0,
    pendingReports: 0,
    totalOffers: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        allListings, 
        activeListings, 
        allSellers, 
        verifiedSellers, 
        pending, 
        reports,
        offers,
        recentSubmissions
      ] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "available"),
        supabase.from("sellers").select("id", { count: "exact", head: true }),
        supabase.from("sellers").select("id", { count: "exact", head: true }).eq("verified", true),
        supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("offers").select("id", { count: "exact", head: true }),
        supabase.from("submissions")
          .select("id, title, created_at, status")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setStats({
        totalListings: allListings.count || 0,
        activeListings: activeListings.count || 0,
        totalSellers: allSellers.count || 0,
        verifiedSellers: verifiedSellers.count || 0,
        pendingSubmissions: pending.count || 0,
        pendingReports: reports.count || 0,
        totalOffers: offers.count || 0,
        recentActivity: (recentSubmissions.data || []).map(s => ({
          id: s.id,
          type: "submission",
          title: s.title,
          created_at: s.created_at || "",
        })),
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <AdminLayout title="نظرة عامة">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              الإعلانات النشطة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.activeListings}</p>
            <p className="text-xs text-muted-foreground">من {stats.totalListings} إعلان</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              البائعون
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalSellers}</p>
            <p className="text-xs text-muted-foreground">{stats.verifiedSellers} موثق</p>
          </CardContent>
        </Card>

        <Card className={stats.pendingSubmissions > 0 ? "border-warning" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              طلبات قيد المراجعة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.pendingSubmissions}</p>
            {stats.pendingSubmissions > 0 && (
              <Button variant="link" className="p-0 h-auto text-xs" asChild>
                <Link to="/admin/submissions">مراجعة الآن</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className={stats.pendingReports > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              البلاغات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.pendingReports}</p>
            {stats.pendingReports > 0 && (
              <Button variant="link" className="p-0 h-auto text-xs text-destructive" asChild>
                <Link to="/admin/reports">مراجعة البلاغات</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إجراءات سريعة</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" asChild>
              <Link to="/admin/submissions">
                <FileText className="h-4 w-4 ml-2" />
                مراجعة الطلبات
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/listings">
                <Package className="h-4 w-4 ml-2" />
                إدارة الإعلانات
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/sellers">
                <Users className="h-4 w-4 ml-2" />
                إدارة البائعين
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/reports">
                <AlertTriangle className="h-4 w-4 ml-2" />
                البلاغات
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">آخر الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm">لا توجد طلبات حديثة</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between text-sm">
                    <span className="line-clamp-1">{activity.title}</span>
                    <span className="text-muted-foreground text-xs shrink-0 mr-2">
                      {getRelativeTime(activity.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
