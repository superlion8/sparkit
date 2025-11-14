"use client";

import { useState } from "react";
import ImageGrid from "@/components/ImageGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { logTaskEvent, generateClientTaskId } from "@/lib/clientTasks";
import { User, Download } from "lucide-react";
import { downloadImage } from "@/lib/downloadUtils";

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export default function MimicPage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  const [referenceImage, setReferenceImage] = useState<File[]>([]);
  const [characterImage, setCharacterImage] = useState<File[]>([]);
  const [numImages, setNumImages] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [loading, setLoading] = useState(false);
  const [captionPrompt, setCaptionPrompt] = useState("");
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [finalImages, setFinalImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string>("");

  const handleGenerate = async () => {
    if (referenceImage.length === 0) {
      setError("请上传参考图");
      return;
    }

    if (characterImage.length === 0) {
      setError("请上传角色图");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setError("登录后才能使用 Mimic 功能");
      setErrorDetails(null);
      promptLogin();
      return;
    }

    setLoading(true);
    setError("");
    setErrorDetails(null);
    setCaptionPrompt("");
    setBackgroundImage("");
    setFinalImages([]);
    setCurrentStep("正在反推提示词...");

    try {
      const formData = new FormData();
      formData.append("referenceImage", referenceImage[0]);
      formData.append("characterImage", characterImage[0]);
      formData.append("aspectRatio", aspectRatio);
      formData.append("numImages", numImages.toString());

      setCurrentStep("正在去掉参考图中的人物...");

      const response = await fetch("/api/generate/mimic", {
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
        throw new Error(errorData.error || errorData.statusText || "生成失败");
      }

      setCurrentStep("正在生成最终图片...");

      const data = await response.json();

      if (data.captionPrompt) {
        setCaptionPrompt(data.captionPrompt);
      }

      // Use base64 images for display if available (avoids CORS issues)
      const displayBackgroundImage =
        data.backgroundImageBase64 && data.backgroundImageBase64.length > 0
          ? data.backgroundImageBase64
          : data.backgroundImage;
      setBackgroundImage(displayBackgroundImage);

      const displayFinalImages =
        data.finalImagesBase64 && data.finalImagesBase64.length > 0
          ? data.finalImagesBase64
          : data.finalImages;
      setFinalImages(displayFinalImages);

      // Log task event
      if (accessToken && displayFinalImages.length > 0) {
        const taskId = generateClientTaskId("mimic");
        await logTaskEvent(accessToken, {
          taskId,
          taskType: "mimic",
          prompt: data.captionPrompt,
          inputImageUrl: referenceImage[0]?.name || null,
          outputImageUrl: typeof displayFinalImages[0] === "string" ? displayFinalImages[0] : null,
        });
      }

      setCurrentStep("");
    } catch (err: any) {
      if (!errorDetails) {
        setErrorDetails({ message: err.message, stack: err.stack });
      }
      setError(err.message || "生成失败，请重试");
      setCurrentStep("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <User className="w-8 h-8 text-primary-600" />
          Mimic 角色替换
        </h1>
        <p className="text-gray-600 mt-2">
          上传参考图和角色图，AI 将角色替换到参考图场景中
        </p>
        {!authLoading && !isAuthenticated && (
          <div className="mt-4 rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            登录后才能使用 Mimic 功能，点击"生成"按钮时会弹出登录提示。
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
                onImagesChange={setReferenceImage}
                label="上传参考图"
              />

              <ImageUpload
                maxImages={1}
                onImagesChange={setCharacterImage}
                label="上传角色图"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  生成数量: {numImages}
                </label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={numImages}
                  onChange={(e) => setNumImages(parseInt(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1张</span>
                  <span>4张</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  宽高比
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="1:1">1:1 (正方形)</option>
                  <option value="16:9">16:9 (横屏)</option>
                  <option value="9:16">9:16 (竖屏)</option>
                  <option value="4:3">4:3 (标准横屏)</option>
                  <option value="3:4">3:4 (标准竖屏)</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <strong>工作流程：</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                  <li>反推参考图的提示词（不含人物信息）</li>
                  <li>去掉参考图中的人物，生成背景图</li>
                  <li>将角色图替换到背景图中，生成最终图片</li>
                </ol>
              </div>

              <button
                onClick={handleGenerate}
                disabled={
                  loading ||
                  authLoading ||
                  referenceImage.length === 0 ||
                  characterImage.length === 0
                }
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>生成中...</>
                ) : (
                  <>
                    <User className="w-5 h-5" />
                    生成图片
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
              <div className="space-y-4">
                <LoadingSpinner
                  text={authLoading ? "加载登录状态..." : currentStep || "AI正在处理..."}
                />
                {currentStep && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 text-center">
                    {currentStep}
                  </div>
                )}
              </div>
            )}

            {error && !loading && !authLoading && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">生成失败</h3>
                    <p className="text-red-700 text-sm mb-3 break-words">{error}</p>
                    {errorDetails && (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-red-700 mb-2">API 返回详情：</div>
                        <div className="mt-2 p-3 bg-red-100 rounded text-red-900 overflow-x-auto max-h-64 overflow-y-auto">
                          <pre className="text-xs whitespace-pre-wrap break-words">
                            {JSON.stringify(errorDetails, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!loading && !authLoading && !error && captionPrompt && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">反推的提示词</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{captionPrompt}</p>
                </div>
              </div>
            )}

            {!loading && !authLoading && !error && backgroundImage && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">背景图（去人物后）</h3>
                <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={backgroundImage}
                    alt="Background"
                    className="w-full h-auto object-contain"
                  />
                  <button
                    onClick={() => downloadImage(backgroundImage, "background-image.png")}
                    className="absolute top-2 right-2 bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    下载
                  </button>
                </div>
              </div>
            )}

            {!loading && !authLoading && !error && finalImages.length === 0 && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>上传参考图和角色图，点击生成按钮开始创作</p>
                </div>
              </div>
            )}

            {!loading && !authLoading && finalImages.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">最终生成图片</h3>
                <ImageGrid images={finalImages} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

