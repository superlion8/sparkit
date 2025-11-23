"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, Users, Chrome, ChevronRight } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  link: string;
  isRead: boolean;
}

export default function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 初始化通知列表
  useEffect(() => {
    const readNotifications = JSON.parse(
      localStorage.getItem("sparkit-notifications-read") || "[]"
    );

    const allNotifications: Notification[] = [
      {
        id: "character-management",
        title: "角色管理功能使用指南",
        description: "了解如何创建和管理你的 AI 角色，快速开始 Mimic 洗稿",
        icon: Users,
        iconBg: "bg-primary-100 text-primary-600",
        link: "/tutorials/character-management",
        isRead: readNotifications.includes("character-management"),
      },
      {
        id: "browser-extension",
        title: "浏览器插件使用指南",
        description: "在 Pinterest、Instagram 上一键 Mimic，快速洗稿",
        icon: Chrome,
        iconBg: "bg-green-100 text-green-600",
        link: "/tutorials/browser-extension",
        isRead: readNotifications.includes("browser-extension"),
      },
    ];

    setNotifications(allNotifications);
  }, []);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = (notification: Notification) => {
    // 标记为已读
    const readNotifications = JSON.parse(
      localStorage.getItem("sparkit-notifications-read") || "[]"
    );
    if (!readNotifications.includes(notification.id)) {
      readNotifications.push(notification.id);
      localStorage.setItem(
        "sparkit-notifications-read",
        JSON.stringify(readNotifications)
      );
    }

    // 跳转到详细页面
    router.push(notification.link);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 通知铃铛按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="通知中心"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-semibold rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div>
              <h3 className="text-base font-semibold text-gray-900">通知中心</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {unreadCount} 条未读通知
                </p>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 通知列表 */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无通知</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const IconComponent = notification.icon;
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-left"
                  >
                    {/* 图标 */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${notification.iconBg}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900 leading-snug">
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-1"></span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {notification.description}
                      </p>
                      <div className="flex items-center gap-1 text-primary-600 text-xs font-medium">
                        <span>查看详情</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
