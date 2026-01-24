import React, { useState } from "react";
import { Star } from "lucide-react";
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

    // Check if user already reviewed this seller for this listing
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("seller_id", sellerId)
      .eq("reviewer_id", user.id)
      .eq("listing_id", listingId)
      .single();

    if (existingReview) {
      // Update existing review
      const { error } = await supabase
        .from("reviews")
        .update({
          rating,
          comment: comment || null,
        })
        .eq("id", existingReview.id);

      if (error) {
        toast({ title: "حدث خطأ", description: "يرجى المحاولة لاحقاً", variant: "destructive" });
      } else {
        toast({ title: "تم تحديث التقييم بنجاح" });
        setOpen(false);
        setRating(0);
        setComment("");
        onReviewSubmitted?.();
      }
    } else {
      // Create new review
      const { error } = await supabase.from("reviews").insert({
        seller_id: sellerId,
        reviewer_id: user.id,
        listing_id: listingId,
        rating,
        comment: comment || null,
      });

      if (error) {
        toast({ title: "حدث خطأ", description: "يرجى المحاولة لاحقاً", variant: "destructive" });
      } else {
        toast({ title: "تم إرسال التقييم بنجاح", description: "شكراً لمساعدتك في بناء مجتمع موثوق" });
        setOpen(false);
        setRating(0);
        setComment("");
        onReviewSubmitted?.();
      }
    }

    setSubmitting(false);
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
          <DialogDescription>
            شارك تجربتك مع هذا البائع لمساعدة الآخرين
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
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
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "text-warning fill-warning"
                        : "text-muted-foreground"
                    }`}
                  />
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
              rows={4}
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full btn-brand"
            disabled={submitting || rating === 0}
          >
            {submitting ? "جاري الإرسال..." : "إرسال التقييم"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewSellerDialog;
