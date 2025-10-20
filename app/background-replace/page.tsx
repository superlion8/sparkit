"use client";

import { useState } from "react";
import ImageGrid from "@/components/ImageGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { logTaskEvent, generateClientTaskId } from "@/lib/clientTasks";
import { Palette } from "lucide-react";

export default function BackgroundReplacePage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  const [subjectImage, setSubjectImage] = useState<File[]>([]);
  const [backgroundPrompt, setBackgroundPrompt] = useState("");
  const [posePrompt, setPosePrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);

  const handleGenerate = async () => {
    if (subjectImage.length === 0) {
      setError("请上传人物图片");
      return;
    }

    if (!backgroundPrompt.trim()) {
      setError("请描述想要的背景");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setError("登录后才能生成新背景");
      setErrorDetails(null);
      promptLogin();
      return;
    }

    setLoading(true);
    setError("");
    setErrorDetails(null);
    setGeneratedImages([]);

    try {
      const formData = new FormData();

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
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorData: any;
        const contentType = response.headers.get("content-type");
        try {
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
          } else {
            const errorText = await response.text();
            errorData = {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
              contentType,
            };
          }
        } catch (parseError) {
          errorData = {
            status: response.status,
            statusText: response.statusText,
            error: "无法解析错误响应",
          };
        }

        setErrorDetails(errorData);
        throw new Error(errorData.error || errorData.statusText || "Generation failed");
      }

      const data = await response.json();
      if (data.images && data.images.length > 0) {
        setGeneratedImages(data.images);

        const taskId = generateClientTaskId("background_replace");
        const outputImage = data.images[0];
        await logTaskEvent(accessToken, {
          taskId,
          taskType: "background_replace",
          prompt,
          inputImageUrl: subjectImage[0]?.name ?? null,
          outputImageUrl: typeof outputImage === "string" ? outputImage : null,
        });
      } else {
        setError("API 返回成功但没有图片数据");
        setErrorDetails(data);
      }
    } catch (err: any) {
      if (!errorDetails) {
        setErrorDetails({ message: err.message, stack: err.stack });
      }
      setError(err.message || "生成失败，请重试");
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
        {!authLoading && !isAuthenticated && (
          <div className="mt-4 rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            登录后才能生成新背景，点击“生成新背景”按钮会唤起登录提示。
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">控制面板</h2>

            <div className="space-y-6">
              <ImageUpload
                maxImages={1}
                onImagesChange={setSubjectImage}
                label="上传人物图片"
              />

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

              <button
                onClick={handleGenerate}
                disabled={loading || authLoading || subjectImage.length === 0 || !backgroundPrompt.trim()}
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
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">生成结果</h2>

            {(loading || authLoading) && (
              <LoadingSpinner text={authLoading ? "加载登录状态..." : "AI正在生成新背景..."} />
            )}

            {error && !loading && !authLoading && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">生成失败</h3>
                    <p className="text-red-700 text-sm mb-3 break-words">{error}</p>
                    {errorDetails && (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-red-700 mb-2">API 返回详情：</div>
                        <div className="mt-2 p-3 bg-red-100 rounded text-red-900 overflow-x-auto max-h-64 overflow-y-auto">
                          <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(errorDetails, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!loading && !authLoading && !error && generatedImages.length === 0 && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Palette className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>上传人物图片并描述背景，点击生成按钮查看效果</p>
                </div>
              </div>
            )}

            {!loading && !authLoading && generatedImages.length > 0 && (
              <ImageGrid images={generatedImages} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
