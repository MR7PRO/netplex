import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Layout from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { REGIONS, CONDITION_OPTIONS } from "@/lib/constants";
import type { Database } from "@/integrations/supabase/types";

type ItemCondition = Database["public"]["Enums"]["item_condition"];

interface Category {
  id: string;
  slug: string;
  name_ar: string;
}

const submissionSchema = z.object({
  title: z.string().min(5, "العنوان يجب أن يكون 5 أحرف على الأقل").max(100, "العنوان طويل جداً"),
  description: z.string().max(2000, "الوصف طويل جداً").optional(),
  price_ils: z.coerce.number().min(1, "يرجى إدخال السعر").max(1000000, "السعر كبير جداً"),
  category_id: z.string().min(1, "يرجى اختيار القسم"),
  region: z.string().min(1, "يرجى اختيار المنطقة"),
  condition: z.string().min(1, "يرجى اختيار الحالة"),
  brand: z.string().max(50, "اسم الماركة طويل جداً").optional(),
  model: z.string().max(50, "اسم الموديل طويل جداً").optional(),
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const SellerSubmissionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, seller } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsSellerProfile, setNeedsSellerProfile] = useState(false);

  // Seller profile form
  const [sellerShopName, setSellerShopName] = useState("");
  const [sellerRegion, setSellerRegion] = useState("");
  const [sellerWhatsapp, setSellerWhatsapp] = useState("");
  const [creatingProfile, setCreatingProfile] = useState(false);

  const form = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      title: "",
      description: "",
      price_ils: 0,
      category_id: "",
      region: "",
      condition: "",
      brand: "",
      model: "",
    },
  });

  // Check auth and seller status
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!seller) {
      setNeedsSellerProfile(true);
    }
  }, [user, seller, navigate]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, slug, name_ar")
        .order("sort_order");
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      if (images.length + validFiles.length >= MAX_IMAGES) {
        toast({
          title: `الحد الأقصى ${MAX_IMAGES} صور`,
          variant: "destructive",
        });
        break;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "الملف كبير جداً",
          description: "الحد الأقصى 5 ميجابايت",
          variant: "destructive",
        });
        continue;
      }

      if (!file.type.startsWith("image/")) {
        toast({
          title: "نوع الملف غير مدعوم",
          description: "يرجى رفع صور فقط",
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setImages((prev) => [...prev, ...validFiles]);

      // Create previews
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const createSellerProfile = async () => {
    if (!user) return;

    if (!sellerShopName || !sellerRegion) {
      toast({
        title: "يرجى إكمال البيانات",
        description: "الاسم والمنطقة مطلوبان",
        variant: "destructive",
      });
      return;
    }

    setCreatingProfile(true);
    const { error } = await supabase.from("sellers").insert({
      user_id: user.id,
      shop_name: sellerShopName,
      region: sellerRegion,
      whatsapp: sellerWhatsapp || null,
    });

    if (error) {
      toast({
        title: "حدث خطأ",
        description: "يرجى المحاولة لاحقاً",
        variant: "destructive",
      });
    } else {
      toast({ title: "تم إنشاء الحساب بنجاح!" });
      setNeedsSellerProfile(false);
      // Refresh auth context
      window.location.reload();
    }
    setCreatingProfile(false);
  };

  const onSubmit = async (data: SubmissionFormData) => {
    if (!user || !seller) return;

    if (images.length === 0) {
      toast({
        title: "يرجى إضافة صورة واحدة على الأقل",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images
      const imageUrls: string[] = [];
      for (const file of images) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("listings")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        // Store the file path (not public URL) since bucket is now private
        imageUrls.push(fileName);
      }

      if (imageUrls.length === 0) {
        toast({
          title: "فشل رفع الصور",
          description: "يرجى المحاولة لاحقاً",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Create submission
      const { error } = await supabase.from("submissions").insert({
        seller_id: seller.id,
        title: data.title,
        description: data.description || null,
        price_ils: data.price_ils,
        category_id: data.category_id,
        region: data.region,
        condition: data.condition as ItemCondition,
        brand: data.brand || null,
        model: data.model || null,
        images: imageUrls,
      });

      if (error) {
        console.error("Submission error:", error);
        toast({
          title: "حدث خطأ",
          description: "يرجى المحاولة لاحقاً",
          variant: "destructive",
        });
      } else {
        toast({
          title: "تم إرسال طلبك بنجاح!",
          description: "سيتم مراجعته ونشره قريباً",
        });
        navigate("/seller/dashboard");
      }
    } catch (err) {
      console.error("Error:", err);
      toast({
        title: "حدث خطأ",
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
  };

  if (needsSellerProfile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-lg">
          <h1 className="text-2xl font-bold mb-6 text-center">إنشاء حساب بائع</h1>
          <p className="text-muted-foreground text-center mb-8">
            أكمل بياناتك للبدء في البيع
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">اسم المتجر / الاسم *</label>
              <Input
                placeholder="مثال: متجر أحمد"
                value={sellerShopName}
                onChange={(e) => setSellerShopName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">المنطقة *</label>
              <Select value={sellerRegion} onValueChange={setSellerRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنطقة" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((region) => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">رقم واتساب (اختياري)</label>
              <Input
                type="tel"
                placeholder="مثال: 970599123456"
                value={sellerWhatsapp}
                onChange={(e) => setSellerWhatsapp(e.target.value)}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                سيستخدم للتواصل مع المشترين
              </p>
            </div>

            <Button
              onClick={createSellerProfile}
              disabled={creatingProfile}
              className="w-full btn-brand"
            >
              {creatingProfile && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              إنشاء الحساب
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">أضف منتج جديد</h1>
        <p className="text-muted-foreground mb-8">
          سيتم مراجعة منتجك قبل النشر
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Images */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                الصور * (حتى {MAX_IMAGES} صور)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="aspect-square relative rounded-lg overflow-hidden border">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 left-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">إضافة صورة</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العنوان *</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: آيفون 14 برو ماكس 256GB" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category & Region */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>القسم *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر القسم" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name_ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المنطقة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المنطقة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGIONS.map((region) => (
                          <SelectItem key={region.value} value={region.value}>
                            {region.label_ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Price & Condition */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price_ils"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>السعر (₪) *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحالة *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONDITION_OPTIONS.map((condition) => (
                          <SelectItem key={condition.value} value={condition.value}>
                            {condition.label_ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Brand & Model */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الماركة (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: Apple" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الموديل (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: iPhone 14 Pro Max" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أضف تفاصيل إضافية عن المنتج..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    أضف معلومات تفصيلية لزيادة فرص البيع
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>ملاحظة</AlertTitle>
              <AlertDescription>
                سيتم مراجعة منتجك قبل النشر. عادة ما تستغرق المراجعة أقل من 24 ساعة.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-brand"
              size="lg"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              إرسال للمراجعة
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
};

export default SellerSubmissionPage;
