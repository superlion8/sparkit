"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, BookOpen, Chrome, Users } from "lucide-react";

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // 检查是否有未读通知
  useEffect(() => {
    const hasRead = localStorage.getItem("sparkit-tutorial-read");
    if (!hasRead) {
      setUnreadCount(2); // 2 个教程
    }
  }, []);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      // 标记为已读
      localStorage.setItem("sparkit-tutorial-read", "true");
      setUnreadCount(0);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 通知铃铛按钮 */}
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="通知中心"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">通知中心</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* 角色管理教程 */}
            <div className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    📚 角色管理功能使用指南
                  </h4>
                  <p className="text-xs text-gray-600 mb-3">
                    了解如何创建和管理你的 AI 角色，快速开始 Mimic 洗稿
                  </p>
                  
                  <div className="space-y-2 text-xs text-gray-700">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="font-medium mb-2">📝 创建角色</p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-600">
                        <li>点击左侧导航栏的 "角色管理"</li>
                        <li>点击 "创建新角色" 按钮</li>
                        <li>上传角色的头像照片（正面清晰照）</li>
                        <li>（可选）上传全身照，效果更好</li>
                        <li>填写角色名称，点击创建</li>
                      </ol>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="font-medium mb-2">🎨 查看生成结果</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li><strong>资源 Tab</strong>：查看所有生成的图片</li>
                        <li><strong>收藏 Tab</strong>：查看收藏的图片</li>
                        <li><strong>参考 Tab</strong>：查看 Mimic 时使用的参考图</li>
                        <li>点击图片可以放大查看</li>
                        <li>支持下载、收藏、删除操作</li>
                        <li>可以一键复制 prompt</li>
                      </ul>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="font-medium mb-2">💡 使用技巧</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li>照片越清晰，生成效果越好</li>
                        <li>建议上传正面照作为头像</li>
                        <li>全身照能让生成更准确</li>
                        <li>一个角色可以生成无数张图片</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 浏览器插件教程 */}
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Chrome className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    🔌 浏览器插件使用指南
                  </h4>
                  <p className="text-xs text-gray-600 mb-3">
                    在 Pinterest、Instagram 上一键 Mimic，快速洗稿
                  </p>
                  
                  <div className="space-y-2 text-xs text-gray-700">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="font-medium mb-2">📥 安装插件</p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-600">
                        <li>下载插件文件（联系管理员获取）</li>
                        <li>打开 Chrome，访问 <code className="bg-gray-100 px-1 rounded">chrome://extensions/</code></li>
                        <li>开启右上角的 "开发者模式"</li>
                        <li>点击 "加载已解压的扩展程序"</li>
                        <li>选择插件文件夹，完成安装</li>
                      </ol>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="font-medium mb-2">🔑 同步登录状态</p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-600">
                        <li>确保已在 Sparkit 网站登录</li>
                        <li>点击浏览器插件图标</li>
                        <li>点击 "Sync Login Status" 按钮</li>
                        <li>显示登录邮箱即同步成功</li>
                      </ol>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="font-medium mb-2">🎯 使用插件 Mimic</p>
                      <ol className="list-decimal list-inside space-y-1 text-gray-600">
                        <li>打开 Pinterest 或 Instagram</li>
                        <li>鼠标悬停在任意图片上</li>
                        <li>点击右下角出现的 "Mimic" 按钮</li>
                        <li>选择要使用的角色</li>
                        <li>选择是否保留背景</li>
                        <li>点击 "Generate 2 images" 开始生成</li>
                        <li>弹窗自动关闭，后台继续生成</li>
                        <li>稍后在角色管理页面查看结果</li>
                      </ol>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="font-medium mb-2">✨ 核心优势</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li><strong>1 秒提交</strong>：提交后立即关闭，不阻塞浏览</li>
                        <li><strong>批量操作</strong>：可以连续 Mimic 多张图片</li>
                        <li><strong>自动保存</strong>：结果自动保存到角色资源</li>
                        <li><strong>智能处理</strong>：自动反推 prompt，保留构图</li>
                        <li><strong>记住角色</strong>：下次打开默认选中上次的角色</li>
                      </ul>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="font-medium mb-2">⚠️ 注意事项</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li>首次使用需要同步登录状态</li>
                        <li>生成需要 30-60 秒，请耐心等待</li>
                        <li>建议选择高质量的参考图</li>
                        <li>生成失败的任务可以在资源页删除</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              💡 如有问题，请联系技术支持
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

