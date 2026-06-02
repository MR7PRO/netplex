import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { brandToast } from "@/lib/brandToast";
import { haptic } from "@/lib/haptics";

export function useFollowSeller(sellerId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const followKey = ["seller-follow", sellerId, user?.id];
  const countKey = ["seller-follower-count", sellerId];

  const { data: isFollowing, isLoading } = useQuery({
    queryKey: followKey,
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
    queryKey: countKey,
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
    // Optimistic UI — flip immediately, roll back on error.
    onMutate: async () => {
      haptic("light");
      await qc.cancelQueries({ queryKey: followKey });
      await qc.cancelQueries({ queryKey: countKey });
      const prevFollowing = qc.getQueryData<boolean>(followKey);
      const prevCount = qc.getQueryData<number>(countKey);
      qc.setQueryData<boolean>(followKey, !prevFollowing);
      qc.setQueryData<number>(countKey, Math.max(0, (prevCount ?? 0) + (prevFollowing ? -1 : 1)));
      return { prevFollowing, prevCount };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevFollowing !== undefined) qc.setQueryData(followKey, ctx.prevFollowing);
      if (ctx?.prevCount !== undefined) qc.setQueryData(countKey, ctx.prevCount);
      haptic("error");
      brandToast.error("حدث خطأ");
    },
    onSuccess: () => {
      // isFollowing here is the value BEFORE the optimistic flip in onMutate,
      // so a true value means we just unfollowed.
      brandToast.success(isFollowing ? "تم إلغاء المتابعة" : "تمت المتابعة");
      haptic("success");
      qc.invalidateQueries({ queryKey: ["followed-sellers-feed"] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: followKey });
      qc.invalidateQueries({ queryKey: countKey });
    },
  });

  return {
    isFollowing: !!isFollowing,
    isLoading,
    followerCount: followerCount || 0,
    toggle: toggle.mutate,
    toggling: toggle.isPending,
  };
}
