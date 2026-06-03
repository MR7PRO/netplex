import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, Star, Store, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Slide = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
};

const SLIDES: Slide[] = [
  {
    id: "deals",
    title: "صفقات اليوم 🔥",
    subtitle: "أفضل الأسعار وأكبر الخصومات لفترة محدودة",
    cta: "اكتشف الصفقات",
    to: "/deals",
    icon: Flame,
    gradient: "from-primary to-primary/70",
  },
  {
    id: "featured",
    title: "منتجات مميّزة",
    subtitle: "اختيارات مدققة من بائعين موثوقين في غزة",
    cta: "تصفّح المميّز",
    to: "/search?featured=true",
    icon: Star,
    gradient: "from-foreground to-foreground/70",
  },
  {
    id: "sell",
    title: "ابدأ البيع اليوم",
    subtitle: "أضف منتجك في دقائق وابدأ الوصول لآلاف المشترين",
    cta: "أضف منتجك",
    to: "/sell/new",
    icon: Store,
    gradient: "from-primary/80 to-foreground/80",
  },
];

export const HeroRotator: React.FC = () => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 8000);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[idx];
  const Icon = slide.icon;

  return (
    <Link to={slide.to} className="block group" aria-label={slide.title}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl p-6 md:p-8 text-primary-foreground bg-gradient-to-r transition-all duration-500",
          slide.gradient,
          "shadow-lg hover:shadow-xl"
        )}
      >
        <div key={slide.id} className="flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Icon className="h-7 w-7 md:h-8 md:w-8" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl md:text-2xl font-bold truncate">{slide.title}</h3>
              <p className="text-sm md:text-base opacity-90 line-clamp-1">{slide.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-sm font-medium">{slide.cta}</span>
            <ArrowLeft className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:-translate-x-1" />
          </div>
        </div>

        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={(e) => {
                e.preventDefault();
                setIdx(i);
              }}
              aria-label={`عرض ${s.title}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === idx ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              )}
            />
          ))}
        </div>

        <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
      </div>
    </Link>
  );
};

export default HeroRotator;
