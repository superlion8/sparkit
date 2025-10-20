"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { Video, Play, Download, Sparkles, Maximize2, X } from "lucide-react";

interface VideoTemplate {
  id: string;
  video_type: string;
  generate_type: string;
  template_level?: number | string;
  title: string;
  title_en_name: string;
  image_url: string;
  video_url: string;
  video_medium_url: string;
  video_low_url: string;
  video_width: number;
  video_height: number;
  autoplay: boolean;
  free_trial: boolean;
  like_count: number;
  base_like_count: number;
  thirdparty: string;
  user_template_info: {
    is_like: boolean;
  };
}

interface TemplateResponse {
  code: number;
  msg: string;
  data: {
    total: number;
    next_index: number;
    next_page_info: string;
    entries: VideoTemplate[];
  };
}

const TAG_CATEGORIES = [
  { id: "tag_category_animal", name: "动物", icon: "🐾" },
  { id: "tag_category_business", name: "商务", icon: "💼" },
  { id: "tag_category_anime", name: "动漫", icon: "🎌" },
  { id: "tag_category_beauty", name: "美妆", icon: "💄" },
  { id: "tag_category_horror", name: "恐怖", icon: "👻" },
  { id: "tag_category_comedy", name: "喜剧", icon: "😂" },
  { id: "tag_category_dance", name: "舞蹈", icon: "💃" },
  { id: "tag_category_emotions", name: "情感", icon: "💕" },
];

export default function VideoGenerationPage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  const [uploadedImage, setUploadedImage] = useState<File[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);
  const [activeTag, setActiveTag] = useState(TAG_CATEGORIES[0].id);
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [error, setError] = useState("");
  const [userToken, setUserToken] = useState<string>("");
  const [previewTemplate, setPreviewTemplate] = useState<VideoTemplate | null>(null);

  useEffect(() => {
    const getUserToken = async () => {
      if (!isAuthenticated || !accessToken) {
        setUserToken("");
        return;
      }

      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUserToken(data.token);
        } else {
          const errorText = await response.text();
          console.error("Failed to get user token:", response.status, errorText);
          setError(`认证失败: HTTP ${response.status}`);
        }
      } catch (err) {
        console.error("Error getting user token:", err);
        setError(`认证失败: ${err}`);
      }
    };

    getUserToken();
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !userToken) {
      return;
    }
    loadAllTemplates(activeTag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTag, isAuthenticated, accessToken, userToken]);

  async function loadAllTemplates(categoryId: string) {
    if (!isAuthenticated || !accessToken || !userToken) {
      return;
    }

    setLoadingTemplates(true);
    try {
      const aggregated: VideoTemplate[] = [];
      let index = 0;
      let pageInfo = "";
      const pageSize = 60;

      while (true) {
        const response = await fetch("/api/templates/list", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-Aimovely-Token": userToken,
          },
          body: JSON.stringify({
            category_id: categoryId,
            index,
            size: pageSize,
            page_info: pageInfo,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          setError(`获取模板失败: HTTP ${response.status} ${errorText}`);
          break;
        }

        const data: TemplateResponse = await response.json();
        if (data.code !== 0) {
          setError(`获取模板失败: ${data.msg}`);
          break;
        }

        const entries = data.data.entries || [];
        const filtered = entries.filter((template) => {
          const level = Number(template.template_level ?? 0);
          return template.video_type === "image2video" && [1, 2, 3].includes(level);
        });
        aggregated.push(...filtered);

        if (!data.data.next_page_info || entries.length === 0) {
          break;
        }

        pageInfo = data.data.next_page_info;
        index = data.data.next_index;
      }

      setTemplates(aggregated);
    } catch (err) {
      setError(`获取模板失败: ${err}`);
    } finally {
      setLoadingTemplates(false);
    }
  }

  const handleGenerate = async () => {
    if (!uploadedImage.length) {
      setError("请上传图像文件");
      return;
    }

    if (!selectedTemplate) {
      setError("请选择一个视频模板");
      return;
    }

    if (!isAuthenticated || !accessToken) {
      setError("登录后才能生成视频");
      promptLogin();
      return;
    }

    if (!userToken) {
      setError("Aimovely 认证失败，请刷新页面后重试");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedVideo("");
    setTaskId("");

    try {
      const imageFormData = new FormData();
      imageFormData.append("file", uploadedImage[0]);

      const uploadResponse = await fetch("/api/resource/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Aimovely-Token": userToken,
        },
        body: imageFormData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "图像上传失败");
      }

      const uploadData = await uploadResponse.json();
      const resourceId = uploadData.resource_id;

      const generateResponse = await fetch("/api/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Aimovely-Token": userToken,
        },
        body: JSON.stringify({
          generate_type: selectedTemplate.generate_type,
          origin_resource_id: resourceId,
        }),
      });

      if (!generateResponse.ok) {
        throw new Error("创建生成任务失败");
      }

      const generateData = await generateResponse.json();
      if (generateData.code === 0) {
        const newTaskId = generateData.data.task.id;
        setTaskId(newTaskId);
        await pollTaskStatus(newTaskId);
      } else {
        throw new Error(generateData.msg || "创建任务失败");
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const pollTaskStatus = async (taskId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        if (!isAuthenticated || !accessToken || !userToken) {
          setError("登录状态已失效，请重新登录");
          promptLogin();
          setLoading(false);
          return;
        }

        const response = await fetch("/api/video/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "X-Aimovely-Token": userToken,
          },
          body: JSON.stringify({ task_id: taskId }),
        });

        if (!response.ok) {
          throw new Error(`查询失败: ${response.status}`);
        }

        const data = await response.json();

        if (data.code === 0) {
          const taskStatus = data.data.task.status;

          if (taskStatus === 2) {
            let videoUrl = null;
            if (data.data.results && Array.isArray(data.data.results) && data.data.results.length > 0) {
              videoUrl = data.data.results[0].video_url;
            } else if (data.data.video_url) {
              videoUrl = data.data.video_url;
            }

            if (videoUrl) {
              setGeneratedVideo(videoUrl);
            } else {
              setError("生成完成但未找到视频URL");
            }
            setLoading(false);
            return;
          }

          if (taskStatus === 3) {
            const errorMsg = data.data.task.msg || "视频生成失败";
            setError(errorMsg);
            setLoading(false);
            return;
          }
        } else {
          setError(`查询任务失败: ${data.msg}`);
          setLoading(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setError("生成超时，请重试");
          setLoading(false);
        }
      } catch (err: any) {
        setError(`轮询失败: ${err.message}`);
        setLoading(false);
      }
    };

    poll();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">视频生成</h1>
          <p className="text-gray-600">上传图像，选择模板，生成精彩视频</p>
          {!authLoading && !isAuthenticated && (
            <div className="mt-4 inline-block rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-700">
              登录后即可开始生成视频，点击“生成视频”按钮会提示登录。
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Video className="w-5 h-5 text-primary-600" />
              上传图像
            </h2>

            <ImageUpload
              onImagesChange={setUploadedImage}
              maxImages={1}
              label="上传图像"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">生成结果</h2>
                <p className="text-sm text-gray-500 mt-1">上传图像并选择模板，点击生成按钮开始创作</p>
              </div>
            </div>

            {loading && (
              <div className="space-y-4">
                <LoadingSpinner text={taskId ? `正在生成视频... (任务ID: ${taskId})` : "正在创建任务..."} />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 text-center">
                  ✨ 正在生成精彩视频<br />
                  {taskId ? "任务已创建，正在生成中..." : "正在上传图像并创建任务..."}<br />
                  预计需要 1-3 分钟，请耐心等待
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
                    <h3 className="text-lg font-semibold text-red-900 mb-2">生成失败</h3>
                    <p className="text-red-700 text-sm break-words">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {!loading && !error && !generatedVideo && (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>上传图像并选择模板，点击生成按钮开始创作</p>
                  <p className="text-sm mt-2 text-primary-600">✨ 支持多种风格模板</p>
                </div>
              </div>
            )}

            {!loading && generatedVideo && (
              <div className="space-y-4">
                {taskId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    <strong>任务ID：</strong>{taskId}
                    <p className="text-xs text-green-600 mt-1">✓ 生成完成</p>
                  </div>
                )}

                <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                  <video src={generatedVideo} controls className="w-full h-auto" />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = generatedVideo;
                      link.download = `generated-video-${Date.now()}.mp4`;
                      link.click();
                    }}
                    className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    下载视频
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedVideo("");
                      setTaskId("");
                      setUploadedImage([]);
                      setSelectedTemplate(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    重新生成
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                选择模板
              </h2>
              <p className="text-sm text-gray-500 mt-1">浏览模板并点击选择，支持点击预览查看大图效果</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TAG_CATEGORIES.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setActiveTag(tag.id)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeTag === tag.id
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tag.icon} {tag.name}
                </button>
              ))}
            </div>
          </div>

          {loadingTemplates ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner text="加载模板中..." />
            </div>
          ) : templates.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`group rounded-2xl border transition-all cursor-pointer ${
                    selectedTemplate?.id === template.id
                      ? "border-primary-500 shadow-lg shadow-primary-200/50"
                      : "border-gray-200 hover:border-primary-400 hover:shadow-md"
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="relative aspect-[9/16] overflow-hidden rounded-t-2xl bg-black">
                    <video
                      src={template.video_medium_url || template.video_low_url}
                      className="h-full w-full object-cover"
                      preload="metadata"
                      muted
                      loop
                      playsInline
                      autoPlay
                      onMouseEnter={(event) => {
                        event.currentTarget.play().catch(() => {
                          /* ignore autoplay errors */
                        });
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.pause();
                        event.currentTarget.currentTime = 0;
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="absolute bottom-3 left-3 h-5 w-5 text-white" />
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPreviewTemplate(template);
                      }}
                      className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-gray-700 shadow transition hover:bg-white"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 line-clamp-1">
                          {template.title_en_name || template.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {template.thirdparty} • {template.video_width}×{template.video_height}
                        </p>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <span className="rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700">
                          已选择
                        </span>
                      )}
                    </div>
                    {template.free_trial && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        免费试用
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              {isAuthenticated ? "该分类下暂无模板" : "登录后即可加载模板列表"}
            </div>
          )}

          <div className="mt-10 flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={loading || authLoading || templates.length === 0}
              className="bg-primary-600 text-white py-4 px-8 rounded-xl font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-3 text-lg"
            >
              {loading ? (
                <>生成中...</>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  生成视频
                </>
              )}
            </button>
          </div>
        </section>
      </div>

      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative w-full max-w-3xl">
            <button
              type="button"
              onClick={() => setPreviewTemplate(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="overflow-hidden rounded-2xl bg-black">
              <video
                src={previewTemplate.video_url || previewTemplate.video_medium_url || previewTemplate.video_low_url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
            <div className="mt-4 text-white">
              <h3 className="text-lg font-semibold">
                {previewTemplate.title_en_name || previewTemplate.title}
              </h3>
              <p className="text-sm text-white/70 mt-1">
                {previewTemplate.thirdparty} • {previewTemplate.video_width}×{previewTemplate.video_height}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
