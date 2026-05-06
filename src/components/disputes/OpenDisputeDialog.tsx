import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Props {
  listingId: string;
  sellerId: string;
}

const OpenDisputeDialog: React.FC<Props> = ({ listingId, sellerId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast({ title: "مطلوب", description: "يرجى إدخال العنوان والوصف", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("disputes")
      .insert({
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: sellerId,
        title: title.trim(),
        description: description.trim(),
        amount_ils: amount ? Number(amount) : null,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "تم فتح الشكوى", description: "سيتواصل الأدمن معك قريباً" });
    setOpen(false);
    if (data?.id) navigate(`/disputes/${data.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <AlertTriangle className="h-4 w-4" />
          فتح شكوى
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            فتح شكوى رسمية
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>عنوان الشكوى</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: المنتج لا يطابق الوصف" />
          </div>
          <div className="space-y-1.5">
            <Label>تفاصيل الشكوى</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="اشرح المشكلة بالتفصيل..." />
          </div>
          <div className="space-y-1.5">
            <Label>المبلغ المتنازع عليه (اختياري)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₪" dir="ltr" />
          </div>
          <Button onClick={submit} disabled={submitting} className="w-full btn-brand">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            إرسال الشكوى
          </Button>
          <p className="text-xs text-muted-foreground">
            سيتم إعلام البائع وفريق الأدمن. تابع حالة الشكوى من صفحة "شكاواي".
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OpenDisputeDialog;
