import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Copy, Trash2, Plus, TicketCheck } from "lucide-react";

interface Invite {
  id: string;
  email: string;
  invite_code: string;
  role: string;
  expires_at: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const AdminInvites: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchInvites = async () => {
    const { data, error } = await supabase
      .from("admin_invites")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setInvites(data as Invite[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleCreate = async () => {
    if (!email || !user) return;
    setCreating(true);

    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const { error } = await supabase.from("admin_invites").insert({
      email,
      invite_code: code,
      role: "sub_admin" as any,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم إنشاء الدعوة", description: `الكود: ${code}` });
      setEmail("");
      fetchInvites();
    }
    setCreating(false);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "تم النسخ", description: "تم نسخ كود الدعوة" });
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from("admin_invites").delete().eq("id", id);
    if (!error) {
      toast({ title: "تم الحذف" });
      fetchInvites();
    }
  };

  const getStatus = (invite: Invite) => {
    if (invite.used) return { label: "مُستخدم", variant: "secondary" as const };
    if (new Date(invite.expires_at) < new Date()) return { label: "منتهي", variant: "destructive" as const };
    return { label: "نشط", variant: "default" as const };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <TicketCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">إدارة الدعوات</h1>
        </div>

        {/* Create Invite */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إنشاء دعوة جديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <Label>البريد الإلكتروني للمدعو</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  dir="ltr"
                />
              </div>
              <Button onClick={handleCreate} disabled={creating || !email} className="btn-brand">
                <Plus className="h-4 w-4 ml-2" />
                {creating ? "جاري الإنشاء..." : "إنشاء دعوة"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              سيتم إنشاء كود دعوة صالح لمدة 7 أيام بدور مشرف فرعي (sub_admin)
            </p>
          </CardContent>
        </Card>

        {/* Invites List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الدعوات ({invites.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">جاري التحميل...</p>
            ) : invites.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">لا توجد دعوات بعد</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>البريد</TableHead>
                    <TableHead>الكود</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تنتهي في</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => {
                    const status = getStatus(invite);
                    return (
                      <TableRow key={invite.id}>
                        <TableCell dir="ltr" className="font-mono text-sm">
                          {invite.email}
                        </TableCell>
                        <TableCell dir="ltr" className="font-mono text-sm font-bold">
                          {invite.invite_code}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(invite.expires_at).toLocaleDateString("ar-SA")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopy(invite.invite_code)}
                              title="نسخ الكود"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {!invite.used && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRevoke(invite.id)}
                                title="حذف الدعوة"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminInvites;
