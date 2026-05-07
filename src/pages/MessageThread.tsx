import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import OpenDisputeDialog from "@/components/disputes/OpenDisputeDialog";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string | null;
}

const MessageThread: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [otherName, setOtherName] = useState<string>("محادثة");
  const [listingTitle, setListingTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: c } = await supabase
        .from("conversations")
        .select("id, buyer_id, seller_id, listing_id")
        .eq("id", id)
        .maybeSingle();
      if (!c) return;
      setConv(c);

      // Load other party info
      const isBuyer = c.buyer_id === user.id;
      if (isBuyer) {
        const { data: s } = await supabase
          .from("sellers")
          .select("shop_name, user_id")
          .eq("id", c.seller_id)
          .maybeSingle();
        if (s?.shop_name) setOtherName(s.shop_name);
        else if (s?.user_id) {
          const { data: p } = await supabase.from("profiles").select("name").eq("id", s.user_id).maybeSingle();
          setOtherName(p?.name || "بائع");
        }
      } else {
        const { data: p } = await supabase.from("profiles").select("name").eq("id", c.buyer_id).maybeSingle();
        setOtherName(p?.name || "مشتري");
      }
      if (c.listing_id) {
        const { data: l } = await supabase.from("listings").select("title").eq("id", c.listing_id).maybeSingle();
        setListingTitle(l?.title ?? null);
      }

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at, read_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Message[]);

      // Mark unread incoming as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", id)
        .neq("sender_id", user.id)
        .is("read_at", null);
    })();
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`thread-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.find((x) => x.id === m.id) ? prev : [...prev, m]));
          if (user && m.sender_id !== user.id) {
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", m.id)
              .then(() => {});
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !id || !user || sending) return;
    setSending(true);
    const body = input.trim();
    setInput("");
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_id: user.id, body });
    if (error) {
      toast({ title: "تعذّر الإرسال", description: error.message, variant: "destructive" });
      setInput(body);
    }
    setSending(false);
  };

  return (
    <Layout>
      <div className="container max-w-3xl mx-auto px-4 py-4 flex flex-col h-[calc(100vh-8rem)]" dir="rtl">
        <div className="flex items-center gap-2 pb-3 border-b mb-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/messages")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{otherName}</h2>
            {listingTitle && conv?.listing_id && (
              <Link to={`/listing/${conv.listing_id}`} className="text-xs text-primary truncate block">
                حول: {listingTitle}
              </Link>
            )}
          </div>
          {conv?.listing_id && conv.buyer_id === user?.id && (
            <OpenDisputeDialog listingId={conv.listing_id} sellerId={conv.seller_id} />
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 py-2">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              ابدأ المحادثة بإرسال أول رسالة
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words",
                      mine
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    )}
                  >
                    {m.body}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t pt-3 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="اكتب رسالة..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring max-h-32"
            dir="rtl"
          />
          <Button size="icon" onClick={send} disabled={!input.trim() || sending} className="rounded-xl">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default MessageThread;
