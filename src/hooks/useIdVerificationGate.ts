import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the price threshold above which the seller must be ID-verified,
 * and whether the current seller is verified.
 */
export const useIdVerificationGate = () => {
  const { user, seller } = useAuth();
  const [threshold, setThreshold] = useState<number>(3000);
  const [verified, setVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "id_verification_price_threshold_ils")
        .maybeSingle();
      if (!cancelled && data?.value != null) {
        const v = typeof data.value === "number" ? data.value : Number(data.value);
        if (!Number.isNaN(v)) setThreshold(v);
      }
      if (seller) setVerified(!!seller.verified);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, seller]);

  const requiresVerification = (price: number) => price >= threshold && !verified;

  return { threshold, verified, loading, requiresVerification };
};
