import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useSignedImageUrl } from "@/hooks/useSignedImageUrl";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, User } from "lucide-react";
import { format } from "date-fns";

interface VerificationRow {
  id: string;
  seller_id: string;
  user_id: string;
  id_image_path: string;
  full_name: string | null;
  id_number: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  sellers?: { shop_name: string | null } | null;
  profiles?: { name: string | null; email: string | null } | null;
}

const VerificationItem: React.FC<{ row: VerificationRow; onChanged: () => void }> = ({ row, onChanged }) => {
  const { signedUrl } = useSignedImageUrl(row.id_image_path);
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);

  const review = async (status: "approved" | "rejected") => {
    if (!user) return;
    if (status === "rejected" && !notes.trim()) {
      toast({ title: "مطلوب", description: "أضف سبب الرفض", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { error } = await supabase
      .from("seller_verifications")
      .update({ status, admin_notes: notes.trim() || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", row.id);
    setWorking(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "approved" ? "تم التوثيق ✓" : "تم الرفض" });
    onChanged();
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              {row.sellers?.shop_name || row.profiles?.name || "بائع"}
            </p>
            <p className="text-xs text-muted-foreground">{row.profiles?.email}</p>
          </div>
          <Badge variant={row.status === "pending" ? "secondary" : row.status === "approved" ? "default" : "destructive"}>
            {row.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">الاسم:</span> {row.full_name || "-"}</div>
          <div dir="ltr" className="text-right"><span className="text-muted-foreground">رقم الهوية:</span> {row.id_number || "-"}</div>
        </div>

        {signedUrl && (
          <a href={signedUrl} target="_blank" rel="noopener noreferrer">
            <img src={signedUrl} alt="ID" className="w-full max-h-80 object-contain rounded border" />
          </a>
        )}

        {row.status === "pending" && (
          <>
            <Textarea
              placeholder="ملاحظات الأدمن (مطلوبة عند الرفض)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button onClick={() => review("approved")} disabled={working} className="flex-1">
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 ml-1" />موافقة</>}
              </Button>
              <Button onClick={() => review("rejected")} disabled={working} variant="destructive" className="flex-1">
                <XCircle className="h-4 w-4 ml-1" />رفض
              </Button>
            </div>
          </>
        )}

        {row.admin_notes && row.status !== "pending" && (
          <p className="text-xs p-2 bg-muted/40 rounded">ملاحظات: {row.admin_notes}</p>
        )}

        <p className="text-xs text-muted-foreground">{format(new Date(row.created_at), "yyyy-MM-dd HH:mm")}</p>
      </CardContent>
    </Card>
  );
};

const AdminVerifications: React.FC = () => {
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("seller_verifications")
      .select("*, sellers(shop_name), profiles!seller_verifications_user_id_fkey(name, email)" as any)
      .order("created_at", { ascending: false });
    if (filter === "pending") q = q.eq("status", "pending");
    const { data, error } = await q;
    if (error) {
      // fallback without join if FK alias missing
      const { data: d2 } = await supabase
        .from("seller_verifications")
        .select("*")
        .order("created_at", { ascending: false });
      setRows((d2 || []) as VerificationRow[]);
    } else {
      setRows((data || []) as any);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            توثيق البائعين
          </h1>
          <div className="flex gap-2">
            <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
              المعلقة
            </Button>
            <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
              الكل
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">لا توجد طلبات</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rows.map((r) => <VerificationItem key={r.id} row={r} onChanged={load} />)}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminVerifications;
