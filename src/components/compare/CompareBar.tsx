import React, { useState } from "react";
import { X, GitCompareArrows, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/contexts/CompareContext";
import { SignedImage } from "@/components/SignedImage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/netplex-ai`;

export const CompareBar: React.FC = () => {
  const { items, removeItem, clearAll } = useCompare();
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (items.length === 0) return null;

  const runCompare = async () => {
    setLoading(true);
    setDialogOpen(true);
    setCompareResult(null);

    const itemsSummary = items
      .map(
        (item, i) =>
          `${i + 1}. ${item.title} - ₪${item.price_ils} - ${item.condition || "غير محدد"} - ${item.region}${item.sellerVerified ? " (بائع موثق ✓)" : ""}${item.sellerTrustScore ? ` - ثقة: ${item.sellerTrustScore}` : ""}`
      )
      .join("\n");

    const message = `قارن بين هذه المنتجات وأخبرني أيها الأفضل من حيث السعر والحالة والبائع:\n${itemsSummary}`;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [{ role: "user", content: message }] }),
      });

      if (!resp.ok) throw new Error("Request failed");

      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream") && resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let result = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                result += content;
                setCompareResult(result);
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      } else {
        const data = await resp.json();
        setCompareResult(data.reply || "عذراً، لم أستطع المقارنة.");
      }
    } catch {
      setCompareResult("عذراً، حدث خطأ أثناء المقارنة. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border shadow-lg animate-in slide-in-from-bottom-4 duration-300" dir="rtl">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 shrink-0">
                <span className="text-xs font-medium max-w-[120px] truncate">{item.title}</span>
                <span className="text-xs text-primary font-bold">₪{item.price_ils.toLocaleString()}</span>
                <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <span className="text-xs text-muted-foreground shrink-0">
              {items.length}/3
            </span>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="ghost" onClick={clearAll} className="text-xs">
              مسح
            </Button>
            <Button
              size="sm"
              onClick={runCompare}
              disabled={items.length < 2 || loading}
              className="gap-1.5"
            >
              <GitCompareArrows className="h-4 w-4" />
              قارن ({items.length})
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5 text-primary" />
              مقارنة المنتجات
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {loading && !compareResult && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {compareResult && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{compareResult}</ReactMarkdown>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompareBar;
