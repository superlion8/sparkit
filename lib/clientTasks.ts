export interface TaskLogRequest {
  taskId: string;
  taskType: string;
  prompt?: string | null;
  inputImageUrl?: string | null;
  inputVideoUrl?: string | null;
  outputImageUrl?: string | null;
  outputVideoUrl?: string | null;
  taskTime?: string;
}

export function generateClientTaskId(prefix?: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return prefix ? `${prefix}-${crypto.randomUUID()}` : crypto.randomUUID();
  }
  const random = Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}-${Date.now()}-${random}` : `${Date.now()}-${random}`;
}

export async function logTaskEvent(accessToken: string, payload: TaskLogRequest) {
  try {
    await fetch("/api/tasks/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        task_id: payload.taskId,
        task_type: payload.taskType,
        prompt: payload.prompt ?? null,
        input_image_url: payload.inputImageUrl ?? null,
        input_video_url: payload.inputVideoUrl ?? null,
        output_image_url: payload.outputImageUrl ?? null,
        output_video_url: payload.outputVideoUrl ?? null,
        task_time: payload.taskTime ?? undefined,
      }),
    });
  } catch (error) {
    console.error("Failed to log task event:", error);
  }
}
