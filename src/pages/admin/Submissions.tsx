import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, Pencil, Loader2, Search } from "lucide-react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SignedImage } from "@/components/SignedImage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAdminAudit } from "@/hooks/useAdminAudit";
import { formatPrice, getRegionLabel, getConditionLabel, getRelativeTime, REGIONS, CONDITION_OPTIONS } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";

type SubmissionStatus = Database["public"]["Enums"]["submission_status"];
type ItemCondition = Database["public"]["Enums"]["item_condition"];

interface Submission {
  id: string;
  title: string;
  description: string | null;
  price_ils: number;
  condition: ItemCondition | null;
  region: string;
  images: string[];
  status: SubmissionStatus;
  brand: string | null;
  model: string | null;
  admin_notes: string | null;
  created_at: string | null;
  category_id: string | null;
  seller_id: string;
  seller: {
    id: string;
    shop_name: string | null;
    verified: boolean | null;
    user_id: string;
  } | null;
  category: {
    name_ar: string;
  } | null;
}

export default function AdminSubmissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logAction } = useAdminAudit();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [dialogMode, setDialogMode] = useState<"review" | "edit">("review");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCondition, setEditCondition] = useState<ItemCondition>("good");
  const [editRegion, setEditRegion] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("submissions")
      .select(`
        id, title, description, price_ils, condition, region, images, status, 
        brand, model, admin_notes, created_at, category_id, seller_id,
        seller:sellers(id, shop_name, verified, user_id),
        category:categories(name_ar)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSubmissions(data as unknown as Submission[]);
    }
    setLoading(false);
  };

  const openReviewDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setAdminNotes(submission.admin_notes || "");
    setDialogMode("review");
    setDialogOpen(true);
  };

  const openEditDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setEditTitle(submission.title);
    setEditDescription(submission.description || "");
    setEditPrice(submission.price_ils.toString());
    setEditCondition(submission.condition || "good");
    setEditRegion(submission.region);
    setAdminNotes(submission.admin_notes || "");
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleApproveAndPublish = async () => {
    if (!selectedSubmission || !user) return;
    setProcessing(true);

    try {
      // Create listing from submission
      const { error: listingError } = await supabase.from("listings").insert({
        seller_id: selectedSubmission.seller_id,
        submission_id: selectedSubmission.id,
        title: dialogMode === "edit" ? editTitle : selectedSubmission.title,
        description: dialogMode === "edit" ? editDescription : selectedSubmission.description,
        price_ils: dialogMode === "edit" ? parseFloat(editPrice) : selectedSubmission.price_ils,
        condition: dialogMode === "edit" ? editCondition : selectedSubmission.condition,
        region: dialogMode === "edit" ? editRegion : selectedSubmission.region,
        images: selectedSubmission.images,
        category_id: selectedSubmission.category_id,
        brand: selectedSubmission.brand,
        model: selectedSubmission.model,
        published_at: new Date().toISOString(),
      });

      if (listingError) throw listingError;

      // Update submission status
      await supabase
        .from("submissions")
        .update({
          status: "approved",
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", selectedSubmission.id);

      // Log audit
      await logAction({
        action: "submission_approved",
        entityType: "submission",
        entityId: selectedSubmission.id,
        details: { title: selectedSubmission.title },
      });

      toast({ title: "تمت الموافقة ونشر الإعلان" });
      setDialogOpen(false);
      fetchSubmissions();
    } catch (err) {
      console.error(err);
      toast({ title: "حدث خطأ", variant: "destructive" });
    }

    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedSubmission || !user) return;
    setProcessing(true);

    try {
      await supabase
        .from("submissions")
        .update({
          status: "rejected",
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", selectedSubmission.id);

      await logAction({
        action: "submission_rejected",
        entityType: "submission",
        entityId: selectedSubmission.id,
        details: { title: selectedSubmission.title, reason: adminNotes },
      });

      toast({ title: "تم رفض الطلب" });
      setDialogOpen(false);
      fetchSubmissions();
    } catch (err) {
      console.error(err);
      toast({ title: "حدث خطأ", variant: "destructive" });
    }

    setProcessing(false);
  };

  const handleSaveEdits = async () => {
    if (!selectedSubmission || !user) return;
    setProcessing(true);

    try {
      await supabase
        .from("submissions")
        .update({
          title: editTitle,
          description: editDescription || null,
          price_ils: parseFloat(editPrice),
          condition: editCondition,
          region: editRegion,
          admin_notes: adminNotes || null,
        })
        .eq("id", selectedSubmission.id);

      await logAction({
        action: "submission_edited",
        entityType: "submission",
        entityId: selectedSubmission.id,
        details: { title: editTitle },
      });

      toast({ title: "تم حفظ التعديلات" });
      setDialogOpen(false);
      fetchSubmissions();
    } catch (err) {
      console.error(err);
      toast({ title: "حدث خطأ", variant: "destructive" });
    }

    setProcessing(false);
  };

  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-warning text-warning">قيد المراجعة</Badge>;
      case "approved":
        return <Badge className="bg-success text-success-foreground">مقبول</Badge>;
      case "rejected":
        return <Badge variant="destructive">مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredSubmissions = submissions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.seller?.shop_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = submissions.filter(s => s.status === "pending").length;

  return (
    <AdminLayout title="إدارة الطلبات">
      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالعنوان أو اسم البائع..."
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
              <Badge className="mr-2 h-5 min-w-5 px-1 bg-warning text-warning-foreground">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">المقبولة</TabsTrigger>
          <TabsTrigger value="rejected">المرفوضة</TabsTrigger>
          <TabsTrigger value="all">الكل</TabsTrigger>
        </TabsList>

        {["pending", "approved", "rejected", "all"].map((tab) => (
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
                      <TableHead>المنتج</TableHead>
                      <TableHead>البائع</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>المنطقة</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions
                      .filter((s) => tab === "all" || s.status === tab)
                      .map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {submission.images?.[0] && (
                                <SignedImage
                                  src={submission.images[0]}
                                  alt=""
                                  className="w-10 h-10 rounded object-cover"
                                />
                              )}
                              <div>
                                <p className="font-medium line-clamp-1">{submission.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {submission.category?.name_ar}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{submission.seller?.shop_name || "-"}</p>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatPrice(submission.price_ils)}
                          </TableCell>
                          <TableCell>{getRegionLabel(submission.region)}</TableCell>
                          <TableCell>{getStatusBadge(submission.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {submission.created_at ? getRelativeTime(submission.created_at) : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openReviewDialog(submission)}
                                title="مراجعة"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {submission.status === "pending" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(submission)}
                                  title="تعديل"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredSubmissions.filter((s) => tab === "all" || s.status === tab).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          لا توجد طلبات
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

      {/* Review/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === "edit" ? "تعديل الطلب" : "مراجعة الطلب"}
                </DialogTitle>
                <DialogDescription>
                  {selectedSubmission.title}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Images */}
                {selectedSubmission.images?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedSubmission.images.map((img, i) => (
                      <SignedImage
                        key={i}
                        src={img}
                        alt=""
                        className="w-20 h-20 rounded-lg object-cover shrink-0"
                      />
                    ))}
                  </div>
                )}

                {dialogMode === "edit" ? (
                  // Edit Form
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">العنوان</label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">الوصف</label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">السعر (₪)</label>
                        <Input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">الحالة</label>
                        <Select value={editCondition} onValueChange={(v) => setEditCondition(v as ItemCondition)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITION_OPTIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label_ar}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">المنطقة</label>
                      <Select value={editRegion} onValueChange={setEditRegion}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label_ar}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  // Review View
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">السعر</p>
                      <p className="font-semibold">{formatPrice(selectedSubmission.price_ils)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">الحالة</p>
                      <p className="font-semibold">
                        {selectedSubmission.condition ? getConditionLabel(selectedSubmission.condition) : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">المنطقة</p>
                      <p className="font-semibold">{getRegionLabel(selectedSubmission.region)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">البائع</p>
                      <p className="font-semibold">{selectedSubmission.seller?.shop_name}</p>
                    </div>
                    {selectedSubmission.description && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground mb-1">الوصف</p>
                        <p className="text-sm whitespace-pre-line">{selectedSubmission.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Notes */}
                <div>
                  <label className="text-sm font-medium mb-1 block">ملاحظات المراجعة</label>
                  <Textarea
                    placeholder="أضف ملاحظات..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                {selectedSubmission.status === "pending" && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={processing}
                    >
                      {processing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                      <XCircle className="h-4 w-4 ml-2" />
                      رفض
                    </Button>
                    {dialogMode === "edit" && (
                      <Button
                        variant="outline"
                        onClick={handleSaveEdits}
                        disabled={processing}
                      >
                        {processing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                        حفظ التعديلات
                      </Button>
                    )}
                    <Button
                      onClick={handleApproveAndPublish}
                      disabled={processing}
                      className="bg-success hover:bg-success/90"
                    >
                      {processing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                      <CheckCircle className="h-4 w-4 ml-2" />
                      موافقة ونشر
                    </Button>
                  </>
                )}
                {selectedSubmission.status !== "pending" && (
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    إغلاق
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
