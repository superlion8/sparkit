"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Image, 
  ImagePlus, 
  Shirt, 
  Palette, 
  Video, 
  Replace,
  Menu,
  X,
  Film,
  History
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "图像生成", href: "/text-to-image", icon: Image },
  { name: "图像编辑", href: "/image-to-image", icon: ImagePlus },
  { name: "AI换装", href: "/outfit-change", icon: Shirt },
  { name: "AI换背景", href: "/background-replace", icon: Palette },
  { name: "视频生成", href: "/video-generation", icon: Video },
  { name: "视频主体替换", href: "/video-subject-replace", icon: Replace },
  { name: "改图转场", href: "/image-transition", icon: Film },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NavContent = () => (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-8 px-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
          Creator AI
        </h1>
        <p className="text-sm text-gray-500 mt-1">Toolkit</p>
      </div>

      {/* AI Generation Tools */}
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all
              ${
                isActive
                  ? "bg-primary-100 text-primary-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
              }
            `}
          >
            <Icon className="w-5 h-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}

      {/* Divider */}
      <div className="my-4 px-4">
        <div className="h-px bg-gray-200"></div>
      </div>

      {/* History Link */}
      <Link
        href="/history"
        onClick={() => setMobileMenuOpen(false)}
        className={`
          flex items-center gap-3 px-4 py-3 rounded-lg transition-all
          ${
            pathname === "/history"
              ? "bg-primary-100 text-primary-700 font-medium"
              : "text-gray-700 hover:bg-gray-100"
          }
        `}
      >
        <History className="w-5 h-5" />
        <span>生成历史</span>
      </Link>
    </nav>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {mobileMenuOpen ? (
          <X className="w-6 h-6 text-gray-700" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700" />
        )}
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <NavContent />
      </aside>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-white z-40 overflow-y-auto shadow-xl">
            <NavContent />
          </aside>
        </>
      )}
    </>
  );
}

