"use client";

import { useAuth } from "@/hooks/useAuth";
import ChatContainer from "@/components/chat-edit/ChatContainer";

export default function ChatEditPage() {
  const { isAuthenticated, loading: authLoading, promptLogin } = useAuth();

  return (
    <div className="h-full flex flex-col">
      {/* 未登录提示 */}
      {!authLoading && !isAuthenticated && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex-shrink-0">
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
      <div className="flex-1 min-h-0">
        <div className="h-full max-w-5xl mx-auto">
          <ChatContainer />
        </div>
      </div>
    </div>
  );
}
