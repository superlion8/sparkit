"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import AdminDashboard from "../../../components/AdminDashboard";
import { useAuth } from "../../../hooks/useAuth";

interface GenerationTask {
  id: string;
  task_id: string;
  task_type: string;
  username: string | null;
  email: string | null;
  created_at: string;
  prompt: string | null;
  input_image_url: string | null;
  input_video_url: string | null;
  output_image_url: string | null;
  output_video_url: string | null;
  model_name: string | null;
  status: string | null;
}

interface Filters {
  taskType: string;
  taskId: string;
  email: string;
  username: string;
  limit: number;
}

interface FetchResult {
  tasks: GenerationTask[];
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
}

const TASK_TYPES = [
  "text_to_image_gemini",
  "text_to_image_flux",
  "image_to_image_gemini",
  "image_to_image_flux",
  "outfit_change",
  "background_replace",
  "video_generation",
  "video_subject_replace",
  "image_transition",
];

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const isImageValue = (value: string) =>
  value.startsWith("data:image") || /\.(png|jpg|jpeg|webp|gif)$/i.test(value);
const isVideoValue = (value: string) =>
  value.startsWith("data:video") || /\.(mp4|mov|avi|webm)$/i.test(value);

export default function AdminTasksPage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin, userEmail } = useAuth();
  const [filters, setFilters] = useState<Filters>({
    taskType: "",
    taskId: "",
    email: "",
    username: "",
    limit: 100,
  });
  const [offset, setOffset] = useState(0);
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  const fetchTasks = useCallback(
    async (nextOffset = 0) => {
      if (!accessToken) {
        return;
      }

      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.taskType) params.set("taskType", filters.taskType);
      if (filters.taskId) params.set("taskId", filters.taskId.trim());
      if (filters.email) params.set("email", filters.email.trim());
      if (filters.username) params.set("username", filters.username.trim());
      params.set("limit", String(filters.limit));
      if (nextOffset > 0) params.set("offset", String(nextOffset));

      try {
        const response = await fetch(`/api/admin/tasks?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          let message = "无法获取任务数据";
          try {
            const data = await response.json();
            message = data.error ?? message;
          } catch {
            message = `${message} (${response.status})`;
          }
          setTasks([]);
          setTotal(null);
          setError(message);
          return;
        }

        const result = (await response.json()) as FetchResult;
        setTasks(result.tasks ?? []);
        setTotal(result.pagination?.total ?? null);
        setOffset(result.pagination?.offset ?? nextOffset);
        setHasFetchedOnce(true);
      } catch (err: any) {
        setError(err?.message ?? "请求失败");
        setTasks([]);
        setTotal(null);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, filters]
  );

  useEffect(() => {
    if (!authLoading && isAuthenticated && accessToken && !hasFetchedOnce) {
      fetchTasks(0);
    }
  }, [authLoading, isAuthenticated, accessToken, fetchTasks, hasFetchedOnce]);

  const totalPages = useMemo(() => {
    if (!total || total <= 0) {
      return 1;
    }
    return Math.ceil(total / filters.limit);
  }, [total, filters.limit]);

  const currentPage = useMemo(() => {
    return Math.floor(offset / filters.limit) + 1;
  }, [offset, filters.limit]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    setOffset(0);
    fetchTasks(0);
  };

  const handleResetFilters = () => {
    setFilters({
      taskType: "",
      taskId: "",
      email: "",
      username: "",
      limit: 100,
    });
    setOffset(0);
    fetchTasks(0);
  };

  const handlePrev = () => {
    if (offset === 0) return;
    const nextOffset = Math.max(offset - filters.limit, 0);
    fetchTasks(nextOffset);
  };

  const handleNext = () => {
    if (total && offset + filters.limit >= total) return;
    const nextOffset = offset + filters.limit;
    fetchTasks(nextOffset);
  };

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        <LoadingSpinner text="登录状态加载中..." />
      </div>
    );
  }

  if (!isAuthenticated || !accessToken) {
    return (
      <div className="max-w-3xl mx-auto p-6 lg:p-10 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">任务数据后台</h1>
        <p className="text-gray-600">请先登录后再查看任务数据。</p>
        <button
          onClick={promptLogin}
          className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-3 text-white font-medium hover:bg-primary-700"
        >
          使用管理员账号登录
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto p-6 lg:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">任务数据后台</h1>
        <p className="text-gray-600 mt-2">
          当前登录：<span className="font-medium text-gray-900">{userEmail ?? "未知"}</span>
        </p>
      </div>

      <AdminDashboard accessToken={accessToken} />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务类型</label>
            <select
              value={filters.taskType}
              onChange={(event) => setFilters((prev) => ({ ...prev, taskType: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">全部</option>
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">任务 ID</label>
            <input
              type="text"
              value={filters.taskId}
              onChange={(event) => setFilters((prev) => ({ ...prev, taskId: event.target.value }))}
              placeholder="支持模糊查询"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户邮箱</label>
            <input
              type="text"
              value={filters.email}
              onChange={(event) => setFilters((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="支持模糊查询，多个用逗号分隔"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={filters.username}
              onChange={(event) => setFilters((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="支持模糊查询，多个用逗号分隔"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">每页数量</label>
            <input
              type="number"
              min={1}
              max={500}
              value={filters.limit}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  limit: Math.min(Math.max(Number(event.target.value) || 1, 1), 500),
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-primary-600 px-5 py-2.5 text-white font-medium hover:bg-primary-700"
            disabled={loading}
          >
            {loading ? "查询中..." : "查询任务"}
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center rounded-lg border border-gray-300 px-5 py-2.5 text-gray-700 hover:bg-gray-100"
            disabled={loading}
          >
            重置筛选
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <p className="text-sm text-gray-600">
              {total !== null
                ? `共 ${total} 条记录，当前第 ${currentPage}/${totalPages} 页`
                : `当前显示 ${tasks.length} 条记录`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              disabled={loading || offset === 0}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              上一页
            </button>
            <button
              onClick={handleNext}
              disabled={loading || (total !== null && offset + filters.limit >= total)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              下一页
            </button>
            <button
              onClick={() => fetchTasks(offset)}
              disabled={loading}
              className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2 text-sm text-primary-700 hover:bg-primary-100 disabled:text-primary-300 disabled:hover:bg-primary-50"
            >
              刷新
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="任务数据加载中..." />
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center text-gray-500">暂无任务数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    创建时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    任务类型
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    任务 ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    用户
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    状态
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Prompt
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    输入
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    输出
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {formatDateTime(task.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {task.task_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <code className="text-xs break-words">{task.task_id}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="space-y-1">
                        <div>{task.username ?? "未知用户"}</div>
                        <div className="text-xs text-gray-500 break-words">
                          {task.email ?? "邮箱未记录"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        task.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : task.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status || '未知'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700" style={{maxWidth: '300px'}}>
                      {task.prompt ? (
                        <div className="whitespace-pre-wrap break-words text-xs bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                          {task.prompt}
                        </div>
                      ) : (
                        <span className="text-gray-400">无</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700" style={{minWidth: '150px'}}>
                      <div className="space-y-2">
                        {task.input_image_url ? (
                          <DirectMediaDisplay label="输入图片" value={task.input_image_url} />
                        ) : null}
                        {task.input_video_url ? (
                          <DirectMediaDisplay label="输入视频" value={task.input_video_url} />
                        ) : null}
                        {!task.input_image_url && !task.input_video_url ? (
                          <span className="text-gray-400 text-xs block">无输入</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700" style={{minWidth: '150px'}}>
                      <div className="space-y-2">
                        {task.output_image_url ? (
                          <DirectMediaDisplay label="输出图片" value={task.output_image_url} />
                        ) : null}
                        {task.output_video_url ? (
                          <DirectMediaDisplay label="输出视频" value={task.output_video_url} />
                        ) : null}
                        {!task.output_image_url && !task.output_video_url ? (
                          <span className="text-gray-400 text-xs block">无输出</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function DirectMediaDisplay({ label, value }: { label: string; value: string }) {
  if (isImageValue(value)) {
    return (
      <div className="space-y-1">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-1">
          <img src={value} alt={label} className="max-h-24 w-auto rounded" />
        </div>
      </div>
    );
  }

  if (isVideoValue(value)) {
    return (
      <div className="space-y-1">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-1">
          <video src={value} controls className="max-h-24 w-auto rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500">{label}</div>
      <pre className="whitespace-pre-wrap break-words text-xs bg-gray-50 rounded-md p-2 max-h-16 overflow-y-auto">
        {value}
      </pre>
    </div>
  );
}

function MediaPreview({ label, value }: { label: string; value: string }) {
  const displayLabel = `${label}预览`;

  if (isImageValue(value)) {
    return (
      <details>
        <summary className="cursor-pointer text-primary-600 text-xs">{displayLabel}</summary>
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
          <img src={value} alt={label} className="max-h-48 w-auto rounded" />
        </div>
      </details>
    );
  }

  if (isVideoValue(value)) {
    return (
      <details>
        <summary className="cursor-pointer text-primary-600 text-xs">{displayLabel}</summary>
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
          <video src={value} controls className="max-h-48 w-auto rounded" />
        </div>
      </details>
    );
  }

  return (
    <details>
      <summary className="cursor-pointer text-primary-600 text-xs">{displayLabel}</summary>
      <pre className="mt-2 whitespace-pre-wrap break-words text-xs bg-gray-50 rounded-md p-2">
        {value}
      </pre>
    </details>
  );
}