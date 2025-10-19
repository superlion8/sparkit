"use client";

import { createContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabaseClient";

interface AuthContextValue {
  session: Session | null;
  accessToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  accessToken: null,
  loading: true,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  signInWithGoogle: async () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  signOut: async () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const accessToken = session?.access_token ?? null;

    return {
      session,
      accessToken,
      loading,
      signInWithGoogle: async () => {
        const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
          },
        });
        if (error) {
          console.error("Google 登录失败:", error.message);
          throw error;
        }
      },
      signOut: async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
          console.error("退出登录失败:", error.message);
          throw error;
        }
      },
    };
  }, [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
