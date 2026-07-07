import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { brandToast } from "@/lib/brandToast";

// VAPID public key (safe to expose in client).
export const VAPID_PUBLIC_KEY =
  "BAAzC3mZ4XvxJqM6mzSiQoh4twC929rgicVhnTsf6Cww8RIDMdFtC05VjXwHkqNOoeNxplrIJ781F8Mdh5Al3vg";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export function usePushNotifications() {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    isPushSupported() ? Notification.permission : "unsupported"
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    navigator.serviceWorker
      .getRegistration("/push-sw.js")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, [user]);

  const subscribe = useCallback(async () => {
    if (!isPushSupported()) {
      brandToast.error("متصفحك لا يدعم إشعارات Push");
      return false;
    }
    if (!user) {
      brandToast.error("سجّل الدخول لتفعيل الإشعارات");
      return false;
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        brandToast.error("يجب السماح بالإشعارات من إعدادات المتصفح");
        return false;
      }
      const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/push-sw.js" });
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: (json.keys as any)?.p256dh || "",
          auth: (json.keys as any)?.auth || "",
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
      setSubscribed(true);
      brandToast.success("تم تفعيل إشعارات المتصفح ✓");
      return true;
    } catch (err: any) {
      console.error("Push subscribe failed:", err);
      brandToast.error("تعذّر تفعيل الإشعارات");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!isPushSupported() || !user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      brandToast.success("تم إيقاف الإشعارات");
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { supported: isPushSupported(), permission, subscribed, loading, subscribe, unsubscribe };
}
