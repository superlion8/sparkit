"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";
import LoginDialog from "@/components/LoginDialog";

interface AuthContextValue {
  session: Session | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  promptLogin: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  userEmail: string | null;
  userAvatar: string | null;
  userName: string | null;
}

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  accessToken: null,
  isAuthenticated: false,
  loading: true,
  promptLogin: () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  userEmail: null,
  userAvatar: null,
  userName: null,
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      const { data, error } = await supabaseClient.auth.getSession();

      if (!isMounted) return;

      if (error) {
        console.error("获取 Supabase 会话失败:", error.message);
        setSession(null);
      } else {
        setSession(data.session ?? null);
      }
      setLoading(false);
    };

    initSession();

    const { data } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setLoading(false);
      if (newSession) {
        setLoginModalOpen(false);
        setLoginLoading(false);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setLoginLoading(true);
    try {
      let redirectTo: string | undefined;
      if (typeof window !== "undefined") {
        const currentUrl = window.location.href;
        window.sessionStorage.setItem("postLoginRedirect", currentUrl);
        const origin = window.location.origin;
        const normalized = origin.endsWith("/") ? origin.slice(0, -1) : origin;
        redirectTo = `${normalized}/auth/callback`;
        console.log("[Auth] redirecting to", redirectTo, "from", currentUrl);
      }
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      if (error) {
        console.error("Google 登录失败:", error.message);
        setLoginLoading(false);
        throw error;
      }
    } catch (err) {
      setLoginLoading(false);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error("退出登录失败:", error.message);
      throw error;
    }
  }, []);

  const promptLogin = useCallback(() => {
    setLoginModalOpen(true);
  }, []);

  const accessToken = session?.access_token ?? null;
  const isAuthenticated = Boolean(session && accessToken);

  const metadata = (session?.user?.user_metadata as Record<string, any>) || {};
  const userEmail = session?.user?.email ?? null;
  const userAvatar =
    (metadata.avatar_url as string | undefined) ||
    (metadata.picture as string | undefined) ||
    null;
  const userName =
    (metadata.full_name as string | undefined) ||
    (metadata.name as string | undefined) ||
    (metadata.user_name as string | undefined) ||
    userEmail;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      accessToken,
      isAuthenticated,
      loading,
      promptLogin,
      signInWithGoogle,
      signOut,
      userEmail,
      userAvatar,
      userName,
    }),
    [
      session,
      accessToken,
      isAuthenticated,
      loading,
      promptLogin,
      signInWithGoogle,
      signOut,
      userEmail,
      userAvatar,
      userName,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginDialog
        open={loginModalOpen}
        loading={loginLoading}
        onLogin={signInWithGoogle}
        onClose={() => {
          if (!loginLoading) {
            setLoginModalOpen(false);
          }
        }}
      />
    </AuthContext.Provider>
  );
}
