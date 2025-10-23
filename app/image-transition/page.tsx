"use client";

import { useState } from "react";
import ImageUpload from "@/components/ImageUpload";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { Film, Sparkles, Video, ArrowRight, Download } from "lucide-react";
import { downloadImage, downloadVideo } from "@/lib/downloadUtils";

type Step = "edit" | "transition" | "video";

export default function ImageTransitionPage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  
  // Step 1: Image editing
  const [originalImage, setOriginalImage] = useState<File[]>([]);
  const [editPrompt, setEditPrompt] = useState("");
  const [editedImageUrl, setEditedImageUrl] = useState("");
  const [editedImageBlob, setEditedImageBlob] = useState<Blob | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  
  // Step 2: Transition prompt generation
  const [transitionPrompt, setTransitionPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState("");
  
  // Step 3: Video generation
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [taskId, setTaskId] = useState("");
  
  const [currentStep, setCurrentStep] = useState<Step>("edit");

  // Step 1: Edit image using Nano Banana (Gemini)
  const handleEditImage = async () => {
    if (!editPrompt.trim()) {
      setEditError("请输入改图描述");
      return;
    }

    if (originalImage.length === 0) {
      setEditError("请上传图片");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setEditError("登录后才能使用改图功能");
      promptLogin();
      return;
    }

    setEditLoading(true);
    setEditError("");

    try {
      const formData = new FormData();
      formData.append("prompt", editPrompt);
      formData.append("aspectRatio", "1:1");
      originalImage.forEach((image) => {
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
        throw new Error(errorData.error || "改图失败");
      }

      const data = await response.json();
      if (data.images && data.images.length > 0) {
        const imageUrl = data.images[0];
        setEditedImageUrl(imageUrl);
        
        // Use base64 image if available (avoids CORS issues)
        const base64Image = data.base64Images?.[0] || imageUrl;
        
        try {
          // Convert base64 to blob
          const base64Response = await fetch(base64Image);
          const blob = await base64Response.blob();
          setEditedImageBlob(blob);
          console.log("Successfully converted image to blob:", blob.size, "bytes");
        } catch (blobError) {
          console.error("Failed to convert image to blob:", blobError);
          setEditError("图片处理失败，请重试");
          return;
        }
        
        setCurrentStep("transition");
      } else {
        setEditError("未返回改图结果");
      }
    } catch (err: any) {
      setEditError(err.message || "改图失败，请重试");
    } finally {
      setEditLoading(false);
    }
  };

  // Step 2: Generate transition prompt using Gemini
  const handleGenerateTransitionPrompt = async () => {
    if (!isAuthenticated || !accessToken) {
      setPromptError("登录后才能使用此功能");
      promptLogin();
      return;
    }

    if (originalImage.length === 0 || !editedImageBlob) {
      setPromptError("需要原图和改图结果");
      return;
    }

    setPromptLoading(true);
    setPromptError("");

    try {
      const formData = new FormData();
      formData.append("startImage", originalImage[0]);
      
      // Use the saved blob instead of fetching (avoids CORS issues)
      const editedImageFile = new File([editedImageBlob], "edited-image.png", { 
        type: editedImageBlob.type || "image/png" 
      });
      formData.append("endImage", editedImageFile);

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

  // Step 3: Generate video using Kling
  const handleGenerateVideo = async () => {
    if (!transitionPrompt.trim()) {
      setVideoError("请确认转场描述");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setVideoError("登录后才能使用视频生成功能");
      promptLogin();
      return;
    }

    setVideoLoading(true);
    setVideoError("");
    setCurrentStep("video");

    try {
      // Get URLs for original and edited images
      const startImageUrl = originalImage[0] 
        ? await uploadImageToGetUrl(originalImage[0], accessToken)
        : "";
      const endImageUrl = editedImageUrl;

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
      pollVideoStatus(data.taskId);

    } catch (err: any) {
      setVideoError(err.message || "视频生成失败");
      setVideoLoading(false);
    }
  };

  // Poll video generation status
  const pollVideoStatus = async (id: string) => {
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

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Film className="w-8 h-8 text-primary-600" />
          改图转场
        </h1>
        <p className="text-gray-600 mt-2">
          上传图片 → AI改图 → 生成转场描述 → 创作视频转场
        </p>
        {!authLoading && !isAuthenticated && (
          <div className="mt-4 rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            未登录状态下可以浏览界面，使用功能时会提示登录。
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentStep === "edit" ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"}`}>
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">1. 改图</span>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400" />
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentStep === "transition" ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"}`}>
          <Film className="w-5 h-5" />
          <span className="font-medium">2. 转场描述</span>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-400" />
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${currentStep === "video" ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"}`}>
          <Video className="w-5 h-5" />
          <span className="font-medium">3. 生成视频</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel: Controls */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            {/* Step 1: Image Editing */}
            <div className={`p-4 rounded-lg border-2 ${currentStep === "edit" ? "border-primary-300 bg-primary-50" : "border-gray-200"}`}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                步骤 1: AI 改图
              </h2>

              <ImageUpload
                maxImages={1}
                onImagesChange={setOriginalImage}
                label="上传原图"
              />

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  改图描述
                </label>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="描述你想要如何修改图片..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  disabled={currentStep !== "edit"}
                />
              </div>

              <button
                onClick={handleEditImage}
                disabled={editLoading || authLoading || !editPrompt.trim() || originalImage.length === 0 || currentStep !== "edit"}
                className="w-full mt-4 bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {editLoading ? (
                  <>生成中...</>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    生成改图
                  </>
                )}
              </button>

              {editError && (
                <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                  {editError}
                </div>
              )}
            </div>

            {/* Step 2: Transition Prompt */}
            <div className={`p-4 rounded-lg border-2 ${currentStep === "transition" ? "border-primary-300 bg-primary-50" : "border-gray-200"}`}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Film className="w-5 h-5 text-primary-600" />
                步骤 2: 生成转场描述
              </h2>

              {!editedImageUrl && (
                <p className="text-sm text-gray-500 italic">请先完成改图...</p>
              )}

              {editedImageUrl && (
                <>
                  <button
                    onClick={handleGenerateTransitionPrompt}
                    disabled={promptLoading || !editedImageBlob}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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

                  {transitionPrompt && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        转场镜头描述（可编辑）
                      </label>
                      <textarea
                        value={transitionPrompt}
                        onChange={(e) => setTransitionPrompt(e.target.value)}
                        rows={5}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>
                  )}

                  {promptError && (
                    <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                      {promptError}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Step 3: Video Generation */}
            <div className={`p-4 rounded-lg border-2 ${currentStep === "video" ? "border-primary-300 bg-primary-50" : "border-gray-200"}`}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-primary-600" />
                步骤 3: 生成转场视频
              </h2>

              {!transitionPrompt && (
                <p className="text-sm text-gray-500 italic">请先生成转场描述...</p>
              )}

              {transitionPrompt && !videoLoading && !videoUrl && (
                <button
                  onClick={handleGenerateVideo}
                  disabled={!transitionPrompt.trim()}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Video className="w-5 h-5" />
                  生成转场视频
                </button>
              )}

              {videoError && (
                <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700">
                  {videoError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[600px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">生成结果</h2>

            {(editLoading || authLoading) && currentStep === "edit" && (
              <LoadingSpinner text="AI 正在改图..." />
            )}

            {promptLoading && (
              <LoadingSpinner text="AI 正在生成转场描述..." />
            )}

            {videoLoading && (
              <LoadingSpinner text="视频生成中，预计需要 2-5 分钟..." />
            )}

            {/* Show edited image and video together */}
            <div className="space-y-6">
              {/* Edited image */}
              {editedImageUrl && !videoLoading && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">改图结果</h3>
                  <img
                    src={editedImageUrl}
                    alt="改图结果"
                    className="w-full rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => downloadImage(editedImageUrl, "edited-image.png")}
                    className="mt-4 w-full bg-gray-600 text-white py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    下载图片
                  </button>
                </div>
              )}

              {/* Transition video */}
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
            </div>

            {!editLoading && !authLoading && !promptLoading && !videoLoading && !editedImageUrl && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>上传图片，开始创作转场视频</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

