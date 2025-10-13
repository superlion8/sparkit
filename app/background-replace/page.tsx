"use client";

import { useState } from "react";
import ImageGrid from "@/components/ImageGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { Palette } from "lucide-react";

export default function BackgroundReplacePage() {
  const [subjectImage, setSubjectImage] = useState<File[]>([]);
  const [backgroundPrompt, setBackgroundPrompt] = useState("");
  const [posePrompt, setPosePrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (subjectImage.length === 0) {
      setError("请上传人物图片");
      return;
    }

    if (!backgroundPrompt.trim()) {
      setError("请描述想要的背景");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedImages([]);

    try {
      const formData = new FormData();
      
      // Build comprehensive prompt
      let prompt = `Place the subject in the following background: ${backgroundPrompt}. `;
      
      if (posePrompt.trim()) {
        prompt += `Adjust the pose: ${posePrompt}. `;
      }
      
      prompt += "Maintain natural lighting and ensure the subject blends seamlessly with the new background. ";
      prompt += "Keep the subject's appearance consistent.";

      formData.append("prompt", prompt);
      formData.append("images", subjectImage[0]);

      const response = await fetch("/api/generate/gemini", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Generation failed");
      }

      const data = await response.json();
      if (data.images && data.images.length > 0) {
        setGeneratedImages(data.images);
      }
    } catch (err: any) {
      setError(err.message || "生成失败，请重试");
      console.error("Generation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const presetBackgrounds = [
    { label: "海滩日落", value: "a beautiful beach at sunset with golden light" },
    { label: "城市街道", value: "a modern city street at night with neon lights" },
    { label: "森林小径", value: "a peaceful forest path with sunlight filtering through trees" },
    { label: "咖啡厅", value: "a cozy coffee shop interior with warm lighting" },
    { label: "山顶风景", value: "a mountain peak with panoramic views" },
    { label: "纯白背景", value: "a clean white studio background" },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Palette className="w-8 h-8 text-primary-600" />
          AI换背景
        </h1>
        <p className="text-gray-600 mt-2">上传人物图片，描述想要的背景和姿势</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">控制面板</h2>

            <div className="space-y-6">
              {/* Subject Image Upload */}
              <ImageUpload
                maxImages={1}
                onImagesChange={setSubjectImage}
                label="上传人物图片"
              />

              {/* Preset Backgrounds */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  快速选择背景
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {presetBackgrounds.map((bg) => (
                    <button
                      key={bg.label}
                      onClick={() => setBackgroundPrompt(bg.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-primary-500 hover:text-primary-600 transition-colors"
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  背景描述
                </label>
                <textarea
                  value={backgroundPrompt}
                  onChange={(e) => setBackgroundPrompt(e.target.value)}
                  placeholder="描述你想要的背景场景..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Pose Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  姿势调整（可选）
                </label>
                <textarea
                  value={posePrompt}
                  onChange={(e) => setPosePrompt(e.target.value)}
                  placeholder="例如：站立、坐着、跳跃等..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">💡 使用提示</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 人物图片应清晰，主体明确</li>
                  <li>• 描述背景时可以包括环境、光线、氛围</li>
                  <li>• 可以调整人物姿势以适应新背景</li>
                  <li>• AI会自动处理光影融合</li>
                </ul>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || subjectImage.length === 0 || !backgroundPrompt.trim()}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>生成中...</>
                ) : (
                  <>
                    <Palette className="w-5 h-5" />
                    生成新背景
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
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">生成结果</h2>

            {loading && <LoadingSpinner text="AI正在生成新背景..." />}

            {!loading && generatedImages.length === 0 && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Palette className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>上传人物图片并描述背景，点击生成按钮查看效果</p>
                </div>
              </div>
            )}

            {!loading && generatedImages.length > 0 && (
              <ImageGrid images={generatedImages} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

