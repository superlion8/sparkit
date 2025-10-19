import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthBadge from "@/components/AuthBadge";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Creator AI Toolkit",
  description: "AI-powered image and video generation toolkit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>
          <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar />
            <main className="flex-1 flex flex-col">
              <header className="flex items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur px-6 py-4">
                <div>
                  <span className="text-sm text-gray-400">欢迎使用</span>
                  <h1 className="text-lg font-semibold text-gray-900">Creator AI Toolkit</h1>
                </div>
                <AuthBadge />
              </header>
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
