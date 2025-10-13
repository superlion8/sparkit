"use client";

import { useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import VideoUpload from "@/components/VideoUpload";
import { Replace, Download } from "lucide-react";

export default function VideoSubjectReplacePage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subjectImage, setSubjectImage] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [error, setError] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);

  const handleGenerate = async () => {
    console.log("=== 开始视频主体替换 ===");
    
    if (!videoFile) {
      setError("请上传视频文件");
      return;
    }

    if (subjectImage.length === 0) {
      setError("请上传替换的主体图片");
      return;
    }

    setLoading(true);
    setError("");
    setErrorDetails(null);
    setGeneratedVideo("");
    setTaskId("");

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("subjectImage", subjectImage[0]);

      console.log("发送请求到 RunningHub API...");
      const response = await fetch("/api/generate/runninghub", {
        method: "POST",
        body: formData,
      });

      console.log("收到响应:", response.status);

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
              contentType: contentType 
            };
          }
        } catch (parseError) {
          errorData = { 
            status: response.status, 
            statusText: response.statusText,
            error: "无法解析错误响应" 
          };
        }
        
        console.error("❌ API 错误:", errorData);
        setErrorDetails(errorData);
        throw new Error(errorData.error || errorData.statusText || "Video processing failed");
      }

      const data = await response.json();
      console.log("✅ 响应数据:", data);
      
      if (data.videoUrl) {
        setGeneratedVideo(data.videoUrl);
        setTaskId(data.taskId || "");
        console.log("✅ 视频处理完成");
      } else {
        setError("API 返回成功但没有视频数据");
        setErrorDetails(data);
      }
    } catch (err: any) {
      console.error("❌ 捕获到错误:", err);
      if (!errorDetails) {
        setErrorDetails({ message: err.message, stack: err.stack });
      }
      setError(err.message || "处理失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Replace className="w-8 h-8 text-primary-600" />
          视频主体替换
        </h1>
        <p className="text-gray-600 mt-2">上传视频和主体图片，AI替换视频中的主体</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">控制面板</h2>

            <div className="space-y-6">
              {/* Video Upload */}
              <VideoUpload
                onVideoChange={setVideoFile}
                label="上传原始视频"
              />

              {/* Subject Image Upload */}
              <ImageUpload
                maxImages={1}
                onImagesChange={setSubjectImage}
                label="上传替换主体图片"
              />

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>提示：</strong>上传一个视频和一张主体图片，AI 将会自动替换视频中的主体角色。
                  处理时间取决于视频长度和复杂度，通常需要 5-20 分钟。
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !videoFile || subjectImage.length === 0}
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

        {/* Results Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">处理结果</h2>

            {loading && (
              <div className="space-y-4">
                <LoadingSpinner text="AI正在处理视频，这可能需要 5-20 分钟..." />
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 text-center">
                    ⏳ 正在调用 RunningHub ComfyUI 工作流<br />
                    由于算力要求较高，处理时间可能较长<br />
                    请耐心等待，不要关闭页面
                  </p>
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
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

            {!loading && !error && !generatedVideo && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Replace className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>上传视频和主体图片，点击开始按钮进行处理</p>
                  <p className="text-sm mt-2 text-primary-600">✨ 已集成 RunningHub ComfyUI API</p>
                </div>
              </div>
            )}

            {!loading && generatedVideo && (
              <div className="space-y-4">
                {taskId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      <strong>任务ID：</strong>{taskId}
                    </p>
                    <p className="text-xs text-green-600 mt-1">✓ 处理完成</p>
                  </div>
                )}
                
                <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                  <video
                    src={generatedVideo}
                    controls
                    className="w-full h-auto"
                  />
                </div>
                
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

