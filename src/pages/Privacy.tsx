import React from "react";
import Layout from "@/components/layout/Layout";
import { Lock } from "lucide-react";

const PrivacyPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">سياسة الخصوصية</h1>
          <p className="text-muted-foreground">آخر تحديث: مارس 2026</p>
        </div>

        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-3">1. البيانات التي نجمعها</h2>
            <p className="text-muted-foreground leading-relaxed">
              نجمع المعلومات التالية عند استخدامك للمنصة:
            </p>
            <ul className="list-disc pr-6 text-muted-foreground space-y-1 mt-2">
              <li>الاسم والبريد الإلكتروني عند إنشاء الحساب</li>
              <li>رقم الهاتف (اختياري) للتواصل</li>
              <li>بيانات الإعلانات والصور التي تنشرها</li>
              <li>سجل التصفح والتفاعل مع المنصة</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. كيف نستخدم بياناتك</h2>
            <p className="text-muted-foreground leading-relaxed">
              نستخدم بياناتك لتقديم خدمات المنصة وتحسينها، وإرسال إشعارات مهمة، وضمان أمان المعاملات. لا نبيع بياناتك لأطراف ثالثة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. حماية البيانات</h2>
            <p className="text-muted-foreground leading-relaxed">
              نتخذ إجراءات أمنية مناسبة لحماية بياناتك من الوصول غير المصرح به أو الفقدان. نستخدم تشفير SSL ونخزن البيانات بشكل آمن.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. ملفات تعريف الارتباط</h2>
            <p className="text-muted-foreground leading-relaxed">
              نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربة التصفح وتذكر تفضيلاتك. يمكنك التحكم في إعدادات ملفات تعريف الارتباط من متصفحك.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. حقوقك</h2>
            <p className="text-muted-foreground leading-relaxed">
              لديك الحق في الوصول إلى بياناتك الشخصية وتعديلها أو حذفها. يمكنك التواصل معنا لممارسة هذه الحقوق في أي وقت.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. التواصل</h2>
            <p className="text-muted-foreground leading-relaxed">
              لأي استفسارات حول سياسة الخصوصية، تواصل معنا عبر البريد الإلكتروني support@netplex.ps
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPage;
