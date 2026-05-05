import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Upload, Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";

type Status = "pending" | "approved" | "rejected";

interface Verification {
  id: string;
  status: Status;
  admin_notes: string | null;
  created_at: string;
}

const VerificationCard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [latest, setLatest] = useState<Verification | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!seller) {
        setLoading(false);
        return;
      }
      setSellerId(seller.id);
      const { data } = await supabase
        .from("seller_verifications")
        .select("id, status, admin_notes, created_at")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLatest(data as Verification | null);
      setLoading(false);
    })();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !sellerId) return;
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast({ title: "مطلوب", description: "ارفع صورة الهوية", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "صور فقط", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "خطأ", description: "الحد الأقصى 5MB", variant: "destructive" });
      return;
    }
    if (!fullName.trim() || !idNumber.trim()) {
      toast({ title: "مطلوب", description: "أدخل الاسم ورقم الهوية", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `seller-ids/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("listings")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from("seller_verifications")
        .insert({
          seller_id: sellerId,
          user_id: user.id,
          id_image_path: path,
          full_name: fullName.trim(),
          id_number: idNumber.trim(),
        })
        .select("id, status, admin_notes, created_at")
        .single();
      if (error) throw error;

      setLatest(data as Verification);
      toast({ title: "تم الإرسال", description: "سيتم مراجعة طلبك قريباً" });
      if (fileRef.current) fileRef.current.value = "";
      setFullName("");
      setIdNumber("");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!sellerId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          توثيق الهوية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {latest?.status === "approved" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-sm">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">حسابك موثّق ✓</span>
          </div>
        )}

        {latest?.status === "pending" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm">
            <Clock className="h-5 w-5" />
            <span>طلبك قيد المراجعة من فريق الأدمن</span>
          </div>
        )}

        {(!latest || latest.status === "rejected") && (
          <>
            {latest?.status === "rejected" && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <XCircle className="h-5 w-5" />
                  تم رفض طلبك السابق
                </div>
                {latest.admin_notes && <p className="text-xs">السبب: {latest.admin_notes}</p>}
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              ارفع صورة هويتك للحصول على شارة "بائع موثق" وزيادة ثقة المشترين.
            </p>

            <div className="space-y-2">
              <Label>الاسم الكامل (كما في الهوية)</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
            </div>

            <div className="space-y-2">
              <Label>رقم الهوية</Label>
              <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} maxLength={20} dir="ltr" />
            </div>

            <div className="space-y-2">
              <Label>صورة الهوية (واضحة، الحد الأقصى 5MB)</Label>
              <Input ref={fileRef} type="file" accept="image/*" />
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full btn-brand">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Upload className="h-4 w-4 ml-2" />}
              إرسال طلب التوثيق
            </Button>

            <p className="text-xs text-muted-foreground">
              🔒 صورة هويتك مشفرة ولن يطلع عليها سوى فريق الأدمن المسؤول.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default VerificationCard;
