import React from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  HelpCircle, ShoppingCart, Package, MessageCircle, Shield, 
  UserPlus, Search, CreditCard, AlertTriangle, ChevronDown
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FAQ_SECTIONS = [
  {
    title: "الشراء",
    icon: ShoppingCart,
    items: [
      {
        q: "كيف أشتري منتج من نت بلكس؟",
        a: "تصفح المنتجات، اختر المنتج الذي يعجبك، ثم تواصل مع البائع مباشرة عبر واتساب للاتفاق على التفاصيل والسعر. نت بلكس منصة وسيطة لا تتدخل في عملية البيع.",
      },
      {
        q: "هل يمكنني التفاوض على السعر؟",
        a: "نعم! يمكنك إرسال عرض سعر من خلال صفحة المنتج أو التواصل مباشرة مع البائع عبر واتساب.",
      },
      {
        q: "هل يوجد توصيل؟",
        a: "نت بلكس لا توفر خدمة التوصيل بشكل مباشر. يتم الاتفاق على طريقة التسليم بين البائع والمشتري.",
      },
    ],
  },
  {
    title: "البيع",
    icon: Package,
    items: [
      {
        q: "كيف أبيع منتجاتي؟",
        a: "سجل حساب، ثم اذهب لصفحة 'أضف منتج' واملأ التفاصيل وأضف الصور. سيتم مراجعة إعلانك قبل النشر.",
      },
      {
        q: "كم يستغرق نشر الإعلان؟",
        a: "عادةً يتم مراجعة الإعلانات خلال 24 ساعة. ستصلك إشعار عند الموافقة أو الرفض.",
      },
      {
        q: "هل هناك رسوم للبيع؟",
        a: "لا! نشر الإعلانات على نت بلكس مجاني تماماً.",
      },
    ],
  },
  {
    title: "الحساب",
    icon: UserPlus,
    items: [
      {
        q: "كيف أنشئ حساب؟",
        a: "اضغط على 'تسجيل الدخول' ثم 'إنشاء حساب جديد'. أدخل بريدك الإلكتروني وكلمة المرور واسمك.",
      },
      {
        q: "نسيت كلمة المرور، ماذا أفعل؟",
        a: "اضغط على 'نسيت كلمة المرور' في صفحة تسجيل الدخول وأدخل بريدك الإلكتروني لاستلام رابط إعادة التعيين.",
      },
    ],
  },
  {
    title: "الأمان والبلاغات",
    icon: Shield,
    items: [
      {
        q: "كيف أبلغ عن إعلان مخالف؟",
        a: "في صفحة المنتج، اضغط على زر 'بلاغ' واختر السبب. سيقوم فريقنا بمراجعة البلاغ واتخاذ الإجراء المناسب.",
      },
      {
        q: "كيف أحمي نفسي من الاحتيال؟",
        a: "تأكد من فحص المنتج شخصياً قبل الدفع، وتعامل في أماكن عامة، ولا ترسل دفعات مقدمة لبائعين لا تعرفهم.",
      },
    ],
  },
];

const HelpPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">مركز المساعدة</h1>
          <p className="text-muted-foreground text-lg">
            إجابات على الأسئلة الشائعة حول استخدام نت بلكس
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-6">
          {FAQ_SECTIONS.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <section.icon className="h-5 w-5 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, i) => (
                    <AccordionItem key={i} value={`${section.title}-${i}`}>
                      <AccordionTrigger className="text-right">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-10 text-center p-6 rounded-xl bg-secondary/50 border">
          <h3 className="text-lg font-semibold mb-2">لم تجد إجابتك؟</h3>
          <p className="text-muted-foreground mb-4">تواصل معنا مباشرة وسنساعدك</p>
          <Button className="btn-brand" asChild>
            <a href="https://wa.me/970599000000" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 ml-2" />
              تواصل عبر واتساب
            </a>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default HelpPage;
