"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Chrome, Download, LogIn, Sparkles, Zap, Package, Clock, AlertCircle } from "lucide-react";

export default function BrowserExtensionTutorial() {
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
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Chrome className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">浏览器插件使用指南</h1>
              <p className="text-green-100">
                在 Pinterest、Instagram 上一键 Mimic，快速洗稿
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* 简介 */}
          <div className="mb-8 p-6 bg-green-50 border border-green-100 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">✨ 插件能做什么？</h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              Sparkit 浏览器插件让你可以在 <strong>Pinterest</strong> 和 <strong>Instagram</strong> 等平台上，直接对任意图片进行 Mimic 操作。只需鼠标悬停，点击按钮，就能快速将图片场景应用到你的角色上。
            </p>
            <div className="flex items-start gap-2 text-sm text-gray-600 bg-white rounded-lg p-3">
              <Zap className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>核心优势：</strong>1 秒提交，批量操作，自动保存到角色资源，无需等待生成完成。
              </p>
            </div>
          </div>

          {/* 第一部分：安装插件 */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Download className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">1. 安装插件</h2>
            </div>

            <div className="space-y-6 ml-13">
              {/* 步骤 1 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">获取插件文件</h3>
                    <p className="text-gray-600 mb-3">
                      联系技术支持或管理员获取插件文件包（ZIP 或文件夹）。
                    </p>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>注意：</strong>插件目前为内部测试版本，暂未上架 Chrome 应用商店。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 步骤 2 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">打开扩展程序页面</h3>
                    <p className="text-gray-600 mb-3">
                      在 Chrome 浏览器中，访问以下地址：
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-gray-300 font-mono text-sm text-gray-700">
                      chrome://extensions/
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      或者：点击浏览器右上角的 ⋮ 菜单 → 更多工具 → 扩展程序
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤 3 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">开启开发者模式</h3>
                    <p className="text-gray-600 mb-3">
                      在扩展程序页面的 <strong>右上角</strong>，找到并开启 <strong>「开发者模式」</strong> 开关。
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤 4 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">加载插件</h3>
                    <p className="text-gray-600 mb-3">
                      点击左上角的 <strong>「加载已解压的扩展程序」</strong> 按钮。
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤 5 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    5
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">选择插件文件夹</h3>
                    <p className="text-gray-600 mb-3">
                      在弹出的文件选择对话框中，选择插件的 <strong>browser-extension</strong> 文件夹，点击「选择」。
                    </p>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>成功标志：</strong>扩展程序列表中会出现 "Sparkit Mimic" 插件卡片。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 第二部分：同步登录状态 */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <LogIn className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">2. 同步登录状态</h2>
            </div>

            <div className="space-y-6 ml-13">
              <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-gray-700 mb-3">
                  <strong>为什么需要同步？</strong>插件需要知道你的登录状态，才能将生成的图片保存到你的账户中。
                </p>
              </div>

              {/* 步骤 1 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">确保已登录 Sparkit</h3>
                    <p className="text-gray-600 mb-3">
                      在浏览器中访问 <strong>sparkiai.com</strong>，确保你已经登录账户。
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤 2 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">打开插件弹窗</h3>
                    <p className="text-gray-600 mb-3">
                      点击浏览器工具栏中的 <strong>Sparkit Mimic</strong> 插件图标，打开弹窗。
                    </p>
                    <p className="text-sm text-gray-500">
                      如果看不到图标，点击工具栏的拼图图标 🧩 固定插件。
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤 3 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">点击同步按钮</h3>
                    <p className="text-gray-600 mb-3">
                      在弹窗中找到 <strong>「Sync Login Status」</strong> 按钮，点击它。
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤 4 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">验证同步成功</h3>
                    <p className="text-gray-600 mb-3">
                      如果弹窗中显示你的 <strong>登录邮箱</strong>，说明同步成功！
                    </p>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>同步成功：</strong>现在你可以开始使用 Mimic 功能了！
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 第三部分：使用 Mimic 功能 */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">3. 使用 Mimic 功能</h2>
            </div>

            <div className="space-y-6 ml-13">
              {/* 步骤 1 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">打开 Pinterest 或 Instagram</h3>
                    <p className="text-gray-600 mb-3">
                      访问 <strong>pinterest.com</strong> 或 <strong>instagram.com</strong>，浏览你喜欢的图片。
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤 2 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">悬停图片，点击 Mimic 按钮</h3>
                    <p className="text-gray-600 mb-3">
                      将鼠标移动到任意图片上，<strong>右下角</strong> 会出现一个 <strong>「Mimic」</strong> 按钮。点击它！
                    </p>
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-800">
                        <strong>提示：</strong>按钮会在鼠标悬停整个图片区域时出现，不仅限于右下角。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 步骤 3 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">选择角色</h3>
                    <p className="text-gray-600 mb-3">
                      在弹出的精美弹窗中，选择你想要使用的角色。弹窗会显示角色的头像和名称。
                    </p>
                    <p className="text-sm text-gray-500 mb-2">
                      还没有角色？<button onClick={() => router.push("/characters")} className="text-primary-600 hover:text-primary-700 font-medium">点击这里创建角色 →</button>
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤 4 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">选择是否保留背景</h3>
                    <p className="text-gray-600 mb-3">
                      使用精美的 iOS 风格开关，选择是否 <strong>保留原图背景</strong>：
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      <li><strong>保留背景</strong>：角色会融入原图的背景环境</li>
                      <li><strong>不保留</strong>：AI 会根据场景描述生成新背景</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 步骤 5 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    5
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">点击生成按钮</h3>
                    <p className="text-gray-600 mb-3">
                      点击大大的 <strong>「Generate 2 images」</strong> 按钮，开始生成！
                    </p>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>默认生成 2 张：</strong>提高成功率，让你有更多选择。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 步骤 6 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    6
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">弹窗自动关闭</h3>
                    <p className="text-gray-600 mb-3">
                      提交成功后，弹窗会在 <strong>1 秒内自动关闭</strong>，你可以继续浏览其他图片！
                    </p>
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Zap className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800">
                        <strong>Fire-and-Forget：</strong>提交即忘，无需等待，后台会自动生成并保存到你的角色资源中。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 步骤 7 */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    7
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">稍后查看结果</h3>
                    <p className="text-gray-600 mb-3">
                      生成需要 <strong>30-60 秒</strong>。稍后访问 <button onClick={() => router.push("/characters")} className="text-primary-600 hover:text-primary-700 font-medium">角色管理页面</button>，在对应角色的资源 Tab 中查看生成的图片。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 第四部分：核心优势 */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">4. 核心优势</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4 ml-13">
              {/* 1 秒提交 */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">⚡ 1 秒提交</h3>
                </div>
                <p className="text-sm text-gray-700">
                  提交后立即关闭弹窗，不阻塞浏览体验，效率提升 <strong>60 倍</strong>！
                </p>
              </div>

              {/* 批量操作 */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-6 h-6 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">📦 批量操作</h3>
                </div>
                <p className="text-sm text-gray-700">
                  可以连续 Mimic 多张图片，一次性提交多个任务，后台并行生成。
                </p>
              </div>

              {/* 自动保存 */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <Download className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold text-gray-900">💾 自动保存</h3>
                </div>
                <p className="text-sm text-gray-700">
                  生成的图片自动保存到角色资源，无需手动下载和管理文件。
                </p>
              </div>

              {/* 智能处理 */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-5 border-2 border-yellow-200">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-6 h-6 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">🤖 智能处理</h3>
                </div>
                <p className="text-sm text-gray-700">
                  AI 自动反推 prompt，保留原图构图和氛围，确保高质量输出。
                </p>
              </div>

              {/* 记住角色 */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border-2 border-indigo-200 md:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">💭</span>
                  <h3 className="font-semibold text-gray-900">💭 记住角色</h3>
                </div>
                <p className="text-sm text-gray-700">
                  下次打开弹窗时，默认选中上次使用的角色，无需重复选择。
                </p>
              </div>
            </div>
          </section>

          {/* 第五部分：注意事项 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">5. 注意事项</h2>
            </div>

            <div className="space-y-3 ml-13">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700">
                  <strong>首次使用：</strong>必须先同步登录状态，否则无法保存生成结果。
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700">
                  <strong>生成时间：</strong>通常需要 30-60 秒，请耐心等待。可以继续浏览，稍后查看结果。
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700">
                  <strong>图片质量：</strong>建议选择高质量的参考图，模糊或低分辨率的图片生成效果会打折扣。
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700">
                  <strong>失败处理：</strong>如果生成失败，会在角色资源页显示失败卡片，可以点击删除按钮清理。
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700">
                  <strong>支持平台：</strong>目前主要支持 Pinterest 和 Instagram，其他平台可能存在兼容性问题。
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
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/characters")}
                className="px-6 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 transition-colors font-medium"
              >
                创建角色
              </button>
              <button
                onClick={() => window.open("https://pinterest.com", "_blank")}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                去 Pinterest 试试
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

