"use client";

import { useState } from "react";
import ImageGrid from "@/components/ImageGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { ImagePlus } from "lucide-react";

type Model = "gemini" | "flux";
type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export default function ImageToImagePage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<Model>("gemini");
  const [numImages, setNumImages] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("请输入描述文本");
      return;
    }

    if (uploadedImages.length === 0) {
      setError("请至少上传一张图片");
      return;
    }

    setLoading(true);
    setError("");
    setErrorDetails(null);
    setGeneratedImages([]);

    try {
      const allImages: string[] = [];

      // Generate multiple images if requested
      for (let i = 0; i < numImages; i++) {
        const formData = new FormData();
        
        // Add aspect ratio to prompt
        const enhancedPrompt = `${prompt}. Aspect ratio: ${aspectRatio}`;
        formData.append("prompt", enhancedPrompt);

        // Add images
        if (model === "gemini") {
          // Gemini supports multiple images
          uploadedImages.forEach((image) => {
            formData.append("images", image);
          });
        } else {
          // Flux only supports one image
          formData.append("image", uploadedImages[0]);
        }

        const endpoint = model === "gemini" 
          ? "/api/generate/gemini"
          : "/api/generate/flux";

        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          setErrorDetails(errorData);
          throw new Error(errorData.error || "Generation failed");
        }

        const data = await response.json();
        if (data.images && data.images.length > 0) {
          allImages.push(...data.images);
        }
      }

      if (allImages.length > 0) {
        setGeneratedImages(allImages);
      } else {
        setError("API 返回成功但没有图片数据");
        setErrorDetails({ message: "No images in response", numImages, model });
      }
    } catch (err: any) {
      if (!errorDetails) {
        setErrorDetails({ message: err.message, stack: err.stack });
      }
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
          <ImagePlus className="w-8 h-8 text-primary-600" />
          图生图
        </h1>
        <p className="text-gray-600 mt-2">上传图片并输入描述，AI帮你编辑和变换</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">控制面板</h2>

            <div className="space-y-6">
              {/* Image Upload */}
              <ImageUpload
                maxImages={model === "gemini" ? 4 : 1}
                onImagesChange={setUploadedImages}
                label="上传图片"
              />

              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  编辑描述
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述你想要如何编辑图片..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择模型
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setModel("gemini")}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      model === "gemini"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Nano Banana
                  </button>
                  <button
                    onClick={() => setModel("flux")}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      model === "flux"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Kontext Pro
                  </button>
                </div>
                {model === "flux" && uploadedImages.length > 1 && (
                  <p className="text-xs text-amber-600 mt-2">
                    注意：Kontext Pro仅支持单张图片，将使用第一张
                  </p>
                )}
              </div>

              {/* Number of Images */}
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

              {/* Aspect Ratio */}
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

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim() || uploadedImages.length === 0}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
              {loading ? (
                <>生成中...</>
              ) : (
                <>
                  <ImagePlus className="w-5 h-5" />
                  生成图像
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

          {loading && <LoadingSpinner text="AI正在为你编辑图像..." />}

          {error && !loading && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
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

          {!loading && !error && generatedImages.length === 0 && (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <ImagePlus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>上传图片并输入编辑描述，点击生成按钮开始创作</p>
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

