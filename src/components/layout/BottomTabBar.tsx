import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, MessageSquare, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Tab {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (path: string) => boolean;
}

const TABS: Tab[] = [
  { to: "/", label: "الرئيسية", icon: Home, match: (p) => p === "/" },
  { to: "/search", label: "البحث", icon: Search, match: (p) => p.startsWith("/search") },
  { to: "/messages", label: "الرسائل", icon: MessageSquare, match: (p) => p.startsWith("/messages") },
  { to: "/following", label: "متابعاتي", icon: Heart, match: (p) => p.startsWith("/following") },
  { to: "/profile", label: "حسابي", icon: User, match: (p) => p.startsWith("/profile") },
];

const BottomTabBar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="التنقل السفلي"
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.match ? tab.match(location.pathname) : location.pathname === tab.to;
          // Redirect auth-required tabs to /auth when signed-out
          const requiresAuth = tab.to === "/messages" || tab.to === "/following" || tab.to === "/profile";
          const target = requiresAuth && !user ? "/auth" : tab.to;
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={target}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110 transition-transform")} />
                <span>{tab.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomTabBar;
