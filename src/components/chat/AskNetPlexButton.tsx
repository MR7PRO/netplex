import React, { useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NetPlexChatPanel } from "@/components/chat/NetPlexChatPanel";

interface ListingContext {
  title: string;
  price: number;
  brand?: string | null;
  model?: string | null;
  condition?: string | null;
  region?: string | null;
}

interface AskNetPlexButtonProps {
  listingContext?: ListingContext | null;
}

export const AskNetPlexButton: React.FC<AskNetPlexButtonProps> = ({ listingContext }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-30 rounded-full shadow-lg gap-2 px-5 py-3 h-auto"
        size="lg"
      >
        <Bot className="h-5 w-5" />
        <span className="text-sm font-semibold">اسأل NetPlex</span>
      </Button>

      <NetPlexChatPanel
        open={open}
        onClose={() => setOpen(false)}
        listingContext={listingContext}
      />
    </>
  );
};

export default AskNetPlexButton;
