"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AuthBadge from "@/components/AuthBadge";
import NotificationCenter from "@/components/NotificationCenter";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  if (isHomePage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white/75 backdrop-blur px-6 py-3">
          <div className="flex items-center gap-3">
            <img src="/sparkit.png" alt="Sparkit" className="h-8 w-8 object-contain" />
            <div>
              <span className="text-xs text-gray-400">欢迎使用</span>
              <h1 className="text-base font-semibold text-gray-900">Sparkit</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <AuthBadge />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

