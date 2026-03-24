import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, Search, ArrowRight, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16 text-center">
        {/* Animated icon */}
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <MapPinOff className="h-16 w-16 text-primary" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive/20 animate-bounce" style={{ animationDelay: '0.5s' }} />
          <div className="absolute -bottom-1 -left-3 w-6 h-6 rounded-full bg-primary/20 animate-bounce" style={{ animationDelay: '1s' }} />
        </div>

        {/* Error text */}
        <h1 className="text-7xl md:text-9xl font-black text-primary mb-2 tracking-tighter">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          الصفحة غير موجودة
        </h2>
        <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-md">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها. تأكد من الرابط أو عُد للصفحة الرئيسية.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button size="lg" className="btn-brand" asChild>
            <Link to="/">
              <Home className="h-5 w-5 ml-2" />
              العودة للرئيسية
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/search">
              <Search className="h-5 w-5 ml-2" />
              تصفح المنتجات
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
