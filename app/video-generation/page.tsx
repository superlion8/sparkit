"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { Video, Play, Download, Sparkles } from "lucide-react";

interface VideoTemplate {
  id: string;
  video_type: string;
  generate_type: string;
  template_level?: number;
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
      const pageSize = 50;

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">视频生成</h1>
          <p className="text-gray-600">上传图像，选择模板，生成精彩视频</p>
          {!authLoading && !isAuthenticated && (
            <div className="mt-4 inline-block rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-700">
              登录后即可开始生成视频，点击“生成视频”按钮会提示登录。
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                选择模板
              </h2>

              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {TAG_CATEGORIES.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => setActiveTag(tag.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTag === tag.id
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {tag.icon} {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              {loadingTemplates ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner text="加载模板中..." />
                </div>
              ) : templates.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? "border-primary-500 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <video
                            src={template.video_low_url}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {template.title_en_name || template.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {template.thirdparty} • {template.video_width}×{template.video_height}
                          </p>
                          {template.free_trial && (
                            <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              免费试用
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {isAuthenticated ? "该分类下暂无模板" : "登录后即可加载模板列表"}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[400px]">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">生成结果</h2>

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
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={isAuthenticated ? handleGenerate : () => {
              setError("登录后才能生成视频");
              promptLogin();
            }}
            disabled={loading || authLoading}
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
      </div>
    </div>
  );
}
