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
  video_generation: "视频生成",
  video_subject_replace: "视频主体替换",
  image_transition_edit: "改图转场 - 图片编辑",
  image_transition_video: "改图转场 - 视频生成",
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
                <div className="aspect-square bg-gray-100 relative">
                  {task.output_image_url && (
                    <img
                      src={task.output_image_url}
                      alt="Generated"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {task.output_video_url && !task.output_image_url && (
                    <video
                      src={task.output_video_url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                  {!task.output_image_url && !task.output_video_url && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-gray-400">
                        {task.task_type.includes("video") ? (
                          <Video className="w-12 h-12" />
                        ) : (
                          <ImageIcon className="w-12 h-12" />
                        )}
                      </div>
                    </div>
                  )}
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
                      {task.prompt}
                    </p>
                  )}

                  {/* Download buttons */}
                  <div className="flex gap-2">
                    {task.output_image_url && (
                      <button
                        onClick={() => handleDownloadImage(task.output_image_url!, task.task_id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        图片
                      </button>
                    )}
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

