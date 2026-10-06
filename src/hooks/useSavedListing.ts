import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import { brandToast } from "@/lib/brandToast";

/**
 * Quick favorite/save toggle for a single listing.
 */
export function useSavedListing(listingId?: string) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!user || !listingId) {
      setIsSaved(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("saved_listings")
        .select("id")
        .eq("user_id", user.id)
        .eq("listing_id", listingId)
        .maybeSingle();
      if (!cancelled) setIsSaved(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, listingId]);

  const toggle = useCallback(async () => {
    if (!user) {
      brandToast.info("سجّل الدخول لحفظ المنتجات");
      return;
    }
    if (!listingId || loading) return;
    setLoading(true);
    const next = !isSaved;
    setIsSaved(next);
    haptic("light");
    if (next) {
      const { error } = await supabase
        .from("saved_listings")
        .insert({ user_id: user.id, listing_id: listingId });
      if (error) {
        setIsSaved(false);
        haptic("error");
        brandToast.error("تعذر حفظ المنتج");
      } else {
        brandToast.success("أُضيف إلى المفضلة");
      }
    } else {
      const { error } = await supabase
        .from("saved_listings")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);
      if (error) {
        setIsSaved(true);
        haptic("error");
        brandToast.error("تعذر إزالة المنتج");
      } else {
        brandToast.success("أُزيل من المفضلة");
      }
    }
    setLoading(false);
    // Saved listings feed the personalized recommendations.
    qc.invalidateQueries({ queryKey: ["recommendations"] });
  }, [user, listingId, isSaved, loading, qc]);

  return { isSaved, loading, toggle };
}
