import { useState, useEffect } from "react";
import { ScrollText, Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { getRelativeTime } from "@/lib/constants";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin?: {
    name: string;
  } | null;
}

const ACTION_LABELS: Record<string, string> = {
  submission_approved: "موافقة على طلب",
  submission_rejected: "رفض طلب",
  submission_edited: "تعديل طلب",
  listing_published: "نشر إعلان",
  listing_status_changed: "تغيير حالة إعلان",
  listing_featured_toggled: "تمييز/إلغاء تمييز إعلان",
  listing_deleted: "حذف إعلان",
  seller_verified: "توثيق بائع",
  seller_unverified: "إلغاء توثيق بائع",
  seller_trust_adjusted: "تعديل نقاط الثقة",
  seller_banned: "حظر بائع",
  seller_warned: "تحذير بائع",
  report_reviewed: "مراجعة بلاغ",
  report_closed: "إغلاق بلاغ",
};

const ENTITY_LABELS: Record<string, string> = {
  submission: "طلب",
  listing: "إعلان",
  seller: "بائع",
  report: "بلاغ",
};

export default function AdminAudit() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    
    // Use type assertion for the new table
    const { data, error } = await supabase
      .from("admin_audit" as never)
      .select(`
        id, admin_id, action, entity_type, entity_id, details, created_at,
        admin:profiles_public(name)
      ` as never)
      .order("created_at", { ascending: false })
      .limit(100) as { data: AuditLog[] | null; error: unknown };

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const getActionBadge = (action: string) => {
    if (action.includes("approved") || action.includes("verified") || action.includes("published")) {
      return <Badge className="bg-success text-success-foreground">{ACTION_LABELS[action] || action}</Badge>;
    }
    if (action.includes("rejected") || action.includes("deleted") || action.includes("banned")) {
      return <Badge variant="destructive">{ACTION_LABELS[action] || action}</Badge>;
    }
    if (action.includes("warned") || action.includes("unverified")) {
      return <Badge variant="outline" className="border-warning text-warning">{ACTION_LABELS[action] || action}</Badge>;
    }
    return <Badge variant="outline">{ACTION_LABELS[action] || action}</Badge>;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesEntity = entityFilter === "all" || log.entity_type === entityFilter;
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesEntity && matchesAction;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type))];

  return (
    <AdminLayout title="سجل العمليات">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="الكيان" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {uniqueEntities.map((e) => (
              <SelectItem key={e} value={e}>{ENTITY_LABELS[e] || e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الإجراء" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {uniqueActions.map((a) => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الوقت</TableHead>
                <TableHead>المشرف</TableHead>
                <TableHead>الإجراء</TableHead>
                <TableHead>الكيان</TableHead>
                <TableHead>التفاصيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {getRelativeTime(log.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.admin?.name || "مشرف"}
                  </TableCell>
                  <TableCell>
                    {getActionBadge(log.action)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {ENTITY_LABELS[log.entity_type] || log.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {log.details && (
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {log.details.title as string || 
                         log.details.shop_name as string || 
                         log.details.reason as string ||
                         JSON.stringify(log.details)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    لا توجد سجلات
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminLayout>
  );
}
