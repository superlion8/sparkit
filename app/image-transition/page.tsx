"use client";

import { useState } from "react";
import ImageUpload from "@/components/ImageUpload";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { Film, Sparkles, Video, Upload, Download, Wand2 } from "lucide-react";
import { downloadImage, downloadVideo } from "@/lib/downloadUtils";
import { logTaskEvent, generateClientTaskId } from "@/lib/clientTasks";

export default function ImageTransitionPage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  
  // Images
  const [startImage, setStartImage] = useState<File[]>([]);
  const [endImage, setEndImage] = useState<File[]>([]);
  const [endImageMode, setEndImageMode] = useState<"upload" | "generate">("upload");
  
  // AI Generation for end frame
  const [editPrompt, setEditPrompt] = useState("");
  const [generatedEndImageUrl, setGeneratedEndImageUrl] = useState("");
  const [generatedEndImageBlob, setGeneratedEndImageBlob] = useState<Blob | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState("");
  
  // Transition prompt
  const [transitionPrompt, setTransitionPrompt] = useState("");
  const [promptMode, setPromptMode] = useState<"manual" | "ai">("manual");
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState("");
  
  // Video generation
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [taskId, setTaskId] = useState("");

  // Generate end frame using AI
  const handleGenerateEndFrame = async () => {
    if (!editPrompt.trim()) {
      setGenerateError("请输入改图描述");
      return;
    }

    if (startImage.length === 0) {
      setGenerateError("请先上传首帧图");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setGenerateError("登录后才能使用AI生成功能");
      promptLogin();
      return;
    }

    setGenerateLoading(true);
    setGenerateError("");

    try {
      const formData = new FormData();
      formData.append("prompt", editPrompt);
      formData.append("aspectRatio", "1:1");
      startImage.forEach((image) => {
        formData.append("images", image);
      });

      const response = await fetch("/api/generate/gemini", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "AI生成失败");
      }

      const data = await response.json();
      if (data.images && data.images.length > 0) {
        const imageUrl = data.images[0];
        setGeneratedEndImageUrl(imageUrl);
        
        // Use base64 image if available (avoids CORS issues)
        const base64Image = data.base64Images?.[0] || imageUrl;
        
        try {
          // Convert base64 to blob
          const base64Response = await fetch(base64Image);
          const blob = await base64Response.blob();
          setGeneratedEndImageBlob(blob);
          console.log("Successfully converted image to blob:", blob.size, "bytes");
        } catch (blobError) {
          console.error("Failed to convert image to blob:", blobError);
          setGenerateError("图片处理失败，请重试");
          return;
        }
        
        // Log image editing task
        if (accessToken) {
          const taskId = generateClientTaskId("image_transition_edit");
          await logTaskEvent(accessToken, {
            taskId,
            taskType: "image_transition_edit",
            prompt: editPrompt,
            inputImageUrl: startImage[0]?.name || null,
            outputImageUrl: imageUrl,
          });
        }
      } else {
        setGenerateError("未返回AI生成结果");
      }
    } catch (err: any) {
      setGenerateError(err.message || "AI生成失败，请重试");
    } finally {
      setGenerateLoading(false);
    }
  };

  // Generate transition prompt using AI (Gemini)
  const handleGenerateTransitionPrompt = async () => {
    if (!isAuthenticated || !accessToken) {
      setPromptError("登录后才能使用此功能");
      promptLogin();
      return;
    }

    if (startImage.length === 0) {
      setPromptError("请上传首帧图");
      return;
    }

    // Check end frame based on mode
    if (endImageMode === "upload" && endImage.length === 0) {
      setPromptError("请上传尾帧图");
      return;
    }

    if (endImageMode === "generate" && !generatedEndImageBlob) {
      setPromptError("请先AI生成尾帧图");
      return;
    }

    setPromptLoading(true);
    setPromptError("");

    try {
      const formData = new FormData();
      formData.append("startImage", startImage[0]);
      
      // Add end image based on mode
      if (endImageMode === "upload") {
        formData.append("endImage", endImage[0]);
      } else {
        const editedImageFile = new File([generatedEndImageBlob!], "edited-image.png", { 
          type: generatedEndImageBlob!.type || "image/png" 
        });
        formData.append("endImage", editedImageFile);
      }

      const response = await fetch("/api/generate/transition-prompt", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "生成转场描述失败");
      }

      const data = await response.json();
      setTransitionPrompt(data.prompt);
    } catch (err: any) {
      setPromptError(err.message || "生成转场描述失败");
    } finally {
      setPromptLoading(false);
    }
  };

  // Generate video using Kling
  const handleGenerateVideo = async () => {
    if (!transitionPrompt.trim()) {
      setVideoError("请输入转场描述");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setVideoError("登录后才能使用视频生成功能");
      promptLogin();
      return;
    }

    if (startImage.length === 0) {
      setVideoError("请上传首帧图");
      return;
    }

    // Check end frame based on mode
    if (endImageMode === "upload" && endImage.length === 0) {
      setVideoError("请上传尾帧图");
      return;
    }

    if (endImageMode === "generate" && !generatedEndImageUrl) {
      setVideoError("请先AI生成尾帧图");
      return;
    }

    // Clear previous video and errors
    setVideoUrl("");
    setVideoLoading(true);
    setVideoError("");

    try {
      // Get URLs for start and end images
      const startImageUrl = await uploadImageToGetUrl(startImage[0], accessToken);
      
      let endImageUrl: string;
      if (endImageMode === "upload") {
        endImageUrl = await uploadImageToGetUrl(endImage[0], accessToken);
      } else {
        endImageUrl = generatedEndImageUrl;
      }

      if (!startImageUrl || !endImageUrl) {
        throw new Error("图片URL获取失败");
      }

      // Start video generation
      const response = await fetch("/api/kling/generate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startImageUrl,
          endImageUrl,
          prompt: transitionPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "视频生成请求失败");
      }

      const data = await response.json();
      setTaskId(data.taskId);

      // Poll for video status
      pollVideoStatus(data.taskId, endImageUrl);

    } catch (err: any) {
      setVideoError(err.message || "视频生成失败");
      setVideoLoading(false);
    }
  };

  // Poll video generation status
  const pollVideoStatus = async (id: string, endImgUrl: string) => {
    const maxAttempts = 60; // 5 minutes max (5s interval)
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setVideoError("视频生成超时，请稍后重试");
        setVideoLoading(false);
        return;
      }

      attempts++;

      try {
        const response = await fetch(`/api/kling/query?taskId=${id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("查询视频状态失败");
        }

        const data = await response.json();
        console.log("视频生成状态:", data.status);

        if (data.status === "succeed" && data.videoUrl) {
          setVideoUrl(data.videoUrl);
          setVideoLoading(false);
          
          // Log video generation task
          if (accessToken) {
            const videoTaskId = generateClientTaskId("image_transition_video");
            await logTaskEvent(accessToken, {
              taskId: videoTaskId,
              taskType: "image_transition_video",
              prompt: transitionPrompt,
              inputImageUrl: endImgUrl,
              outputVideoUrl: data.videoUrl,
            });
          }
        } else if (data.status === "failed") {
          setVideoError("视频生成失败");
          setVideoLoading(false);
        } else {
          // Continue polling
          setTimeout(poll, 5000);
        }
      } catch (err: any) {
        setVideoError(err.message || "查询视频状态失败");
        setVideoLoading(false);
      }
    };

    poll();
  };

  // Helper function to upload image and get URL
  const uploadImageToGetUrl = async (file: File, token: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload/to-aimovely", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "图片上传失败");
    }

    const data = await response.json();
    return data.url;
  };

  // Check if we have both frames ready
  const hasBothFrames = startImage.length > 0 && (
    (endImageMode === "upload" && endImage.length > 0) ||
    (endImageMode === "generate" && generatedEndImageUrl)
  );

  // Get the end frame image URL for display
  const getEndFrameUrl = () => {
    if (endImageMode === "upload" && endImage.length > 0) {
      return URL.createObjectURL(endImage[0]);
    }
    if (endImageMode === "generate" && generatedEndImageUrl) {
      return generatedEndImageUrl;
    }
    return "";
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Film className="w-8 h-8 text-primary-600" />
          改图转场
        </h1>
        <p className="text-gray-600 mt-2">
          准备首尾帧图 → 填写转场描述 → 生成转场视频
        </p>
        {!authLoading && !isAuthenticated && (
          <div className="mt-4 rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            未登录状态下可以浏览界面，使用功能时会提示登录。
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel: Controls */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            
            {/* Step 1: Start Frame (首帧图) */}
            <div className="p-4 rounded-lg border-2 border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary-600" />
                首帧图
              </h2>
              <ImageUpload
                maxImages={1}
                onImagesChange={setStartImage}
                label="上传首帧图"
              />
            </div>

            {/* Step 2: End Frame (尾帧图) - Upload or Generate */}
            <div className="p-4 rounded-lg border-2 border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary-600" />
                尾帧图
              </h2>

              {/* Mode Selection */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setEndImageMode("upload")}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    endImageMode === "upload"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  上传图片
                </button>
                <button
                  onClick={() => setEndImageMode("generate")}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    endImageMode === "generate"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Wand2 className="w-4 h-4 inline mr-2" />
                  AI 生成
                </button>
              </div>

              {/* Upload Mode */}
              {endImageMode === "upload" && (
                <ImageUpload
                  maxImages={1}
                  onImagesChange={setEndImage}
                  label="上传尾帧图"
                />
              )}

              {/* Generate Mode */}
              {endImageMode === "generate" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      改图描述
                    </label>
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="描述你想要如何修改首帧图..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <button
                    onClick={handleGenerateEndFrame}
                    disabled={generateLoading || !editPrompt.trim() || startImage.length === 0}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {generateLoading ? (
                      <>AI 生成中...</>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        AI 生成尾帧图
                      </>
                    )}
                  </button>

                  {generateError && (
                    <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                      {generateError}
                    </div>
                  )}

                  {generatedEndImageUrl && (
                    <div>
                      <p className="text-sm text-green-600 mb-2">✓ 尾帧图已生成</p>
                      <img
                        src={generatedEndImageUrl}
                        alt="AI生成的尾帧图"
                        className="w-full rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Transition Prompt */}
            <div className="p-4 rounded-lg border-2 border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Film className="w-5 h-5 text-primary-600" />
                转场描述
              </h2>

              {!hasBothFrames && (
                <p className="text-sm text-gray-500 italic mb-4">请先准备首尾帧图...</p>
              )}

              {hasBothFrames && (
                <>
                  {/* Mode Selection */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setPromptMode("manual")}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        promptMode === "manual"
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      手动输入
                    </button>
                    <button
                      onClick={() => setPromptMode("ai")}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                        promptMode === "ai"
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      AI 生成
                    </button>
                  </div>

                  {/* AI Generate Button */}
                  {promptMode === "ai" && !transitionPrompt && (
                    <button
                      onClick={handleGenerateTransitionPrompt}
                      disabled={promptLoading}
                      className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-4"
                    >
                      {promptLoading ? (
                        <>AI 思考中...</>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          AI 生成转场描述
                        </>
                      )}
                    </button>
                  )}

                  {/* Prompt Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      转场镜头描述
                    </label>
                    <textarea
                      value={transitionPrompt}
                      onChange={(e) => setTransitionPrompt(e.target.value)}
                      placeholder="描述首尾帧之间的转场效果..."
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {promptError && (
                    <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                      {promptError}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Step 4: Video Generation */}
            <div className="p-4 rounded-lg border-2 border-primary-300 bg-primary-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-primary-600" />
                生成转场视频
              </h2>

              {!hasBothFrames && (
                <p className="text-sm text-gray-500 italic">请先准备首尾帧图...</p>
              )}

              {hasBothFrames && !transitionPrompt.trim() && (
                <p className="text-sm text-gray-500 italic">请先填写转场描述...</p>
              )}

              {hasBothFrames && transitionPrompt.trim() && !videoLoading && (
                <button
                  onClick={handleGenerateVideo}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Video className="w-5 h-5" />
                  {videoUrl ? "重新生成视频" : "生成转场视频"}
                </button>
              )}

              {videoLoading && (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 text-sm text-blue-700">
                  视频生成中，预计需要 2-5 分钟...
                </div>
              )}

              {videoError && (
                <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                  {videoError}
                </div>
              )}

              {videoUrl && !videoLoading && (
                <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-3 text-sm text-green-700">
                  ✓ 视频已生成！可修改转场描述后重新生成。
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Preview & Results */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[600px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">预览 & 结果</h2>

            {(generateLoading || promptLoading) && (
              <LoadingSpinner text={generateLoading ? "AI 生成中..." : "AI 思考中..."} />
            )}

            {videoLoading && (
              <LoadingSpinner text="视频生成中，预计需要 2-5 分钟..." />
            )}

            {!generateLoading && !promptLoading && !videoLoading && (
              <div className="space-y-6">
                {/* Frame Preview */}
                {(startImage.length > 0 || getEndFrameUrl()) && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">首尾帧预览</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {startImage.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">首帧</p>
                          <img
                            src={URL.createObjectURL(startImage[0])}
                            alt="首帧"
                            className="w-full rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                      {getEndFrameUrl() && (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">尾帧</p>
                          <img
                            src={getEndFrameUrl()}
                            alt="尾帧"
                            className="w-full rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Generated End Frame Download */}
                {generatedEndImageUrl && endImageMode === "generate" && (
                  <button
                    onClick={() => downloadImage(generatedEndImageUrl, "end-frame.png")}
                    className="w-full bg-gray-600 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    下载尾帧图
                  </button>
                )}

                {/* Video Result */}
                {videoUrl && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">转场视频</h3>
                    <video
                      src={videoUrl}
                      controls
                      className="w-full rounded-lg border border-gray-200"
                    />
                    <button
                      onClick={() => downloadVideo(videoUrl, "transition-video.mp4")}
                      className="mt-4 w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Video className="w-5 h-5" />
                      下载视频
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!startImage.length && !getEndFrameUrl() && !videoUrl && (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>准备首尾帧图，开始创作转场视频</p>
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
