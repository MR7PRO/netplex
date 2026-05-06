import React, { useState, useRef } from "react";
import { Star, ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ReviewSellerDialogProps {
  sellerId: string;
  listingId: string;
  sellerName: string;
  onReviewSubmitted?: () => void;
}

export const ReviewSellerDialog: React.FC<ReviewSellerDialogProps> = ({
  sellerId,
  listingId,
  sellerName,
  onReviewSubmitted,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowed = files.slice(0, 4 - imageFiles.length);
    const valid = allowed.filter(f => f.type.startsWith("image/") && f.size <= 3 * 1024 * 1024);
    if (valid.length < allowed.length) {
      toast({ title: "ملاحظة", description: "تم تجاهل صور أكبر من 3MB أو غير مدعومة" });
    }
    setImageFiles(prev => [...prev, ...valid]);
    setPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!user || imageFiles.length === 0) return [];
    const paths: string[] = [];
    for (const file of imageFiles) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `review-images/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("listings").upload(path, file, { upsert: false });
      if (error) throw error;
      paths.push(path);
    }
    return paths;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      return;
    }
    if (rating === 0) {
      toast({ title: "يرجى اختيار تقييم", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const uploadedPaths = await uploadImages();

      const { data: existing } = await supabase
        .from("reviews")
        .select("id, images")
        .eq("seller_id", sellerId)
        .eq("reviewer_id", user.id)
        .eq("listing_id", listingId)
        .maybeSingle();

      if (existing) {
        const merged = [...(existing.images || []), ...uploadedPaths];
        const { error } = await supabase
          .from("reviews")
          .update({ rating, comment: comment || null, images: merged })
          .eq("id", existing.id);
        if (error) throw error;
        toast({ title: "تم تحديث التقييم بنجاح" });
      } else {
        const { error } = await supabase.from("reviews").insert({
          seller_id: sellerId,
          reviewer_id: user.id,
          listing_id: listingId,
          rating,
          comment: comment || null,
          images: uploadedPaths,
        });
        if (error) throw error;
        toast({ title: "تم إرسال التقييم", description: "شكراً لمساعدتك في بناء مجتمع موثوق" });
      }

      setOpen(false);
      setRating(0);
      setComment("");
      setImageFiles([]);
      setPreviews([]);
      onReviewSubmitted?.();
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Star className="h-4 w-4 ml-2" />
          قيّم البائع
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تقييم {sellerName}</DialogTitle>
          <DialogDescription>شارك تجربتك مع هذا البائع لمساعدة الآخرين</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-4">
          {/* Star Rating */}
          <div className="text-center">
            <label className="text-sm font-medium mb-3 block">تقييمك *</label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star className={`h-8 w-8 transition-colors ${
                    star <= (hoverRating || rating) ? "text-warning fill-warning" : "text-muted-foreground"
                  }`} />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {rating === 1 && "سيء جداً"}
              {rating === 2 && "سيء"}
              {rating === 3 && "مقبول"}
              {rating === 4 && "جيد"}
              {rating === 5 && "ممتاز"}
            </p>
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium mb-2 block">تعليقك (اختياري)</label>
            <Textarea
              placeholder="اكتب تجربتك مع البائع..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          {/* Images */}
          <div>
            <label className="text-sm font-medium mb-2 block">صور للمراجعة (اختياري — حتى 4)</label>
            <div className="grid grid-cols-4 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded border overflow-hidden group">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 left-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {imageFiles.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded border border-dashed flex items-center justify-center text-muted-foreground hover:bg-muted/50 transition"
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAddFiles}
            />
          </div>

          <Button onClick={handleSubmit} className="w-full btn-brand" disabled={submitting || rating === 0}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            إرسال التقييم
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewSellerDialog;
