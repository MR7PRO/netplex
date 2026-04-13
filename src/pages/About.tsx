import React from "react";
import { Shield, Users, Zap, Heart, Target, Globe } from "lucide-react";
import Layout from "@/components/layout/Layout";

const AboutPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">عن نت بلكس</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            سوق إلكتروني فلسطيني يهدف لربط البائعين والمشترين في قطاع غزة بطريقة آمنة وموثوقة
          </p>
        </div>

        {/* Mission */}
        <section className="mb-12">
          <div className="rounded-2xl bg-primary/5 border p-8 text-center">
            <Target className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">رسالتنا</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              توفير منصة تسوق محلية موثوقة تخدم أبناء غزة، بأسعار عادلة وتجربة سلسة تربط البائع بالمشتري مباشرة.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">قيمنا</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-card border text-center">
              <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">الثقة والأمان</h3>
              <p className="text-sm text-muted-foreground">
                جميع المنتجات تمر بمراجعة يدوية قبل النشر لضمان جودة المحتوى
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border text-center">
              <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">خدمة المجتمع</h3>
              <p className="text-sm text-muted-foreground">
                نسعى لتسهيل التجارة المحلية ودعم الاقتصاد الفلسطيني
              </p>
            </div>
            <div className="p-6 rounded-xl bg-card border text-center">
              <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-2">السهولة والسرعة</h3>
              <p className="text-sm text-muted-foreground">
                واجهة بسيطة تتيح للبائع نشر منتجاته وللمشتري العثور على ما يحتاج بسرعة
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">كيف يعمل نت بلكس؟</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "أنشئ حسابك", desc: "سجل كبائع أو مشتري بسهولة" },
              { step: "2", title: "أضف منتجك", desc: "ارفع صور المنتج واكتب التفاصيل والسعر" },
              { step: "3", title: "مراجعة سريعة", desc: "فريقنا يراجع المنتج ويوافق عليه خلال ساعات" },
              { step: "4", title: "تواصل مباشر", desc: "المشتري يتواصل معك عبر واتساب أو الهاتف" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="rounded-2xl bg-primary/5 border p-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <Globe className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">غزة</p>
              <p className="text-xs text-muted-foreground">تغطية كاملة</p>
            </div>
            <div>
              <Users className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">مجتمع</p>
              <p className="text-xs text-muted-foreground">متنامي</p>
            </div>
            <div>
              <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">100%</p>
              <p className="text-xs text-muted-foreground">مراجعة يدوية</p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default AboutPage;
