import React, { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  sellerId: string;
  sellerName: string;
  onSubmitted?: () => void;
}

export const WriteSellerReviewButton: React.FC<Props> = ({
  sellerId,
  sellerName,
  onSubmitted,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [listingId, setListingId] = useState<string>("");
  const [soldListings, setSoldListings] = useState<{ id: string; title: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingList(true);
    supabase
      .from("listings")
      .select("id, title")
      .eq("seller_id", sellerId)
      .eq("status", "sold")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSoldListings(data || []);
        setLoadingList(false);
      });
  }, [open, sellerId]);

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "سجل دخول الأول", variant: "destructive" });
      return;
    }
    if (rating === 0) {
      toast({ title: "اختار التقييم", variant: "destructive" });
      return;
    }
    if (!listingId) {
      toast({ title: "اختار المنتج اللي اشتريته", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("seller_id", sellerId)
        .eq("reviewer_id", user.id)
        .eq("listing_id", listingId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("reviews")
          .update({ rating, comment: comment || null })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reviews").insert({
          seller_id: sellerId,
          reviewer_id: user.id,
          listing_id: listingId,
          rating,
          comment: comment || null,
        });
        if (error) throw error;
      }
      toast({ title: "يعطيك العافية!", description: "انضاف تقييمك" });
      setOpen(false);
      setRating(0);
      setComment("");
      setListingId("");
      onSubmitted?.();
    } catch (err: any) {
      toast({
        title: "ما زبطت",
        description: err.message || "ممكن يكون المنتج لسا ما تباع",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <Star className="h-4 w-4 ml-2" />
          اكتب تقييمك
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تقييم {sellerName}</DialogTitle>
          <DialogDescription>
            شارك تجربتك مع البائع وساعد باقي الزبائن
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              المنتج اللي اشتريته *
            </label>
            <Select value={listingId} onValueChange={setListingId} disabled={loadingList}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingList
                      ? "جاري التحميل..."
                      : soldListings.length === 0
                      ? "ما في منتجات متاحة للتقييم"
                      : "اختار المنتج"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {soldListings.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingList && soldListings.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                التقييم متاح بس على المنتجات اللي تباعت فعلياً.
              </p>
            )}
          </div>

          <div className="text-center">
            <label className="text-sm font-medium mb-3 block">تقييمك *</label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      s <= (hover || rating)
                        ? "text-warning fill-warning"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">رأيك (اختياري)</label>
            <Textarea
              placeholder="احكي عن تجربتك مع البائع..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full btn-brand"
            disabled={submitting || rating === 0 || !listingId}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            إرسال التقييم
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WriteSellerReviewButton;
