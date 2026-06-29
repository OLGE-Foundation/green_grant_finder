"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { MotionConfig } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authModalOpen: boolean;
  authModalMode: "login" | "signup";
  pendingBookmarkGrantId: string | null;
  openAuthModal: (mode?: "login" | "signup", pendingGrantId?: string) => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearPendingBookmark: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login");
  const [pendingBookmarkGrantId, setPendingBookmarkGrantId] = useState<string | null>(
    null,
  );

  const refreshSession = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
  }, [supabase]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const openAuthModal = useCallback(
    (mode: "login" | "signup" = "login", pendingGrantId?: string) => {
      setAuthModalMode(mode);
      if (pendingGrantId) setPendingBookmarkGrantId(pendingGrantId);
      setAuthModalOpen(true);
    },
    [],
  );

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const clearPendingBookmark = useCallback(() => {
    setPendingBookmarkGrantId(null);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    // Leave any auth-gated page (e.g. /admin) and re-render server components so
    // protected content (and its data) disappears immediately instead of
    // lingering until the next manual refresh.
    router.replace("/");
    router.refresh();
  }, [supabase, router]);

  const value = useMemo(
    () => ({
      user,
      loading,
      authModalOpen,
      authModalMode,
      pendingBookmarkGrantId,
      openAuthModal,
      closeAuthModal,
      signOut,
      refreshSession,
      clearPendingBookmark,
    }),
    [
      user,
      loading,
      authModalOpen,
      authModalMode,
      pendingBookmarkGrantId,
      openAuthModal,
      closeAuthModal,
      signOut,
      refreshSession,
      clearPendingBookmark,
    ],
  );

  return (
    <MotionConfig reducedMotion="user">
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </MotionConfig>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}
