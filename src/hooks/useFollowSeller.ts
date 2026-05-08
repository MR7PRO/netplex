import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function useFollowSeller(sellerId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: isFollowing, isLoading } = useQuery({
    queryKey: ["seller-follow", sellerId, user?.id],
    queryFn: async () => {
      if (!user || !sellerId) return false;
      const { data } = await supabase
        .from("seller_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("seller_id", sellerId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!sellerId,
  });

  const { data: followerCount } = useQuery({
    queryKey: ["seller-follower-count", sellerId],
    queryFn: async () => {
      if (!sellerId) return 0;
      const { count } = await supabase
        .from("seller_follows")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", sellerId);
      return count || 0;
    },
    enabled: !!sellerId,
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user || !sellerId) throw new Error("auth");
      if (isFollowing) {
        const { error } = await supabase
          .from("seller_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("seller_id", sellerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("seller_follows")
          .insert({ follower_id: user.id, seller_id: sellerId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seller-follow", sellerId, user?.id] });
      qc.invalidateQueries({ queryKey: ["seller-follower-count", sellerId] });
      qc.invalidateQueries({ queryKey: ["followed-sellers-feed"] });
      toast({ title: isFollowing ? "تم إلغاء المتابعة" : "تمت المتابعة" });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  return { isFollowing: !!isFollowing, isLoading, followerCount: followerCount || 0, toggle: toggle.mutate, toggling: toggle.isPending };
}
