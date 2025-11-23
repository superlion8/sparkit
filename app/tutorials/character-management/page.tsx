"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Plus, Image as ImageIcon, Heart, Folder, Download, Trash2, Copy, Eye } from "lucide-react";

export default function CharacterManagementTutorial() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>返回</span>
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Title Section */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">角色管理功能使用指南</h1>
              <p className="text-primary-100">
                了解如何创建和管理你的 AI 角色，快速开始 Mimic 洗稿
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* 简介 */}
          <div className="mb-8 p-6 bg-blue-50 border border-blue-100 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 什么是角色管理？</h3>
            <p className="text-gray-700 leading-relaxed">
              角色管理是 Sparkit 的核心功能之一。通过上传角色的照片，AI 会学习这个角色的外貌特征，然后你可以使用这个角色在各种场景中生成图片。每个角色可以重复使用，生成无数张不同场景的图片。
            </p>
          </div>

          {/* 第一部分：创建角色 */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Plus className="w-6 h-6 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">1. 创建新角色</h2>
            </div>

            <div className="space-y-6 ml-13">
              {/* 步骤 1 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">进入角色管理页面</h3>
                    <p className="text-gray-600 mb-3">
                      点击左侧导航栏的 <strong>「角色管理」</strong> 菜单项，进入角色管理页面。
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤 2 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">点击创建按钮</h3>
                    <p className="text-gray-600 mb-3">
                      在页面右上角找到 <strong>「创建新角色」</strong> 按钮，点击打开创建对话框。
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤 3 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">上传头像照片（必填）</h3>
                    <p className="text-gray-600 mb-3">
                      上传角色的 <strong>头像照片</strong>。这是必填项，建议使用：
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
                      <li>正面清晰照片</li>
                      <li>光线充足，无遮挡</li>
                      <li>五官清晰可见</li>
                      <li>背景简洁（单色背景最佳）</li>
                    </ul>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>提示：</strong>头像照片的质量直接影响生成效果，照片越清晰，AI 学习的特征越准确。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 步骤 4 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">上传全身照（可选）</h3>
                    <p className="text-gray-600 mb-3">
                      可选择上传 <strong>全身照</strong>，帮助 AI 更好地学习角色的体态和比例：
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
                      <li>站立姿势，全身入镜</li>
                      <li>穿着简洁，能体现身材比例</li>
                      <li>背景干净，无其他人物</li>
                    </ul>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>建议：</strong>上传全身照可以让生成的图片更加准确，特别是涉及全身姿势的场景。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 步骤 5 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    5
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">填写角色名称</h3>
                    <p className="text-gray-600 mb-3">
                      为角色起一个容易识别的名字，比如 "Fiya"、"小美"、"Alex" 等。
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤 6 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    6
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">完成创建</h3>
                    <p className="text-gray-600 mb-3">
                      点击 <strong>「创建」</strong> 按钮，系统会保存角色信息。创建成功后，你就可以开始使用这个角色进行 Mimic 生成了！
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 第二部分：查看生成结果 */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Folder className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">2. 查看生成结果</h2>
            </div>

            <div className="space-y-4 ml-13">
              <p className="text-gray-600 mb-4">
                点击任意角色卡片，进入角色详情页面。页面顶部有三个标签页：
              </p>

              {/* 资源 Tab */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-start gap-3 mb-3">
                  <ImageIcon className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">📦 资源 Tab</h3>
                    <p className="text-gray-700 mb-3">
                      显示该角色生成的 <strong>所有图片</strong>。这里会展示：
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li>所有已完成的生成图片</li>
                      <li>正在生成中的任务（动画加载卡片）</li>
                      <li>生成失败的任务（可删除）</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 收藏 Tab */}
              <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
                <div className="flex items-start gap-3 mb-3">
                  <Heart className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">❤️ 收藏 Tab</h3>
                    <p className="text-gray-700 mb-3">
                      显示你 <strong>收藏的图片</strong>。在资源 Tab 中，点击图片右上角的爱心图标即可收藏。
                    </p>
                    <p className="text-gray-600 text-sm">
                      收藏功能帮助你快速找到满意的作品。
                    </p>
                  </div>
                </div>
              </div>

              {/* 参考 Tab */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-200">
                <div className="flex items-start gap-3 mb-3">
                  <Eye className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">🎯 参考 Tab</h3>
                    <p className="text-gray-700 mb-3">
                      显示使用该角色进行 Mimic 时的 <strong>原始参考图</strong>。
                    </p>
                    <p className="text-gray-600 text-sm">
                      这些是你从 Pinterest、Instagram 等平台 Mimic 时选择的图片。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 第三部分：图片操作 */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">3. 图片操作功能</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4 ml-13">
              {/* 放大查看 */}
              <div className="bg-white rounded-lg p-5 border-2 border-gray-200 hover:border-primary-300 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">点击放大</h3>
                </div>
                <p className="text-sm text-gray-600">
                  点击任意图片，可以全屏查看高清大图。
                </p>
              </div>

              {/* 下载 */}
              <div className="bg-white rounded-lg p-5 border-2 border-gray-200 hover:border-green-300 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Download className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">下载图片</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Hover 图片时，点击左上角的下载按钮保存到本地。
                </p>
              </div>

              {/* 收藏 */}
              <div className="bg-white rounded-lg p-5 border-2 border-gray-200 hover:border-red-300 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <Heart className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">收藏图片</h3>
                </div>
                <p className="text-sm text-gray-600">
                  点击右上角的爱心图标，将图片添加到收藏。
                </p>
              </div>

              {/* 删除 */}
              <div className="bg-white rounded-lg p-5 border-2 border-gray-200 hover:border-red-300 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">删除图片</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Hover 图片时，点击左上角的删除按钮移除图片。
                </p>
              </div>

              {/* 复制 Prompt */}
              <div className="bg-white rounded-lg p-5 border-2 border-gray-200 hover:border-purple-300 transition-colors md:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Copy className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">复制 Prompt</h3>
                </div>
                <p className="text-sm text-gray-600">
                  每张图片下方显示生成时使用的 prompt，点击复制按钮可以一键复制到剪贴板。
                </p>
              </div>
            </div>
          </section>

          {/* 第四部分：使用技巧 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💡</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">4. 使用技巧</h2>
            </div>

            <div className="space-y-3 ml-13">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-xl flex-shrink-0">✅</span>
                <p className="text-gray-700">
                  <strong>照片质量</strong>：上传高质量、清晰的照片，生成效果会更好。
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-xl flex-shrink-0">✅</span>
                <p className="text-gray-700">
                  <strong>正面照片</strong>：头像最好使用正面照，避免侧脸或低头。
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-xl flex-shrink-0">✅</span>
                <p className="text-gray-700">
                  <strong>全身照优势</strong>：上传全身照可以让 AI 更准确地理解角色的身材比例。
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-xl flex-shrink-0">✅</span>
                <p className="text-gray-700">
                  <strong>重复使用</strong>：一个角色创建后可以无限次使用，生成不同场景的图片。
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-xl flex-shrink-0">✅</span>
                <p className="text-gray-700">
                  <strong>多角色管理</strong>：可以创建多个不同的角色，方便管理和使用。
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              💡 如有问题，请联系技术支持
            </p>
            <button
              onClick={() => router.push("/characters")}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              立即使用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

