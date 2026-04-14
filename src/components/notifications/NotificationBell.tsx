import React, { useEffect } from "react";
import { Bell, MessageSquare, Star, Check, CheckCheck, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { requestNotificationPermission, isNotificationSupported, getNotificationPermission } from "@/lib/browserNotifications";

const iconMap: Record<string, React.ReactNode> = {
  new_offer: <MessageSquare className="h-4 w-4 text-primary" />,
  new_review: <Star className="h-4 w-4 fill-primary text-primary" />,
  offer_accepted: <Check className="h-4 w-4 text-success" />,
  offer_rejected: <MessageSquare className="h-4 w-4 text-destructive" />,
  submission_approved: <Check className="h-4 w-4 text-success" />,
  submission_rejected: <MessageSquare className="h-4 w-4 text-destructive" />,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} ي`;
}

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  // Request browser notification permission on first interaction
  useEffect(() => {
    if (isNotificationSupported() && getNotificationPermission() === "default") {
      // Auto-request after a short delay
      const timer = setTimeout(() => requestNotificationPermission(), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClick = (notif: Notification) => {
    if (!notif.read) markAsRead(notif.id);
    if (notif.link) navigate(notif.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -left-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-in zoom-in-50"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        dir="rtl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">الإشعارات</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 ml-1" />
              قراءة الكل
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              لا توجد إشعارات
            </div>
          ) : (
            <div>
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-right px-4 py-3 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b last:border-0 ${
                    !notif.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {iconMap[notif.type] || <Bell className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm line-clamp-1 ${!notif.read ? "font-semibold" : ""}`}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notif.body}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
