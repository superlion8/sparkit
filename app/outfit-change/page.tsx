"use client";

import { useState } from "react";
import ImageGrid from "@/components/ImageGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { Shirt } from "lucide-react";

export default function OutfitChangePage() {
  const [modelImage, setModelImage] = useState<File[]>([]);
  const [productImages, setProductImages] = useState<File[]>([]);
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (modelImage.length === 0) {
      setError("请上传模特图片");
      return;
    }

    if (productImages.length === 0) {
      setError("请至少上传一张商品图片");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedImages([]);

    try {
      const formData = new FormData();
      
      // Build prompt for outfit change
      let prompt = "Create an image of the model wearing the product(s) shown. ";
      prompt += "Maintain the model's pose, lighting, and background style. ";
      prompt += "Ensure the clothing fits naturally on the model's body. ";
      
      if (additionalPrompt.trim()) {
        prompt += additionalPrompt;
      }

      formData.append("prompt", prompt);

      // Add model image
      formData.append("images", modelImage[0]);
      
      // Add product images
      productImages.forEach((image) => {
        formData.append("images", image);
      });

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

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Shirt className="w-8 h-8 text-primary-600" />
          AI换装
        </h1>
        <p className="text-gray-600 mt-2">上传模特图和商品图，AI帮你生成穿搭效果</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">控制面板</h2>

            <div className="space-y-6">
              {/* Model Image Upload */}
              <ImageUpload
                maxImages={1}
                onImagesChange={setModelImage}
                label="上传模特图"
              />

              {/* Product Images Upload */}
              <ImageUpload
                maxImages={3}
                onImagesChange={setProductImages}
                label="上传商品图"
              />

              {/* Additional Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  额外描述（可选）
                </label>
                <textarea
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  placeholder="例如：保持原背景、调整光线、改变姿势等..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">💡 使用提示</h3>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 模特图片应清晰，人物完整</li>
                  <li>• 商品图片背景最好是白色或纯色</li>
                  <li>• 可以同时上传多件商品进行搭配</li>
                  <li>• AI会自动保持原始光线和背景风格</li>
                </ul>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || modelImage.length === 0 || productImages.length === 0}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>生成中...</>
                ) : (
                  <>
                    <Shirt className="w-5 h-5" />
                    生成换装效果
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

            {loading && <LoadingSpinner text="AI正在生成换装效果..." />}

            {!loading && generatedImages.length === 0 && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Shirt className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>上传模特图和商品图，点击生成按钮查看效果</p>
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

