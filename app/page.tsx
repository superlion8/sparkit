"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import StructuredData from "@/components/StructuredData";
import { 
  Sparkles, 
  Image, 
  ImagePlus, 
  Video, 
  Camera, 
  User,
  PlayCircle,
  Film,
  Replace,
  Shirt,
  Palette,
  ArrowRight,
  Check,
  Zap,
  Shield,
  Globe
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const imageTools = [
    {
      name: "文生图",
      description: "通过文本描述生成高质量AI图像，支持多种模型和尺寸",
      href: "/text-to-image",
      icon: Image,
      color: "from-blue-500 to-cyan-500"
    },
    {
      name: "图像编辑",
      description: "基于图片和提示词进行智能编辑和风格转换",
      href: "/image-to-image",
      icon: ImagePlus,
      color: "from-purple-500 to-pink-500"
    },
    {
      name: "Mimic(洗稿)",
      description: "角色替换功能，将参考图中的角色替换为您指定的角色",
      href: "/mimic",
      icon: User,
      color: "from-green-500 to-emerald-500"
    },
    {
      name: "PhotoBooth(组图)",
      description: "一键生成6张Instagram风格的写真组图，展现不同pose",
      href: "/photobooth",
      icon: Camera,
      color: "from-orange-500 to-red-500"
    },
    {
      name: "Snapshot",
      description: "生成5张适合Instagram的生活感随手拍照片",
      href: "/snapshot",
      icon: Camera,
      color: "from-indigo-500 to-purple-500"
    }
  ];

  const videoTools = [
    {
      name: "Photo to Live",
      description: "将静态照片转换为5秒Instagram风格短视频",
      href: "/photo-to-live",
      icon: PlayCircle,
      color: "from-pink-500 to-rose-500"
    },
    {
      name: "改图首尾帧",
      description: "智能生成两张图片之间的转场视频",
      href: "/image-transition",
      icon: Film,
      color: "from-violet-500 to-purple-500"
    },
    {
      name: "模板视频生成",
      description: "基于提示词生成高质量AI视频内容",
      href: "/video-generation",
      icon: Video,
      color: "from-cyan-500 to-blue-500"
    },
    {
      name: "视频主体替换(animate)",
      description: "将视频中的主体替换为指定对象",
      href: "/video-subject-replace",
      icon: Replace,
      color: "from-teal-500 to-green-500"
    }
  ];

  const otherTools = [
    {
      name: "AI换装",
      description: "智能更换人物服装，支持多种风格",
      href: "/outfit-change",
      icon: Shirt,
      color: "from-yellow-500 to-orange-500"
    },
    {
      name: "AI换背景",
      description: "一键更换图片背景，保持主体不变",
      href: "/background-replace",
      icon: Palette,
      color: "from-rose-500 to-pink-500"
    }
  ];

  const features = [
    {
      icon: Zap,
      title: "极速生成",
      description: "基于先进的AI模型，快速生成高质量内容"
    },
    {
      icon: Shield,
      title: "安全可靠",
      description: "数据加密传输，保护您的创作隐私"
    },
    {
      icon: Globe,
      title: "易于使用",
      description: "直观的界面设计，无需专业技能即可上手"
    }
  ];

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push("/text-to-image");
    } else {
      router.push("/auth/callback");
    }
  };

  return (
    <>
      <StructuredData />
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <img src="/sparkit.png" alt="Sparkit Logo" className="h-8 w-8 object-contain" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                Sparkit
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="#tools"
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
              >
                功能
              </Link>
              {isAuthenticated ? (
                <Link
                  href="/text-to-image"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  开始使用
                </Link>
              ) : (
                <Link
                  href="/auth/callback"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  登录
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 text-white pt-16">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 sm:pt-24 sm:pb-40">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary-400 rounded-full blur-2xl opacity-50"></div>
                <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <Sparkles className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="block">AI 驱动的</span>
              <span className="block bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                创意工具包
              </span>
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl sm:text-2xl text-primary-100 leading-relaxed">
              使用 Sparkit 强大的 AI 工具，轻松生成图像、视频和创意内容。
              <br className="hidden sm:block" />
              无论是社交媒体内容、商业设计还是个人创作，都能满足您的需求。
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="group relative px-8 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span className="flex items-center justify-center gap-2">
                  立即开始
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <Link
                href="#tools"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200"
              >
                探索功能
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="text-center p-8 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white mb-4">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Image Tools Section */}
      <section id="tools" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                Image
              </span>
              {" "}图像生成工具
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              强大的 AI 图像生成和编辑工具，助您轻松创作专业级视觉内容
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {imageTools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={index}
                  href={tool.href}
                  className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:border-primary-300 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {tool.description}
                  </p>
                  <div className="flex items-center text-primary-600 font-medium text-sm">
                    立即使用
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Video Tools Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                Video
              </span>
              {" "}视频生成工具
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              将静态图像转换为动态视频，创作引人入胜的视觉内容
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {videoTools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={index}
                  href={tool.href}
                  className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:border-primary-300 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {tool.description}
                  </p>
                  <div className="flex items-center text-primary-600 font-medium text-sm">
                    立即使用
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Other Tools Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                Other Tools
              </span>
              {" "}其他工具
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              更多实用的 AI 工具，满足您的多样化需求
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {otherTools.map((tool, index) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={index}
                  href={tool.href}
                  className="group relative bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-xl hover:border-primary-300 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} text-white mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {tool.description}
                  </p>
                  <div className="flex items-center text-primary-600 font-medium">
                    立即使用
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            准备好开始创作了吗？
          </h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            加入 Sparkit，体验强大的 AI 创作工具，让您的创意无限延伸
          </p>
          <button
            onClick={handleGetStarted}
            className="group px-8 py-4 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <span className="flex items-center justify-center gap-2">
              免费开始使用
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </section>
      </div>
    </>
  );
}
