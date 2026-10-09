import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

// Device-local keys that hold the previous user's private browsing state.
const PRIVATE_LOCAL_KEYS = ["netplex_recently_viewed"];

interface Profile {
  id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  role: "buyer" | "seller" | "admin";
}

interface Seller {
  id: string;
  user_id: string;
  type: "individual" | "shop";
  shop_name: string | null;
  verified: boolean;
  trust_score: number;
  region: string;
  whatsapp?: string | null;
}

type AppRole = "admin" | "moderator" | "user" | "sub_admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  seller: Seller | null;
  isAdmin: boolean;
  isSeller: boolean;
  loading: boolean;
  userRole: AppRole | null;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const lastUserIdRef = React.useRef<string | null>(null);

  /** Wipe every trace of the previous user: cached queries, realtime channels, local private state. */
  const clearPrivateState = () => {
    queryClient.clear();
    supabase.removeAllChannels();
    try { PRIVATE_LOCAL_KEYS.forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
    setProfile(null);
    setSeller(null);
    setIsAdmin(false);
    setUserRole(null);
  };

  const fetchProfile = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch role from user_roles table
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const role = (roleData?.role as AppRole) ?? "user";
      setUserRole(role);
      setIsAdmin(role === "admin");

      // Check if seller
      const { data: sellerData } = await supabase
        .from("sellers")
        .select("id, user_id, type, shop_name, verified, trust_score, region, bio, created_at, updated_at, logo_url, cover_url")
        .eq("user_id", userId)
        .maybeSingle();

      if (sellerData) {
        setSeller(sellerData as Seller);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let active = true;

    // Resolve the session AND the user's role before releasing `loading`,
    // so protected pages never render (or redirect) on a half-known identity.
    const applySession = async (next: Session | null) => {
      const nextId = next?.user?.id ?? null;
      if (lastUserIdRef.current && lastUserIdRef.current !== nextId) {
        // Signed out, or a different account signed in on this device.
        clearPrivateState();
      }
      lastUserIdRef.current = nextId;
      setSession(next);
      setUser(next?.user ?? null);
      if (next?.user) {
        await fetchProfile(next.user.id);
      }
      if (active) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      // Token refreshes keep the same user — no need to refetch or clear.
      if (event === "TOKEN_REFRESHED" && next?.user?.id === lastUserIdRef.current) {
        setSession(next);
        return;
      }
      // Defer DB calls out of the auth callback to avoid deadlocks.
      setTimeout(() => { void applySession(next); }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      void applySession(initial);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name, phone },
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Clear local state even if the server call fails (e.g. expired refresh token).
    lastUserIdRef.current = null;
    clearPrivateState();
    setUser(null);
    setSession(null);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        seller,
        isAdmin,
        userRole,
        isSeller: !!seller,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
