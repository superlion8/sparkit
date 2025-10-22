"use client";

import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardList, RefreshCw } from "lucide-react";

interface GenerationTask {
  id: string;
  task_id: string;
  task_type: string;
  username: string | null;
  email: string | null;
  task_time: string | null;
  prompt: string | null;
  input_image_url: string | null;
  input_video_url: string | null;
  output_image_url: string | null;
  output_video_url: string | null;
}

interface TasksResponse {
  tasks: GenerationTask[];
  total: number;
  tasksByType: Record<string, number>;
  summaryByUser: Array<{
    key: string;
    username: string | null;
    email: string | null;
    total: number;
    byType: Record<string, number>;
  }>;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  text_to_image_gemini: "文生图 · Gemini",
  text_to_image_flux: "文生图 · Flux",
  image_to_image_gemini: "图生图 · Gemini",
  image_to_image_flux: "图生图 · Flux",
  outfit_change: "AI 换装",
  background_replace: "AI 换背景",
  video_generation: "视频生成",
  video_subject_replace: "视频主体替换",
};

const taskTypeOptions = [
  { value: "", label: "全部任务类型" },
  ...Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

export default function TasksPage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ taskType: "", taskId: "", email: "" });
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [stats, setStats] = useState<TasksResponse | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function fetchTasks() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.taskType) params.set("taskType", filters.taskType);
        if (filters.taskId) params.set("taskId", filters.taskId.trim());
        if (filters.email) params.set("email", filters.email.trim());

        const response = await fetch(`/api/tasks/list?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `加载任务失败 (${response.status})`);
        }

        const data: TasksResponse = await response.json();
        if (!cancelled) {
          setTasks(data.tasks);
          setStats(data);
        }
      } catch (err: any) {
        if (!cancelled && err.name !== "AbortError") {
          console.error("加载任务失败:", err);
          setError(err.message || "加载任务失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTasks();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, filters]);

  const totals = useMemo(() => {
    if (!stats) {
      return { total: 0, byType: {}, byUser: [] as TasksResponse["summaryByUser"] };
    }
    return {
      total: stats.total,
      byType: stats.tasksByType,
      byUser: stats.summaryByUser,
    };
  }, [stats]);

  const renderImage = (url: string | null) => {
    if (!url) return <span className="text-xs text-gray-400">-</span>;
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block w-24 h-24 overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
      >
        <img src={url} alt="preview" className="h-full w-full object-cover" />
      </a>
    );
  };

  const renderVideo = (url: string | null) => {
    if (!url) return <span className="text-xs text-gray-400">-</span>;
    return (
      <video src={url} controls className="w-32 h-24 rounded-lg border border-gray-200 bg-black" />
    );
  };

  if (authLoading) {
    return (
      <div className="p-12">
        <LoadingSpinner text="加载登录状态..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-2xl border border-dashed border-primary-300 bg-primary-50 px-6 py-8 text-center text-primary-700">
          <h2 className="text-xl font-semibold">访问受限</h2>
          <p className="mt-3 text-sm text-primary-600">
            请使用管理员账户登录后查看生成任务。如果你没有权限，请联系系统管理员。
          </p>
          <button
            onClick={promptLogin}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-700"
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3 text-primary-600">
            <ClipboardList className="h-7 w-7" />
            <span className="text-sm font-medium tracking-wide">任务数据面板</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">生成记录统计</h1>
          <p className="mt-1 text-sm text-gray-500">
            查看所有任务的生成记录，支持按任务类型、任务 ID、邮箱筛选。
          </p>
        </div>
        <button
          onClick={() => setFilters({ taskType: "", taskId: "", email: "" })}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-100"
        >
          <RefreshCw className="h-4 w-4" />
          重置筛选
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">任务总数</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totals.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">任务类型</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            {Object.entries(totals.byType).map(([key, value]) => (
              <li key={key} className="flex justify-between">
                <span>{TASK_TYPE_LABELS[key] ?? key}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </li>
            ))}
            {Object.keys(totals.byType).length === 0 && (
              <li className="text-gray-400">暂无数据</li>
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:col-span-2 xl:col-span-2">
          <p className="text-sm text-gray-500">用户任务数</p>
          <div className="mt-3 max-h-40 overflow-auto pr-2">
            {totals.byUser.length > 0 ? (
              <table className="min-w-full text-left text-sm text-gray-700">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2">用户 / 邮箱</th>
                    <th className="pb-2 text-right">任务数</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.byUser.map((user) => (
                    <tr key={user.key} className="border-t border-gray-100">
                      <td className="py-2">
                        <div className="font-medium text-gray-900">
                          {user.username || user.email || "未填写"}
                        </div>
                        {user.email && (
                          <div className="text-xs text-gray-500">{user.email}</div>
                        )}
                      </td>
                      <td className="py-2 text-right font-semibold text-gray-900">
                        {user.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-4 text-xs text-gray-400">暂无任务数据</div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">任务类型</label>
            <select
              value={filters.taskType}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, taskType: event.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              {taskTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">任务 ID</label>
            <input
              value={filters.taskId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, taskId: event.target.value }))
              }
              placeholder="支持模糊搜索"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">邮箱</label>
            <input
              value={filters.email}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="支持模糊搜索"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-10">
            <LoadingSpinner text="加载任务记录..." />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            暂无符合条件的任务记录。
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-400">
                  <th className="whitespace-nowrap px-4 py-3 text-left">任务时间</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">任务 ID</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">任务类型</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">用户</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left">提示词 / 备注</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">输入图</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">输入视频</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">输出图</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center">输出视频</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {task.task_time
                        ? new Date(task.task_time).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {task.task_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
                        {TASK_TYPE_LABELS[task.task_type] ?? task.task_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {task.username || "未填写"}
                      </div>
                      <div className="text-xs text-gray-500">{task.email || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {task.prompt ? (
                        <div className="max-w-xs whitespace-pre-wrap break-words">{task.prompt}</div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{renderImage(task.input_image_url)}</td>
                    <td className="px-4 py-3 text-center">
                      {task.input_video_url ? (
                        <a
                          href={task.input_video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                          查看来源
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{renderImage(task.output_image_url)}</td>
                    <td className="px-4 py-3 text-center">{renderVideo(task.output_video_url)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
