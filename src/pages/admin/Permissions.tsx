import { useState, useEffect } from "react";
import { Search, ShieldCheck, ShieldX, Loader2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminAudit } from "@/hooks/useAdminAudit";

interface UserWithRole {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string | null;
  role: string;
}

export default function AdminPermissions() {
  const { toast } = useToast();
  const { logAction } = useAdminAudit();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: UserWithRole | null;
    action: "grant" | "revoke";
  }>({ open: false, user: null, action: "grant" });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);

    // Fetch all profiles (admin has SELECT policy)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, email, phone, avatar_url, created_at")
      .order("created_at", { ascending: false });

    if (profilesError || !profiles) {
      setLoading(false);
      return;
    }

    // Fetch all user_roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const rolesMap = new Map<string, string>();
    roles?.forEach((r) => rolesMap.set(r.user_id, r.role));

    const usersWithRoles: UserWithRole[] = profiles.map((p) => ({
      ...p,
      role: rolesMap.get(p.id) || "user",
    }));

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const handleGrantSubAdmin = async (user: UserWithRole) => {
    setProcessing(user.id);
    try {
      // Upsert into user_roles
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role: "sub_admin" as any }, { onConflict: "user_id" });

      if (error) throw error;

      await logAction({
        action: "grant_sub_admin",
        entityType: "user",
        entityId: user.id,
        details: { name: user.name, email: user.email },
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: "sub_admin" } : u))
      );
      toast({ title: "تم منح الصلاحية", description: `${user.name} أصبح تاجر مؤهل للنشر` });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
      setConfirmDialog({ open: false, user: null, action: "grant" });
    }
  };

  const handleRevokeSubAdmin = async (user: UserWithRole) => {
    setProcessing(user.id);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: "user" as any })
        .eq("user_id", user.id);

      if (error) throw error;

      await logAction({
        action: "revoke_sub_admin",
        entityType: "user",
        entityId: user.id,
        details: { name: user.name, email: user.email },
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: "user" } : u))
      );
      toast({ title: "تم سحب الصلاحية", description: `${user.name} أصبح مستخدم عادي` });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
      setConfirmDialog({ open: false, user: null, action: "revoke" });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-primary text-primary-foreground">أدمن</Badge>;
      case "sub_admin":
        return <Badge className="bg-success text-success-foreground">تاجر مؤهل</Badge>;
      default:
        return <Badge variant="secondary">مستخدم</Badge>;
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.includes(searchQuery)
  );

  const subAdmins = users.filter((u) => u.role === "sub_admin");
  const regularUsers = users.filter((u) => u.role === "user");

  return (
    <AdminLayout title="إدارة الصلاحيات">
      <p className="text-muted-foreground mb-6">
        من هنا يمكنك منح أو سحب صلاحية النشر (تاجر مؤهل) للمستخدمين
      </p>

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">الكل ({users.length})</TabsTrigger>
          <TabsTrigger value="sub_admin">تجار مؤهلون ({subAdmins.length})</TabsTrigger>
          <TabsTrigger value="user">مستخدمون ({regularUsers.length})</TabsTrigger>
        </TabsList>

        {["all", "sub_admin", "user"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>البريد الإلكتروني</TableHead>
                      <TableHead>الهاتف</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>تاريخ التسجيل</TableHead>
                      <TableHead className="w-32">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers
                      .filter((u) => {
                        if (tab === "sub_admin") return u.role === "sub_admin";
                        if (tab === "user") return u.role === "user";
                        return true;
                      })
                      .map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.name}
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                                  {user.name?.[0]?.toUpperCase() || "U"}
                                </div>
                              )}
                              <span className="font-medium">{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm" dir="ltr">
                            {user.email || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm" dir="ltr">
                            {user.phone || "-"}
                          </TableCell>
                          <TableCell>{getRoleBadge(user.role)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString("ar")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {user.role === "admin" ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : user.role === "sub_admin" ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={processing === user.id}
                                onClick={() =>
                                  setConfirmDialog({ open: true, user, action: "revoke" })
                                }
                              >
                                {processing === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserX className="h-4 w-4 ml-1" />
                                    سحب
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="btn-brand"
                                disabled={processing === user.id}
                                onClick={() =>
                                  setConfirmDialog({ open: true, user, action: "grant" })
                                }
                              >
                                {processing === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 ml-1" />
                                    تأهيل
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredUsers.filter((u) => {
                      if (tab === "sub_admin") return u.role === "sub_admin";
                      if (tab === "user") return u.role === "user";
                      return true;
                    }).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          لا يوجد مستخدمون
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ open: false, user: null, action: "grant" })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "grant"
                ? "تأهيل التاجر للنشر"
                : "سحب صلاحية النشر"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "grant"
                ? `هل تريد منح "${confirmDialog.user?.name}" صلاحية النشر كتاجر مؤهل؟ سيتمكن من إضافة وإدارة المنتجات مباشرة.`
                : `هل تريد سحب صلاحية النشر من "${confirmDialog.user?.name}"؟ سيصبح مستخدم عادي ولن يتمكن من إدارة المنتجات.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog.user) {
                  if (confirmDialog.action === "grant") {
                    handleGrantSubAdmin(confirmDialog.user);
                  } else {
                    handleRevokeSubAdmin(confirmDialog.user);
                  }
                }
              }}
              className={confirmDialog.action === "revoke" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {confirmDialog.action === "grant" ? "تأهيل" : "سحب الصلاحية"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
