import React from "react";
import { Award, Trophy, Camera, Star, ShieldCheck, Flame, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSellerStats } from "@/hooks/useSellerStats";
import { cn } from "@/lib/utils";

interface Props {
  sellerId: string;
  verified?: boolean | null;
  createdAt?: string | null;
}

interface Badge {
  key: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  earned: boolean;
  color: string;
}

export const SellerAchievements: React.FC<Props> = ({ sellerId, verified, createdAt }) => {
  const { data: stats, isLoading } = useSellerStats(sellerId, createdAt);

  const badges: Badge[] = [
    {
      key: "verified",
      label: "بائع موثّق",
      desc: "تم التحقق من هوية البائع",
      icon: <ShieldCheck className="h-5 w-5" />,
      earned: !!verified,
      color: "text-green-600 bg-green-50 dark:bg-green-950/30",
    },
    {
      key: "sales-1",
      label: "أول بيعة 🎉",
      desc: "أنجز أول عملية بيع",
      icon: <Trophy className="h-5 w-5" />,
      earned: (stats?.soldCount || 0) >= 1,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    },
    {
      key: "sales-10",
      label: "10 بيعات",
      desc: "أنجز 10 عمليات بيع",
      icon: <Award className="h-5 w-5" />,
      earned: (stats?.soldCount || 0) >= 10,
      color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30",
    },
    {
      key: "sales-100",
      label: "بائع نشط · 100+",
      desc: "أكثر من 100 عملية بيع",
      icon: <Flame className="h-5 w-5" />,
      earned: (stats?.soldCount || 0) >= 100,
      color: "text-red-600 bg-red-50 dark:bg-red-950/30",
    },
    {
      key: "photos",
      label: "صور احترافية",
      desc: "منتجات بصور متعددة وواضحة",
      icon: <Camera className="h-5 w-5" />,
      earned: !!stats?.hasPhotos,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    },
    {
      key: "rating",
      label: "تقييم ممتاز",
      desc: "متوسط تقييم 4.5+ نجوم",
      icon: <Star className="h-5 w-5" />,
      earned: (stats?.averageRating || 0) >= 4.5 && (stats?.reviewCount || 0) >= 3,
      color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30",
    },
    {
      key: "reviews-10",
      label: "محبوب المشترين",
      desc: "10+ تقييمات من المشترين",
      icon: <Users className="h-5 w-5" />,
      earned: (stats?.reviewCount || 0) >= 10,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30",
    },
    {
      key: "veteran",
      label: "عضو قديم",
      desc: "أكثر من 6 أشهر في المنصة",
      icon: <Clock className="h-5 w-5" />,
      earned: (stats?.memberSinceMonths || 0) >= 6,
      color: "text-slate-600 bg-slate-50 dark:bg-slate-900/60",
    },
  ];

  const earnedCount = badges.filter((b) => b.earned).length;

  if (isLoading) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            إنجازات البائع
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {earnedCount} / {badges.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {badges.map((b) => (
            <div
              key={b.key}
              className={cn(
                "rounded-xl p-3 border transition-all",
                b.earned
                  ? `${b.color} border-transparent shadow-sm`
                  : "bg-muted/30 text-muted-foreground border-dashed opacity-60"
              )}
              title={b.desc}
            >
              <div className="flex items-center gap-2 mb-1">
                {b.icon}
                <span className="font-semibold text-sm">{b.label}</span>
              </div>
              <p className="text-xs opacity-80 line-clamp-2">{b.desc}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
