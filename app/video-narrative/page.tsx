"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/LoadingSpinner";
import { downloadVideo } from "@/lib/downloadUtils";
import {
  Film,
  Wand2,
  Play,
  Pause,
  RefreshCcw,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface HistoryTask {
  id: string;
  task_id: string;
  task_type: string;
  task_time: string;
  prompt: string | null;
  output_image_url: string | null;
}

interface HistoryImage {
  id: string;
  taskId: string;
  url: string;
  taskType: string;
  prompt: string | null;
  createdAt: string;
}

interface ClipResult {
  frameUrl: string;
  frameDesc: string;
  videoClip: string;
  taskId?: string;
  status?: string;
  videoUrl?: string | null;
}

const MAX_FRAMES = 5;

function parseImageUrl(output: string | null): string | null {
  if (!output) return null;
  try {
    const parsed = JSON.parse(output);
    if (typeof parsed === "string") return parsed;
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string") {
      return parsed[0];
    }
    if (parsed?.final) return parsed.final;
    if (parsed?.output) return parsed.output;
  } catch {
    // not JSON, return as-is
  }
  return output;
}

export default function VideoNarrativePage() {
  const { accessToken, isAuthenticated, loading: authLoading, promptLogin } = useAuth();
  const [historyImages, setHistoryImages] = useState<HistoryImage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedFrames, setSelectedFrames] = useState<HistoryImage[]>([]);
  const [clips, setClips] = useState<ClipResult[]>([]);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [polling, setPolling] = useState(false);
  const [timelineOrder, setTimelineOrder] = useState<number[]>([]);
  const [playingCombined, setPlayingCombined] = useState(false);
  const [currentPlayIdx, setCurrentPlayIdx] = useState(0);
  const combinedPlayerRef = useRef<HTMLVideoElement | null>(null);

  // 拉取历史图片列表
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    const fetchHistoryImages = async () => {
      setLoadingHistory(true);
      try {
        const resp = await fetch("/api/history?page=1&pageSize=50", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!resp.ok) throw new Error("获取历史记录失败");
        const data = await resp.json();
        const images: HistoryImage[] = (data.data as HistoryTask[])
          .map((task) => {
            const url = parseImageUrl(task.output_image_url);
            if (!url) return null;
            return {
              id: task.id,
              taskId: task.task_id,
              url,
              taskType: task.task_type,
              prompt: task.prompt,
              createdAt: task.task_time,
            };
          })
          .filter(Boolean) as HistoryImage[];
        setHistoryImages(images);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "获取历史记录失败");
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistoryImages();
  }, [isAuthenticated, accessToken]);

  // 轮询 Kling 结果
  useEffect(() => {
    const pending = clips.filter((c) => !c.videoUrl && c.taskId && c.status !== "error");
    if (!isAuthenticated || !accessToken || pending.length === 0) {
      setPolling(false);
      return;
    }
    setPolling(true);
    const timer = setInterval(async () => {
      try {
        const updated = await Promise.all(
          pending.map(async (clip) => {
            const resp = await fetch(`/api/kling/query?taskId=${clip.taskId}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!resp.ok) return clip;
            const data = await resp.json();
            return {
              ...clip,
              status: data.status,
              videoUrl: data.videoUrl || clip.videoUrl,
            };
          })
        );
        setClips((prev) =>
          prev.map((clip) => {
            const newer = updated.find((u) => u.taskId === clip.taskId);
            return newer ? { ...clip, ...newer } : clip;
          })
        );
      } catch (err) {
        console.error("轮询 Kling 任务失败:", err);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [clips, isAuthenticated, accessToken]);

  useEffect(() => {
    if (clips.length > 0 && timelineOrder.length === 0) {
      setTimelineOrder(clips.map((_, idx) => idx));
    }
  }, [clips, timelineOrder.length]);

  const orderedClips = useMemo(() => timelineOrder.map((idx) => clips[idx]).filter(Boolean), [timelineOrder, clips]);

  const toggleFrame = (img: HistoryImage) => {
    if (selectedFrames.find((f) => f.taskId === img.taskId && f.url === img.url)) {
      setSelectedFrames((prev) => prev.filter((f) => !(f.taskId === img.taskId && f.url === img.url)));
      return;
    }
    if (selectedFrames.length >= MAX_FRAMES) {
      setError(`最多选择 ${MAX_FRAMES} 张分镜图`);
      return;
    }
    setError("");
    setSelectedFrames((prev) => [...prev, img]);
  };

  const handleGenerate = async () => {
    if (!isAuthenticated || !accessToken) {
      promptLogin();
      return;
    }
    if (selectedFrames.length === 0) {
      setError("请先选择分镜图片");
      return;
    }
    setGenerating(true);
    setError("");
    setClips([]);
    setTimelineOrder([]);
    try {
      const resp = await fetch("/api/video/narrative", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ frames: selectedFrames.map((f) => f.url) }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "生成失败");
      }
      const data = await resp.json();
      setClips(data.frames as ClipResult[]);
      setTimelineOrder((data.frames as ClipResult[]).map((_: ClipResult, idx: number) => idx));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const moveClip = (from: number, to: number) => {
    if (to < 0 || to >= timelineOrder.length) return;
    const next = [...timelineOrder];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setTimelineOrder(next);
  };

  const startCombinedPlay = () => {
    if (orderedClips.some((c) => !c.videoUrl)) return;
    setPlayingCombined(true);
    setCurrentPlayIdx(0);
    const video = combinedPlayerRef.current;
    if (video && orderedClips[0]?.videoUrl) {
      video.src = orderedClips[0].videoUrl!;
      video.play();
    }
  };

  const onCombinedEnded = () => {
    const nextIdx = currentPlayIdx + 1;
    if (nextIdx >= orderedClips.length) {
      setPlayingCombined(false);
      return;
    }
    setCurrentPlayIdx(nextIdx);
    const video = combinedPlayerRef.current;
    if (video && orderedClips[nextIdx]?.videoUrl) {
      video.src = orderedClips[nextIdx].videoUrl!;
      video.play();
    }
  };

  const readyCount = clips.filter((c) => c.videoUrl).length;

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Film className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Narrative 视频故事</h1>
          </div>
          <p className="text-gray-600 mt-2">
            从历史生成图里挑选最多 {MAX_FRAMES} 张分镜，自动写分镜描述、生成每段视频文案，并用 Kling 2.5 并行产出视频，支持顺序调整与串联预览。
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || authLoading || selectedFrames.length === 0}
          className="bg-primary-600 text-white px-5 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generating ? (
            <>
              <RefreshCcw className="w-4 h-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              生成 Narrative
            </>
          )}
        </button>
      </div>

      {!authLoading && !isAuthenticated && (
        <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700">
          需要登录才能使用。点击右上角登录后重试。
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">从历史记录选择分镜 ({selectedFrames.length}/{MAX_FRAMES})</h2>
          <div className="text-sm text-gray-500">已加载 {historyImages.length} 条</div>
        </div>
        {loadingHistory ? (
          <LoadingSpinner text="正在加载历史图片..." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {historyImages.map((img) => {
              const selected = selectedFrames.some((f) => f.taskId === img.taskId && f.url === img.url);
              return (
                <button
                  key={`${img.taskId}-${img.url}`}
                  onClick={() => toggleFrame(img)}
                  className={`relative border rounded-lg overflow-hidden text-left transition-all ${
                    selected ? "ring-2 ring-primary-500 border-primary-300" : "border-gray-200 hover:border-primary-200"
                  }`}
                >
                  <img src={img.url} alt="history" className="w-full h-48 object-cover" />
                  <div className="p-3">
                    <p className="text-sm text-gray-700 line-clamp-2">{img.prompt || "无提示词"}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(img.createdAt).toLocaleString()}</p>
                  </div>
                  {selected && (
                    <div className="absolute top-2 right-2 bg-primary-600 text-white px-2 py-1 text-xs rounded">
                      已选
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {generating && <LoadingSpinner text="生成分镜描述与视频文案中..." />}

      {clips.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">分镜结果</h2>
            <span className="text-sm text-gray-500">
              {readyCount}/{clips.length} 段视频已完成 {polling ? "(轮询中...)" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {clips.map((clip, idx) => (
              <div key={`${clip.frameUrl}-${idx}`} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-700">分镜 {idx + 1}</div>
                  <div className="text-xs text-gray-500">{clip.status || "pending"}</div>
                </div>
                <img src={clip.frameUrl} alt="" className="w-full h-48 object-cover rounded-lg" />
                <div className="text-sm text-gray-700">
                  <div className="font-semibold mb-1">Frame 描述</div>
                  <p className="text-gray-600">{clip.frameDesc}</p>
                </div>
                <div className="text-sm text-gray-700">
                  <div className="font-semibold mb-1">视频 prompt</div>
                  <p className="text-gray-600 whitespace-pre-wrap break-words">{clip.videoClip}</p>
                </div>
                {clip.videoUrl ? (
                  <div className="space-y-2">
                    <video src={clip.videoUrl} controls className="w-full rounded-lg" />
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadVideo(clip.videoUrl!, `narrative-${idx + 1}.mp4`)}
                        className="flex-1 bg-primary-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-700"
                      >
                        下载片段
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    等待 Kling 完成...
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">时间轴 / 拼接预览</h3>
                {readyCount === clips.length ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle2 className="w-4 h-4" /> 全部片段已完成
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">等待全部片段生成后可播放合成</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={startCombinedPlay}
                  disabled={readyCount !== clips.length || clips.length === 0}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {playingCombined ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  播放合成
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {orderedClips.map((clip, orderIdx) => (
                <div key={`${clip.frameUrl}-${orderIdx}`} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">段落 {orderIdx + 1}</span>
                    <div className="flex gap-1">
                      <button
                        className="p-1 rounded hover:bg-gray-100"
                        onClick={() => moveClip(orderIdx, orderIdx - 1)}
                        aria-label="move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-100"
                        onClick={() => moveClip(orderIdx, orderIdx + 1)}
                        aria-label="move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <img src={clip.frameUrl} alt="" className="w-full h-28 object-cover rounded" />
                  <p className="text-xs text-gray-600 line-clamp-2">{clip.videoClip}</p>
                  <div className="text-xs text-gray-500">状态: {clip.status || "pending"}</div>
                  {clip.videoUrl && (
                    <video src={clip.videoUrl} controls className="w-full rounded" />
                  )}
                </div>
              ))}
            </div>

            <video
              ref={combinedPlayerRef}
              className="mt-4 w-full rounded-lg border border-gray-200"
              controls
              onEnded={onCombinedEnded}
            />
          </div>
        </div>
      )}
    </div>
  );
}
