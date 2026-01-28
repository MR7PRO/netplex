import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { EnvErrorBoundary } from "@/components/EnvErrorBoundary";
import { lazy, Suspense } from "react";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Search = lazy(() => import("./pages/Search"));
const ListingDetails = lazy(() => import("./pages/ListingDetails"));
const SellerSubmission = lazy(() => import("./pages/SellerSubmission"));
const SellerDashboard = lazy(() => import("./pages/seller/Dashboard"));
const SellerPage = lazy(() => import("./pages/Seller"));
const Cart = lazy(() => import("./pages/Cart"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin pages
const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminSubmissions = lazy(() => import("./pages/admin/Submissions"));
const AdminListings = lazy(() => import("./pages/admin/Listings"));
const AdminSellers = lazy(() => import("./pages/admin/Sellers"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminAudit = lazy(() => import("./pages/admin/Audit"));

const queryClient = new QueryClient();

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <EnvErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/listing/:id" element={<ListingDetails />} />
                    <Route path="/sell/new" element={<SellerSubmission />} />
                    <Route path="/seller/dashboard" element={<SellerDashboard />} />
                    <Route path="/seller/:id" element={<SellerPage />} />
                    <Route path="/admin" element={<AdminOverview />} />
                    <Route path="/admin/submissions" element={<AdminSubmissions />} />
                    <Route path="/admin/listings" element={<AdminListings />} />
                    <Route path="/admin/sellers" element={<AdminSellers />} />
                    <Route path="/admin/reports" element={<AdminReports />} />
                    <Route path="/admin/audit" element={<AdminAudit />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </EnvErrorBoundary>
);

export default App;
