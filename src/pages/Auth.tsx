import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/layout/Layout";
import { getAuthErrorMessage } from "@/lib/authErrors";
import { Separator } from "@/components/ui/separator";

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      toast({
        title: "خطأ في تسجيل الدخول",
        description: getAuthErrorMessage(error),
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await signIn(
        formData.get("email") as string,
        formData.get("password") as string
      );
      toast({ title: "تم تسجيل الدخول بنجاح" });
      navigate("/");
    } catch (error: unknown) {
      toast({ 
        title: "خطأ في تسجيل الدخول", 
        description: getAuthErrorMessage(error),
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      await signUp(
        formData.get("email") as string,
        formData.get("password") as string,
        formData.get("name") as string,
        formData.get("phone") as string
      );
      toast({ title: "تم إنشاء الحساب بنجاح!" });
      navigate("/");
    } catch (error: unknown) {
      toast({ 
        title: "خطأ في إنشاء الحساب", 
        description: getAuthErrorMessage(error),
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout hideFooter>
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-bold text-2xl">N</span>
            </div>
            <CardTitle className="text-2xl">مرحباً بك في نت بلكس</CardTitle>
            <CardDescription>سجل دخولك أو أنشئ حساب جديد</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Google Sign In Button */}
            <Button
              variant="outline"
              className="w-full flex items-center gap-3 mb-4"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {googleLoading ? "جاري التحميل..." : "المتابعة مع Google"}
            </Button>

            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                أو
              </span>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="register">حساب جديد</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">البريد الإلكتروني</Label>
                    <Input id="login-email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">كلمة المرور</Label>
                    <Input id="login-password" name="password" type="password" required />
                  </div>
                  <Button type="submit" className="w-full btn-brand" disabled={loading}>
                    {loading ? "جاري التحميل..." : "تسجيل الدخول"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">الاسم الكامل</Label>
                    <Input id="reg-name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">البريد الإلكتروني</Label>
                    <Input id="reg-email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">رقم الهاتف</Label>
                    <Input id="reg-phone" name="phone" type="tel" placeholder="059xxxxxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">كلمة المرور</Label>
                    <Input id="reg-password" name="password" type="password" required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full btn-brand" disabled={loading}>
                    {loading ? "جاري التحميل..." : "إنشاء حساب"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Auth;
