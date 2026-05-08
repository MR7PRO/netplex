import React from "react";
import { Button } from "@/components/ui/button";
import { Heart, HeartOff, LogIn } from "lucide-react";
import { useFollowSeller } from "@/hooks/useFollowSeller";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Props {
  sellerId: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
}

export const FollowSellerButton: React.FC<Props> = ({ sellerId, size = "default", variant = "outline" }) => {
  const { user } = useAuth();
  const nav = useNavigate();
  const { isFollowing, toggle, toggling, followerCount } = useFollowSeller(sellerId);

  if (!user) {
    return (
      <Button size={size} variant={variant} onClick={() => nav("/auth")}>
        <LogIn className="h-4 w-4 ml-2" />
        تابع البائع
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={isFollowing ? "default" : variant}
      onClick={() => toggle()}
      disabled={toggling}
      className={isFollowing ? "btn-brand" : ""}
    >
      {isFollowing ? <HeartOff className="h-4 w-4 ml-2" /> : <Heart className="h-4 w-4 ml-2" />}
      {isFollowing ? "إلغاء المتابعة" : "متابعة"}
      {followerCount > 0 && <span className="mr-2 text-xs opacity-80">({followerCount})</span>}
    </Button>
  );
};
