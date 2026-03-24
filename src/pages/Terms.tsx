import React from "react";
import Layout from "@/components/layout/Layout";
import { FileText } from "lucide-react";

const TermsPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">الشروط والأحكام</h1>
          <p className="text-muted-foreground">آخر تحديث: مارس 2026</p>
        </div>

        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-3">1. مقدمة</h2>
            <p className="text-muted-foreground leading-relaxed">
              مرحباً بك في نت بلكس (NetPlex). باستخدامك لمنصتنا فإنك توافق على هذه الشروط والأحكام. يرجى قراءتها بعناية قبل استخدام الموقع.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. طبيعة المنصة</h2>
            <p className="text-muted-foreground leading-relaxed">
              نت بلكس هو سوق إلكتروني يربط البائعين والمشترين. المنصة لا تبيع منتجات بشكل مباشر ولا تضمن جودة المنتجات المعروضة. جميع المعاملات تتم بين الأطراف مباشرة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. حسابات المستخدمين</h2>
            <p className="text-muted-foreground leading-relaxed">
              يجب عليك تقديم معلومات دقيقة عند إنشاء حسابك. أنت مسؤول عن الحفاظ على أمان حسابك وكلمة المرور. أي نشاط يتم من حسابك يقع تحت مسؤوليتك.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. الإعلانات والمنتجات</h2>
            <p className="text-muted-foreground leading-relaxed">
              يجب أن تكون الإعلانات المنشورة صادقة ودقيقة. يُمنع نشر منتجات مسروقة أو مقلدة أو محظورة قانونياً. نحتفظ بحق إزالة أي إعلان يخالف هذه الشروط.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. المسؤولية</h2>
            <p className="text-muted-foreground leading-relaxed">
              نت بلكس غير مسؤول عن أي خسائر ناتجة عن المعاملات بين المستخدمين. ننصح دائماً بفحص المنتجات شخصياً قبل الشراء والتعامل بحذر.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. الخصوصية</h2>
            <p className="text-muted-foreground leading-relaxed">
              نحترم خصوصيتك ونحمي بياناتك وفقاً لسياسة الخصوصية المنشورة على الموقع. لن نشارك بياناتك مع أطراف ثالثة دون موافقتك.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. التعديلات</h2>
            <p className="text-muted-foreground leading-relaxed">
              نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية. استمرارك في استخدام المنصة يعني موافقتك على الشروط المحدثة.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default TermsPage;
