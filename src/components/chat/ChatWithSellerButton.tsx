import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  sellerId: string;
  sellerUserId?: string;
  listingId?: string;
}

export const ChatWithSellerButton: React.FC<Props> = ({ sellerId, sellerUserId, listingId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const startChat = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (sellerUserId && sellerUserId === user.id) {
      toast({ title: "لا يمكنك مراسلة نفسك", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Try to find existing conversation
      let query = supabase
        .from("conversations")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("seller_id", sellerId);
      query = listingId ? query.eq("listing_id", listingId) : query.is("listing_id", null);
      const { data: existing } = await query.maybeSingle();

      let convId = existing?.id;
      if (!convId) {
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({
            buyer_id: user.id,
            seller_id: sellerId,
            listing_id: listingId ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        convId = created.id;
      }
      navigate(`/messages/${convId}`);
    } catch (e: any) {
      toast({ title: "تعذّر فتح المحادثة", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" className="flex-1" onClick={startChat} disabled={loading}>
      <MessageSquare className="h-4 w-4 ml-2" />
      مراسلة البائع
    </Button>
  );
};

export default ChatWithSellerButton;
