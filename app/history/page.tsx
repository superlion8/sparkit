"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/LoadingSpinner";
import { History, Image as ImageIcon, Video, ChevronLeft, ChevronRight, Download, Copy, Check, X, ZoomIn, Trash2, AlertCircle, Heart, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { downloadImage, downloadVideo } from "@/lib/downloadUtils";
import FavoriteModal from "@/components/FavoriteModal";

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
  background_image_url: string | null;
  status?: string; // pending, processing, completed, failed
  started_at?: string;
  completed_at?: string;
  error_message?: string;
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
  snapshot: "Snapshot随手拍",
  pose_control: "Pose Control",
  video_generation: "视频生成",
  video_subject_replace: "视频主体替换",
  image_transition_edit: "改图转场 - 图片编辑",
  image_transition_video: "改图转场 - 视频生成",
  photo_to_live: "Photo to Live",
};

// 任务类型到编辑页面的映射
const TASK_TYPE_TO_EDIT_PAGE: Record<string, string> = {
  text_to_image_gemini: "/text-to-image",
  text_to_image_flux: "/text-to-image",
  image_to_image_gemini: "/image-to-image",
  image_to_image_flux: "/image-to-image",
  outfit_change: "/outfit-change",
  background_replace: "/background-replace",
  mimic: "/mimic",
  photobooth: "/photobooth",
  snapshot: "/snapshot",
  pose_control: "/pose-control",
  video_generation: "/video-generation",
  video_subject_replace: "/video-subject-replace",
  image_transition_edit: "/image-transition",
  image_transition_video: "/image-transition",
  photo_to_live: "/photo-to-live",
};

// Parse JSON format image URLs (for Mimic, PhotoBooth, Snapshot, and Pose Control tasks)
const parseImageUrls = (url: string | null): { type: 'single' | 'mimic' | 'photobooth' | 'snapshot' | 'pose_control'; urls: any } | null => {
  if (!url) return null;
  
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(url);
    
    // Check if it's an array (Pose Control format: ["url1", "url2", ...])
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      return { type: 'pose_control', urls: parsed };
    }
    
    // Check if it's a Mimic format
    if (typeof parsed === 'object' && (parsed.reference || parsed.character || parsed.background || parsed.final)) {
      return { type: 'mimic', urls: parsed };
    }
    // Check if it's a PhotoBooth format
    if (typeof parsed === 'object' && (parsed.input || parsed.poses)) {
      return { type: 'photobooth', urls: parsed };
    }
    // Check if it's a Snapshot format
    if (typeof parsed === 'object' && (parsed.input || parsed.snapshots)) {
      return { type: 'snapshot', urls: parsed };
    }
  } catch {
    // Not JSON, treat as single URL
  }
  
  // Single URL
  return { type: 'single', urls: url };
};

export default function HistoryPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<"history" | "favorites">("history");
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [favorites, setFavorites] = useState<GenerationTask[]>([]);
  const [pendingTasks, setPendingTasks] = useState<GenerationTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [filterType, setFilterType] = useState("all");
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [favoriteModalOpen, setFavoriteModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      if (activeTab === "history") {
      fetchHistory(1);
        fetchPendingTasks();
      } else {
        fetchFavorites();
      }
    }
  }, [isAuthenticated, accessToken, filterType, activeTab]);

  // 轮询进行中的任务
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // 每 5 秒轮询一次进行中的任务
    const intervalId = setInterval(() => {
      fetchPendingTasks();
      // 如果有进行中的任务，也刷新历史列表（检查是否完成）
      // 使用静默模式（silent=true），不触发整个页面的 loading 状态
      if (pendingTasks.length > 0) {
        fetchHistory(pagination.page, true); // ← 静默刷新
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, accessToken, pendingTasks.length, pagination.page]);

  // 监听ESC键关闭预览
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewImage) {
        setPreviewImage(null);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [previewImage]);

  const fetchHistory = async (page: number, silent: boolean = false) => {
    if (!accessToken) return;

    // 静默刷新模式：不触发 loading 状态，避免整个页面刷新
    if (!silent) {
      setLoading(true);
      setError("");
    }

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
      if (!silent) {
        setError(err.message || "获取历史记录失败");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const fetchPendingTasks = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(`/api/history/pending`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取进行中任务失败");
      }

      const data = await response.json();
      setPendingTasks(data.pendingTasks || []);
    } catch (err: any) {
      console.error("Failed to fetch pending tasks:", err);
    }
  };

  const fetchFavorites = async () => {
    if (!accessToken) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/favorites/global`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("获取收藏列表失败");
      }

      const data = await response.json();
      setFavorites(data.favorites || []);
    } catch (err: any) {
      setError(err.message || "获取收藏列表失败");
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
        let filename: string;
        if (taskType === 'photobooth') {
          filename = `photobooth-pose-${index + 1}-${taskId}.png`;
        } else if (taskType === 'mimic') {
          filename = `mimic-${index + 1}-${taskId}.png`;
        } else if (taskType === 'pose_control') {
          filename = `pose-control-${index + 1}-${taskId}.png`;
        } else {
          filename = `image-${index + 1}-${taskId}.png`;
        }
        downloadImage(url, filename);
      }, index * 200);
    });
  };

  const handleCopyPrompt = async (taskId: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPromptId(taskId);
      setTimeout(() => setCopiedPromptId(null), 2000); // 2秒后重置
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!accessToken) return;
    
    if (!confirm('确定要删除这条记录吗？此操作无法撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/history?taskId=${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      // 刷新当前页面
      fetchHistory(pagination.page);
    } catch (err: any) {
      console.error('删除失败:', err);
      alert(err.message || '删除失败，请重试');
    }
  };

  // 解析输入图片 URL（可能是单个 URL 或 JSON 格式的多图）
  const parseInputImageUrls = (inputImageUrl: string | null): string[] => {
    if (!inputImageUrl) return [];
    
    // 尝试解析 JSON
    try {
      const parsed = JSON.parse(inputImageUrl);
      
      // 如果是数组，直接返回
      if (Array.isArray(parsed)) {
        return parsed.filter((url: any) => typeof url === 'string' && url.startsWith('http'));
      }
      
      // 如果是对象（如 mimic 格式），提取所有图片 URL
      if (typeof parsed === 'object') {
        const urls: string[] = [];
        
        // reference 图
        if (parsed.reference && typeof parsed.reference === 'string') {
          urls.push(parsed.reference);
        }
        
        // character 图（可能是数组或单个）
        if (parsed.character) {
          if (Array.isArray(parsed.character)) {
            urls.push(...parsed.character.filter((url: any) => typeof url === 'string'));
          } else if (typeof parsed.character === 'string') {
            urls.push(parsed.character);
          }
        }
        
        // input 图（通用）
        if (parsed.input) {
          if (Array.isArray(parsed.input)) {
            urls.push(...parsed.input.filter((url: any) => typeof url === 'string'));
          } else if (typeof parsed.input === 'string') {
            urls.push(parsed.input);
          }
        }
        
        return urls;
      }
    } catch {
      // 不是 JSON，当作单个 URL 处理
    }
    
    // 单个 URL
    if (inputImageUrl.startsWith('http')) {
      return [inputImageUrl];
    }
    
    return [];
  };

  // 去编辑：跳转到对应页面并预填充数据
  const handleGoToEdit = (task: GenerationTask) => {
    const editPage = TASK_TYPE_TO_EDIT_PAGE[task.task_type];
    if (!editPage) {
      alert('该任务类型暂不支持编辑');
      return;
    }

    // 解析输入图片 URL（支持多图）
    const inputImageUrls = parseInputImageUrls(task.input_image_url);

    // 准备要传递的数据
    const editData = {
      prompt: task.prompt || '',
      inputImageUrls: inputImageUrls, // 改为数组
      backgroundImageUrl: task.background_image_url || '',
      taskType: task.task_type,
      fromHistory: true,
    };

    // 存储到 localStorage
    localStorage.setItem('sparkitEditData', JSON.stringify(editData));

    // 跳转到编辑页面
    router.push(editPage);
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

      {/* Tab 切换 */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-4 px-2 font-medium transition-colors relative ${
              activeTab === "history"
                ? "text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            全部历史
            {activeTab === "history" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`pb-4 px-2 font-medium transition-colors relative flex items-center gap-2 ${
              activeTab === "favorites"
                ? "text-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Heart className="w-4 h-4" />
            我的收藏
            {activeTab === "favorites" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600"></div>
            )}
          </button>
        </div>
      </div>

      {/* Filter (只在历史 tab显示) */}
      {activeTab === "history" && (
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
      )}

      {loading && <LoadingSpinner text="加载历史记录..." />}

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && activeTab === "history" && tasks.length === 0 && pendingTasks.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <History className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
          <p className="text-gray-500">暂无生成记录</p>
        </div>
      )}

      {!loading && !error && activeTab === "favorites" && favorites.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
          <p className="text-gray-500">暂无收藏</p>
        </div>
      )}

      {!loading && !error && activeTab === "history" && (tasks.length > 0 || pendingTasks.length > 0) && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* 显示进行中的任务（Loading 卡片） */}
            {pendingTasks.map((task) => {
              const isFailed = task.status === 'failed';
              const isPending = task.status === 'pending';
              const isProcessing = task.status === 'processing';
              
              return (
              <div
                key={task.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${!isFailed && 'animate-pulse'}`}
                >
                  <div className={`aspect-square relative flex items-center justify-center ${
                    isFailed 
                      ? 'bg-gradient-to-br from-red-50 to-orange-50' 
                      : 'bg-gradient-to-br from-purple-100 to-blue-100'
                  }`}>
                    <div className="text-center px-4">
                      {isFailed ? (
                        <>
                          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                          <p className="text-red-700 font-medium">生成失败</p>
                          {task.error_message && (
                            <p className="text-red-600 text-sm mt-2 line-clamp-2">
                              {task.error_message}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
                          <p className="text-gray-700 font-medium">生成中...</p>
                          <p className="text-gray-500 text-sm mt-2">
                            {isPending ? '等待反推提示词...' : '处理中'}
                          </p>
                        </>
                      )}
                    </div>
                    
                    {/* 失败任务的删除按钮 */}
                    {isFailed && (
                              <button
                        onClick={() => handleDeleteTask(task.task_id)}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                              </button>
                    )}
                  </div>

                  <div className={`p-4 ${isFailed ? 'bg-red-50' : 'bg-gray-50'}`}>
                    {task.prompt && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {task.prompt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          isFailed ? 'bg-red-500' : 'bg-blue-500 animate-pulse'
                        }`}></span>
                        {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                      </span>
                      <span>
                        {new Date(task.started_at || task.task_time).toLocaleTimeString("zh-CN")}
                      </span>
                    </div>
                            </div>
                        </div>
                      );
            })}

            {/* 显示已完成的任务 - 简化为单图显示 */}
            {tasks.map((task) => {
              // 获取单张图片 URL
              let imageUrl: string | null = null;
              
              // 尝试直接使用 output_image_url（新数据格式）
              if (task.output_image_url && task.output_image_url.startsWith('http')) {
                imageUrl = task.output_image_url;
              } else {
                // 旧数据可能是 JSON 格式，解析并取第一张
                const parsedUrls = parseImageUrls(task.output_image_url);
                if (parsedUrls) {
                  if (parsedUrls.type === 'single') {
                    imageUrl = parsedUrls.urls;
                  } else if (parsedUrls.type === 'mimic') {
                    imageUrl = parsedUrls.urls.final?.[0] || parsedUrls.urls.background || null;
                  } else if (parsedUrls.type === 'photobooth') {
                    imageUrl = parsedUrls.urls.poses?.[0] || null;
                  } else if (parsedUrls.type === 'snapshot') {
                    imageUrl = parsedUrls.urls.snapshots?.[0] || null;
                  } else if (parsedUrls.type === 'pose_control') {
                    imageUrl = parsedUrls.urls[0] || null;
                  }
                }
              }
              
              // 如果没有有效图片 URL，跳过此任务
              if (!imageUrl) {
                return null;
              }
              
                      return (
                <div
                  key={task.id}
                  className="relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
                >
                  {/* Action Buttons (Top Right) */}
                  <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Favorite Button */}
                              <button
                      onClick={() => {
                        setSelectedTaskId(task.task_id);
                        setSelectedImageUrl(imageUrl);
                        setFavoriteModalOpen(true);
                      }}
                      className="p-2 bg-white/90 hover:bg-white text-red-500 rounded-full shadow-lg"
                      title="收藏"
                    >
                      <Heart className="w-4 h-4" />
                              </button>
                    {/* Delete Button */}
                              <button
                      onClick={() => handleDeleteTask(task.task_id)}
                      className="p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full shadow-lg"
                      title="删除记录"
                    >
                      <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                  {/* Preview - 统一单图显示 */}
                  <div className="aspect-square bg-gray-100 relative">
                    <img
                      src={imageUrl}
                              alt="Generated"
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setPreviewImage(imageUrl)}
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

                  {/* Info (Bottom) */}
                  <div className="p-4 bg-gray-50">
                  {task.prompt && (
                    <div className="mb-3">
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {task.prompt}
                        </p>
                        <button
                          onClick={() => handleCopyPrompt(task.task_id, task.prompt!)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          {copiedPromptId === task.task_id ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {copiedPromptId === task.task_id ? '已复制' : '复制提示词'}
                        </button>
                      </div>
                    )}

                    {/* Task info */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>{TASK_TYPE_LABELS[task.task_type] || task.task_type}</span>
                      <span>{new Date(task.task_time).toLocaleString("zh-CN")}</span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {/* 去编辑按钮 */}
                      {TASK_TYPE_TO_EDIT_PAGE[task.task_type] && (
                        <button
                          onClick={() => handleGoToEdit(task)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                          title="使用此任务的参数重新编辑"
                        >
                          <Pencil className="w-4 h-4" />
                          编辑
                        </button>
                      )}
                      
                      {/* Download buttons */}
                      {task.task_type === 'mimic' && task.background_image_url ? (
                        <>
                          {/* Background image thumbnail + download */}
                          <div className="flex items-center gap-1.5 p-1.5 bg-gray-100 rounded-lg">
                            <img
                              src={task.background_image_url}
                              alt="背景图"
                              className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80"
                              onClick={() => setPreviewImage(task.background_image_url)}
                            />
                            <button
                              onClick={() => handleDownloadImage(task.background_image_url!, `${task.task_id}-bg`)}
                              className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
                              title="下载背景图"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {/* Main image download */}
                          <button
                            onClick={() => handleDownloadImage(imageUrl, task.task_id)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            下载
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleDownloadImage(imageUrl, task.task_id)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          下载
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* 收藏 Tab - 显示收藏的图片 */}
      {!loading && !error && activeTab === "favorites" && favorites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {favorites.map((task) => {
            // 解析图片 URL
            const parsedUrls = parseImageUrls(task.output_image_url);
            let displayUrl: string | null = null;

            // 根据类型提取第一张图片
            if (parsedUrls) {
              if (parsedUrls.type === 'single') {
                displayUrl = parsedUrls.urls;
              } else if (parsedUrls.type === 'mimic') {
                displayUrl = parsedUrls.urls.final?.[0] || parsedUrls.urls.background || null;
              } else if (parsedUrls.type === 'photobooth') {
                displayUrl = parsedUrls.urls.poses?.[0] || null;
              } else if (parsedUrls.type === 'snapshot') {
                displayUrl = parsedUrls.urls.snapshots?.[0] || null;
              } else if (parsedUrls.type === 'pose_control') {
                displayUrl = parsedUrls.urls[0] || null;
              }
            }

            return (
              <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* 图片区域 */}
                <div className="relative aspect-square bg-gray-100">
                  {displayUrl ? (
                    <img
                      src={displayUrl}
                      alt="Generated"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setPreviewImage(displayUrl)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  {/* 收藏标记 */}
                  <div className="absolute top-2 right-2 bg-red-500 rounded-full p-2">
                    <Heart className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>

              {/* 信息区域 */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded font-medium">
                    {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(task.task_time)}
                  </span>
                </div>

                {task.prompt && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 line-clamp-2">{task.prompt}</p>
                    <button
                      onClick={() => handleCopyPrompt(task.task_id, task.prompt!)}
                      className="mt-1 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      {copiedPromptId === task.task_id ? (
                        <>
                          <Check className="w-3 h-3" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          复制 Prompt
                        </>
                      )}
                    </button>
                  </div>
                )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => displayUrl && handleDownloadImage(displayUrl, task.task_id)}
                      disabled={!displayUrl}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      下载
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("确定要取消收藏吗？")) {
                          try {
                            const response = await fetch(`/api/favorites/global?task_id=${task.task_id}`, {
                              method: "DELETE",
                              headers: {
                                Authorization: `Bearer ${accessToken}`,
                              },
                            });
                            if (response.ok) {
                              fetchFavorites(); // 刷新列表
                            }
                          } catch (error) {
                            console.error("Failed to remove favorite:", error);
                            alert("取消收藏失败");
                          }
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded-lg transition-colors"
                    >
                      <Heart className="w-4 h-4" />
                      取消收藏
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            aria-label="关闭预览"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div 
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/80 text-sm">
            点击背景或按 ESC 关闭
          </div>
        </div>
      )}

      {/* Favorite Modal */}
      {selectedTaskId && (
        <FavoriteModal
          isOpen={favoriteModalOpen}
          onClose={() => {
            setFavoriteModalOpen(false);
            setSelectedTaskId(null);
            setSelectedImageUrl(null);
          }}
          taskId={selectedTaskId}
          imageUrl={selectedImageUrl || undefined}
          onSuccess={() => {
            // 刷新列表
            if (activeTab === "history") {
              fetchHistory(pagination.page);
            } else {
              fetchFavorites();
            }
          }}
        />
      )}
    </div>
  );
}

