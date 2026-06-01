import React from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, AlertCircle, Clock, MessageCircle, CheckCircle2, XCircle } from "lucide-react";
import { SEO } from "@/components/seo/SEO";

const Returns: React.FC = () => {
  return (
    <Layout>
      <SEO title="سياسة الإرجاع — NetPlex" description="كيف تتعامل NetPlex مع الإرجاع والنزاعات بين المشترين والبائعين." path="/returns" />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">سياسة الإرجاع وضمان الصفقة</h1>
          <p className="text-muted-foreground">حقوقك ومسؤولياتك عند الشراء عبر NetPlex</p>
        </div>

        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-primary" />
              مهم — اقرأ قبل الشراء
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>
              منصة NetPlex هي وسيط للإعلان فقط. الصفقات تتم وجهاً لوجه بين البائع والمشتري ولا تتم أي عملية دفع داخل المنصة.
            </p>
            <p className="font-medium text-foreground">
              لذلك ننصحك دائماً بفحص المنتج معاينة فعلية قبل تسليم المبلغ.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              مدة ضمان الإرجاع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">المنتجات الجديدة (New)</p>
                <p className="text-muted-foreground">قابلة للإرجاع خلال 7 أيام إذا لم تتطابق المواصفات أو ظهر عيب مصنعي.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">المنتجات المستعملة (Used)</p>
                <p className="text-muted-foreground">قابلة للإرجاع خلال 48 ساعة إذا تم إخفاء عيب جوهري لم يُذكر في الإعلان.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">حالات لا تخضع للإرجاع</p>
                <p className="text-muted-foreground">تغيير الرأي بعد الفحص، أو تلف ناتج عن سوء استخدام بعد الاستلام.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">خطوات تقديم طلب إرجاع</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground leading-relaxed">
              <li>تواصل مع البائع مباشرة عبر واتساب لمحاولة الحل ودياً.</li>
              <li>إذا لم يستجب البائع خلال 24 ساعة، افتح بلاغاً من صفحة المنتج (زر "الإبلاغ عن الإعلان").</li>
              <li>أرفق صور المنتج المستلم وصور المحادثة كإثبات.</li>
              <li>سيتدخل فريق NetPlex خلال 48 ساعة كحد أقصى للوساطة.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              تأثير عدم الالتزام
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            البائعون الذين يرفضون الالتزام بهذه السياسة دون مبرر يتعرضون لخفض درجة الثقة (Trust Score)، وقد يتم تعليق حساباتهم بعد 3 شكاوى مؤكدة.
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Returns;
