import React, { useEffect, useRef, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, AlertTriangle, Shield } from "lucide-react";
import { format } from "date-fns";

interface Dispute {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  title: string;
  description: string;
  amount_ils: number | null;
  status: "pending" | "under_review" | "resolved" | "rejected";
  admin_notes: string | null;
  created_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  is_admin: boolean;
  created_at: string;
}

const statusLabel: Record<string, string> = {
  pending: "قيد الانتظار",
  under_review: "قيد المراجعة",
  resolved: "تم الحل ✅",
  rejected: "مرفوضة ❌",
};

const DisputeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!id) return;
    const [d, m] = await Promise.all([
      supabase.from("disputes").select("*").eq("id", id).maybeSingle(),
      supabase.from("dispute_messages").select("*").eq("dispute_id", id).order("created_at"),
    ]);
    setDispute(d.data as Dispute | null);
    setMessages((m.data || []) as Message[]);
    if (d.data?.admin_notes) setAdminNotes(d.data.admin_notes);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [id, user]);

  // Realtime new messages
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`dispute_${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "dispute_messages",
        filter: `dispute_id=eq.${id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!user || !id || !body.trim()) return;
    setSending(true);
    const { error } = await supabase.from("dispute_messages").insert({
      dispute_id: id,
      sender_id: user.id,
      body: body.trim(),
      is_admin: isAdmin,
    });
    setSending(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    setBody("");
  };

  const updateStatus = async (status: Dispute["status"]) => {
    if (!user || !id) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("disputes")
      .update({ status, admin_notes: adminNotes || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setUpdatingStatus(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم تحديث الحالة" });
    load();
  };

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  if (loading) {
    return <Layout><div className="py-20 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div></Layout>;
  }
  if (!dispute) {
    return <Layout><div className="py-20 text-center text-muted-foreground">الشكوى غير موجودة</div></Layout>;
  }

  const isParticipant = dispute.buyer_id === user.id || isAdmin || dispute.seller_id; // RLS handles real check
  const canSend = dispute.status !== "resolved" && dispute.status !== "rejected";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  {dispute.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  فُتحت في {format(new Date(dispute.created_at), "yyyy-MM-dd HH:mm")}
                  {dispute.amount_ils ? ` • المبلغ ₪${dispute.amount_ils}` : ""}
                </p>
              </div>
              <Badge variant={dispute.status === "resolved" ? "default" : dispute.status === "rejected" ? "destructive" : "secondary"}>
                {statusLabel[dispute.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm bg-muted/40 p-3 rounded">{dispute.description}</p>
            <Link to={`/listing/${dispute.listing_id}`} className="text-xs text-primary hover:underline">
              عرض المنتج المتعلق ←
            </Link>
            {dispute.admin_notes && (
              <div className="text-sm p-3 rounded border bg-card">
                <p className="font-medium flex items-center gap-1 mb-1"><Shield className="h-3.5 w-3.5" /> ملاحظات الأدمن</p>
                <p className="text-muted-foreground">{dispute.admin_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> إدارة الأدمن</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="ملاحظات تظهر للطرفين..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={updatingStatus} onClick={() => updateStatus("under_review")}>قيد المراجعة</Button>
                <Button size="sm" disabled={updatingStatus} onClick={() => updateStatus("resolved")}>إغلاق كمحلولة</Button>
                <Button size="sm" variant="destructive" disabled={updatingStatus} onClick={() => updateStatus("rejected")}>رفض</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">المحادثة</CardTitle></CardHeader>
          <CardContent>
            <div ref={scrollRef} className="space-y-2 max-h-[400px] overflow-y-auto pb-2">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">لا توجد رسائل بعد</p>
              ) : messages.map((m) => {
                const mine = m.sender_id === user.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      m.is_admin ? "bg-primary/10 border border-primary/30" :
                      mine ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      {m.is_admin && <p className="text-xs font-medium mb-1 flex items-center gap-1"><Shield className="h-3 w-3" /> الأدمن</p>}
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className="text-[10px] opacity-70 mt-1">{format(new Date(m.created_at), "HH:mm")}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {canSend ? (
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Textarea
                  placeholder="اكتب رسالتك..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={send} disabled={sending || !body.trim()} className="self-end">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground mt-3 pt-3 border-t">
                هذه الشكوى مغلقة ولا يمكن إرسال رسائل جديدة.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DisputeDetail;
