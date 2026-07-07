import React from "react";
import { BellRing, BellOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const PushOptInCard: React.FC = () => {
  const { supported, subscribed, loading, subscribe, unsubscribe, permission } = usePushNotifications();

  if (!supported) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-5 w-5 text-primary" />
          إشعارات المتصفح (Push)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          فعّل الإشعارات لتصلك التنبيهات (عروض جديدة، رسائل، تحديث الطلبات) حتى وأنت خارج التطبيق.
        </p>

        {permission === "denied" ? (
          <p className="text-sm text-destructive">
            الإشعارات محظورة من إعدادات المتصفح. فعّلها من إعدادات الموقع في متصفحك.
          </p>
        ) : subscribed ? (
          <Button variant="outline" onClick={unsubscribe} disabled={loading} className="w-full">
            <BellOff className="h-4 w-4 ml-2" />
            إيقاف الإشعارات
          </Button>
        ) : (
          <Button onClick={subscribe} disabled={loading} className="w-full btn-brand">
            <BellRing className="h-4 w-4 ml-2" />
            {loading ? "جارٍ التفعيل..." : "تفعيل الإشعارات"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
