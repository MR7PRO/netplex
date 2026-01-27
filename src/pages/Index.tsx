import React, { useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Users, Zap, Smartphone, Home, Car, Shirt, Dumbbell, BookOpen, Briefcase, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ListingCard from "@/components/listings/ListingCard";
import heroLogo from "@/assets/hero-logo.png";
const CATEGORIES = [
  { slug: "electronics", name: "إلكترونيات", icon: Smartphone },
  { slug: "fashion", name: "ملابس وأزياء", icon: Shirt },
  { slug: "home-garden", name: "منزل وحديقة", icon: Home },
  { slug: "vehicles", name: "سيارات ومركبات", icon: Car },
  { slug: "sports", name: "رياضة وترفيه", icon: Dumbbell },
  { slug: "books", name: "كتب وتعليم", icon: BookOpen },
  { slug: "services", name: "خدمات", icon: Briefcase },
  { slug: "other", name: "أخرى", icon: Package },
];

const Index: React.FC = () => {
  // Drag to scroll state for marquee
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const handleDragStart = useCallback((clientX: number) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    dragStart.current = {
      x: clientX,
      scrollLeft: scrollContainerRef.current.scrollLeft
    };
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const diff = dragStart.current.x - clientX;
    scrollContainerRef.current.scrollLeft = dragStart.current.scrollLeft + diff;
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Fetch featured listings
  const { data: featuredListings, isLoading: loadingFeatured } = useQuery({
    queryKey: ["featured-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "available")
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent listings
  const { data: recentListings, isLoading: loadingRecent } = useQuery({
    queryKey: ["recent-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(8);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-secondary/30 py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-8">
              <img 
                src={heroLogo} 
                alt="NetPlex" 
                className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain drop-shadow-2xl animate-scale-in" 
                style={{ animation: 'scale-in 0.6s ease-out, float 3s ease-in-out infinite 0.6s' }}
              />
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-2 md:mb-4">
              متجر <span className="text-foreground">نت</span> <span className="text-primary">بلكس</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-semibold text-foreground mb-4 md:mb-6">
              سوق غزة… بسعره الحقيقي
            </p>
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 px-4">
              بيع واشتري إلكترونياتك بثقة، إعلانات مدققة، وأسعار أقرب للواقع.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4">
              <Button size="lg" className="btn-brand text-base md:text-lg px-6 md:px-8" asChild>
                <Link to="/search">
                  تصفح المنتجات
                  <ArrowLeft className="mr-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base md:text-lg px-6 md:px-8" asChild>
                <Link to="/sell/new">أضف منتجك</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-48 md:w-72 h-48 md:h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 md:w-96 h-64 md:h-96 bg-primary/5 rounded-full blur-3xl" />
      </section>

      {/* Featured Listings - Auto-scrolling Carousel */}
      {(featuredListings && featuredListings.length > 0) && (
        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">منتجات مميزة</h2>
              <Button variant="ghost" asChild>
                <Link to="/search?featured=true">عرض الكل</Link>
              </Button>
            </div>
            <div 
              ref={scrollContainerRef}
              className={`marquee-wrapper ${isDragging ? 'dragging' : ''}`}
              onMouseDown={(e) => handleDragStart(e.clientX)}
              onMouseUp={handleDragEnd}
              onMouseMove={(e) => { if (isDragging) { e.preventDefault(); handleDragMove(e.clientX); }}}
              onMouseLeave={handleDragEnd}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
              onTouchEnd={handleDragEnd}
            >
              <div className={`marquee-track gap-3 md:gap-4 ${isDragging ? 'paused' : ''}`}>
                {/* Double set for seamless infinite loop */}
                {[...featuredListings, ...featuredListings].map((listing, index) => (
                  <div key={`${listing.id}-${index}`} className="w-[160px] md:w-[220px] lg:w-[260px] flex-shrink-0 select-none">
                    <div className="pointer-events-auto">
                      <ListingCard
                        id={listing.id}
                        title={listing.title}
                        price={listing.price_ils}
                        image={listing.images?.[0]}
                        region={listing.region}
                        condition={listing.condition || undefined}
                        viewCount={listing.view_count || 0}
                        featured={listing.featured || false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Recent Listings */}
      <section className="py-10 md:py-14 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">أحدث المنتجات</h2>
            <Button variant="ghost" asChild>
              <Link to="/search">عرض الكل</Link>
            </Button>
          </div>
          
          {loadingRecent ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : recentListings && recentListings.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {recentListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  price={listing.price_ils}
                  image={listing.images?.[0]}
                  region={listing.region}
                  condition={listing.condition || undefined}
                  viewCount={listing.view_count || 0}
                  featured={listing.featured || false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد منتجات حالياً</p>
              <Button className="mt-4" asChild>
                <Link to="/sell/new">كن أول بائع</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-6 md:mb-8 text-center">تصفح حسب القسم</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/search?category=${cat.slug}`}
                className="group flex flex-col items-center p-4 md:p-6 rounded-xl bg-card border card-hover"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2 md:mb-3 group-hover:bg-primary/20 transition-colors">
                  <cat.icon className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                </div>
                <span className="font-medium text-xs md:text-sm text-center">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Features */}
      <section className="py-10 md:py-14 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-6 md:mb-8 text-center">لماذا NetPlex؟</h2>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            <div className="p-5 md:p-6 rounded-xl bg-card border text-center">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Shield className="h-6 w-6 md:h-7 md:w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-2">بائعون موثوقون</h3>
              <p className="text-muted-foreground text-xs md:text-sm">
                جميع المنتجات تمر بمراجعة قبل النشر لضمان جودة العروض
              </p>
            </div>
            <div className="p-5 md:p-6 rounded-xl bg-card border text-center">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Users className="h-6 w-6 md:h-7 md:w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-2">مجتمع محلي</h3>
              <p className="text-muted-foreground text-xs md:text-sm">
                تواصل مباشر مع البائعين في منطقتك عبر واتساب أو الهاتف
              </p>
            </div>
            <div className="p-5 md:p-6 rounded-xl bg-card border text-center">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 md:mb-4">
                <Zap className="h-6 w-6 md:h-7 md:w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg mb-2">سريع وسهل</h3>
              <p className="text-muted-foreground text-xs md:text-sm">
                أضف منتجك في دقائق وابدأ البيع فور الموافقة
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4">جاهز للبيع؟</h2>
            <p className="text-muted-foreground mb-5 md:mb-6 text-sm md:text-base">
              أضف منتجاتك الآن وابدأ الوصول لآلاف المشترين في غزة
            </p>
            <Button size="lg" className="btn-brand" asChild>
              <Link to="/auth">ابدأ الآن</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
