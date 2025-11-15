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
        router.replace("/text-to-image");
        return;
      }
      const stored = window.sessionStorage.getItem("postLoginRedirect");
      let next = "/text-to-image";
      
      if (stored) {
        try {
          // Parse the stored URL and extract pathname to use relative path
          // This ensures we stay on the current domain
          const storedUrl = new URL(stored);
          // Use only the pathname to ensure we stay on current domain
          next = storedUrl.pathname || "/text-to-image";
          // If the stored URL is the homepage, redirect to text-to-image instead
          if (next === "/" || next === "") {
            next = "/text-to-image";
          }
        } catch (e) {
          // If URL parsing fails, use default
          console.warn("[AuthCallback] Failed to parse stored URL:", stored);
          next = "/text-to-image";
        }
      }
      
      console.log("[AuthCallback] stored redirect", stored, "->", next);
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
