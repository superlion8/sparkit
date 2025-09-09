import type { Metadata } from "next";
import { Inter, HarmonyOS_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const harmony = HarmonyOS_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-harmony",
});

export const metadata: Metadata = {
  title: "Sparkit - AI Image Generation Tool",
  description: "Create and edit amazing images with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${harmony.variable}`}>{children}</body>
    </html>
  );
}
