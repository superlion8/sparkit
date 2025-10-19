"use client";

import { LogIn } from "lucide-react";

interface LoginPromptProps {
  onLogin: () => void | Promise<void>;
  loading?: boolean;
}

export default function LoginPrompt({ onLogin, loading = false }: LoginPromptProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-4">
      <LogIn className="w-12 h-12 text-primary-600" />
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">请先登录</h2>
        <p className="text-gray-600 max-w-xs">
          登录 Google 账号后即可使用 Creator AI Toolkit 的全部生成功能。
        </p>
      </div>
      <button
        onClick={onLogin}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:bg-gray-300 transition-colors"
      >
        {loading ? "跳转中..." : "使用 Google 登录"}
      </button>
      <p className="text-xs text-gray-400">
        登录后我们会通过 Supabase 验证身份，以确保服务安全。
      </p>
    </div>
  );
}
