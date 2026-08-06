import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Gavel, ShieldCheck, ArrowLeft } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface Props {
  listingId: string;
}

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "rounded-lg");
    setTimeout(() => el.classList.remove("ring-2", "ring-primary", "rounded-lg"), 1600);
  }
};

/**
 * Quick jump button inside the product page:
 * - Auction product → jump to the live auction box / auctions screen
 * - Otherwise → jump to the escrow steps / my deals
 */
export const QuickFeatureJump: React.FC<Props> = ({ listingId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasAuction, setHasAuction] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("auctions")
        .select("id")
        .eq("listing_id", listingId)
        .maybeSingle();
      if (active) setHasAuction(!!data);
    })();
    return () => {
      active = false;
    };
  }, [listingId]);

  if (hasAuction === null) return null;
  if (!hasAuction && !user) return null;

  const isAuction = hasAuction;
  const Icon = isAuction ? Gavel : ShieldCheck;

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
      <Button
        variant="secondary"
        className="flex-1 min-h-11 justify-start gap-2"
        onClick={() => {
          haptic("light");
          scrollTo(isAuction ? "auction-section" : "deal-section");
        }}
        aria-label={isAuction ? "الانتقال إلى المزاد" : "الانتقال إلى خطوات ضمان الاستلام"}
      >
        <Icon className="h-4 w-4 text-primary" />
        {isAuction ? "شوف المزاد وزايد" : "خطوات ضمان الاستلام"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="min-h-11 shrink-0"
        onClick={() => {
          haptic("light");
          navigate(isAuction ? "/auctions" : "/deals");
        }}
        aria-label={isAuction ? "كل المزادات" : "صفقاتي"}
      >
        {isAuction ? "كل المزادات" : "صفقاتي"}
        <ArrowLeft className="h-4 w-4 mr-1" />
      </Button>
    </div>
  );
};

export default QuickFeatureJump;
