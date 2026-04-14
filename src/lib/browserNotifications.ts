/**
 * Request browser notification permission and show native notifications.
 * Works only when the tab is open (no Service Worker needed).
 */

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
};

export const showBrowserNotification = (title: string, body?: string, onClick?: () => void) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    const notif = new Notification(title, {
      body: body || undefined,
      icon: "/favicon.png",
      badge: "/favicon.png",
      dir: "rtl",
      lang: "ar",
    });

    if (onClick) {
      notif.onclick = () => {
        window.focus();
        onClick();
        notif.close();
      };
    }

    // Auto-close after 6 seconds
    setTimeout(() => notif.close(), 6000);
  } catch {
    // Notification constructor may fail in some contexts (e.g. iframes)
  }
};

export const isNotificationSupported = () => "Notification" in window;
export const getNotificationPermission = () => {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
};
