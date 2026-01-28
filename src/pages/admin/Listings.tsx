import { useState, useEffect } from "react";
import { Eye, Star, Trash2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SignedImage } from "@/components/SignedImage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminAudit } from "@/hooks/useAdminAudit";
import { formatPrice, getRegionLabel, getRelativeTime } from "@/lib/constants";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type ListingStatus = Database["public"]["Enums"]["listing_status"];

interface Listing {
  id: string;
  title: string;
  price_ils: number;
  region: string;
  status: ListingStatus;
  featured: boolean;
  view_count: number;
  images: string[];
  created_at: string | null;
  published_at: string | null;
  seller: {
    id: string;
    shop_name: string | null;
  } | null;
}

const STATUS_OPTIONS: { value: ListingStatus; label: string }[] = [
  { value: "available", label: "متاح" },
  { value: "reserved", label: "محجوز" },
  { value: "sold", label: "مباع" },
  { value: "expired", label: "منتهي" },
];

export default function AdminListings() {
  const { toast } = useToast();
  const { logAction } = useAdminAudit();

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select(`
        id, title, price_ils, region, status, featured, view_count, images, 
        created_at, published_at,
        seller:sellers(id, shop_name)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setListings(data as unknown as Listing[]);
    }
    setLoading(false);
  };

  const handleStatusChange = async (listingId: string, newStatus: ListingStatus) => {
    setProcessing(listingId);
    
    const { error } = await supabase
      .from("listings")
      .update({ status: newStatus })
      .eq("id", listingId);

    if (!error) {
      await logAction({
        action: "listing_status_changed",
        entityType: "listing",
        entityId: listingId,
        details: { newStatus },
      });
      
      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, status: newStatus } : l))
      );
      toast({ title: "تم تحديث الحالة" });
    } else {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
    
    setProcessing(null);
  };

  const handleFeaturedToggle = async (listingId: string, featured: boolean) => {
    setProcessing(listingId);
    
    const { error } = await supabase
      .from("listings")
      .update({ featured })
      .eq("id", listingId);

    if (!error) {
      await logAction({
        action: "listing_featured_toggled",
        entityType: "listing",
        entityId: listingId,
        details: { featured },
      });
      
      setListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, featured } : l))
      );
      toast({ title: featured ? "تم تمييز الإعلان" : "تم إلغاء التمييز" });
    } else {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
    
    setProcessing(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setProcessing(deleteId);
    
    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", deleteId);

    if (!error) {
      await logAction({
        action: "listing_deleted",
        entityType: "listing",
        entityId: deleteId,
      });
      
      setListings((prev) => prev.filter((l) => l.id !== deleteId));
      toast({ title: "تم حذف الإعلان" });
    } else {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
    
    setDeleteId(null);
    setProcessing(null);
  };

  const getStatusBadge = (status: ListingStatus) => {
    switch (status) {
      case "available":
        return <Badge className="bg-success text-success-foreground">متاح</Badge>;
      case "reserved":
        return <Badge variant="outline" className="border-warning text-warning">محجوز</Badge>;
      case "sold":
        return <Badge variant="secondary">مباع</Badge>;
      case "expired":
        return <Badge variant="destructive">منتهي</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredListings = listings.filter((l) => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.seller?.shop_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout title="إدارة الإعلانات">
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
                <TableHead>البائع</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>المنطقة</TableHead>
                <TableHead>المشاهدات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>مميز</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredListings.map((listing) => (
                <TableRow key={listing.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {listing.images?.[0] && (
                        <SignedImage
                          src={listing.images[0]}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium line-clamp-1">{listing.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {listing.published_at ? getRelativeTime(listing.published_at) : "-"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{listing.seller?.shop_name || "-"}</TableCell>
                  <TableCell className="font-medium">{formatPrice(listing.price_ils)}</TableCell>
                  <TableCell>{getRegionLabel(listing.region)}</TableCell>
                  <TableCell>{listing.view_count || 0}</TableCell>
                  <TableCell>
                    <Select
                      value={listing.status || "available"}
                      onValueChange={(v) => handleStatusChange(listing.id, v as ListingStatus)}
                      disabled={processing === listing.id}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={listing.featured || false}
                        onCheckedChange={(v) => handleFeaturedToggle(listing.id, v)}
                        disabled={processing === listing.id}
                      />
                      {listing.featured && <Star className="h-4 w-4 text-warning fill-warning" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/listing/${listing.id}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(listing.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredListings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    لا توجد إعلانات
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الإعلان</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
