"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window === "undefined") {
        router.replace("/");
        return;
      }
      const stored = window.sessionStorage.getItem("postLoginRedirect");
      const next = stored || "/";
      window.sessionStorage.removeItem("postLoginRedirect");
      router.replace(next);
    }, 200);

    return () => clearTimeout(timer);
  }, [router]);

  const code = searchParams.get("code");
  const message = code ? "正在完成登录跳转..." : "正在处理登录信息...";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <LoadingSpinner text={message} />
    </div>
  );
}
