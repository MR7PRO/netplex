import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Search from "./pages/Search";
import ListingDetails from "./pages/ListingDetails";
import SellerSubmission from "./pages/SellerSubmission";
import SellerDashboard from "./pages/seller/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import Cart from "./pages/Cart";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/search" element={<Search />} />
              <Route path="/listing/:id" element={<ListingDetails />} />
              <Route path="/sell/new" element={<SellerSubmission />} />
              <Route path="/seller/dashboard" element={<SellerDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
