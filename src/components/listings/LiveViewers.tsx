import React, { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiveViewersProps {
  listingId: string;
}

/**
 * Live viewer counter using Supabase Realtime Presence.
 * Shows "X person viewing now" to create demand signals.
 */
export const LiveViewers: React.FC<LiveViewersProps> = ({ listingId }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!listingId) return;
    const anonId = Math.random().toString(36).slice(2);
    const channel = supabase.channel(`listing_presence:${listingId}`, {
      config: { presence: { key: anonId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ at: Date.now() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId]);

  if (count < 2) return null;

  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full animate-fade-in">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
      </span>
      <Eye className="h-3 w-3" />
      <span>{count} شخص يشاهد هذا المنتج الآن</span>
    </div>
  );
};

export default LiveViewers;
