import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);

  // Check admin access
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isAdmin) {
      navigate("/");
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية الوصول",
        variant: "destructive",
      });
    }
  }, [user, isAdmin, loading, navigate, toast]);

  // Fetch badge counts
  useEffect(() => {
    if (!isAdmin) return;

    const fetchCounts = async () => {
      const [submissions, reports] = await Promise.all([
        supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setPendingSubmissions(submissions.count || 0);
      setPendingReports(reports.count || 0);
    };

    fetchCounts();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar 
          pendingSubmissions={pendingSubmissions} 
          pendingReports={pendingReports} 
        />
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              {title && <h1 className="text-lg font-semibold">{title}</h1>}
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <Home className="h-4 w-4 ml-2" />
                العودة للموقع
              </Link>
            </Button>
          </header>
          
          {/* Content */}
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
