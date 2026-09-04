import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Search as SearchIcon } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/EmptyState";
import DealCard, { type DealWithListing } from "@/components/deals/DealCard";
import { DEAL_STATUS_LABEL, dealTab, getDealRole, type DealTab, type DealStatus } from "@/lib/deals";

const TABS: { key: DealTab; label: string }[] = [
  { key: "active", label: "نشطة" },
  { key: "completed", label: "مكتملة" },
  { key: "disputed", label: "متنازع عليها" },
  { key: "cancelled", label: "ملغاة" },
];

const Deals: React.FC = () => {
  const { user, seller, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [deals, setDeals] = useState<DealWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DealTab>("active");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "buyer" | "seller">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | DealStatus>("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      // RLS already scopes rows to the buyer/seller of each deal.
      const { data } = await supabase
        .from("deals")
        .select("*, listings(title, images)")
        .order("created_at", { ascending: false });
      setDeals(((data as unknown) as DealWithListing[]) || []);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const counts = useMemo(() => {
    const c: Record<DealTab, number> = { active: 0, completed: 0, disputed: 0, cancelled: 0 };
    deals.forEach((d) => c[dealTab(d.status)]++);
    return c;
  }, [deals]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return deals.filter((d) => {
      if (dealTab(d.status) !== tab) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      const role = getDealRole(d, user?.id, seller?.id);
      if (roleFilter !== "all" && role !== roleFilter) return false;
      if (needle && !(d.listings?.title || "").toLowerCase().includes(needle) && !d.id.startsWith(needle)) return false;
      return true;
    });
  }, [deals, tab, q, roleFilter, statusFilter, user, seller]);

  const activeStatuses: DealStatus[] = ["pending", "shipped", "delivered"];

  return (
    <Layout>
      <SEO title="صفقاتي — NetPlex" description="مركز متابعة صفقات ضمان الاستلام" />
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">صفقاتي</h1>
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as DealTab); setStatusFilter("all"); }} className="mb-4">
          <TabsList className="w-full grid grid-cols-4 h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs sm:text-sm py-2 gap-1">
                {t.label}
                <span className="text-[10px] opacity-70">({counts[t.key]})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث باسم المنتج أو رقم الصفقة"
              className="pr-9"
              aria-label="بحث في الصفقات"
            />
          </div>
          {seller && (
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
              <SelectTrigger className="sm:w-36" aria-label="تصفية حسب الدور">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="buyer">أنا المشتري</SelectItem>
                <SelectItem value="seller">أنا البائع</SelectItem>
              </SelectContent>
            </Select>
          )}
          {tab === "active" && (
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="sm:w-44" aria-label="تصفية حسب الحالة">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {activeStatuses.map((s) => (
                  <SelectItem key={s} value={s}>{DEAL_STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {(loading || authLoading) && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-4 flex items-center gap-3">
                <Skeleton className="h-16 w-16 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-2 text-left">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !authLoading && deals.length === 0 && (
          <EmptyState
            icon={ShieldCheck}
            title="لا توجد صفقات بعد"
            description="ابدأ بتصفّح المنتجات، وعند الاتفاق مع البائع افتح ضمان الاستلام لمتابعة الصفقة خطوة بخطوة."
            actionLabel="تصفّح المنتجات"
            actionTo="/search"
          />
        )}

        {!loading && deals.length > 0 && filtered.length === 0 && (
          <EmptyState icon={ShieldCheck} title="لا توجد صفقات مطابقة" description="جرّب تبويباً أو فلتراً آخر." />
        )}

        <div className="space-y-3">
          {filtered.map((d) => (
            <DealCard key={d.id} deal={d} role={getDealRole(d, user?.id, seller?.id)} />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Deals;
