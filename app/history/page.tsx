"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/LoadingSpinner";
import { History, Image as ImageIcon, Video, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { downloadImage, downloadVideo } from "@/lib/downloadUtils";

interface GenerationTask {
  id: string;
  task_id: string;
  task_type: string;
  username: string | null;
  email: string | null;
  task_time: string;
  prompt: string | null;
  input_image_url: string | null;
  input_video_url: string | null;
  output_image_url: string | null;
  output_video_url: string | null;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  text_to_image_gemini: "文生图 (Nano Banana)",
  text_to_image_flux: "文生图 (Kontext Pro)",
  image_to_image_gemini: "图生图 (Nano Banana)",
  image_to_image_flux: "图生图 (Kontext Pro)",
  outfit_change: "AI换装",
  background_replace: "背景替换",
  mimic: "Mimic角色替换",
  photobooth: "PhotoBooth写真组图",
  video_generation: "视频生成",
  video_subject_replace: "视频主体替换",
  image_transition_edit: "改图转场 - 图片编辑",
  image_transition_video: "改图转场 - 视频生成",
  photo_to_live: "Photo to Live",
};

// Parse JSON format image URLs (for Mimic and PhotoBooth tasks)
const parseImageUrls = (url: string | null): { type: 'single' | 'mimic' | 'photobooth'; urls: any } | null => {
  if (!url) return null;
  
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(url);
    // Check if it's a Mimic format
    if (typeof parsed === 'object' && (parsed.reference || parsed.character || parsed.background || parsed.final)) {
      return { type: 'mimic', urls: parsed };
    }
    // Check if it's a PhotoBooth format
    if (typeof parsed === 'object' && (parsed.input || parsed.poses)) {
      return { type: 'photobooth', urls: parsed };
    }
  } catch {
    // Not JSON, treat as single URL
  }
  
  // Single URL
  return { type: 'single', urls: url };
};

export default function HistoryPage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchHistory(1);
    }
  }, [isAuthenticated, accessToken, filterType]);

  const fetchHistory = async (page: number) => {
    if (!accessToken) return;

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });

      if (filterType !== "all") {
        params.append("taskType", filterType);
      }

      const response = await fetch(`/api/history?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取历史记录失败");
      }

      const data = await response.json();
      setTasks(data.data);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || "获取历史记录失败");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchHistory(newPage);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownloadImage = async (url: string, taskId: string) => {
    await downloadImage(url, `image-${taskId}.png`);
  };

  const handleDownloadVideo = async (url: string, taskId: string) => {
    await downloadVideo(url, `video-${taskId}.mp4`);
  };

  const handleDownloadAllImages = async (urls: string[], taskId: string, taskType: string) => {
    // Download all images with delay to avoid browser blocking
    urls.forEach((url, index) => {
      setTimeout(() => {
        const filename = taskType === 'photobooth' 
          ? `photobooth-pose-${index + 1}-${taskId}.png`
          : `image-${index + 1}-${taskId}.png`;
        downloadImage(url, filename);
      }, index * 200);
    });
  };

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <LoadingSpinner text="加载中..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <History className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">请先登录</h2>
          <p className="text-gray-600 mb-6">登录后查看你的生成历史记录</p>
          <button
            onClick={promptLogin}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            立即登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <History className="w-8 h-8 text-primary-600" />
          生成历史
        </h1>
        <p className="text-gray-600 mt-2">查看你的所有 AI 生成记录</p>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          筛选类型
        </label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">全部</option>
          {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner text="加载历史记录..." />}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <History className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
          <p className="text-gray-500">暂无生成记录</p>
        </div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Preview */}
                <div className={(() => {
                  const parsedUrls = parseImageUrls(task.output_image_url);
                  // PhotoBooth tasks: use auto height to accommodate all images
                  if (parsedUrls?.type === 'photobooth' && Array.isArray(parsedUrls.urls.poses) && parsedUrls.urls.poses.length > 1) {
                    return "bg-gray-100 relative";
                  }
                  // Other tasks: keep aspect-square
                  return "aspect-square bg-gray-100 relative";
                })()}>
                  {(() => {
                    const parsedUrls = parseImageUrls(task.output_image_url);
                    
                    // Handle PhotoBooth with multiple images - show all images
                    if (parsedUrls?.type === 'photobooth' && Array.isArray(parsedUrls.urls.poses) && parsedUrls.urls.poses.length > 0) {
                      if (parsedUrls.urls.poses.length === 1) {
                        // Single image: use square aspect
                        return (
                          <div className="w-full h-full aspect-square relative">
                            <img
                              src={parsedUrls.urls.poses[0]}
                              alt="Generated"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><div class="text-center"><svg class="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><p class="text-xs">图片加载失败</p></div></div>';
                                }
                              }}
                            />
                          </div>
                        );
                      }
                      // Multiple images: show grid (2 cols for 2-3 images, 3 cols for 4-9 images)
                      const imageCount = parsedUrls.urls.poses.length;
                      const gridColsClass = imageCount <= 3 ? 'grid-cols-2' : 'grid-cols-3';
                      return (
                        <div className={`grid ${gridColsClass} gap-1 p-1`}>
                          {parsedUrls.urls.poses.map((url: string, index: number) => (
                            <div key={index} className="aspect-square relative bg-gray-200 rounded overflow-hidden">
                              <img
                                src={url}
                                alt={`Pose ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-400"><svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                                  }
                                }}
                              />
                              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    
                    // Handle Mimic with multiple images
                    if (parsedUrls?.type === 'mimic') {
                      const firstImage = parsedUrls.urls.final?.[0] || parsedUrls.urls.background;
                      if (firstImage) {
                        const imageCount = (parsedUrls.urls.final?.length || 0) + (parsedUrls.urls.background ? 1 : 0);
                        return (
                          <div className="w-full h-full relative">
                            <img
                              src={firstImage}
                              alt="Generated"
                              className="w-full h-full object-cover"
                            />
                            {imageCount > 1 && (
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                {imageCount} 张
                              </div>
                            )}
                          </div>
                        );
                      }
                    }
                    
                    // Handle single image
                    if (parsedUrls?.type === 'single' && parsedUrls.urls) {
                      return (
                        <img
                          src={parsedUrls.urls}
                          alt="Generated"
                          className="w-full h-full object-cover"
                        />
                      );
                    }
                    
                    // Handle video
                    if (task.output_video_url && !task.output_image_url) {
                      return (
                        <video
                          src={task.output_video_url}
                          className="w-full h-full object-cover"
                          controls
                        />
                      );
                    }
                    
                    // Empty state
                    return (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-gray-400">
                          {task.task_type.includes("video") ? (
                            <Video className="w-12 h-12" />
                          ) : (
                            <ImageIcon className="w-12 h-12" />
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
                      {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(task.task_time)}
                    </span>
                  </div>

                  {task.prompt && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {(() => {
                        // Try to parse PhotoBooth prompt (JSON format)
                        if (task.task_type === 'photobooth') {
                          try {
                            const poseDescriptions = JSON.parse(task.prompt);
                            if (Array.isArray(poseDescriptions) && poseDescriptions.length > 0) {
                              // Display first pose description as preview
                              const firstPose = poseDescriptions[0];
                              const preview = `Pose 1: ${firstPose.pose || ''} | Camera: ${firstPose.cameraPosition || ''} | Composition: ${firstPose.composition || ''}`;
                              return preview.length > 150 ? preview.substring(0, 150) + '...' : preview;
                            }
                          } catch {
                            // If parsing fails, display as is
                          }
                        }
                        // For other task types or if parsing fails, display prompt directly
                        return task.prompt.length > 150 ? task.prompt.substring(0, 150) + '...' : task.prompt;
                      })()}
                    </p>
                  )}

                  {/* Download buttons */}
                  <div className="flex gap-2">
                    {(() => {
                      const parsedUrls = parseImageUrls(task.output_image_url);
                      const imageUrls: string[] = [];
                      
                      // Collect all image URLs
                      if (parsedUrls?.type === 'photobooth' && Array.isArray(parsedUrls.urls.poses)) {
                        imageUrls.push(...parsedUrls.urls.poses);
                      } else if (parsedUrls?.type === 'mimic') {
                        if (parsedUrls.urls.background) imageUrls.push(parsedUrls.urls.background);
                        if (Array.isArray(parsedUrls.urls.final)) {
                          imageUrls.push(...parsedUrls.urls.final);
                        }
                      } else if (parsedUrls?.type === 'single' && parsedUrls.urls) {
                        imageUrls.push(parsedUrls.urls);
                      }
                      
                      if (imageUrls.length > 0) {
                        if (imageUrls.length > 1) {
                          // Multiple images - show download all button
                          return (
                            <button
                              onClick={() => handleDownloadAllImages(imageUrls, task.task_id, task.task_type)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              下载全部 ({imageUrls.length}张)
                            </button>
                          );
                        } else {
                          // Single image
                          return (
                            <button
                              onClick={() => handleDownloadImage(imageUrls[0], task.task_id)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              图片
                            </button>
                          );
                        }
                      }
                      return null;
                    })()}
                    {task.output_video_url && (
                      <button
                        onClick={() => handleDownloadVideo(task.output_video_url!, task.task_id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        视频
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-600">
                共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

