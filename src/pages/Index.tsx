import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Users, Zap, Smartphone, Home, Car, Shirt, Dumbbell, BookOpen, Briefcase, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

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
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-secondary/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
              سوق <span className="gradient-text">غزة</span> الموثوق
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-fade-in">
              منصة آمنة وموثوقة لبيع وشراء كل ما تحتاجه في قطاع غزة
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
              <Button size="lg" className="btn-brand text-lg px-8" asChild>
                <Link to="/search">
                  تصفح المنتجات
                  <ArrowLeft className="mr-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                <Link to="/sell/new">أضف منتجك</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </section>

      {/* Categories */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">تصفح حسب القسم</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="group flex flex-col items-center p-6 rounded-xl bg-card border card-hover"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <cat.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="font-medium text-sm text-center">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Features */}
      <section className="py-12 md:py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">لماذا نت بلكس؟</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-card border text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">بائعون موثوقون</h3>
              <p className="text-muted-foreground text-sm">
                جميع المنتجات تمر بمراجعة قبل النشر لضمان جودة العروض
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">مجتمع محلي</h3>
              <p className="text-muted-foreground text-sm">
                تواصل مباشر مع البائعين في منطقتك عبر واتساب أو الهاتف
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">سريع وسهل</h3>
              <p className="text-muted-foreground text-sm">
                أضف منتجك في دقائق وابدأ البيع فور الموافقة
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">جاهز للبيع؟</h2>
            <p className="text-muted-foreground mb-6">
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
