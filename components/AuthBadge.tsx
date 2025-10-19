"use client";

import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut } from "lucide-react";

export default function AuthBadge() {
  const { isAuthenticated, loading, promptLogin, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-sm text-gray-500 shadow-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
        登录状态检测中...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={promptLogin}
        className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-primary-500/30 transition-all hover:-translate-y-[1px] hover:bg-primary-700"
      >
        <LogIn className="h-4 w-4" />
        Sign in
      </button>
    );
  }

  return (
    <button
      onClick={signOut}
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
