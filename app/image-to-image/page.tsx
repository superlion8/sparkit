"use client";

import { useState, useEffect } from "react";
import ImageGrid from "@/components/ImageGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { logTaskEvent, generateClientTaskId } from "@/lib/clientTasks";
import { ImagePlus, History } from "lucide-react";

type Model = "gemini" | "flux" | "qwen";
type AspectRatio = "default" | "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export default function ImageToImagePage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<Model>("gemini");
  const [hotMode, setHotMode] = useState(false);
  const [numImages, setNumImages] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("default");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatedTaskIds, setGeneratedTaskIds] = useState<string[]>([]); // 保存每张图片对应的 taskId
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [fromHistory, setFromHistory] = useState(false);
  const [historyInputImageUrls, setHistoryInputImageUrls] = useState<string[]>([]);

  // 从 localStorage 读取历史编辑数据
  useEffect(() => {
    const editDataStr = localStorage.getItem('sparkitEditData');
    if (editDataStr) {
      try {
        const editData = JSON.parse(editDataStr);
        localStorage.removeItem('sparkitEditData');
        
        if (editData.fromHistory && (editData.taskType === 'image_to_image_gemini' || editData.taskType === 'image_to_image_flux')) {
          setFromHistory(true);
          if (editData.prompt) {
            setPrompt(editData.prompt);
          }
          // 支持多图
          if (editData.inputImageUrls && editData.inputImageUrls.length > 0) {
            setHistoryInputImageUrls(editData.inputImageUrls);
          }
          // 根据任务类型设置模型
          if (editData.taskType === 'image_to_image_flux') {
            setModel('flux');
          } else {
            setModel('gemini');
          }
        }
      } catch (e) {
        console.error('Failed to parse edit data:', e);
      }
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("请输入描述文本");
      return;
    }

    if (uploadedImages.length === 0) {
      setError("请至少上传一张图片");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setError("登录后才能使用图生图功能");
      setErrorDetails(null);
      promptLogin();
      return;
    }

    setLoading(true);
    setError("");
    setErrorDetails(null);
    setGeneratedImages([]);
    setGeneratedTaskIds([]); // 清空旧的 taskIds

    try {
      // Step 1: Upload images to Aimovely (尝试上传但不阻塞)
      const uploadedImageUrls: string[] = [];
      
      console.log(`[Image-to-Image] 尝试上传图片到 Aimovely（仅用于记录）`);
      for (const uploadedImage of uploadedImages) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("file", uploadedImage);
          
          const uploadResponse = await fetch("/api/upload/to-aimovely", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: uploadFormData,
          });

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json();
            uploadedImageUrls.push(uploadData.url);
            console.log(`[Image-to-Image] 图片上传成功: ${uploadData.url}`);
          } else {
            console.warn(`[Image-to-Image] 图片上传失败（不影响生成）- Status: ${uploadResponse.status}`);
            uploadedImageUrls.push(""); // 占位，继续执行
          }
        } catch (uploadError) {
          console.warn(`[Image-to-Image] 图片上传异常（不影响生成）:`, uploadError);
          uploadedImageUrls.push(""); // 占位，继续执行
        }
      }

      // Step 2: Generate images
      const allImages: string[] = [];
      const allTaskIds: string[] = []; // 收集所有 taskIds

      // For Hot Mode (Qwen), only generate 1 image per request
      if (hotMode) {
        if (uploadedImages.length === 0) {
          throw new Error("请至少上传一张图片");
        }
        
        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("image", uploadedImages[0]);
        formData.append("seed", String(Math.floor(Math.random() * 1000000)));

        console.log(`[Image-to-Image] Hot Mode enabled - calling Qwen API`);

        const response = await fetch("/api/generate/qwen", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });

        console.log(`[Image-to-Image] Qwen API response - Status: ${response.status}`);

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

          console.error(`[Image-to-Image] Qwen API failed - Error:`, errorData);
          setErrorDetails(errorData);
          throw new Error(errorData.error || errorData.statusText || "Generation failed");
        }

        const data = await response.json();
        console.log(`[Image-to-Image] Qwen response - Images count: ${data.images?.length || 0}`);

        if (data.images && data.images.length > 0) {
          const taskId = generateClientTaskId("image_to_image_qwen");
          // 使用上传的 URL，如果上传失败则为 null
          const inputImageUrl = uploadedImageUrls[0] && uploadedImageUrls[0].trim() !== "" 
            ? uploadedImageUrls[0] 
            : null;

          await logTaskEvent(accessToken, {
            taskId,
            taskType: "image_to_image_qwen",
            prompt,
            inputImageUrl,
            outputImageUrl: data.images[0],
          });

          // 保存 taskId
          allTaskIds.push(taskId);
          allImages.push(...data.images);
        }

        setGeneratedImages(allImages);
        setGeneratedTaskIds(allTaskIds); // 同时保存 taskIds
        setLoading(false);
        return;
      }

      // For Flux/Kontext Pro, only generate 1 image per request (API limitation)
      const actualNumImages = model === "flux" ? 1 : numImages;

      for (let i = 0; i < actualNumImages; i++) {
        const formData = new FormData();
        formData.append("prompt", prompt);

        if (model === "gemini") {
          if (aspectRatio !== "default") {
            formData.append("aspectRatio", aspectRatio);
          }
          uploadedImages.forEach((image) => {
            formData.append("images", image);
          });
        } else {
          // Flux/Kontext Pro only supports single image
          if (uploadedImages.length === 0) {
            throw new Error("请至少上传一张图片");
          }
          formData.append("image", uploadedImages[0]);
        }

        const endpoint = model === "gemini" ? "/api/generate/gemini" : "/api/generate/flux";
        
        console.log(`[Image-to-Image] 准备发送请求 - Model: ${model}, Endpoint: ${endpoint}, Image count: ${uploadedImages.length}, Prompt length: ${prompt.length}, Iteration: ${i + 1}/${actualNumImages}`);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });
        
        console.log(`[Image-to-Image] 请求响应状态 - Status: ${response.status}, OK: ${response.ok}`);

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

          console.error(`[Image-to-Image] 请求失败 - Error:`, errorData);
          setErrorDetails(errorData);
          throw new Error(errorData.error || errorData.statusText || "Generation failed");
        }

        const data = await response.json();
        console.log(`[Image-to-Image] 响应数据 - Images count: ${data.images?.length || 0}, Has requestId: ${!!data.requestId}`);
        
        if (data.images && data.images.length > 0) {
          const taskType = model === "flux" ? "image_to_image_flux" : "image_to_image_gemini";
          const baseTaskId =
            model === "flux" && data.requestId
              ? String(data.requestId)
              : generateClientTaskId(taskType);
          // 使用上传的 URL，如果上传失败则为 null
          const inputImageUrl = uploadedImageUrls[0] && uploadedImageUrls[0].trim() !== "" 
            ? uploadedImageUrls[0] 
            : null;

          let imageIndex = 0;
          for (const imageUrl of data.images as string[]) {
            const taskId = data.images.length > 1 ? `${baseTaskId}-${imageIndex}` : baseTaskId;
            await logTaskEvent(accessToken, {
              taskId,
              taskType,
              prompt,
              inputImageUrl,
              outputImageUrl: imageUrl,
            });
            // 保存 taskId
            allTaskIds.push(taskId);
            imageIndex += 1;
          }

          // Use base64 images for display if available (avoids CORS issues)
          const displayImages = data.base64Images && data.base64Images.length > 0 
            ? data.base64Images 
            : data.images;
          allImages.push(...displayImages);
        } else {
          console.warn(`[Image-to-Image] API 返回成功但没有图片数据 - Response:`, data);
        }
      }

      if (allImages.length > 0) {
        setGeneratedImages(allImages);
        setGeneratedTaskIds(allTaskIds); // 同时保存 taskIds
      } else {
        setError("API 返回成功但没有图片数据");
        setErrorDetails({ message: "No images in response", numImages, model });
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

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ImagePlus className="w-8 h-8 text-primary-600" />
          图生图
        </h1>
        <p className="text-gray-600 mt-2">上传图片并输入描述，AI帮你编辑和变换</p>
        {fromHistory && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>已从历史记录加载提示词，请上传图片后重新生成</span>
          </div>
        )}
        {!authLoading && !isAuthenticated && (
          <div className="mt-4 rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            未登录状态下可以浏览界面，点击"生成图像"时会提示登录。
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">控制面板</h2>

            <div className="space-y-6">
              <ImageUpload
                maxImages={hotMode || model === "flux" ? 1 : undefined}
                onImagesChange={setUploadedImages}
                label="上传图片"
                initialImageUrls={historyInputImageUrls.length > 0 ? historyInputImageUrls : undefined}
              />

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择模型
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setModel("gemini");
                      setHotMode(false);
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      model === "gemini" && !hotMode
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Nano Banana
                  </button>
                  <button
                    onClick={() => {
                      setModel("flux");
                      setHotMode(false);
                    }}
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

              {model === "gemini" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hot Mode 🔥
                  </label>
                  <button
                    onClick={() => setHotMode(!hotMode)}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-all ${
                      hotMode
                        ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {hotMode ? "🔥 Hot Mode 已开启" : "开启 Hot Mode"}
                  </button>
                  {hotMode && (
                    <p className="text-xs text-orange-600 mt-2">
                      Hot Mode 使用 Qwen 模型，仅支持单张图片输入
                    </p>
                  )}
                </div>
              )}

              {model === "gemini" && !hotMode && (
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
              )}
              {hotMode && (
                <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                  <p>🔥 Hot Mode 每次生成 1 张图片</p>
                </div>
              )}
              {model === "flux" && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <p>Kontext Pro 每次生成 1 张图片</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  宽高比
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="default">默认（由模型决定）</option>
                  <option value="1:1">1:1 (正方形)</option>
                  <option value="16:9">16:9 (横屏)</option>
                  <option value="9:16">9:16 (竖屏)</option>
                  <option value="4:3">4:3 (标准横屏)</option>
                  <option value="3:4">3:4 (标准竖屏)</option>
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || authLoading || !prompt.trim() || uploadedImages.length === 0}
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

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">生成结果</h2>

            {(loading || authLoading) && (
              <LoadingSpinner text={authLoading ? "加载登录状态..." : "AI正在为你编辑图像..."} />
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
                  <ImagePlus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>上传图片并输入编辑描述，点击生成按钮开始创作</p>
                </div>
              </div>
            )}

            {!loading && !authLoading && generatedImages.length > 0 && (
              <ImageGrid 
                images={generatedImages} 
                taskIds={generatedTaskIds}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
