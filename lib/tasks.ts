import { supabaseAdminClient } from "./supabaseAdmin";

export interface TaskLogPayload {
  task_id: string;
  task_type: string;
  username?: string | null;
  email?: string | null;
  task_time?: string;
  prompt?: string | null;
  input_image_url?: string | null;
  input_video_url?: string | null;
  output_image_url?: string | null;
  output_video_url?: string | null;
  background_image_url?: string | null;
  character_id?: string | null; // 关联的角色 ID
}

export async function logGenerationTask(payload: TaskLogPayload) {
  const record = {
    ...payload,
    task_time: payload.task_time ?? new Date().toISOString(),
  };

  const { error } = await supabaseAdminClient.from("generation_tasks").insert(record);

  if (error) {
    throw new Error(error.message);
  }
}
