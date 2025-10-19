"use client";

import { LogIn } from "lucide-react";

interface LoginPromptProps {
  onLogin: () => void | Promise<void>;
  loading?: boolean;
}

export default function LoginPrompt({ onLogin, loading = false }: LoginPromptProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
      <LogIn className="w-12 h-12 text-primary-600 mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">请先登录</h2>
      <p className="text-gray-600 mb-6">
        需要登录 Google 账号后才能使用 Creator AI Toolkit 的所有功能。
      </p>
      <button
        onClick={onLogin}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:bg-gray-300 transition-colors"
      >
        {loading ? "跳转中..." : "使用 Google 登录"}
      </button>
      <p className="text-xs text-gray-400 mt-4">
        登录后，我们会使用 Supabase 验证您的身份，以确保服务安全。
      </p>
    </div>
  );
}
