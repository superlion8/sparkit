"use client";

import { useState, useEffect } from "react";
import ImageGrid from "@/components/ImageGrid";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { logTaskEvent, generateClientTaskId } from "@/lib/clientTasks";
import { User, Download, History } from "lucide-react";
import { downloadImage } from "@/lib/downloadUtils";

type AspectRatio = "default" | "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export default function MimicPage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  const [referenceImage, setReferenceImage] = useState<File[]>([]);
  const [characterImage, setCharacterImage] = useState<File[]>([]);
  const [numImages, setNumImages] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("default");
  const [keepBackground, setKeepBackground] = useState(true);
  const [hotMode, setHotMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captionPrompt, setCaptionPrompt] = useState("");
  const [editableCaptionPrompt, setEditableCaptionPrompt] = useState("");
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [finalImages, setFinalImages] = useState<string[]>([]);
  const [finalTaskIds, setFinalTaskIds] = useState<string[]>([]); // 保存每张图片对应的 taskId
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [fromHistory, setFromHistory] = useState(false);
  const [historyInputImageUrl, setHistoryInputImageUrl] = useState<string>("");

  // 从 localStorage 读取历史编辑数据
  useEffect(() => {
    const editDataStr = localStorage.getItem('sparkitEditData');
    if (editDataStr) {
      try {
        const editData = JSON.parse(editDataStr);
        // 清除 localStorage，避免重复使用
        localStorage.removeItem('sparkitEditData');
        
        if (editData.fromHistory && editData.taskType === 'mimic') {
          setFromHistory(true);
          
          // 预填充 prompt
          if (editData.prompt) {
            setCaptionPrompt(editData.prompt);
            setEditableCaptionPrompt(editData.prompt);
          }
          
          // 保存输入图片 URL（用于显示提示）
          if (editData.inputImageUrl) {
            setHistoryInputImageUrl(editData.inputImageUrl);
          }
          
          // 如果有背景图 URL，设置为 backgroundImage
          if (editData.backgroundImageUrl) {
            setBackgroundImage(editData.backgroundImageUrl);
          }
        }
      } catch (e) {
        console.error('Failed to parse edit data:', e);
      }
    }
  }, []);

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
    setEditableCaptionPrompt("");
    setBackgroundImage("");
    setFinalImages([]);
    setFinalTaskIds([]); // 清空旧的 taskIds
    setCurrentStep("正在反推提示词...");

    try {
      const formData = new FormData();
      formData.append("referenceImage", referenceImage[0]);
      // Append all character images
      for (const charImage of characterImage) {
        formData.append("characterImage", charImage);
      }
      if (aspectRatio !== "default") {
        formData.append("aspectRatio", aspectRatio);
      }
      formData.append("numImages", hotMode ? "1" : numImages.toString());
      formData.append("keepBackground", keepBackground.toString());
      formData.append("hotMode", hotMode.toString());

      setCurrentStep("正在去掉参考图中的人物...");

      // 设置 300 秒超时（5 分钟），与后端 maxDuration 保持一致
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 秒

      let response: Response;
      try {
        response = await fetch("/api/generate/mimic", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('生成超时（5分钟），请重试或减少生成数量');
        }
        throw error;
      }

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
        setEditableCaptionPrompt(data.captionPrompt); // 同时设置可编辑版本
      }

      // 只使用 URL，不再使用 base64 fallback（避免响应体过大）
      const displayBackgroundImage = data.backgroundImageUrl || "";
      setBackgroundImage(displayBackgroundImage);

      // 只使用 finalImageUrls（已上传的图片）
      const displayFinalImages = (data.finalImageUrls || []).filter((url: string | null) => url !== null);
      
      setFinalImages(displayFinalImages);
      
      // 如果有上传警告，显示提示
      if (data.uploadWarnings && data.uploadWarnings.length > 0) {
        console.warn("图片上传警告:", data.uploadWarnings);
      }

      // Log task event - 为每张 final image 创建单独的 task
      const taskIds: string[] = [];
      if (accessToken && displayFinalImages.length > 0) {
        const baseTaskId = generateClientTaskId("mimic");
        
        const inputImageUrls = {
          reference: data.referenceImageUrl || null,
          character: data.characterImageUrls || [], // Now an array
        };
        const inputImageUrlJson = JSON.stringify(inputImageUrls);
        
        // 为每张 final image 创建单独的 task
        for (let i = 0; i < displayFinalImages.length; i++) {
          const taskId = displayFinalImages.length > 1 ? `${baseTaskId}-${i}` : baseTaskId;
          
          await logTaskEvent(accessToken, {
            taskId,
            taskType: "mimic",
            prompt: data.captionPrompt,
            inputImageUrl: inputImageUrlJson,
            outputImageUrl: displayFinalImages[i], // 单张图片 URL
            backgroundImageUrl: data.backgroundImageUrl || null,
          });
          
          taskIds.push(taskId);
        }
      }
      
      setFinalTaskIds(taskIds); // 保存 taskIds

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

  // 使用修改后的 prompt 重新生成
  const handleRegenerate = async () => {
    if (!editableCaptionPrompt) {
      setError("请先生成初始结果，获取反推提示词");
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
    setFinalImages([]);
    setFinalTaskIds([]); // 清空旧的 taskIds
    setCurrentStep("正在使用修改后的提示词重新生成...");

    try {
      const formData = new FormData();
      // Append all character images
      for (const charImage of characterImage) {
        formData.append("characterImage", charImage);
      }
      if (aspectRatio !== "default") {
        formData.append("aspectRatio", aspectRatio);
      }
      formData.append("numImages", hotMode ? "1" : numImages.toString());
      formData.append("hotMode", hotMode.toString());
      formData.append("keepBackground", keepBackground.toString()); // 传递 keepBackground 状态
      // 传入用户修改后的 captionPrompt，告诉后端跳过 Step 1
      formData.append("customCaptionPrompt", editableCaptionPrompt);
      // 如果用户选择了保留背景且有背景图，传递 URL 给后端
      if (keepBackground && backgroundImage) {
        formData.append("existingBackgroundImageUrl", backgroundImage);
        console.log("已将背景图 URL 添加到重新生成请求:", backgroundImage);
      }

      // 设置 300 秒超时（5 分钟），与后端 maxDuration 保持一致
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 秒

      let response: Response;
      try {
        response = await fetch("/api/generate/mimic", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          setError('生成超时（5分钟），请重试或减少生成数量');
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "生成失败");
        setErrorDetails(errorData.details || null);
        return;
      }

      const data = await response.json();

      // 只使用 finalImageUrls（已上传的图片）
      const displayFinalImages = (data.finalImageUrls || []).filter((url: string | null) => url !== null);
      
      setFinalImages(displayFinalImages);
      
      // 如果有上传警告，显示提示
      if (data.uploadWarnings && data.uploadWarnings.length > 0) {
        console.warn("图片上传警告:", data.uploadWarnings);
      }

      // Log task event - 为每张 final image 创建单独的 task
      const taskIds: string[] = [];
      if (accessToken && displayFinalImages.length > 0) {
        const baseTaskId = generateClientTaskId("mimic");
        
        const inputImageUrls = {
          character: data.characterImageUrls || [],
        };
        const inputImageUrlJson = JSON.stringify(inputImageUrls);
        
        // 为每张 final image 创建单独的 task
        for (let i = 0; i < displayFinalImages.length; i++) {
          const taskId = displayFinalImages.length > 1 ? `${baseTaskId}-${i}` : baseTaskId;
          
          await logTaskEvent(accessToken, {
            taskId,
            taskType: "mimic",
            prompt: editableCaptionPrompt, // 使用用户修改后的 prompt
            inputImageUrl: inputImageUrlJson,
            outputImageUrl: displayFinalImages[i], // 单张图片 URL
            backgroundImageUrl: data.backgroundImageUrl || backgroundImage || null,
          });
          
          taskIds.push(taskId);
        }
      }
      
      setFinalTaskIds(taskIds); // 保存 taskIds

      setCurrentStep("生成完成！");
    } catch (err: any) {
      setError(err.message || "生成失败");
      setErrorDetails(err);
      console.error("Regenerate error:", err);
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
        {fromHistory && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
            <History className="w-4 h-4" />
            <span>已从历史记录加载参数，请上传角色图后使用"重新生成"功能</span>
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
                maxImages={hotMode ? 1 : 10}
                onImagesChange={setCharacterImage}
                label={hotMode ? "上传角色图" : "上传角色图 (可多张)"}
              />

              {/* Hot Mode Toggle */}
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
                    Hot Mode 使用 Qwen 模型生成，每次生成 1 张图片
                  </p>
                )}
              </div>

              {!hotMode && (
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

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="keepBackground"
                  checked={keepBackground}
                  onChange={(e) => setKeepBackground(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="keepBackground" className="text-sm font-medium text-gray-700">
                  保留参考图背景
                </label>
              </div>
              <p className="text-xs text-gray-500 -mt-4 ml-6">
                勾选后将使用参考图的背景，取消勾选则只使用场景描述生成背景
              </p>

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
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  反推的提示词
                  <span className="text-xs text-gray-500 ml-2">（可修改后重新生成）</span>
                </h3>
                <textarea
                  value={editableCaptionPrompt}
                  onChange={(e) => setEditableCaptionPrompt(e.target.value)}
                  className="w-full min-h-[120px] p-4 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                  placeholder="修改提示词后，点击下方重新生成按钮..."
                />
                <button
                  onClick={handleRegenerate}
                  disabled={loading || !editableCaptionPrompt}
                  className="mt-3 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2.5 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  使用修改后的提示词重新生成
                </button>
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
                <ImageGrid 
                  images={finalImages} 
                  taskIds={finalTaskIds}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

