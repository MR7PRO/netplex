import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useSellerWhatsapp = (sellerId: string | null | undefined) => {
  const { user } = useAuth();
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWhatsapp = async () => {
      // Only fetch if user is authenticated and we have a seller ID
      if (!user || !sellerId) {
        setWhatsapp(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc("get_seller_whatsapp", {
          p_seller_id: sellerId,
        });

        if (rpcError) {
          console.error("Error fetching seller WhatsApp:", rpcError);
          setError(rpcError.message);
          setWhatsapp(null);
        } else {
          setWhatsapp(data);
        }
      } catch (err) {
        console.error("Unexpected error fetching WhatsApp:", err);
        setError("Failed to fetch contact");
        setWhatsapp(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWhatsapp();
  }, [user, sellerId]);

  return { whatsapp, loading, error, isAuthenticated: !!user };
};
