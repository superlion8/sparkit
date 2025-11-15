"use client";

import { useState } from "react";
import ImageUpload from "@/components/ImageUpload";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { Video, Sparkles, Upload, Download } from "lucide-react";
import { downloadVideo } from "@/lib/downloadUtils";
import { logTaskEvent, generateClientTaskId } from "@/lib/clientTasks";

export default function PhotoToLivePage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();

  // Image
  const [image, setImage] = useState<File[]>([]);

  // Prompt
  const [prompt, setPrompt] = useState("");
  const [promptMode, setPromptMode] = useState<"manual" | "ai">("manual");
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptError, setPromptError] = useState("");

  // Video generation
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [taskId, setTaskId] = useState("");

  // Generate prompt using AI (Gemini)
  const handleGeneratePrompt = async () => {
    if (!isAuthenticated || !accessToken) {
      setPromptError("登录后才能使用此功能");
      promptLogin();
      return;
    }

    if (image.length === 0) {
      setPromptError("请上传图片");
      return;
    }

    setPromptLoading(true);
    setPromptError("");

    try {
      const formData = new FormData();
      formData.append("image", image[0]);

      const response = await fetch("/api/generate/photo-to-live-prompt", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "生成prompt失败");
      }

      const data = await response.json();
      setPrompt(data.prompt);
      setPromptMode("ai");
    } catch (err: any) {
      setPromptError(err.message || "生成prompt失败");
    } finally {
      setPromptLoading(false);
    }
  };

  // Generate video using Kling
  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      setVideoError("请输入或生成prompt");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setVideoError("登录后才能使用视频生成功能");
      promptLogin();
      return;
    }

    if (image.length === 0) {
      setVideoError("请上传图片");
      return;
    }

    // Clear previous video and errors
    setVideoUrl("");
    setVideoLoading(true);
    setVideoError("");

    try {
      // Upload image and get URL
      const imageUrl = await uploadImageToGetUrl(image[0], accessToken);

      if (!imageUrl) {
        throw new Error("图片URL获取失败");
      }

      // Start video generation
      const response = await fetch("/api/kling/photo-to-live", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "视频生成请求失败");
      }

      const data = await response.json();
      setTaskId(data.taskId);

      // Poll for video status
      pollVideoStatus(data.taskId, imageUrl);

    } catch (err: any) {
      setVideoError(err.message || "视频生成失败");
      setVideoLoading(false);
    }
  };

  // Poll video generation status
  const pollVideoStatus = async (id: string, imgUrl: string) => {
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
            const videoTaskId = generateClientTaskId("photo_to_live");
            await logTaskEvent(accessToken, {
              taskId: videoTaskId,
              taskType: "photo_to_live",
              prompt: prompt,
              inputImageUrl: imgUrl,
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

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Video className="w-8 h-8 text-primary-600" />
          Photo to Live
        </h1>
        <p className="text-gray-600 mt-2">
          上传一张图片，输入或AI生成一段prompt，生成一段5秒的短视频
        </p>
        {!authLoading && !isAuthenticated && (
          <div className="mt-4 rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            登录后才能使用 Photo to Live 功能，点击"生成视频"按钮时会弹出登录提示。
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
                label="上传图片"
              />

              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  视频描述 Prompt
                </label>
                <div className="flex gap-2 mb-2">
                  <textarea
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      setPromptMode("manual");
                    }}
                    placeholder="输入视频描述，或点击下方按钮AI生成..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>
                <button
                  onClick={handleGeneratePrompt}
                  disabled={promptLoading || image.length === 0 || !isAuthenticated}
                  className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {promptLoading ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      AI生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      AI生成Prompt
                    </>
                  )}
                </button>
                {promptError && (
                  <p className="mt-2 text-sm text-red-600">{promptError}</p>
                )}
                {promptMode === "ai" && prompt && (
                  <p className="mt-2 text-xs text-gray-500">
                    ✓ AI已生成prompt，您可以手动编辑
                  </p>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateVideo}
                disabled={
                  videoLoading ||
                  !prompt.trim() ||
                  image.length === 0 ||
                  !isAuthenticated
                }
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {videoLoading ? (
                  <>
                    <Video className="w-5 h-5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    生成视频
                  </>
                )}
              </button>

              {videoError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-600">{videoError}</p>
                </div>
              )}

              {/* Workflow Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <strong>工作流程：</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                  <li>上传一张图片</li>
                  <li>输入prompt或使用AI生成prompt</li>
                  <li>生成5秒短视频</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">生成结果</h2>

            {videoLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <LoadingSpinner text={taskId ? "视频生成中，请稍候..." : "正在提交生成任务..."} />
              </div>
            ) : videoUrl ? (
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full"
                    autoPlay
                    loop
                  />
                </div>
                <button
                  onClick={() => downloadVideo(videoUrl, "photo-to-live-video.mp4")}
                  className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  下载视频
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Video className="w-16 h-16 mb-4 opacity-50" />
                <p>生成的视频将显示在这里</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

