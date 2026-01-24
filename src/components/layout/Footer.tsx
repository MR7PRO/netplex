import React from "react";
import { Link } from "react-router-dom";
import { Phone, MessageCircle, Mail, MapPin } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-foreground text-background mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/favicon.png" 
                alt="NetPlex" 
                className="w-14 h-14 object-contain" 
              />
              <span className="font-bold text-xl" dir="ltr">
                <span className="text-background">N</span>et<span className="text-primary">P</span>lex
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              سوق فلسطيني موثوق يربط البائعين والمشترين في قطاع غزة
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>غزة، فلسطين</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">روابط سريعة</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/categories" className="hover:text-primary transition-colors">
                تصفح الأقسام
              </Link>
              <Link to="/search" className="hover:text-primary transition-colors">
                البحث
              </Link>
              <Link to="/sell/new" className="hover:text-primary transition-colors">
                بيع منتجك
              </Link>
            </nav>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">الدعم</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/help" className="hover:text-primary transition-colors">
                مركز المساعدة
              </Link>
              <Link to="/safety" className="hover:text-primary transition-colors">
                نصائح الأمان
              </Link>
              <Link to="/terms" className="hover:text-primary transition-colors">
                الشروط والأحكام
              </Link>
              <Link to="/privacy" className="hover:text-primary transition-colors">
                سياسة الخصوصية
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">تواصل معنا</h4>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <a 
                href="https://wa.me/970599000000" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                واتساب
              </a>
              <a 
                href="tel:+970599000000"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4" />
                اتصل بنا
              </a>
              <a 
                href="mailto:support@netplex.ps"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
                support@netplex.ps
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-muted-foreground/20 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2024 نت بلكس. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
