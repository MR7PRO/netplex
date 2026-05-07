import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { getRelativeTime } from "@/lib/constants";

interface ConvRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string | null;
  last_message_at: string;
  buyer_profile?: { name: string } | null;
  seller?: { shop_name: string | null; user_id: string; profiles?: { name: string } | null } | null;
  listing?: { title: string } | null;
  last_message?: { body: string; sender_id: string } | null;
  unread_count?: number;
}

const Messages: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id, listing_id, last_message_at")
      .order("last_message_at", { ascending: false });

    const rows = (data ?? []) as ConvRow[];
    // Enrich
    const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
    const buyerIds = [...new Set(rows.map((r) => r.buyer_id))];
    const listingIds = [...new Set(rows.map((r) => r.listing_id).filter(Boolean) as string[])];

    const [sellersRes, profilesRes, listingsRes, msgsRes] = await Promise.all([
      sellerIds.length ? supabase.from("sellers").select("id, shop_name, user_id").in("id", sellerIds) : { data: [] },
      buyerIds.length ? supabase.from("profiles").select("id, name").in("id", buyerIds) : { data: [] },
      listingIds.length ? supabase.from("listings").select("id, title").in("id", listingIds) : { data: [] },
      supabase
        .from("messages")
        .select("conversation_id, body, sender_id, read_at, created_at")
        .in("conversation_id", rows.map((r) => r.id))
        .order("created_at", { ascending: false }),
    ]);

    const sellerNameMap = new Map<string, { shop_name: string | null; user_id: string }>();
    (sellersRes.data ?? []).forEach((s: any) => sellerNameMap.set(s.id, s));
    const sellerUserIds = (sellersRes.data ?? []).map((s: any) => s.user_id);
    const sellerProfilesRes = sellerUserIds.length
      ? await supabase.from("profiles").select("id, name").in("id", sellerUserIds)
      : { data: [] };
    const profMap = new Map<string, string>();
    [...(profilesRes.data ?? []), ...(sellerProfilesRes.data ?? [])].forEach((p: any) =>
      profMap.set(p.id, p.name)
    );
    const listingMap = new Map<string, string>();
    (listingsRes.data ?? []).forEach((l: any) => listingMap.set(l.id, l.title));

    const lastMsgMap = new Map<string, any>();
    const unreadMap = new Map<string, number>();
    (msgsRes.data ?? []).forEach((m: any) => {
      if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m);
      if (m.sender_id !== user.id && !m.read_at) {
        unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) ?? 0) + 1);
      }
    });

    setConvs(
      rows.map((r) => {
        const s = sellerNameMap.get(r.seller_id);
        const isBuyer = r.buyer_id === user.id;
        const otherName = isBuyer
          ? s?.shop_name || profMap.get(s?.user_id ?? "") || "بائع"
          : profMap.get(r.buyer_id) || "مشتري";
        return {
          ...r,
          seller: s ? { ...s, profiles: { name: profMap.get(s.user_id) || "" } } : null,
          listing: r.listing_id ? { title: listingMap.get(r.listing_id) || "" } : null,
          last_message: lastMsgMap.get(r.id),
          unread_count: unreadMap.get(r.id) ?? 0,
          buyer_profile: { name: otherName },
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("messages-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  return (
    <Layout>
      <div className="container max-w-3xl mx-auto py-6 px-4" dir="rtl">
        <h1 className="text-2xl font-bold mb-6">الرسائل</h1>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : convs.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">لا توجد محادثات</h3>
            <p className="text-sm text-muted-foreground">
              ابدأ محادثة من خلال زر "مراسلة البائع" في صفحة المنتج
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {convs.map((c) => {
              const otherName = c.buyer_profile?.name || "محادثة";
              return (
                <Link
                  key={c.id}
                  to={`/messages/${c.id}`}
                  className="block"
                >
                  <Card className="p-4 hover:bg-accent transition-colors flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate">{otherName}</p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {getRelativeTime(c.last_message_at)}
                        </span>
                      </div>
                      {c.listing?.title && (
                        <p className="text-xs text-primary truncate">حول: {c.listing.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground truncate">
                        {c.last_message?.body || "لا توجد رسائل بعد"}
                      </p>
                    </div>
                    {(c.unread_count ?? 0) > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                        {c.unread_count}
                      </span>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Messages;
