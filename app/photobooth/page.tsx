"use client";

import { useState, useRef } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { logTaskEvent, generateClientTaskId } from "@/lib/clientTasks";
import { Camera, Download, X, Maximize2, Heart, ShoppingBag } from "lucide-react";
import { downloadImage } from "@/lib/downloadUtils";
import FavoriteModal from "@/components/FavoriteModal";

type AspectRatio = "default" | "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
type ImageSize = "default" | "1K" | "2K" | "4K";

interface PoseDescription {
  pose: string;
  cameraPosition: string;
  composition: string;
}

export default function PhotoBoothPage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  const [image, setImage] = useState<File[]>([]);
  const [characterImage, setCharacterImage] = useState<File[]>([]); // 可选的角色面部图
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("default");
  const [imageSize, setImageSize] = useState<ImageSize>("default");
  const [hotMode, setHotMode] = useState(false);
  const [ecommerceMode, setEcommerceMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [poseDescriptions, setPoseDescriptions] = useState<PoseDescription[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatedTaskIds, setGeneratedTaskIds] = useState<string[]>([]); // 保存每张图片对应的 taskId
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [favoriteModalOpen, setFavoriteModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  
  // Use ref to prevent duplicate requests
  const isGeneratingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleGenerate = async () => {
    // Prevent duplicate requests
    if (isGeneratingRef.current || loading) {
      console.warn("请求正在进行中，忽略重复请求");
      return;
    }

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

    // Set flag to prevent duplicate requests
    isGeneratingRef.current = true;

    setLoading(true);
    setError("");
    setErrorDetails(null);
    setPoseDescriptions([]);
    setGeneratedImages([]);
    setGeneratedTaskIds([]); // 清空旧的 taskIds
    setCurrentStep(ecommerceMode ? "正在分析图片并生成电商pose描述..." : "正在分析图片并生成pose描述...");

    try {
      const formData = new FormData();
      formData.append("image", image[0]);
      
      // 通用参数
      if (aspectRatio !== "default") {
        formData.append("aspectRatio", aspectRatio);
      }
      if (imageSize !== "default") {
        formData.append("imageSize", imageSize);
      }
      
      if (ecommerceMode) {
        // 电商模式 - 无额外参数
      } else {
        // 普通模式
        if (characterImage.length > 0) {
          formData.append("characterImage", characterImage[0]);
        }
        formData.append("hotMode", hotMode.toString());
      }

      // Cancel previous request if exists
      if (abortControllerRef.current) {
        console.log("取消之前的请求");
        abortControllerRef.current.abort();
      }

      // Create an AbortController for timeout handling
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const timeoutId = setTimeout(() => {
        console.warn("请求超时，正在取消...");
        controller.abort();
      }, 360000); // 6 minutes timeout

      const apiEndpoint = ecommerceMode 
        ? "/api/generate/photobooth-ecommerce" 
        : "/api/generate/photobooth";

      let response: Response;
      try {
        console.log(`发起 PhotoBooth ${ecommerceMode ? '电商版' : ''} 生成请求...`);
        response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        let errorMessage = "请求失败";
        if (fetchError.name === 'AbortError') {
          errorMessage = "请求超时，请稍后重试。生成图片需要较长时间，请耐心等待。";
        } else if (fetchError.message?.includes('Failed to fetch')) {
          errorMessage = "网络请求失败，可能是服务器响应超时或网络连接问题。请检查网络连接后重试。";
        } else if (fetchError.message) {
          errorMessage = fetchError.message;
        }
        
        setErrorDetails({
          message: errorMessage,
          name: fetchError.name,
          stack: fetchError.stack,
          originalError: fetchError.message,
        });
        throw new Error(errorMessage);
      }

      // Check response status
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
              error: errorText || `HTTP ${response.status}: ${response.statusText}`,
              contentType,
            };
          }
        } catch (parseError) {
          errorData = {
            status: response.status,
            statusText: response.statusText,
            error: `HTTP ${response.status}: ${response.statusText}`,
            parseError: parseError instanceof Error ? parseError.message : "无法解析错误响应",
          };
        }

        setErrorDetails(errorData);
        throw new Error(errorData.error || errorData.statusText || `生成失败 (HTTP ${response.status})`);
      }

      setCurrentStep("正在生成图片...");

      let data: any;
      try {
        const responseText = await response.text();
        if (!responseText) {
          throw new Error("服务器返回空响应");
        }
        data = JSON.parse(responseText);
      } catch (parseError: any) {
        console.error("响应解析失败:", parseError);
        throw new Error(`响应解析失败: ${parseError.message || '未知错误'}`);
      }

      if (data.poseDescriptions) {
        setPoseDescriptions(data.poseDescriptions);
      }

      // Use generatedImageUrls (only URLs, no base64)
      const displayImages = data.generatedImageUrls || [];
      setGeneratedImages(displayImages);

      // Log task event - 为每张 pose 图片创建单独的 task
      const taskIds: string[] = [];
      if (accessToken && displayImages.length > 0) {
        const baseTaskId = generateClientTaskId(ecommerceMode ? "photobooth-ecom" : "photobooth");
        
        const inputImageUrls = {
          input: data.inputImageUrl || null,
        };
        const inputImageUrlJson = JSON.stringify(inputImageUrls);
        
        // 为每张 pose 图片创建单独的 task
        for (let i = 0; i < displayImages.length; i++) {
          const taskId = displayImages.length > 1 ? `${baseTaskId}-${i}` : baseTaskId;
          
          await logTaskEvent(accessToken, {
            taskId,
            taskType: ecommerceMode ? "photobooth-ecommerce" : "photobooth",
            prompt: data.poseDescriptions && data.poseDescriptions[i] 
              ? JSON.stringify(data.poseDescriptions[i])
              : JSON.stringify(data.poseDescriptions),
            inputImageUrl: inputImageUrlJson,
            outputImageUrl: displayImages[i],
          });
          
          taskIds.push(taskId);
        }
      }
      
      setGeneratedTaskIds(taskIds);

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
      isGeneratingRef.current = false;
      abortControllerRef.current = null;
      console.log("请求完成，重置状态");
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
          {ecommerceMode 
            ? "电商版：上传模特图片，AI 将生成5张专业电商棚拍风格的商品展示图。"
            : "上传一张图片，AI 将分析模特的pose和环境，生成多张Instagram风格的组图。可选上传角色面部图以保持一致的脸部特征。"
          }
        </p>
        {!authLoading && !isAuthenticated && (
          <div className="mt-4 rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            未登录状态下可以浏览界面，点击"生成图片"时会提示登录。
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">控制面板</h2>

            <div className="space-y-6">
              {/* Mode Toggle - 普通版/电商版 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setEcommerceMode(false)}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
                    !ecommerceMode
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Camera className="w-4 h-4 inline mr-1" />
                  普通版
                </button>
                <button
                  onClick={() => setEcommerceMode(true)}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
                    ecommerceMode
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 inline mr-1" />
                  电商版
                </button>
              </div>

              {/* Image Upload */}
              <ImageUpload
                maxImages={1}
                onImagesChange={setImage}
                label="上传起始图片 (最多1张)"
              />

              {/* 普通版特有：角色面部图上传 */}
              {!ecommerceMode && (
                <div>
                  <ImageUpload
                    maxImages={1}
                    onImagesChange={setCharacterImage}
                    label="上传角色面部图 (可选，最多1张)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    提供更清晰的面部特征图，AI 会保持一致的脸部特征
                  </p>
                </div>
              )}

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
                  <option value="default">默认（由模型决定）</option>
                  <option value="1:1">1:1 (正方形)</option>
                  <option value="16:9">16:9 (横屏)</option>
                  <option value="9:16">9:16 (竖屏)</option>
                  <option value="4:3">4:3 (标准横屏)</option>
                  <option value="3:4">3:4 (标准竖屏)</option>
                </select>
              </div>

              {/* Image Size / Resolution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  输出分辨率
                </label>
                <select
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value as ImageSize)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="default">默认</option>
                  <option value="1K">1K (1024px)</option>
                  <option value="2K">2K (2048px)</option>
                  <option value="4K">4K (4096px)</option>
                </select>
              </div>

              {/* Hot Mode Toggle - 仅普通版显示 */}
              {!ecommerceMode && (
                <div>
                  <button
                    onClick={() => setHotMode(!hotMode)}
                    className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all duration-200 ${
                      hotMode
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/50'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {hotMode ? '🔥 Hot Mode (已开启)' : 'Hot Mode 🔥'}
                  </button>
                  {hotMode && (
                    <p className="text-xs text-orange-600 mt-2 text-center">
                      Hot Mode 使用 Qwen 模型串行生成 3 张图片（约2分钟）
                    </p>
                  )}
                </div>
              )}

              {/* Workflow Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <strong>工作流程：</strong>
                {ecommerceMode ? (
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                    <li>分析图片并生成5个电商pose描述</li>
                    <li>根据每个pose描述生成专业棚拍图</li>
                    <li>生成5张电商风格的商品展示图</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                    <li>分析图片并生成{hotMode ? '3' : '6'}个不同的pose描述</li>
                    <li>根据每个pose描述生成对应的图片{hotMode && '（串行）'}</li>
                    <li>生成{hotMode ? '3' : '6'}张Instagram风格的组图</li>
                  </ol>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || authLoading || image.length === 0}
                className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  ecommerceMode
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-300'
                    : 'bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-300'
                } disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <>生成中...</>
                ) : (
                  <>
                    {ecommerceMode ? <ShoppingBag className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                    {ecommerceMode ? '生成电商图' : '生成图片'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
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
                {/* Results: Image + Description pairs */}
                {(generatedImages.length > 0 || poseDescriptions.length > 0) && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        生成结果 ({generatedImages.length}/{poseDescriptions.length > 0 ? poseDescriptions.length : (ecommerceMode ? 5 : 6)})
                      </h3>
                      {generatedImages.length > 0 && (
                        <button
                          onClick={() => {
                            generatedImages.forEach((url, index) => {
                              setTimeout(() => {
                                downloadImage(url, `photobooth-${ecommerceMode ? 'ecom' : 'pose'}-${index + 1}.png`);
                              }, index * 200);
                            });
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          下载全部 ({generatedImages.length}张)
                        </button>
                      )}
                    </div>
                    <div className="space-y-6">
                      {poseDescriptions.map((pose, index) => {
                        const hasImage = index < generatedImages.length;
                        const imageUrl = hasImage ? generatedImages[index] : null;
                        
                        return (
                          <div
                            key={index}
                            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                          >
                            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-0">
                              {/* Left: Image */}
                              <div className="bg-gray-50 flex items-center justify-center p-6 min-h-[400px]">
                                {imageUrl ? (
                                  <div className="relative w-full max-w-2xl group cursor-pointer" onClick={() => setSelectedImageIndex(index)}>
                                    <img
                                      src={imageUrl}
                                      alt={`Pose ${index + 1}`}
                                      className="w-full h-auto rounded-lg shadow-lg transition-transform group-hover:scale-[1.02]"
                                    />
                                    <div className={`absolute top-3 left-3 text-white text-xs px-3 py-1.5 rounded-lg font-medium ${ecommerceMode ? 'bg-amber-600/80' : 'bg-black/70'}`}>
                                      {ecommerceMode ? `电商图 ${index + 1}` : `Pose ${index + 1}`}
                                    </div>
                                    <div className="absolute top-3 right-3 bg-black/70 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Maximize2 className="w-4 h-4" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center text-gray-400">
                                    <Camera className="w-16 h-16 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">图片生成中...</p>
                                  </div>
                                )}
                              </div>

                              {/* Right: Description */}
                              <div className="p-8 flex flex-col justify-center">
                                <div className="mb-4">
                                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                    {ecommerceMode ? `电商图 ${index + 1} 描述` : `Pose ${index + 1} 描述`}
                                  </h4>
                                  {!hasImage && (
                                    <span className="inline-block text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                      生成失败
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-700 space-y-4">
                                  <div>
                                    <div className="font-semibold text-gray-900 mb-2">Pose:</div>
                                    <div className="text-gray-600 leading-relaxed">{pose.pose}</div>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900 mb-2">Camera Position:</div>
                                    <div className="text-gray-600 leading-relaxed">{pose.cameraPosition}</div>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900 mb-2">Composition:</div>
                                    <div className="text-gray-600 leading-relaxed">{pose.composition}</div>
                                  </div>
                                </div>
                                {imageUrl && (
                                  <div className="mt-6 flex gap-4">
                                    <button
                                      onClick={() => {
                                        const taskId = generatedTaskIds[index];
                                        if (taskId) {
                                          setSelectedTaskId(taskId);
                                          setSelectedImageUrl(imageUrl);
                                          setFavoriteModalOpen(true);
                                        }
                                      }}
                                      className="inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium"
                                      disabled={!generatedTaskIds[index]}
                                    >
                                      <Heart className="w-4 h-4" />
                                      收藏图片
                                    </button>
                                    <button
                                      onClick={() => downloadImage(imageUrl, `photobooth-${ecommerceMode ? 'ecom' : 'pose'}-${index + 1}.png`)}
                                      className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                                    >
                                      <Download className="w-4 h-4" />
                                      下载图片
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!poseDescriptions.length && !generatedImages.length && (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      {ecommerceMode ? (
                        <>
                          <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p>上传模特图片并点击"生成电商图"按钮开始创作</p>
                        </>
                      ) : (
                        <>
                          <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p>上传图片并点击"生成图片"按钮开始创作</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal for Fullscreen View */}
      {selectedImageIndex !== null && generatedImages[selectedImageIndex] && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <button
            onClick={() => setSelectedImageIndex(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2"
            aria-label="关闭"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-7xl max-h-full relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={generatedImages[selectedImageIndex]}
              alt={`Pose ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
              {ecommerceMode ? `电商图 ${selectedImageIndex + 1}` : `Pose ${selectedImageIndex + 1}`} / {generatedImages.length}
            </div>
          </div>
        </div>
      )}

      {/* Favorite Modal */}
      {selectedTaskId && (
        <FavoriteModal
          isOpen={favoriteModalOpen}
          onClose={() => {
            setFavoriteModalOpen(false);
            setSelectedTaskId(null);
            setSelectedImageUrl(null);
          }}
          taskId={selectedTaskId}
          imageUrl={selectedImageUrl || undefined}
          onSuccess={() => {
            console.log('Image favorited successfully');
          }}
        />
      )}
    </div>
  );
}
