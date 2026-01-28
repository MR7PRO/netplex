import { useState, useEffect } from "react";
import { Search, ShieldCheck, ShieldX, Eye, Loader2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminAudit } from "@/hooks/useAdminAudit";
import { getRegionLabel, getRelativeTime } from "@/lib/constants";
import { Link } from "react-router-dom";

interface Seller {
  id: string;
  user_id: string;
  shop_name: string | null;
  region: string;
  type: string | null;
  verified: boolean;
  trust_score: number;
  created_at: string | null;
  whatsapp: string | null;
  bio: string | null;
  _count?: {
    listings: number;
    reports: number;
  };
}

export default function AdminSellers() {
  const { toast } = useToast();
  const { logAction } = useAdminAudit();

  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [newTrustScore, setNewTrustScore] = useState(50);

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    setLoading(true);
    
    // Fetch sellers
    const { data: sellersData, error } = await supabase
      .from("sellers")
      .select("id, user_id, shop_name, region, type, verified, trust_score, created_at, whatsapp, bio")
      .order("created_at", { ascending: false });

    if (!error && sellersData) {
      // Fetch counts for each seller
      const sellersWithCounts = await Promise.all(
        sellersData.map(async (seller) => {
          const [listings, reports] = await Promise.all([
            supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", seller.id),
            supabase.from("reports").select("id", { count: "exact", head: true })
              .in("listing_id", 
                (await supabase.from("listings").select("id").eq("seller_id", seller.id)).data?.map(l => l.id) || []
              ),
          ]);
          
          return {
            ...seller,
            _count: {
              listings: listings.count || 0,
              reports: reports.count || 0,
            },
          };
        })
      );
      
      setSellers(sellersWithCounts as Seller[]);
    }
    setLoading(false);
  };

  const openSellerDialog = (seller: Seller) => {
    setSelectedSeller(seller);
    setNewTrustScore(seller.trust_score || 50);
    setDialogOpen(true);
  };

  const handleVerify = async (verified: boolean) => {
    if (!selectedSeller) return;
    setProcessing(true);

    const { error } = await supabase
      .from("sellers")
      .update({ verified })
      .eq("id", selectedSeller.id);

    if (!error) {
      await logAction({
        action: verified ? "seller_verified" : "seller_unverified",
        entityType: "seller",
        entityId: selectedSeller.id,
        details: { shop_name: selectedSeller.shop_name },
      });

      setSellers((prev) =>
        prev.map((s) => (s.id === selectedSeller.id ? { ...s, verified } : s))
      );
      setSelectedSeller({ ...selectedSeller, verified });
      toast({ title: verified ? "تم توثيق البائع" : "تم إلغاء التوثيق" });
    } else {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }

    setProcessing(false);
  };

  const handleUpdateTrustScore = async () => {
    if (!selectedSeller) return;
    setProcessing(true);

    const { error } = await supabase
      .from("sellers")
      .update({ trust_score: newTrustScore })
      .eq("id", selectedSeller.id);

    if (!error) {
      await logAction({
        action: "seller_trust_adjusted",
        entityType: "seller",
        entityId: selectedSeller.id,
        details: { 
          shop_name: selectedSeller.shop_name,
          old_score: selectedSeller.trust_score,
          new_score: newTrustScore,
        },
      });

      setSellers((prev) =>
        prev.map((s) => (s.id === selectedSeller.id ? { ...s, trust_score: newTrustScore } : s))
      );
      setSelectedSeller({ ...selectedSeller, trust_score: newTrustScore });
      toast({ title: "تم تحديث نقاط الثقة" });
    } else {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }

    setProcessing(false);
  };

  const getTrustBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-success text-success-foreground">ممتاز</Badge>;
    if (score >= 60) return <Badge variant="outline" className="border-success text-success">جيد</Badge>;
    if (score >= 40) return <Badge variant="outline">متوسط</Badge>;
    return <Badge variant="destructive">ضعيف</Badge>;
  };

  const filteredSellers = sellers.filter((s) =>
    s.shop_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="إدارة البائعين">
      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم المتجر أو المنطقة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">الكل ({sellers.length})</TabsTrigger>
          <TabsTrigger value="verified">موثقون ({sellers.filter(s => s.verified).length})</TabsTrigger>
          <TabsTrigger value="unverified">غير موثقين ({sellers.filter(s => !s.verified).length})</TabsTrigger>
        </TabsList>

        {["all", "verified", "unverified"].map((tab) => (
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
                      <TableHead>المتجر</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المنطقة</TableHead>
                      <TableHead>الإعلانات</TableHead>
                      <TableHead>نقاط الثقة</TableHead>
                      <TableHead>التوثيق</TableHead>
                      <TableHead>الانضمام</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSellers
                      .filter((s) => tab === "all" || (tab === "verified" ? s.verified : !s.verified))
                      .map((seller) => (
                        <TableRow key={seller.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{seller.shop_name || "بدون اسم"}</p>
                              {seller._count?.reports && seller._count.reports > 0 && (
                                <div className="flex items-center gap-1 text-xs text-destructive">
                                  <AlertTriangle className="h-3 w-3" />
                                  {seller._count.reports} بلاغ
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {seller.type === "shop" ? "متجر" : "فرد"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getRegionLabel(seller.region)}</TableCell>
                          <TableCell>{seller._count?.listings || 0}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{seller.trust_score || 50}</span>
                              {getTrustBadge(seller.trust_score || 50)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {seller.verified ? (
                              <Badge className="bg-success text-success-foreground">
                                <ShieldCheck className="h-3 w-3 ml-1" />
                                موثق
                              </Badge>
                            ) : (
                              <Badge variant="secondary">غير موثق</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {seller.created_at ? getRelativeTime(seller.created_at) : "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openSellerDialog(seller)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredSellers.filter((s) => tab === "all" || (tab === "verified" ? s.verified : !s.verified)).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          لا يوجد بائعون
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

      {/* Seller Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedSeller && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSeller.shop_name || "بائع"}</DialogTitle>
                <DialogDescription>
                  {getRegionLabel(selectedSeller.region)} • {selectedSeller.type === "shop" ? "متجر" : "فرد"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Verification */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">التوثيق</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span>
                        {selectedSeller.verified ? (
                          <Badge className="bg-success text-success-foreground">
                            <ShieldCheck className="h-3 w-3 ml-1" />
                            موثق
                          </Badge>
                        ) : (
                          <Badge variant="secondary">غير موثق</Badge>
                        )}
                      </span>
                      <Button
                        variant={selectedSeller.verified ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleVerify(!selectedSeller.verified)}
                        disabled={processing}
                      >
                        {processing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                        {selectedSeller.verified ? (
                          <>
                            <ShieldX className="h-4 w-4 ml-2" />
                            إلغاء التوثيق
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 ml-2" />
                            توثيق
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Trust Score */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">نقاط الثقة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{newTrustScore}</span>
                      {getTrustBadge(newTrustScore)}
                    </div>
                    <Slider
                      value={[newTrustScore]}
                      onValueChange={([v]) => setNewTrustScore(v)}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0 - ضعيف</span>
                      <span>100 - ممتاز</span>
                    </div>
                    {newTrustScore !== (selectedSeller.trust_score || 50) && (
                      <Button
                        onClick={handleUpdateTrustScore}
                        disabled={processing}
                        className="w-full"
                      >
                        {processing && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                        حفظ التغييرات
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link to={`/seller/${selectedSeller.id}`} target="_blank">
                      <Eye className="h-4 w-4 ml-2" />
                      عرض الصفحة
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link to={`/admin/reports?seller=${selectedSeller.id}`}>
                      <AlertTriangle className="h-4 w-4 ml-2" />
                      البلاغات
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
