import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  Users, 
  AlertTriangle, 
  ScrollText,
  ChevronRight
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  pendingSubmissions?: number;
  pendingReports?: number;
}

const menuItems = [
  { title: "نظرة عامة", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "الطلبات", url: "/admin/submissions", icon: FileText, badge: "pendingSubmissions" },
  { title: "الإعلانات", url: "/admin/listings", icon: Package },
  { title: "البائعون", url: "/admin/sellers", icon: Users },
  { title: "البلاغات", url: "/admin/reports", icon: AlertTriangle, badge: "pendingReports" },
  { title: "سجل العمليات", url: "/admin/audit", icon: ScrollText },
];

export function AdminSidebar({ pendingSubmissions = 0, pendingReports = 0 }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const getBadgeCount = (badgeKey?: string) => {
    if (badgeKey === "pendingSubmissions") return pendingSubmissions;
    if (badgeKey === "pendingReports") return pendingReports;
    return 0;
  };

  return (
    <Sidebar 
      className={collapsed ? "w-14" : "w-56"} 
      collapsible="icon"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            {!collapsed && <span>لوحة التحكم</span>}
            <SidebarTrigger className="h-6 w-6" />
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const badgeCount = getBadgeCount(item.badge as string);
                const isActive = item.end 
                  ? location.pathname === item.url 
                  : location.pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink 
                        to={item.url} 
                        end={item.end}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.title}</span>
                            {badgeCount > 0 && (
                              <Badge 
                                variant="destructive" 
                                className="h-5 min-w-5 px-1 flex items-center justify-center"
                              >
                                {badgeCount}
                              </Badge>
                            )}
                          </>
                        )}
                        {collapsed && badgeCount > 0 && (
                          <Badge 
                            variant="destructive" 
                            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
                          >
                            {badgeCount}
                          </Badge>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
