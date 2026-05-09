import React, { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, Plus, Smartphone, Apple, Bell, CheckCircle2 } from "lucide-react";
import { requestNotificationPermission, getNotificationPermission } from "@/lib/browserNotifications";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>(getNotificationPermission());

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore
      window.navigator.standalone === true);

  useEffect(() => {
    // Reuse a previously-captured prompt (e.g. from header button)
    const cached = (window as any).__deferredInstallPrompt as BeforeInstallPromptEvent | undefined;
    if (cached) setDeferred(cached);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      toast.success("تم تثبيت التطبيق ✅");
    }
    setDeferred(null);
  };

  const handleEnableNotifs = async () => {
    const ok = await requestNotificationPermission();
    setNotifPerm(getNotificationPermission());
    if (ok) toast.success("تم تفعيل الإشعارات 🔔");
    else toast.error("لم يتم تفعيل الإشعارات");
  };

  return (
    <Layout>
      <div className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">ثبّت NetPlex على هاتفك</h1>
          <p className="text-muted-foreground">
            استمتع بتجربة كتطبيق حقيقي مع وصول أسرع وإشعارات فورية للرسائل والعروض
          </p>
        </div>

        {(isStandalone || installed) && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <p className="font-medium">التطبيق مثبّت بالفعل على جهازك ✅</p>
            </CardContent>
          </Card>
        )}

        {/* Android / Chrome - Direct install button */}
        {!isStandalone && deferred && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                تثبيت بنقرة واحدة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleInstall} size="lg" className="w-full">
                <Download className="h-5 w-5 ml-2" />
                ثبّت التطبيق الآن
              </Button>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {!isStandalone && (isIOS || !deferred) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="h-5 w-5" />
                على iPhone / iPad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0 h-7 w-7 rounded-full p-0 flex items-center justify-center">1</Badge>
                <p>افتح الموقع في متصفّح <strong>Safari</strong> (ليس Chrome)</p>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0 h-7 w-7 rounded-full p-0 flex items-center justify-center">2</Badge>
                <p className="flex items-center gap-1 flex-wrap">
                  انقر زر المشاركة <Share2 className="h-4 w-4 inline text-primary" /> في الأسفل
                </p>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0 h-7 w-7 rounded-full p-0 flex items-center justify-center">3</Badge>
                <p className="flex items-center gap-1 flex-wrap">
                  اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong> <Plus className="h-4 w-4 inline" />
                </p>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0 h-7 w-7 rounded-full p-0 flex items-center justify-center">4</Badge>
                <p>اضغط <strong>"إضافة"</strong> وستجد التطبيق على الشاشة الرئيسية</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions (fallback if no beforeinstallprompt) */}
        {!isStandalone && isAndroid && !deferred && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                على Android
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0 h-7 w-7 rounded-full p-0 flex items-center justify-center">1</Badge>
                <p>افتح الموقع في <strong>Chrome</strong></p>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0 h-7 w-7 rounded-full p-0 flex items-center justify-center">2</Badge>
                <p>انقر القائمة (⋮) في أعلى المتصفّح</p>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0 h-7 w-7 rounded-full p-0 flex items-center justify-center">3</Badge>
                <p>اختر <strong>"تثبيت التطبيق"</strong> أو "إضافة إلى الشاشة الرئيسية"</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              الإشعارات الفورية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              فعّل الإشعارات لتصلك تنبيهات الرسائل، العروض الجديدة، وتحديثات منتجاتك فور حدوثها
              (تعمل عندما يكون التطبيق مفتوحاً).
            </p>
            {notifPerm === "granted" ? (
              <div className="flex items-center gap-2 text-success text-sm">
                <CheckCircle2 className="h-5 w-5" />
                الإشعارات مفعّلة ✅
              </div>
            ) : notifPerm === "denied" ? (
              <p className="text-sm text-destructive">
                الإشعارات محجوبة. فعّلها من إعدادات المتصفّح ثم أعد تحميل الصفحة.
              </p>
            ) : (
              <Button onClick={handleEnableNotifs} variant="outline" className="w-full">
                <Bell className="h-4 w-4 ml-2" />
                فعّل الإشعارات
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="py-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">مميزات التثبيت:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>أيقونة على الشاشة الرئيسية مثل أي تطبيق</li>
              <li>فتح بدون شريط متصفّح — تجربة أوسع</li>
              <li>وصول أسرع للسوق</li>
              <li>إشعارات فورية للرسائل والعروض</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Install;
