"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";

export default function AuthBadge() {
  const { isAuthenticated, loading, promptLogin, signOut, userEmail, userAvatar, userName } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      window.addEventListener("click", handler);
    }
    return () => window.removeEventListener("click", handler);
  }, [menuOpen]);

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
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((open) => !open)}
        className="inline-flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName || "profile"}
              className="h-7 w-7 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {(userName || userEmail || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900">
              {userName || "已登录"}
            </span>
            {userEmail && <span className="text-xs text-gray-500">{userEmail}</span>}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5">
          <button
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
