"use client";

import { useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { Video, Download } from "lucide-react";

type VideoTemplate = {
  id: string;
  name: string;
  description: string;
  duration: string;
  preview: string;
};

const templates: VideoTemplate[] = [
  {
    id: "zoom-in",
    name: "缩放进入",
    description: "图片从远到近缓缓放大",
    duration: "3秒",
    preview: "🔍"
  },
  {
    id: "pan-left",
    name: "左移动画",
    description: "图片从右向左平移",
    duration: "3秒",
    preview: "⬅️"
  },
  {
    id: "pan-right",
    name: "右移动画",
    description: "图片从左向右平移",
    duration: "3秒",
    preview: "➡️"
  },
  {
    id: "fade-in",
    name: "淡入效果",
    description: "图片渐渐显现",
    duration: "2秒",
    preview: "✨"
  },
  {
    id: "rotate",
    name: "旋转动画",
    description: "图片360度旋转",
    duration: "4秒",
    preview: "🔄"
  },
  {
    id: "parallax",
    name: "视差效果",
    description: "3D视差滚动效果",
    duration: "5秒",
    preview: "🎬"
  },
];

export default function VideoGenerationPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string>("");
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      setError("请选择一个视频模板");
      return;
    }

    if (uploadedImage.length === 0) {
      setError("请上传一张图片");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedVideo("");

    try {
      // TODO: Implement video generation API
      // For now, we'll show a placeholder
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setError("视频生成功能正在开发中。此功能需要集成视频生成API，如Runway ML、Pika Labs或类似服务。");
      
    } catch (err: any) {
      setError(err.message || "生成失败，请重试");
      console.error("Generation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Video className="w-8 h-8 text-primary-600" />
          视频生成
        </h1>
        <p className="text-gray-600 mt-2">选择模板并上传图片，AI生成动态视频</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">控制面板</h2>

            <div className="space-y-6">
              {/* Image Upload */}
              <ImageUpload
                maxImages={1}
                onImagesChange={setUploadedImage}
                label="上传图片"
              />

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  选择视频模板
                </label>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                        selectedTemplate === template.id
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{template.preview}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{template.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                          <div className="text-xs text-primary-600 mt-1">时长: {template.duration}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-amber-900 mb-2">⚠️ 开发中</h3>
                <p className="text-xs text-amber-700">
                  视频生成功能正在开发中。完整实现需要集成专业的视频生成API服务。
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !selectedTemplate || uploadedImage.length === 0}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>生成中...</>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    生成视频
                  </>
                )}
              </button>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">生成结果</h2>

            {loading && <LoadingSpinner text="AI正在生成视频..." />}

            {!loading && !generatedVideo && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>选择模板并上传图片，点击生成按钮开始创作</p>
                  <p className="text-sm mt-2">（功能开发中）</p>
                </div>
              </div>
            )}

            {!loading && generatedVideo && (
              <div className="space-y-4">
                <video
                  src={generatedVideo}
                  controls
                  className="w-full rounded-lg"
                />
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = generatedVideo;
                    link.download = "generated-video.mp4";
                    link.click();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  下载视频
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

