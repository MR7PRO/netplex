import React from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

interface WhatsAppShareButtonProps {
  title: string;
  price: number;
  url?: string;
}

export const WhatsAppShareButton: React.FC<WhatsAppShareButtonProps> = ({
  title,
  price,
  url,
}) => {
  const shareUrl = url || window.location.href;
  const text = `🔥 شوف هالمنتج: ${title}\n💰 السعر: ₪${price.toLocaleString("he-IL")}\n🔗 ${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-green-600 border-green-600/30 hover:bg-green-50 dark:hover:bg-green-950"
      asChild
    >
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
        <Share2 className="h-4 w-4 ml-1" />
        شارك عبر واتساب
      </a>
    </Button>
  );
};
