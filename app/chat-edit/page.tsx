"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import ChatContainer from "@/components/chat-edit/ChatContainer";
import { MessageSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ChatEditPage() {
  const { isAuthenticated, loading: authLoading, promptLogin } = useAuth();

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <Link 
          href="/" 
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary-600" />
          <h1 className="text-xl font-semibold text-gray-900">Chat Edit</h1>
        </div>
        <div className="ml-auto text-sm text-gray-500">
          对话式图像编辑
        </div>
      </header>

      {/* 未登录提示 */}
      {!authLoading && !isAuthenticated && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <p className="text-sm text-amber-700">
              登录后可以使用 Chat Edit 功能
            </p>
            <button
              onClick={promptLogin}
              className="px-4 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              登录
            </button>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto">
          <ChatContainer />
        </div>
      </main>
    </div>
  );
}

