"use client";

import LoginPrompt from "@/components/LoginPrompt";
import { X } from "lucide-react";

interface LoginDialogProps {
  open: boolean;
  loading?: boolean;
  onLogin: () => void | Promise<void>;
  onClose?: () => void;
}

export default function LoginDialog({ open, loading = false, onLogin, onClose }: LoginDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl bg-white shadow-2xl p-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            aria-label="关闭登录窗口"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
          <LoginPrompt onLogin={onLogin} loading={loading} />
        </div>
      </div>
    </div>
  );
}
