import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Package, Plus, Eye, Clock, CheckCircle, XCircle,
  MessageSquare, Store, Edit, Loader2, Trash2, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getRelativeTime, REGIONS, CONDITION_OPTIONS } from "@/lib/constants";
import { SignedImage } from "@/components/SignedImage";
import { SellerStatsCharts } from "@/components/seller/SellerStatsCharts";
import type { Database } from "@/integrations/supabase/types";

type ListingStatus = Database["public"]["Enums"]["listing_status"];
type ItemCondition = Database["public"]["Enums"]["item_condition"];

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price_ils: number;
  images: string[];
  status: ListingStatus;
  condition: ItemCondition | null;
  brand: string | null;
  model: string | null;
  region: string;
  category_id: string | null;
  view_count: number | null;
  save_count: number | null;
  whatsapp_click_count: number | null;
  published_at: string | null;
}

interface Offer {
  id: string;
  offer_price_ils: number;
  message: string | null;
  status: string;
  created_at: string | null;
  listing: { title: string; price_ils: number } | null;
  buyer: { name: string } | null;
}

interface Category {
  id: string;
  name_ar: string;
}

interface SellerInfo {
  id: string;
  shop_name: string | null;
  region: string;
  whatsapp: string | null;
  bio: string | null;
  type: string | null;
}

const MyStorePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, seller, userRole, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellerInfo, setSellerInfo] = useState<SellerInfo | null>(null);
  const [stats, setStats] = useState({ totalListings: 0, totalViews: 0, totalSaves: 0, pendingOffers: 0 });

  // Store info edit
  const [editingStore, setEditingStore] = useState(false);
  const [storeForm, setStoreForm] = useState({ shop_name: "", region: "", whatsapp: "", bio: "" });
  const [savingStore, setSavingStore] = useState(false);

  // Add listing dialog
  const [addingListing, setAddingListing] = useState(false);
  const [listingForm, setListingForm] = useState({
    title: "", description: "", price_ils: 0, category_id: "", region: "", condition: "good" as string, brand: "", model: "",
  });
  const [listingImages, setListingImages] = useState<File[]>([]);
  const [listingPreviews, setListingPreviews] = useState<string[]>([]);
  const [submittingListing, setSubmittingListing] = useState(false);

  // Edit listing dialog
  const [editListing, setEditListing] = useState<Listing | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", price_ils: 0, condition: "", status: "" as string });
  const [savingEdit, setSavingEdit] = useState(false);

  const isSubAdmin = userRole === "sub_admin";
  const isAdmin = userRole === "admin";

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (!isSubAdmin && !isAdmin) { navigate("/"); return; }
  }, [user, userRole, navigate, isSubAdmin, isAdmin]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!seller) return;
      setLoading(true);

      const [listingsRes, catsRes, sellerRes] = await Promise.all([
        supabase.from("listings").select("*").eq("seller_id", seller.id).order("published_at", { ascending: false }),
        supabase.from("categories").select("id, name_ar").order("sort_order"),
        supabase.from("sellers").select("id, shop_name, region, whatsapp, bio, type").eq("id", seller.id).maybeSingle(),
      ]);

      const listingsData = (listingsRes.data || []) as Listing[];
      setListings(listingsData);
      setCategories(catsRes.data || []);
      if (sellerRes.data) {
        setSellerInfo(sellerRes.data as SellerInfo);
        setStoreForm({
          shop_name: sellerRes.data.shop_name || "",
          region: sellerRes.data.region || "",
          whatsapp: sellerRes.data.whatsapp || "",
          bio: sellerRes.data.bio || "",
        });
      }

      // Fetch offers
      const listingIds = listingsData.map(l => l.id);
      if (listingIds.length > 0) {
        const { data: offersData } = await supabase
          .from("offers")
          .select("id, offer_price_ils, message, status, created_at, listing:listings!inner(title, price_ils), buyer:profiles_public!offers_buyer_id_fkey(name)")
          .in("listing_id", listingIds)
          .order("created_at", { ascending: false });
        setOffers((offersData as unknown as Offer[]) || []);
        setStats(prev => ({ ...prev, pendingOffers: offersData?.filter(o => o.status === "pending").length || 0 }));
      }

      setStats(prev => ({
        ...prev,
        totalListings: listingsData.filter(l => l.status === "available").length,
        totalViews: listingsData.reduce((s, l) => s + (l.view_count || 0), 0),
        totalSaves: listingsData.reduce((s, l) => s + (l.save_count || 0), 0),
      }));

      setLoading(false);
    };
    fetchAll();
  }, [seller]);

  const handleSaveStore = async () => {
    if (!seller) return;
    setSavingStore(true);
    const { error } = await supabase.from("sellers").update({
      shop_name: storeForm.shop_name, region: storeForm.region,
      whatsapp: storeForm.whatsapp || null, bio: storeForm.bio || null,
    }).eq("id", seller.id);
    setSavingStore(false);
    if (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } else {
      toast({ title: "تم حفظ بيانات المتجر" });
      setEditingStore(false);
      refreshProfile();
    }
  };

  const handleAddListing = async () => {
    if (!seller || !user) return;
    if (!listingForm.title || !listingForm.price_ils || !listingForm.region) {
      toast({ title: "يرجى إكمال الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSubmittingListing(true);

    // Upload images
    const imageUrls: string[] = [];
    for (const file of listingImages) {
      const ext = file.name.split(".").pop();
      const name = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const { error } = await supabase.storage.from("listings").upload(name, file);
      if (!error) imageUrls.push(name);
    }

    const { error } = await supabase.from("listings").insert({
      seller_id: seller.id,
      title: listingForm.title,
      description: listingForm.description || null,
      price_ils: listingForm.price_ils,
      category_id: listingForm.category_id || null,
      region: listingForm.region,
      condition: listingForm.condition as ItemCondition,
      brand: listingForm.brand || null,
      model: listingForm.model || null,
      images: imageUrls,
      status: "available",
      published_at: new Date().toISOString(),
    });

    setSubmittingListing(false);
    if (error) {
      toast({ title: "حدث خطأ أثناء إضافة المنتج", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم إضافة المنتج بنجاح!" });
      setAddingListing(false);
      setListingForm({ title: "", description: "", price_ils: 0, category_id: "", region: storeForm.region, condition: "good", brand: "", model: "" });
      setListingImages([]);
      setListingPreviews([]);
      // Reload listings
      const { data } = await supabase.from("listings").select("*").eq("seller_id", seller.id).order("published_at", { ascending: false });
      if (data) setListings(data as Listing[]);
    }
  };

  const handleEditSave = async () => {
    if (!editListing) return;
    setSavingEdit(true);
    const { error } = await supabase.from("listings").update({
      title: editForm.title,
      description: editForm.description || null,
      price_ils: editForm.price_ils,
      condition: editForm.condition as ItemCondition,
      status: editForm.status as ListingStatus,
    }).eq("id", editListing.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } else {
      toast({ title: "تم تحديث المنتج" });
      setListings(prev => prev.map(l => l.id === editListing.id ? { ...l, title: editForm.title, description: editForm.description, price_ils: editForm.price_ils, condition: editForm.condition as ItemCondition, status: editForm.status as ListingStatus } : l));
      setEditListing(null);
    }
  };

  const handleDeleteListing = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } else {
      toast({ title: "تم حذف المنتج" });
      setListings(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleOfferAction = async (offerId: string, action: "accepted" | "rejected") => {
    const { error } = await supabase.from("offers").update({ status: action }).eq("id", offerId);
    if (!error) {
      toast({ title: action === "accepted" ? "تم قبول العرض" : "تم رفض العرض" });
      setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: action } : o));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 6 - listingImages.length);
    setListingImages(prev => [...prev, ...files]);
    files.forEach(f => {
      const r = new FileReader();
      r.onload = ev => setListingPreviews(prev => [...prev, ev.target?.result as string]);
      r.readAsDataURL(f);
    });
  };

  const getStatusBadge = (status: ListingStatus) => {
    const map: Record<string, { class: string; label: string }> = {
      available: { class: "bg-success text-success-foreground", label: "متاح" },
      reserved: { class: "border-warning text-warning", label: "محجوز" },
      sold: { class: "bg-muted text-muted-foreground", label: "مباع" },
      expired: { class: "bg-muted text-muted-foreground", label: "منتهي" },
    };
    const s = map[status] || { class: "", label: status };
    return <Badge variant={status === "reserved" ? "outline" : "secondary"} className={s.class}>{s.label}</Badge>;
  };

  if (!user || (!isSubAdmin && !isAdmin)) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Store className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{sellerInfo?.shop_name || "متجري"}</h1>
              <p className="text-sm text-muted-foreground">إدارة المتجر والمنتجات</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingStore(true)}>
              <Edit className="h-4 w-4 ml-1" />
              تعديل المتجر
            </Button>
            <Button className="btn-brand" size="sm" onClick={() => setAddingListing(true)}>
              <Plus className="h-4 w-4 ml-1" />
              إضافة منتج
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><Package className="h-4 w-4" />منتجات نشطة</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalListings}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><Eye className="h-4 w-4" />المشاهدات</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalViews}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><CheckCircle className="h-4 w-4" />المحفوظات</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalSaves}</p></CardContent></Card>
          <Card className={stats.pendingOffers > 0 ? "border-primary" : ""}><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><MessageSquare className="h-4 w-4" />عروض جديدة</CardDescription></CardHeader><CardContent><p className="text-2xl font-bold">{stats.pendingOffers}</p></CardContent></Card>
        </div>

        {loading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : (
          <Tabs defaultValue="listings" className="space-y-4">
            <TabsList>
              <TabsTrigger value="listings">منتجاتي ({listings.length})</TabsTrigger>
              <TabsTrigger value="offers">العروض {stats.pendingOffers > 0 && <Badge className="mr-2 h-5 w-5 p-0 flex items-center justify-center">{stats.pendingOffers}</Badge>}</TabsTrigger>
            </TabsList>

            <TabsContent value="listings">
              {listings.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">لا توجد منتجات</h3>
                  <Button onClick={() => setAddingListing(true)} className="btn-brand"><Plus className="h-4 w-4 ml-2" />أضف أول منتج</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.map(listing => (
                    <div key={listing.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors">
                      {listing.images?.[0] && <SignedImage src={listing.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />}
                      <Link to={`/listing/${listing.id}`} className="flex-1 min-w-0">
                        <h3 className="font-medium line-clamp-1">{listing.title}</h3>
                        <p className="text-primary font-semibold">{formatPrice(listing.price_ils)}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.view_count || 0}</span>
                          <span>{listing.published_at ? getRelativeTime(listing.published_at) : ""}</span>
                        </div>
                      </Link>
                      {getStatusBadge(listing.status)}
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditListing(listing); setEditForm({ title: listing.title, description: listing.description || "", price_ils: listing.price_ils, condition: listing.condition || "good", status: listing.status }); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="نسخ المنتج" onClick={() => {
                          setListingForm({
                            title: listing.title,
                            description: listing.description || "",
                            price_ils: listing.price_ils,
                            category_id: listing.category_id || "",
                            region: listing.region,
                            condition: listing.condition || "good",
                            brand: listing.brand || "",
                            model: listing.model || "",
                          });
                          setAddingListing(true);
                          toast({ title: "تم نسخ بيانات المنتج — عدّل واحفظ" });
                        }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف المنتج؟</AlertDialogTitle>
                              <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteListing(listing.id)} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="offers">
              {offers.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">لا توجد عروض</h3>
                </div>
              ) : (
                <div className="space-y-3">
                  {offers.map(offer => (
                    <div key={offer.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium line-clamp-1">{offer.listing?.title}</h3>
                          <p className="text-sm text-muted-foreground">من: {offer.buyer?.name}</p>
                          <div className="flex gap-4 mt-2">
                            <div><p className="text-xs text-muted-foreground">السعر الأصلي</p><p className="font-medium">{formatPrice(offer.listing?.price_ils || 0)}</p></div>
                            <div><p className="text-xs text-muted-foreground">العرض</p><p className="font-semibold text-primary">{formatPrice(offer.offer_price_ils)}</p></div>
                          </div>
                          {offer.message && <p className="text-sm mt-2 p-2 bg-muted rounded">{offer.message}</p>}
                        </div>
                        {offer.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleOfferAction(offer.id, "rejected")}><XCircle className="h-4 w-4" /></Button>
                            <Button size="sm" className="btn-brand" onClick={() => handleOfferAction(offer.id, "accepted")}><CheckCircle className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <Badge variant={offer.status === "accepted" ? "default" : "secondary"} className={offer.status === "accepted" ? "bg-success" : ""}>{offer.status === "accepted" ? "مقبول" : "مرفوض"}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Edit Store Dialog */}
        <Dialog open={editingStore} onOpenChange={setEditingStore}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader><DialogTitle>تعديل بيانات المتجر</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">اسم المتجر</label>
                <Input value={storeForm.shop_name} onChange={e => setStoreForm(p => ({ ...p, shop_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">المنطقة</label>
                <Select value={storeForm.region} onValueChange={v => setStoreForm(p => ({ ...p, region: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REGIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">رقم واتساب</label>
                <Input value={storeForm.whatsapp} onChange={e => setStoreForm(p => ({ ...p, whatsapp: e.target.value }))} dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">نبذة عن المتجر</label>
                <Textarea value={storeForm.bio} onChange={e => setStoreForm(p => ({ ...p, bio: e.target.value }))} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStore(false)}>إلغاء</Button>
              <Button className="btn-brand" onClick={handleSaveStore} disabled={savingStore}>
                {savingStore && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Listing Dialog */}
        <Dialog open={addingListing} onOpenChange={setAddingListing}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader><DialogTitle>إضافة منتج جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">العنوان *</label>
                <Input value={listingForm.title} onChange={e => setListingForm(p => ({ ...p, title: e.target.value }))} placeholder="مثال: آيفون 14 برو" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">الوصف</label>
                <Textarea value={listingForm.description} onChange={e => setListingForm(p => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">السعر (₪) *</label>
                  <Input type="number" value={listingForm.price_ils || ""} onChange={e => setListingForm(p => ({ ...p, price_ils: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">الحالة</label>
                  <Select value={listingForm.condition} onValueChange={v => setListingForm(p => ({ ...p, condition: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label_ar}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">القسم</label>
                  <Select value={listingForm.category_id} onValueChange={v => setListingForm(p => ({ ...p, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">المنطقة *</label>
                  <Select value={listingForm.region || storeForm.region} onValueChange={v => setListingForm(p => ({ ...p, region: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REGIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label_ar}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">الماركة</label>
                  <Input value={listingForm.brand} onChange={e => setListingForm(p => ({ ...p, brand: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">الموديل</label>
                  <Input value={listingForm.model} onChange={e => setListingForm(p => ({ ...p, model: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">الصور</label>
                <div className="flex gap-2 flex-wrap">
                  {listingPreviews.map((p, i) => (
                    <div key={i} className="w-16 h-16 rounded border overflow-hidden relative">
                      <img src={p} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => { setListingImages(prev => prev.filter((_, idx) => idx !== i)); setListingPreviews(prev => prev.filter((_, idx) => idx !== i)); }} className="absolute top-0 left-0 p-0.5 bg-destructive text-destructive-foreground rounded-full"><XCircle className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {listingImages.length < 6 && (
                    <label className="w-16 h-16 rounded border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary">
                      <Plus className="h-5 w-5 text-muted-foreground" />
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddingListing(false)}>إلغاء</Button>
              <Button className="btn-brand" onClick={handleAddListing} disabled={submittingListing}>
                {submittingListing && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}نشر المنتج
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Listing Dialog */}
        <Dialog open={!!editListing} onOpenChange={o => !o && setEditListing(null)}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader><DialogTitle>تعديل المنتج</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">العنوان</label>
                <Input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">الوصف</label>
                <Textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">السعر (₪)</label>
                  <Input type="number" value={editForm.price_ils || ""} onChange={e => setEditForm(p => ({ ...p, price_ils: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">الحالة</label>
                  <Select value={editForm.condition} onValueChange={v => setEditForm(p => ({ ...p, condition: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label_ar}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">حالة الإعلان</label>
                <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">متاح</SelectItem>
                    <SelectItem value="reserved">محجوز</SelectItem>
                    <SelectItem value="sold">مباع</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditListing(null)}>إلغاء</Button>
              <Button className="btn-brand" onClick={handleEditSave} disabled={savingEdit}>
                {savingEdit && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}حفظ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MyStorePage;
