import React from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Shield, Eye, MapPin, CreditCard, AlertTriangle, 
  CheckCircle, XCircle, Phone, Users
} from "lucide-react";

const TIPS = [
  {
    icon: Eye,
    title: "افحص المنتج شخصياً",
    description: "لا تشتري أي منتج دون فحصه بنفسك. تأكد من مطابقته للوصف والصور المعروضة.",
    type: "do" as const,
  },
  {
    icon: MapPin,
    title: "التقِ في مكان عام",
    description: "اختر أماكن عامة ومزدحمة للقاء مثل المولات أو الأسواق. تجنب الأماكن المنعزلة.",
    type: "do" as const,
  },
  {
    icon: Users,
    title: "اصطحب شخصاً معك",
    description: "من الأفضل دائماً أن تكون برفقة شخص آخر عند مقابلة البائع أو المشتري.",
    type: "do" as const,
  },
  {
    icon: Phone,
    title: "تواصل عبر المنصة أولاً",
    description: "استخدم واتساب المرتبط بالمنصة للتواصل الأولي قبل مشاركة معلوماتك الشخصية.",
    type: "do" as const,
  },
  {
    icon: CreditCard,
    title: "لا ترسل دفعات مقدمة",
    description: "لا تحول أموالاً قبل استلام المنتج وفحصه. لا تثق بوعود الشحن من غرباء.",
    type: "dont" as const,
  },
  {
    icon: AlertTriangle,
    title: "احذر العروض المغرية جداً",
    description: "إذا كان السعر أقل بكثير من السوق فكن حذراً. استخدم ميزة 'فحص السعر' للتأكد.",
    type: "dont" as const,
  },
];

const SafetyPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">نصائح الأمان</h1>
          <p className="text-muted-foreground text-lg">
            نصائح مهمة لتجربة بيع وشراء آمنة على نت بلكس
          </p>
        </div>

        {/* Tips */}
        <div className="grid md:grid-cols-2 gap-4">
          {TIPS.map((tip, i) => (
            <Card key={i} className={tip.type === "dont" ? "border-destructive/30" : "border-success/30"}>
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    tip.type === "do" ? "bg-success/10" : "bg-destructive/10"
                  }`}>
                    <tip.icon className={`h-5 w-5 ${
                      tip.type === "do" ? "text-success" : "text-destructive"
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {tip.type === "do" ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <h3 className="font-semibold">{tip.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {tip.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Emergency */}
        <div className="mt-10 p-6 rounded-xl bg-destructive/5 border border-destructive/20 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">تعرضت لمحاولة احتيال؟</h3>
          <p className="text-muted-foreground text-sm mb-4">
            بلّغ فوراً عن الإعلان من خلال صفحة المنتج أو تواصل معنا مباشرة
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default SafetyPage;
