"use client";

import { useState } from "react";
import ImageGrid from "@/components/ImageGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { logTaskEvent, generateClientTaskId } from "@/lib/clientTasks";
import { Camera, Download } from "lucide-react";
import { downloadImage } from "@/lib/downloadUtils";

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

interface PoseDescription {
  pose: string;
  cameraPosition: string;
  composition: string;
}

export default function PhotoBoothPage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  const [image, setImage] = useState<File[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [loading, setLoading] = useState(false);
  const [poseDescriptions, setPoseDescriptions] = useState<PoseDescription[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string>("");

  const handleGenerate = async () => {
    if (image.length === 0) {
      setError("请上传图片");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setError("登录后才能使用 PhotoBooth 功能");
      setErrorDetails(null);
      promptLogin();
      return;
    }

    setLoading(true);
    setError("");
    setErrorDetails(null);
    setPoseDescriptions([]);
    setGeneratedImages([]);
    setCurrentStep("正在分析图片并生成pose描述...");

    try {
      const formData = new FormData();
      formData.append("image", image[0]);
      formData.append("aspectRatio", aspectRatio);

      const response = await fetch("/api/generate/photobooth", {
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

      setCurrentStep("正在根据pose描述生成图片...");

      const data = await response.json();

      if (data.poseDescriptions) {
        setPoseDescriptions(data.poseDescriptions);
      }

      // Use generatedImageUrls if available, otherwise fallback to base64
      const displayImages =
        data.generatedImageUrls && data.generatedImageUrls.length > 0
          ? data.generatedImageUrls
          : data.generatedImagesBase64 && data.generatedImagesBase64.length > 0
          ? data.generatedImagesBase64
          : data.generatedImages || [];
      setGeneratedImages(displayImages);

      // Log task event with all image URLs
      if (accessToken && displayImages.length > 0) {
        const taskId = generateClientTaskId("photobooth");
        
        // Store all image URLs as JSON string
        // Input image: {"input": "url"}
        // Output images: {"poses": ["url1", "url2", ...]}
        const inputImageUrls = {
          input: data.inputImageUrl || null,
        };
        const outputImageUrls = {
          poses: data.generatedImageUrls || displayImages,
        };
        
        // Store as JSON string in the existing fields
        const inputImageUrlJson = JSON.stringify(inputImageUrls);
        const outputImageUrlJson = JSON.stringify(outputImageUrls);
        
        await logTaskEvent(accessToken, {
          taskId,
          taskType: "photobooth",
          prompt: JSON.stringify(data.poseDescriptions),
          inputImageUrl: inputImageUrlJson,
          outputImageUrl: outputImageUrlJson,
        });
      }

      // Show generation stats if available
      if (data.generatedCount !== undefined && data.requestedCount !== undefined) {
        if (data.generatedCount < data.requestedCount) {
          console.warn(`部分图片生成成功: ${data.generatedCount}/${data.requestedCount}`);
          if (data.errors && data.errors.length > 0) {
            console.warn("生成错误:", data.errors);
          }
        }
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
          <Camera className="w-8 h-8 text-primary-600" />
          PhotoBooth (写真组图)
        </h1>
        <p className="text-gray-600 mt-2">
          上传一张图片，AI 将分析模特的pose和环境，生成5个不同的pose描述，并生成5张Instagram风格的组图。
        </p>
        {!authLoading && !isAuthenticated && (
          <div className="mt-4 rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            未登录状态下可以浏览界面，点击"生成图片"时会提示登录。
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">控制面板</h2>

            <div className="space-y-6">
              {/* Image Upload */}
              <ImageUpload
                maxImages={1}
                onImagesChange={setImage}
                label="上传图片 (最多1张)"
              />

              {/* Aspect Ratio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  输出宽高比
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

              {/* Workflow Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <strong>工作流程：</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                  <li>分析图片并生成5个不同的pose描述</li>
                  <li>根据每个pose描述生成对应的图片</li>
                  <li>生成5张Instagram风格的组图</li>
                </ol>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || authLoading || image.length === 0}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>生成中...</>
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    生成图片
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
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

            {!loading && !authLoading && !error && (
              <div className="space-y-6">
                {/* Pose Descriptions */}
                {poseDescriptions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pose 描述</h3>
                    <div className="space-y-4">
                      {poseDescriptions.map((pose, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                        >
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Pose {index + 1}
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>
                              <strong>Pose:</strong> {pose.pose}
                            </div>
                            <div>
                              <strong>Camera Position:</strong> {pose.cameraPosition}
                            </div>
                            <div>
                              <strong>Composition:</strong> {pose.composition}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generated Images */}
                {generatedImages.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      生成的图片 ({generatedImages.length}/{poseDescriptions.length > 0 ? poseDescriptions.length : 5})
                    </h3>
                    <ImageGrid images={generatedImages} />
                  </div>
                )}

                {!poseDescriptions.length && !generatedImages.length && (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>上传图片并点击"生成图片"按钮开始创作</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

