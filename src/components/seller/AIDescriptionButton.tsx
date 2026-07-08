import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  title: string;
  brand?: string;
  model?: string;
  condition?: string;
  imageFile: File | null;
  onGenerated: (description: string) => void;
}

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const AIDescriptionButton: React.FC<Props> = ({
  title, brand, model, condition, imageFile, onGenerated,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (!title || title.length < 5) {
      toast({ title: "أدخل عنوان المنتج أولاً", variant: "destructive" });
      return;
    }
    if (!imageFile) {
      toast({ title: "أضف صورة للمنتج أولاً", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const imageDataUrl = await fileToDataUrl(imageFile);
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: { title, brand, model, condition, imageDataUrl },
      });

      if (error || !data?.description) {
        toast({
          title: "تعذر توليد الوصف",
          description: data?.error || error?.message || "حاول لاحقاً",
          variant: "destructive",
        });
      } else {
        onGenerated(data.description);
        toast({ title: "✨ تم توليد الوصف" });
      }
    } catch (e) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
      توليد وصف بالذكاء الاصطناعي
    </Button>
  );
};

export default AIDescriptionButton;
