import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Package, Users, FileText, BarChart3, 
  CheckCircle, XCircle, Eye, Clock, TrendingUp, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getRegionLabel, getConditionLabel, getRelativeTime } from "@/lib/constants";
import { SignedImage } from "@/components/SignedImage";
import type { Database } from "@/integrations/supabase/types";

type SubmissionStatus = Database["public"]["Enums"]["submission_status"];

interface Submission {
  id: string;
  title: string;
  description: string | null;
  price_ils: number;
  condition: string | null;
  region: string;
  images: string[];
  status: SubmissionStatus;
  created_at: string | null;
  category_id: string | null;
  seller: {
    id: string;
    shop_name: string | null;
    verified: boolean | null;
    user: {
      name: string;
    } | null;
  } | null;
  category: {
    name_ar: string;
  } | null;
}

interface Stats {
  totalListings: number;
  totalSellers: number;
  pendingSubmissions: number;
  totalOffers: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalListings: 0,
    totalSellers: 0,
    pendingSubmissions: 0,
    totalOffers: 0,
  });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isAdmin) {
      navigate("/");
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية الوصول",
        variant: "destructive",
      });
    }
  }, [user, isAdmin, navigate, toast]);

  // Fetch stats
  useEffect(() => {
    if (!isAdmin) return;

    const fetchStats = async () => {
      const [listings, sellers, pending, offers] = await Promise.all([
        supabase.from("listings").select("id", { count: "exact", head: true }),
        supabase.from("sellers").select("id", { count: "exact", head: true }),
        supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("offers").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalListings: listings.count || 0,
        totalSellers: sellers.count || 0,
        pendingSubmissions: pending.count || 0,
        totalOffers: offers.count || 0,
      });
    };

    fetchStats();
  }, [isAdmin]);

  // Fetch submissions
  useEffect(() => {
    if (!isAdmin) return;

    const fetchSubmissions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          id, title, description, price_ils, condition, region, images, status, created_at, category_id,
          seller:sellers(id, shop_name, verified, user:profiles_public(name)),
          category:categories(name_ar)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching submissions:", error);
      } else {
        setSubmissions((data || []) as unknown as Submission[]);
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, [isAdmin]);

  const handleReview = (submission: Submission) => {
    setSelectedSubmission(submission);
    setAdminNotes("");
    setReviewDialogOpen(true);
  };

  const processSubmission = async (action: "approve" | "reject") => {
    if (!selectedSubmission || !user) return;

    setProcessing(true);

    try {
      if (action === "approve") {
        // Create listing from submission
        const { error: listingError } = await supabase.from("listings").insert({
          seller_id: selectedSubmission.seller?.id,
          submission_id: selectedSubmission.id,
          title: selectedSubmission.title,
          description: selectedSubmission.description,
          price_ils: selectedSubmission.price_ils,
          condition: selectedSubmission.condition as Database["public"]["Enums"]["item_condition"],
          region: selectedSubmission.region,
          images: selectedSubmission.images,
          category_id: selectedSubmission.category_id,
        });

        if (listingError) {
          console.error("Error creating listing:", listingError);
          toast({
            title: "حدث خطأ",
            description: "فشل إنشاء الإعلان",
            variant: "destructive",
          });
          setProcessing(false);
          return;
        }
      }

      // Update submission status
      const { error: updateError } = await supabase
        .from("submissions")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq("id", selectedSubmission.id);

      if (updateError) {
        console.error("Error updating submission:", updateError);
        toast({
          title: "حدث خطأ",
          variant: "destructive",
        });
      } else {
        toast({
          title: action === "approve" ? "تمت الموافقة" : "تم الرفض",
        });
        
        // Update local state
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === selectedSubmission.id
              ? { ...s, status: action === "approve" ? "approved" : "rejected" }
              : s
          )
        );
        setReviewDialogOpen(false);
      }
    } catch (err) {
      console.error("Error:", err);
      toast({
        title: "حدث خطأ",
        variant: "destructive",
      });
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

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout hideFooter>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            لوحة التحكم
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                الإعلانات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalListings}</p>
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
            </CardContent>
          </Card>
          <Card className={stats.pendingSubmissions > 0 ? "border-warning" : ""}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                قيد المراجعة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.pendingSubmissions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                العروض
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalOffers}</p>
            </CardContent>
          </Card>
        </div>

        {/* Submissions */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              قيد المراجعة
              {stats.pendingSubmissions > 0 && (
                <Badge className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center bg-warning text-warning-foreground">
                  {stats.pendingSubmissions}
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
                <div className="space-y-4">
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
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions
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
                              <p className="font-medium">{submission.seller?.shop_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {submission.seller?.user?.name}
                              </p>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReview(submission)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      {submissions.filter((s) => tab === "all" || s.status === tab).length === 0 && (
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

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedSubmission && (
              <>
                <DialogHeader>
                  <DialogTitle>مراجعة الطلب</DialogTitle>
                  <DialogDescription>
                    {selectedSubmission.title}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Images */}
                  {selectedSubmission.images && selectedSubmission.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {selectedSubmission.images.map((img, i) => (
                        <SignedImage
                          key={i}
                          src={img}
                          alt=""
                          className="w-24 h-24 rounded-lg object-cover shrink-0"
                        />
                      ))}
                    </div>
                  )}

                  {/* Details */}
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
                  </div>

                  {selectedSubmission.description && (
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">الوصف</p>
                      <p className="text-sm whitespace-pre-line">{selectedSubmission.description}</p>
                    </div>
                  )}

                  {selectedSubmission.status === "pending" && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        ملاحظات المراجعة (اختياري)
                      </label>
                      <Textarea
                        placeholder="أضف ملاحظات..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2">
                  {selectedSubmission.status === "pending" && (
                    <>
                      <Button
                        variant="destructive"
                        onClick={() => processSubmission("reject")}
                        disabled={processing}
                      >
                        <XCircle className="h-4 w-4 ml-2" />
                        رفض
                      </Button>
                      <Button
                        className="btn-brand"
                        onClick={() => processSubmission("approve")}
                        disabled={processing}
                      >
                        <CheckCircle className="h-4 w-4 ml-2" />
                        موافقة ونشر
                      </Button>
                    </>
                  )}
                  {selectedSubmission.status !== "pending" && (
                    <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                      إغلاق
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
