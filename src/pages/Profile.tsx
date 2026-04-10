import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Phone, Save, Loader2, Camera, LayoutDashboard, Store, FileText, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const Profile: React.FC = () => {
  const { user, profile, isAdmin, userRole, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [activeListings, setActiveListings] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);

  // Fetch quick stats for admin/sub_admin
  useEffect(() => {
    if (!user || (!isAdmin && userRole !== "sub_admin")) return;
    
    const fetchStats = async () => {
      if (isAdmin) {
        const [subsRes, reportsRes, listingsRes] = await Promise.all([
          supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "available"),
        ]);
        setPendingSubmissions(subsRes.count ?? 0);
        setPendingReports(reportsRes.count ?? 0);
        setActiveListings(listingsRes.count ?? 0);
      } else {
        // sub_admin: only own listings
        const { data: seller } = await supabase
          .from("sellers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (seller) {
          const { count } = await supabase
            .from("listings")
            .select("id", { count: "exact", head: true })
            .eq("seller_id", seller.id)
            .eq("status", "available");
          setActiveListings(count ?? 0);
        }
      }
    };
    fetchStats();
  }, [user, isAdmin, userRole]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "يرجى اختيار صورة فقط", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "خطأ", description: "حجم الصورة يجب أن لا يتجاوز 2MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Add cache-busting param
      const url = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(url);
      await refreshProfile();
      toast({ title: "تم الرفع", description: "تم تحديث الصورة الشخصية" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name, phone })
        .eq("id", user.id);

      if (error) throw error;
      await refreshProfile();
      toast({ title: "تم الحفظ", description: "تم تحديث بياناتك بنجاح" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">يرجى تسجيل الدخول أولاً</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">الإعدادات</h1>

        {/* Quick access cards for admin/sub_admin */}
        {(isAdmin || userRole === "sub_admin") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {isAdmin && (
              <Card 
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                onClick={() => navigate("/admin")}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">لوحة التحكم</p>
                    <p className="text-xs text-muted-foreground">إدارة الموقع والمستخدمين</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {(isAdmin || userRole === "sub_admin") && (
              <Card 
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                onClick={() => navigate("/seller/my-store")}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">متجري</p>
                    <p className="text-xs text-muted-foreground">إدارة المنتجات والمبيعات</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              الملف الشخصي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Avatar with upload */}
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
              <div>
                <p className="font-medium">{name || "مستخدم"}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-primary hover:underline mt-1"
                  disabled={uploading}
                >
                  تغيير الصورة
                </button>
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                البريد الإلكتروني
              </Label>
              <Input value={user.email || ""} disabled className="bg-muted" />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                الاسم
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" />
                رقم الهاتف
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05XXXXXXXX"
                dir="ltr"
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full btn-brand">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ التغييرات
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
