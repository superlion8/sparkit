import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LandingLayout from "@/components/LandingLayout";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sparkit - AI 驱动的创意工具包 | 图像生成、视频制作、AI创作工具",
  description: "Sparkit 提供强大的 AI 图像生成、视频制作和创意工具。包括文生图、图像编辑、Mimic角色替换、PhotoBooth组图、Snapshot、Photo to Live、视频生成等功能。免费开始使用，轻松创作专业级视觉内容。",
  keywords: [
    "AI图像生成",
    "AI视频生成",
    "文生图",
    "图像编辑",
    "视频制作",
    "AI工具",
    "创意工具",
    "人工智能",
    "图像处理",
    "视频编辑",
    "Mimic",
    "PhotoBooth",
    "Snapshot",
    "Photo to Live",
    "AI换装",
    "AI换背景"
  ],
  authors: [{ name: "Sparkit Team" }],
  creator: "Sparkit",
  publisher: "Sparkit",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://creator-ai-toolkit.vercel.app"),
  openGraph: {
    title: "Sparkit - AI 驱动的创意工具包",
    description: "强大的 AI 图像生成、视频制作和创意工具。轻松创作专业级视觉内容。",
    url: "/",
    siteName: "Sparkit",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "/sparkit.png",
        width: 1200,
        height: 630,
        alt: "Sparkit - AI 驱动的创意工具包",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sparkit - AI 驱动的创意工具包",
    description: "强大的 AI 图像生成、视频制作和创意工具。轻松创作专业级视觉内容。",
    images: ["/sparkit.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/sparkit.png",
    apple: "/sparkit.png",
  },
  alternates: {
    canonical: "/",
  },
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
          <LandingLayout>
            {children}
          </LandingLayout>
        </Providers>
      </body>
    </html>
  );
}
