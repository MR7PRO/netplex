import React from "react";
import { Button } from "@/components/ui/button";
import { Share2, Facebook, Instagram, Copy, Twitter } from "lucide-react";
import { toast } from "sonner";

interface Props {
  title: string;
  price: number;
  url?: string;
}

export const SocialShareButtons: React.FC<Props> = ({ title, price, url }) => {
  const shareUrl = url || window.location.href;
  const caption = `🔥 ${title}\n💰 ₪${price.toLocaleString("he-IL")}\n🔗 ${shareUrl}`;

  const wa = `https://wa.me/?text=${encodeURIComponent(caption)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(caption)}`;
  const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`;

  const copyForInsta = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success("تم نسخ النص! افتح إنستغرام والصقه");
      window.open("https://www.instagram.com/", "_blank");
    } catch {
      toast.error("فشل النسخ");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("فشل النسخ");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground flex items-center gap-1">
        <Share2 className="h-4 w-4" /> شارك:
      </span>
      <Button variant="outline" size="sm" className="text-green-600 border-green-600/30" asChild>
        <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="واتساب">واتساب</a>
      </Button>
      <Button variant="outline" size="sm" className="text-blue-600 border-blue-600/30" asChild>
        <a href={fb} target="_blank" rel="noopener noreferrer" aria-label="فيسبوك">
          <Facebook className="h-4 w-4 ml-1" /> فيسبوك
        </a>
      </Button>
      <Button variant="outline" size="sm" className="text-pink-600 border-pink-600/30" onClick={copyForInsta} aria-label="إنستغرام">
        <Instagram className="h-4 w-4 ml-1" /> إنستغرام
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={tw} target="_blank" rel="noopener noreferrer" aria-label="تويتر">
          <Twitter className="h-4 w-4 ml-1" /> X
        </a>
      </Button>
      <Button variant="ghost" size="sm" onClick={copyLink} aria-label="نسخ الرابط">
        <Copy className="h-4 w-4 ml-1" /> نسخ الرابط
      </Button>
    </div>
  );
};

export default SocialShareButtons;
