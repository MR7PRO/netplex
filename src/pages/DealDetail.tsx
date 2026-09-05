import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SEO } from "@/components/seo/SEO";
import EmptyState from "@/components/EmptyState";
import DealTimeline from "@/components/deals/DealTimeline";
import OpenDisputeDialog from "@/components/disputes/OpenDisputeDialog";
import { ReviewSellerDialog } from "@/components/reviews/ReviewSellerDialog";
import { SignedImage } from "@/components/SignedImage";
import { toast } from "sonner";
import {
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  PackageCheck,
  XCircle,
  MessageSquare,
  ExternalLink,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Copy,
  BadgeCheck,
} from "lucide-react";
import {
  type Deal,
  getDealRole,
  dealPermissions,
  dealNextAction,
  dealStatusLabel,
  dealStatusVariant,
  isDealLocked,
  confirmShipped,
  confirmReceived,
  cancelDeal,
  fetchDeal,
  formatILS,
  formatDateTime,
} from "@/lib/deals";

interface ListingSnap {
  id: string;
  title: string;
  images: string[] | null;
  price_ils: number;
  status: string | null;
}
interface SellerSnap {
  id: string;
  user_id: string;
  shop_name: string | null;
  verified: boolean | null;
  logo_url: string | null;
}
interface PartySnap {
  name: string | null;
  avatar_url: string | null;
}
interface DisputeSnap {
  id: string;
  status: string;
  title: string;
}

const DealDetail: React.FC = () => {
  const { dealId } = useParams<{ dealId: string }>();
  const { user, seller: mySeller, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [listing, setListing] = useState<ListingSnap | null>(null);
  const [seller, setSeller] = useState<SellerSnap | null>(null);
  const [sellerProfile, setSellerProfile] = useState<PartySnap | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<PartySnap | null>(null);
  const [dispute, setDispute] = useState<DisputeSnap | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);

  const load = useCallback(async () => {
    if (!dealId) return;
    const { deal: d } = await fetchDeal(dealId);
    if (!d) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setDeal(d);
    const [{ data: l }, { data: s }, { data: dis }, { data: bp }] = await Promise.all([
      supabase.from("listings").select("id, title, images, price_ils, status").eq("id", d.listing_id).maybeSingle(),
      supabase.from("sellers").select("id, user_id, shop_name, verified, logo_url").eq("id", d.seller_id).maybeSingle(),
      supabase.from("disputes").select("id, status, title").eq("deal_id", d.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles_public").select("name, avatar_url").eq("id", d.buyer_id).maybeSingle(),
    ]);
    setListing((l as ListingSnap) || null);
    setSeller((s as SellerSnap) || null);
    setDispute((dis as DisputeSnap) || null);
    setBuyerProfile((bp as PartySnap) || null);
    if (s?.user_id) {
      const { data: sp } = await supabase.from("profiles_public").select("name, avatar_url").eq("id", s.user_id).maybeSingle();
      setSellerProfile((sp as PartySnap) || null);
    }
    setLoading(false);
  }, [dealId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    load();
  }, [user, authLoading, navigate, load]);

  // Live refresh when the other party acts
  useEffect(() => {
    if (!dealId || !user) return;
    const ch = supabase
      .channel(`deal-${dealId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "deals", filter: `id=eq.${dealId}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [dealId, user, load]);

  const run = async (fn: () => Promise<{ error: string | null }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast.error(error);
    toast.success(ok);
    load();
  };

  const openChat = async () => {
    if (!deal || !user) return;
    setChatBusy(true);
    try {
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", deal.buyer_id)
        .eq("seller_id", deal.seller_id)
        .eq("listing_id", deal.listing_id)
        .maybeSingle();
      let convId = existing?.id;
      if (!convId) {
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({ buyer_id: deal.buyer_id, seller_id: deal.seller_id, listing_id: deal.listing_id })
          .select("id")
          .single();
        if (error) throw error;
        convId = created.id;
      }
      navigate(`/messages/${convId}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "تعذّر فتح المحادثة");
    } finally {
      setChatBusy(false);
    }
  };

  const copyId = async () => {
    if (!deal) return;
    await navigator.clipboard.writeText(deal.id);
    toast.success("تم نسخ رقم الصفقة");
  };

  if (loading || authLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </Layout>
    );
  }

  if (notFound || !deal) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <EmptyState
            icon={ShieldCheck}
            title="الصفقة غير موجودة"
            description="قد تكون الصفقة محذوفة أو ليس لديك صلاحية للاطلاع عليها."
            actionLabel="العودة إلى صفقاتي"
            actionTo="/deals"
          />
        </div>
      </Layout>
    );
  }

  const role = getDealRole(deal, user?.id, mySeller?.id);
  const perms = dealPermissions(deal, role);
  const locked = isDealLocked(deal);
  const next = dealNextAction(deal, role);
  const img = listing?.images?.[0];
  const sellerName = seller?.shop_name || sellerProfile?.name || "البائع";
  const buyerName = buyerProfile?.name || "المشتري";
  const other = role === "seller"
    ? { label: "المشتري", name: buyerName, avatar: buyerProfile?.avatar_url, icon: ShoppingBag, to: null as string | null, verified: false }
    : { label: "البائع", name: sellerName, avatar: seller?.logo_url || sellerProfile?.avatar_url, icon: Store, to: seller ? `/seller/${seller.id}` : null, verified: !!seller?.verified };

  const banner = (() => {
    if (deal.status === "completed")
      return { cls: "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400", Icon: CheckCircle2, text: `اكتملت الصفقة بنجاح${deal.completed_at ? " — " + formatDateTime(deal.completed_at) : ""}` };
    if (deal.status === "cancelled")
      return { cls: "bg-muted text-muted-foreground", Icon: XCircle, text: `تم إلغاء الصفقة — ${formatDateTime(deal.updated_at)}` };
    if (deal.status === "disputed")
      return { cls: "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400", Icon: AlertTriangle, text: "الصفقة قيد النزاع ويراجعها فريق NetPlex" };
    return null;
  })();

  return (
    <Layout>
      <SEO title={`تفاصيل الصفقة — NetPlex`} description="متابعة صفقة ضمان الاستلام خطوة بخطوة" />
      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button asChild variant="ghost" size="icon" aria-label="العودة إلى صفقاتي">
              <Link to="/deals"><ArrowRight className="h-5 w-5" /></Link>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> تفاصيل الصفقة
              </h1>
              <button onClick={copyId} className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 hover:text-foreground" aria-label="نسخ رقم الصفقة">
                #{deal.id.slice(0, 8)} <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
          <Badge variant={dealStatusVariant(deal.status)} className="shrink-0">{dealStatusLabel(deal.status)}</Badge>
        </div>

        {banner && (
          <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${banner.cls}`} role="status">
            <banner.Icon className="h-4 w-4 shrink-0" /> {banner.text}
          </div>
        )}

        {/* Listing snapshot */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-20 w-20 rounded-lg overflow-hidden bg-muted shrink-0">
              {img ? (
                <SignedImage src={img} width={80} height={80} alt={listing?.title || "منتج"} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground"><ShoppingBag className="h-6 w-6" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{listing?.title || "منتج غير متاح"}</p>
              <p className="text-xs text-muted-foreground">فُتحت في {formatDateTime(deal.created_at)}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] gap-1">
                  {role === "seller" ? <Store className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
                  {role === "seller" ? "أنا البائع" : role === "buyer" ? "أنا المشتري" : "طرف غير معروف"}
                </Badge>
                {listing?.status && listing.status !== "available" && (
                  <Badge variant="secondary" className="text-[10px]">حالة المنتج: {listing.status === "sold" ? "مباع" : listing.status === "reserved" ? "محجوز" : "منتهي"}</Badge>
                )}
              </div>
            </div>
            <div className="text-left shrink-0">
              <p className="text-[11px] text-muted-foreground">السعر المتفق عليه</p>
              <p className="font-bold text-primary text-lg">{formatILS(deal.agreed_price_ils)}</p>
              {listing && Number(listing.price_ils) !== Number(deal.agreed_price_ils) && (
                <p className="text-[11px] text-muted-foreground line-through">{formatILS(listing.price_ils)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Other party */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {other.avatar && <AvatarImage src={other.avatar} alt={other.name} />}
              <AvatarFallback><other.icon className="h-5 w-5" /></AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{other.label}</p>
              <p className="font-medium flex items-center gap-1 truncate">
                {other.name}
                {other.verified && <BadgeCheck className="h-4 w-4 text-primary" aria-label="بائع موثّق" />}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {other.to && (
                <Button asChild variant="ghost" size="sm"><Link to={other.to}>الملف</Link></Button>
              )}
              <Button variant="outline" size="sm" onClick={openChat} disabled={chatBusy}>
                {chatBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4 ml-1" />}
                محادثة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Next action + actions */}
        <Card className={!locked ? "border-primary/30" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">الخطوة التالية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className={locked ? "text-sm text-muted-foreground" : "text-sm font-semibold text-primary"}>{next}</p>

            {(perms.canConfirmShipped || perms.canConfirmReceived || perms.canCancel) && (
              <div className="flex flex-col sm:flex-row gap-2">
                {perms.canConfirmShipped && (
                  <Button onClick={() => run(() => confirmShipped(deal.id), "تم تأكيد التسليم للمشتري")} disabled={busy} className="flex-1 btn-brand">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Truck className="h-4 w-4 ml-1" />} أكّد تسليم المنتج
                  </Button>
                )}
                {perms.canConfirmReceived && (
                  <Button onClick={() => run(() => confirmReceived(deal.id), "تم تأكيد الاستلام — شكراً!")} disabled={busy} className="flex-1 btn-brand">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <PackageCheck className="h-4 w-4 ml-1" />} أكّد الاستلام
                  </Button>
                )}
                {perms.canCancel && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={busy} className="flex-1">
                        <XCircle className="h-4 w-4 ml-1" /> إلغاء الصفقة
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>إلغاء ضمان الاستلام؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          لا يمكن التراجع عن الإلغاء. الإلغاء متاح فقط قبل تأكيد البائع للتسليم.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>تراجع</AlertDialogCancel>
                        <AlertDialogAction onClick={() => run(() => cancelDeal(deal.id), "تم إلغاء الصفقة")}>
                          نعم، ألغِ الصفقة
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}

            {role === "buyer" && deal.status === "pending" && (
              <p className="text-xs text-muted-foreground">لا يمكنك تأكيد الاستلام قبل أن يؤكد البائع التسليم.</p>
            )}

            {/* Dispute / review */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {dispute ? (
                <Button asChild variant="outline" className="flex-1">
                  <Link to={`/disputes/${dispute.id}`}>
                    <AlertTriangle className="h-4 w-4 ml-1" /> عرض الشكوى ({dispute.status === "resolved" ? "محلولة" : dispute.status === "rejected" ? "مرفوضة" : "قيد المراجعة"})
                  </Link>
                </Button>
              ) : (
                perms.canOpenDispute && listing && (
                  <div className="flex-1 [&>button]:w-full">
                    <OpenDisputeDialog listingId={listing.id} sellerId={deal.seller_id} dealId={deal.id} onOpened={() => load()} />
                  </div>
                )
              )}
              {perms.canReview && listing && (
                <div className="flex-1 [&>button]:w-full">
                  <ReviewSellerDialog sellerId={deal.seller_id} listingId={listing.id} sellerName={sellerName} />
                </div>
              )}
              {listing && (
                <Button asChild variant="ghost" className="flex-1">
                  <Link to={`/listing/${listing.id}`}><ExternalLink className="h-4 w-4 ml-1" /> عرض المنتج</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">الخط الزمني</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <DealTimeline deal={deal} />
          </CardContent>
        </Card>

        {deal.notes && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">ملاحظات</CardTitle></CardHeader>
            <CardContent><p className="text-sm whitespace-pre-wrap">{deal.notes}</p></CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default DealDetail;
