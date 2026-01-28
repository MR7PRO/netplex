import { useState, useEffect } from "react";
import { AlertTriangle, Eye, CheckCircle, XCircle, Search, Loader2, EyeOff, UserX, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SignedImage } from "@/components/SignedImage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAdminAudit } from "@/hooks/useAdminAudit";
import { getRelativeTime } from "@/lib/constants";
import { Link } from "react-router-dom";

interface Report {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string | null;
  listing: {
    id: string;
    title: string;
    images: string[];
    seller_id: string;
    status: string;
  } | null;
  reporter: {
    name: string;
  } | null;
}

const REPORT_REASONS: Record<string, string> = {
  spam: "إعلان مكرر / سبام",
  fake: "منتج وهمي",
  wrong_price: "سعر غير صحيح",
  wrong_details: "تفاصيل خاطئة",
  prohibited: "منتج محظور",
  other: "أخرى",
};

export default function AdminReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logAction } = useAdminAudit();

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [resolution, setResolution] = useState("");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select(`
        id, reason, details, status, created_at,
        listing:listings(id, title, images, seller_id, status),
        reporter:profiles_public(name)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReports(data as unknown as Report[]);
    }
    setLoading(false);
  };

  const openReportDialog = (report: Report) => {
    setSelectedReport(report);
    setResolution("");
    setDialogOpen(true);
  };

  const handleCloseReport = async (action: "dismiss" | "hide_listing" | "warn_seller" | "ban_seller") => {
    if (!selectedReport || !user) return;
    setProcessing(true);

    try {
      // Update report status
      await supabase
        .from("reports")
        .update({
          status: "resolved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", selectedReport.id);

      // Take action based on selection
      if (action === "hide_listing" && selectedReport.listing) {
        await supabase
          .from("listings")
          .update({ status: "expired" })
          .eq("id", selectedReport.listing.id);

        await logAction({
          action: "listing_status_changed",
          entityType: "listing",
          entityId: selectedReport.listing.id,
          details: { reason: "report_action", newStatus: "expired" },
        });
      }

      if ((action === "warn_seller" || action === "ban_seller") && selectedReport.listing) {
        // Log the action for seller warning/ban
        await logAction({
          action: action === "ban_seller" ? "seller_banned" : "seller_warned",
          entityType: "seller",
          entityId: selectedReport.listing.seller_id,
          details: { report_id: selectedReport.id },
        });
        await logAction({
          action: action === "ban_seller" ? "seller_banned" : "seller_warned",
          entityType: "seller",
          entityId: selectedReport.listing.seller_id,
          details: { report_id: selectedReport.id },
        });
      }

      await logAction({
        action: "report_closed",
        entityType: "report",
        entityId: selectedReport.id,
        details: { action, resolution },
      });

      toast({ title: "تم إغلاق البلاغ" });
      setDialogOpen(false);
      fetchReports();
    } catch (err) {
      console.error(err);
      toast({ title: "حدث خطأ", variant: "destructive" });
    }

    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-warning text-warning">قيد المراجعة</Badge>;
      case "reviewed":
        return <Badge variant="outline">تمت المراجعة</Badge>;
      case "resolved":
        return <Badge className="bg-success text-success-foreground">مغلق</Badge>;
      case "dismissed":
        return <Badge variant="secondary">مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredReports = reports.filter((r) =>
    r.listing?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = reports.filter(r => r.status === "pending").length;

  return (
    <AdminLayout title="البلاغات">
      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            قيد المراجعة
            {pendingCount > 0 && (
              <Badge className="mr-2 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">مغلقة</TabsTrigger>
          <TabsTrigger value="all">الكل</TabsTrigger>
        </TabsList>

        {["pending", "resolved", "all"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الإعلان</TableHead>
                      <TableHead>السبب</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports
                      .filter((r) => tab === "all" || r.status === tab)
                      .map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {report.listing?.images?.[0] && (
                                <SignedImage
                                  src={report.listing.images[0]}
                                  alt=""
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <div>
                                <p className="font-medium line-clamp-1">
                                  {report.listing?.title || "إعلان محذوف"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {REPORT_REASONS[report.reason] || report.reason}
                            </Badge>
                          </TableCell>
                          <TableCell>{report.reporter?.name || "-"}</TableCell>
                          <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {report.created_at ? getRelativeTime(report.created_at) : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openReportDialog(report)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredReports.filter((r) => tab === "all" || r.status === tab).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          لا توجد بلاغات
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Report Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  بلاغ
                </DialogTitle>
                <DialogDescription>
                  {REPORT_REASONS[selectedReport.reason] || selectedReport.reason}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Listing Preview */}
                {selectedReport.listing && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    {selectedReport.listing.images?.[0] && (
                      <SignedImage
                        src={selectedReport.listing.images[0]}
                        alt=""
                        className="w-16 h-16 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{selectedReport.listing.title}</p>
                      <Button variant="link" size="sm" className="p-0 h-auto" asChild>
                        <Link to={`/listing/${selectedReport.listing.id}`} target="_blank">
                          عرض الإعلان
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Details */}
                {selectedReport.details && (
                  <div>
                    <p className="text-sm font-medium mb-1">تفاصيل البلاغ</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {selectedReport.details}
                    </p>
                  </div>
                )}

                {selectedReport.status === "pending" && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">ملاحظات الإغلاق</label>
                    <Textarea
                      placeholder="أضف ملاحظات..."
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {selectedReport.status === "pending" && (
                <DialogFooter className="flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleCloseReport("dismiss")}
                    disabled={processing}
                  >
                    {processing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                    <XCircle className="h-4 w-4 ml-2" />
                    رفض البلاغ
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="destructive" disabled={processing}>
                        {processing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                        اتخاذ إجراء
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCloseReport("hide_listing")}>
                        <EyeOff className="h-4 w-4 ml-2" />
                        إخفاء الإعلان
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCloseReport("warn_seller")}>
                        <AlertTriangle className="h-4 w-4 ml-2" />
                        تحذير البائع
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleCloseReport("ban_seller")}
                        className="text-destructive"
                      >
                        <Ban className="h-4 w-4 ml-2" />
                        حظر البائع
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </DialogFooter>
              )}

              {selectedReport.status !== "pending" && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    إغلاق
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
