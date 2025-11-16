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
  History,
  Settings,
  User,
  Camera,
  PlayCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const imageTools = [
  { name: "文生图", href: "/text-to-image", icon: Image },
  { name: "图像编辑", href: "/image-to-image", icon: ImagePlus },
  { name: "Mimic(洗稿)", href: "/mimic", icon: User },
  { name: "Control Panel(控制面板)", href: "/control-panel", icon: Settings },
  { name: "PhotoBooth(组图)", href: "/photobooth", icon: Camera },
  { name: "Snapshot", href: "/snapshot", icon: Camera },
];

const videoTools = [
  { name: "Photo to Live", href: "/photo-to-live", icon: PlayCircle },
  { name: "改图首尾帧", href: "/image-transition", icon: Film },
  { name: "模板视频生成", href: "/video-generation", icon: Video },
  { name: "视频主体替换(animate)", href: "/video-subject-replace", icon: Replace },
];

const otherTools = [
  { name: "AI换装", href: "/outfit-change", icon: Shirt },
  { name: "AI换背景", href: "/background-replace", icon: Palette },
];

// 管理员邮箱列表
const isAdminEmail = (email?: string | null) => {
  if (!email) return false;
  const adminEmails = ["billccb.8128@gmail.com"];
  return adminEmails.includes(email.toLowerCase());
};

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [otherToolsExpanded, setOtherToolsExpanded] = useState(false);
  const { userEmail } = useAuth();
  const isAdmin = isAdminEmail(userEmail);

  const NavContent = () => (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-8 px-4 flex items-center gap-3">
        <img src="/sparkit.png" alt="Sparkit" className="h-10 w-10 object-contain" />
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
            Sparkit
          </h1>
          <p className="text-sm text-gray-500 mt-1">AI Toolkit</p>
        </div>
      </div>

      {/* Image Tools Section */}
      <div className="mb-4">
        <div className="px-4 mb-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Image</p>
        </div>
        {imageTools.map((item) => {
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
      </div>

      {/* Video Tools Section */}
      <div className="mb-4">
        <div className="px-4 mb-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Video</p>
        </div>
        {videoTools.map((item) => {
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
      </div>

      {/* Other Tools Section - Collapsible */}
      <div className="mb-4">
        <button
          onClick={() => setOtherToolsExpanded(!otherToolsExpanded)}
          className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
        >
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Other Tools</p>
          </div>
          {otherToolsExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
        {otherToolsExpanded && (
          <div className="mt-1">
            {otherTools.map((item) => {
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
          </div>
        )}
      </div>

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

      {/* Admin Section */}
      {isAdmin && (
        <>
          <div className="my-4 px-4">
            <div className="h-px bg-gray-200"></div>
          </div>
          
          <div className="px-4 mb-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">管理功能</p>
          </div>
          
          <Link
            href="/admin/tasks"
            onClick={() => setMobileMenuOpen(false)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg transition-all
              ${
                pathname === "/admin/tasks"
                  ? "bg-red-100 text-red-700 font-medium"
                  : "text-gray-700 hover:bg-red-50"
              }
            `}
          >
            <Settings className="w-5 h-5" />
            <span>管理后台</span>
          </Link>
        </>
      )}
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

