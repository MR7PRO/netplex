import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { CompareProvider } from "@/contexts/CompareContext";
import { EnvErrorBoundary } from "@/components/EnvErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Search = lazy(() => import("./pages/Search"));
const ListingDetails = lazy(() => import("./pages/ListingDetails"));
const SellerSubmission = lazy(() => import("./pages/SellerSubmission"));
const SellerDashboard = lazy(() => import("./pages/seller/Dashboard"));
const MyStore = lazy(() => import("./pages/seller/MyStore"));
const SellerPage = lazy(() => import("./pages/Seller"));
const Cart = lazy(() => import("./pages/Cart"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Help = lazy(() => import("./pages/Help"));
const Safety = lazy(() => import("./pages/Safety"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Categories = lazy(() => import("./pages/Categories"));
const About = lazy(() => import("./pages/About"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Returns = lazy(() => import("./pages/Returns"));
const Disputes = lazy(() => import("./pages/Disputes"));
const DisputeDetail = lazy(() => import("./pages/DisputeDetail"));
const Activity = lazy(() => import("./pages/Activity"));

// Admin pages
const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminSubmissions = lazy(() => import("./pages/admin/Submissions"));
const AdminListings = lazy(() => import("./pages/admin/Listings"));
const AdminSellers = lazy(() => import("./pages/admin/Sellers"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminAudit = lazy(() => import("./pages/admin/Audit"));
const AdminInvites = lazy(() => import("./pages/admin/Invites"));
const AdminPermissions = lazy(() => import("./pages/admin/Permissions"));
const AdminVerifications = lazy(() => import("./pages/admin/Verifications"));
const AdminDisputes = lazy(() => import("./pages/admin/Disputes"));

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
            <CompareProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/listing/:id" element={<ListingDetails />} />
                    <Route path="/sell/new" element={<SellerSubmission />} />
                    <Route path="/seller/dashboard" element={<ProtectedRoute allowedRoles={["admin", "sub_admin"]}><SellerDashboard /></ProtectedRoute>} />
                    <Route path="/seller/my-store" element={<ProtectedRoute allowedRoles={["admin", "sub_admin"]}><MyStore /></ProtectedRoute>} />
                    <Route path="/seller/:id" element={<SellerPage />} />
                    <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminOverview /></ProtectedRoute>} />
                    <Route path="/admin/submissions" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSubmissions /></ProtectedRoute>} />
                    <Route path="/admin/listings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminListings /></ProtectedRoute>} />
                    <Route path="/admin/sellers" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSellers /></ProtectedRoute>} />
                    <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={["admin"]}><AdminReports /></ProtectedRoute>} />
                    <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={["admin"]}><AdminAudit /></ProtectedRoute>} />
                    <Route path="/admin/invites" element={<ProtectedRoute allowedRoles={["admin"]}><AdminInvites /></ProtectedRoute>} />
                    <Route path="/admin/permissions" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPermissions /></ProtectedRoute>} />
                    <Route path="/admin/verifications" element={<ProtectedRoute allowedRoles={["admin"]}><AdminVerifications /></ProtectedRoute>} />
                    <Route path="/admin/disputes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDisputes /></ProtectedRoute>} />
                    <Route path="/disputes" element={<Disputes />} />
                    <Route path="/disputes/:id" element={<DisputeDetail />} />
                    <Route path="/activity" element={<Activity />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/help" element={<Help />} />
                    <Route path="/safety" element={<Safety />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/returns" element={<Returns />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
            </CompareProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </EnvErrorBoundary>
);

export default App;
