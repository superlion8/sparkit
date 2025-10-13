"use client";

import { useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { Replace, Download, Upload } from "lucide-react";

export default function VideoSubjectReplacePage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subjectImage, setSubjectImage] = useState<File[]>([]);
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string>("");
  const [error, setError] = useState("");

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!videoFile) {
      setError("请上传视频文件");
      return;
    }

    if (subjectImage.length === 0) {
      setError("请上传替换的主体图片");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedVideo("");

    try {
      // TODO: Implement video subject replacement API
      // This requires advanced AI video editing services
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setError("视频主体替换功能正在开发中。此功能需要集成高级AI视频编辑服务，如Runway Gen-2、Wonder Studio或类似服务。");
      
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
          <Replace className="w-8 h-8 text-primary-600" />
          视频主体替换
        </h1>
        <p className="text-gray-600 mt-2">上传视频和主体图片，AI替换视频中的主体</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">控制面板</h2>

            <div className="space-y-6">
              {/* Video Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  上传视频
                </label>
                {!videoFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">点击上传视频</span>
                    <span className="text-xs text-gray-400 mt-1">支持 MP4, MOV 等格式</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="relative">
                    <video
                      src={URL.createObjectURL(videoFile)}
                      controls
                      className="w-full rounded-lg"
                    />
                    <button
                      onClick={() => setVideoFile(null)}
                      className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600"
                    >
                      移除
                    </button>
                  </div>
                )}
              </div>

              {/* Subject Image Upload */}
              <ImageUpload
                maxImages={1}
                onImagesChange={setSubjectImage}
                label="上传替换主体"
              />

              {/* Additional Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  额外描述（可选）
                </label>
                <textarea
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  placeholder="描述替换需求，如保持动作、调整光线等..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">💡 使用提示</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 视频时长建议在10秒以内</li>
                  <li>• 主体图片应清晰，背景简单</li>
                  <li>• AI会自动匹配动作和光线</li>
                  <li>• 处理时间较长，请耐心等待</li>
                </ul>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-amber-900 mb-2">⚠️ 开发中</h3>
                <p className="text-xs text-amber-700">
                  视频主体替换功能正在开发中。完整实现需要集成专业的AI视频编辑服务。
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !videoFile || subjectImage.length === 0}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>处理中...</>
                ) : (
                  <>
                    <Replace className="w-5 h-5" />
                    开始替换
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
            <h2 className="text-lg font-semibold text-gray-900 mb-6">处理结果</h2>

            {loading && <LoadingSpinner text="AI正在处理视频，这可能需要几分钟..." />}

            {!loading && !generatedVideo && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Replace className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>上传视频和主体图片，点击开始按钮进行处理</p>
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
                    link.download = "processed-video.mp4";
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

