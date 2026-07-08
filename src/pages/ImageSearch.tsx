import React, { useState } from "react";
import { Camera, Loader2, Sparkles, X } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ListingCard } from "@/components/listings/ListingCard";
import SEO from "@/components/seo/SEO";

const MAX_SIZE = 5 * 1024 * 1024;

interface Listing {
  id: string;
  title: string;
  price_ils: number;
  region: string;
  condition?: string;
  images?: string[];
  view_count?: number;
  sellers?: { verified?: boolean; shop_name?: string };
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

const ImageSearchPage: React.FC = () => {
  const { toast } = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{
    brand?: string; model?: string; category?: string; keywords?: string[];
  } | null>(null);
  const [results, setResults] = useState<Listing[]>([]);
  const [searched, setSearched] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > MAX_SIZE) {
      toast({ title: "الصورة كبيرة (أقل من 5MB)", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "الملف مش صورة", variant: "destructive" });
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    setResults([]);
    setAnalysis(null);
    setSearched(false);
    await search(dataUrl);
  };

  const search = async (imageDataUrl: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("image-search", {
        body: { imageDataUrl },
      });
      if (error || data?.error) {
        toast({
          title: "تعذر البحث بالصورة",
          description: data?.error || error?.message,
          variant: "destructive",
        });
      } else {
        setAnalysis(data.analysis || null);
        setResults(data.listings || []);
        setSearched(true);
      }
    } catch (e) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setResults([]);
    setAnalysis(null);
    setSearched(false);
  };

  return (
    <Layout>
      <SEO title="البحث بالصورة" description="ارفع صورة ولاقي منتجات مشابهة على NetPlex" />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-2 mb-6">
          <Camera className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">البحث بالصورة</h1>
        </div>

        {!preview && (
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-2xl p-10 text-center hover:border-primary hover:bg-primary/5 transition-colors">
              <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-bold mb-1">ارفع صورة المنتج</p>
              <p className="text-sm text-muted-foreground">
                الذكاء الاصطناعي بيحلل الصورة ويلاقي منتجات مشابهة عنا
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
        )}

        {preview && (
          <div className="space-y-6">
            <div className="relative rounded-2xl overflow-hidden border border-border max-w-sm mx-auto">
              <img src={preview} alt="بحث" className="w-full h-64 object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 left-2 h-8 w-8"
                onClick={reset}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {loading && (
              <div className="flex flex-col items-center gap-2 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">جارٍ تحليل الصورة والبحث...</p>
              </div>
            )}

            {analysis && !loading && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">شو شفنا في الصورة</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.brand && <Badge variant="secondary">الماركة: {analysis.brand}</Badge>}
                  {analysis.model && <Badge variant="secondary">الموديل: {analysis.model}</Badge>}
                  {analysis.category && <Badge variant="outline">{analysis.category}</Badge>}
                  {analysis.keywords?.slice(0, 5).map((k) => (
                    <Badge key={k} variant="outline">{k}</Badge>
                  ))}
                </div>
              </div>
            )}

            {searched && !loading && results.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                ما لقينا منتجات مشابهة حالياً. جرب صورة تانية أو دور بالاسم.
              </div>
            )}

            {results.length > 0 && (
              <div>
                <h2 className="font-bold mb-3">{results.length} منتج مشابه</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {results.map((l) => (
                    <ListingCard
                      key={l.id}
                      id={l.id}
                      title={l.title}
                      price={l.price_ils}
                      image={l.images?.[0]}
                      region={l.region}
                      condition={l.condition}
                      viewCount={l.view_count}
                      verifiedSeller={l.sellers?.verified}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ImageSearchPage;
