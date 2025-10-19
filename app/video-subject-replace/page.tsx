"use client";

import { useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import VideoUpload from "@/components/VideoUpload";
import { useAuth } from "@/hooks/useAuth";
import { Replace, Download } from "lucide-react";

export default function VideoSubjectReplacePage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subjectImage, setSubjectImage] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string>("");
  const [generatedVideos, setGeneratedVideos] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string>("");
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);

  const handleGenerate = async () => {
    if (!videoFile) {
      setError("请上传视频文件");
      return;
    }

    if (subjectImage.length === 0) {
      setError("请上传替换的主体图片");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setError("登录后才能进行视频主体替换");
      setErrorDetails(null);
      promptLogin();
      return;
    }

    setLoading(true);
    setError("");
    setErrorDetails(null);
    setGeneratedVideo("");
    setGeneratedVideos([]);
    setTaskId("");

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("subjectImage", subjectImage[0]);

      const response = await fetch("/api/generate/runninghub", {
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
        throw new Error(errorData.error || errorData.statusText || "Video processing failed");
      }

      const data = await response.json();

      if (data.taskId && data.pollingRequired) {
        setTaskId(data.taskId);
        await pollTaskStatus(data.taskId);
      } else {
        setError("API 返回成功但没有任务ID");
        setErrorDetails(data);
        setLoading(false);
      }
    } catch (err: any) {
      if (!errorDetails) {
        setErrorDetails({ message: err.message, stack: err.stack });
      }
      setError(err.message || "处理失败，请重试");
      setLoading(false);
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    const maxAttempts = 240;
    let attempts = 0;

    const poll = async () => {
      try {
        if (!isAuthenticated || !accessToken) {
          setError("登录状态已失效，请重新登录");
          promptLogin();
          setLoading(false);
          return;
        }

        const response = await fetch("/api/generate/runninghub/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ taskId }),
        });

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.completed) {
          if (data.status === "SUCCESS") {
            if (data.videoUrls && data.videoUrls.length > 0) {
              setGeneratedVideos(data.videoUrls);
              setGeneratedVideo(data.videoUrls[0]);
            } else if (data.videoUrl) {
              setGeneratedVideo(data.videoUrl);
              setGeneratedVideos([data.videoUrl]);
            } else {
              setError("未找到生成的视频");
              setErrorDetails(data);
            }
          } else {
            setError(data.error || "任务处理失败");
            setErrorDetails(data);
          }
          setLoading(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setError("任务处理超时，请重试");
          setLoading(false);
        }
      } catch (err: any) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setError("轮询失败，请重试");
          setLoading(false);
        }
      }
    };

    poll();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Replace className="w-8 h-8 text-primary-600" />
          视频主体替换
        </h1>
        <p className="text-gray-600 mt-2">上传视频和主体图片，AI替换视频中的主体</p>
        {!authLoading && !isAuthenticated && (
          <div className="mt-4 rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
            登录后才能提交任务，点击“开始替换”按钮时会弹出登录提示。
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">控制面板</h2>

            <div className="space-y-6">
              <VideoUpload onVideoChange={setVideoFile} label="上传原始视频" />

              <ImageUpload
                maxImages={1}
                onImagesChange={setSubjectImage}
                label="上传替换主体图片"
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <strong>提示：</strong>上传一个视频和一张主体图片，AI 将会自动替换视频中的主体角色。处理时间通常需要 5-20 分钟。
                <p className="text-xs text-blue-600 mt-2">
                  <strong>文件限制：</strong>视频建议 5MB 以下，图片建议 2MB 以下，总大小不超过 10MB。
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  <strong>注意：</strong>如果遇到"载荷过大"错误，请使用更小的文件。
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || authLoading}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>处理中...</>
                ) : (
                  <>
                    <Replace className="w-5 h-5" />
                    开始替换
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">处理结果</h2>

            {(loading || authLoading) && (
              <div className="space-y-4">
                <LoadingSpinner text={taskId ? `正在处理视频... (任务ID: ${taskId})` : "正在创建任务..."} />
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 text-center">
                  ⏳ 正在处理视频主体替换<br />
                  {taskId ? "任务已创建，正在轮询状态..." : "正在上传文件并创建任务..."}<br />
                  预计需要 5-20 分钟，请耐心等待
                  {taskId && (
                    <p className="text-xs text-yellow-600 mt-2">任务ID: {taskId}</p>
                  )}
                </div>
              </div>
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
                    <h3 className="text-lg font-semibold text-red-900 mb-2">处理失败</h3>
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

            {!loading && !authLoading && !error && !generatedVideo && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Replace className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>上传视频和主体图片，点击开始按钮进行处理</p>
                  <p className="text-sm mt-2 text-primary-600">✨ 已集成 RunningHub ComfyUI API</p>
                </div>
              </div>
            )}

            {!loading && !authLoading && generatedVideo && (
              <div className="space-y-4">
                {taskId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <strong>任务ID：</strong>{taskId}
                    </p>
                    <p className="text-xs text-green-600 mt-1">✓ 处理完成</p>
                  </div>
                )}

                {generatedVideos.length > 1 ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        生成了 {generatedVideos.length} 个视频
                      </h3>
                    </div>
                    {generatedVideos.map((videoUrl, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-700">视频 {index + 1}</h4>
                          <a
                            href={videoUrl}
                            download={`video-subject-replace-${index + 1}.mp4`}
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                          >
                            <Download className="w-3 h-3" />
                            下载
                          </a>
                        </div>
                        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                          <video src={videoUrl} controls className="w-full h-auto" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <video src={generatedVideo} controls className="w-full h-auto" />
                  </div>
                )}

                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = generatedVideo;
                    link.download = `video-subject-replaced-${taskId || Date.now()}.mp4`;
                    link.click();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md"
                >
                  <Download className="w-5 h-5" />
                  下载处理后的视频
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
