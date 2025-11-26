import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { generateText } from "@/lib/vertexai";
import { generateKlingJWT } from "@/lib/klingAuth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

const KLING_API_URL = "https://api-singapore.klingai.com/v1/videos/image2video";
const CAPTION_PROMPT = "你看到的是一个短视频片段里的分镜图，请用语言描述一下这张分镜图，用英文输出。";
const STORY_PROMPT = `
你是一个擅长拍摄instagram风格社交媒体短视频的专业视频摄影师和内容策划师。
你看到的是用户输入的多张图片(frame)及其英文描述(frame_desc)。
请你仔细分析这些分镜和描述，设计一个串联这些分镜的完整视频故事。预期是每个分镜图会生成一段以分镜图为起点的约5s视频。
请输出 JSON 数组，数组元素格式严格为:
{
  "frame_index": <与输入frame对应的序号，从1开始>,
  "video_clip": "<英文prompt，生动描述希望生成的短视频内容，包含景别/动作/气氛/镜头运动/光线/时长5s提示>"
}
不要输出多余文字，不要使用 markdown。保持与输入 frame_index 数量一致。`;

export const maxDuration = 300;

interface NarrativeRequest {
  frames: string[];
}

interface ClipPlan {
  frameUrl: string;
  frameDesc: string;
  videoClip: string;
  taskId?: string;
  status?: string;
  videoUrl?: string | null;
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  if (url.startsWith("data:")) {
    const [meta, data] = url.split(",");
    const mimeMatch = meta.match(/data:(.*?);base64/);
    return {
      base64: data || "",
      mimeType: mimeMatch?.[1] || "image/png",
    };
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`拉取图片失败: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type") || "image/png";
  return {
    base64: buffer.toString("base64"),
    mimeType,
  };
}

function pickModelId() {
  return process.env.GEMINI_TEXT_MODEL_ID || "gemini-3-pro-preview";
}

async function createKlingTask(imageUrl: string, prompt: string) {
  const accessKey = process.env.KLING_ACCESS_KEY;
  const secretKey = process.env.KLING_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error("Kling API 凭证未配置");
  }

  const jwtToken = generateKlingJWT(accessKey, secretKey);
  const body = {
    model_name: "kling-v2-5-turbo",
    mode: "pro",
    duration: "5",
    image: imageUrl,
    prompt,
    cfg_scale: 0.5,
  };

  const response = await fetch(KLING_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kling API 请求失败: ${errorText}`);
  }

  const data = await response.json();
  return {
    taskId: data.data?.task_id as string | undefined,
    status: data.data?.task_status as string | undefined,
  };
}

async function logClipTask(userEmail: string | null, clip: ClipPlan, taskType: string = "video_narrative_clip") {
  try {
    await supabaseAdminClient.from("generation_tasks").insert({
      task_id: clip.taskId,
      task_type: taskType,
      email: userEmail,
      prompt: clip.videoClip,
      input_image_url: clip.frameUrl,
      output_video_url: clip.videoUrl ?? null,
      status: clip.status ?? "pending",
      task_time: new Date().toISOString(),
      started_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("记录 narrative clip 任务失败:", err);
  }
}

export async function POST(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = (await request.json()) as NarrativeRequest;
    const frames = body.frames?.filter(Boolean) || [];

    if (frames.length === 0) {
      return NextResponse.json({ error: "至少需要 1 张图片" }, { status: 400 });
    }
    if (frames.length > 5) {
      return NextResponse.json({ error: "最多只支持 5 张图片" }, { status: 400 });
    }

    const modelId = pickModelId();

    // 1) 每张图生成分镜描述
    const frameDescs: string[] = [];
    for (const frame of frames) {
      const { base64, mimeType } = await fetchImageAsBase64(frame);
      const desc = await generateText(modelId, CAPTION_PROMPT, base64, mimeType, {
        maxOutputTokens: 256,
      });
      frameDescs.push(desc.trim());
    }

    // 2) 生成故事串联 + 每段视频 prompt
    const storyInput = frames
      .map((frame, idx) => `Frame ${idx + 1} URL: ${frame}\nFrame ${idx + 1} Desc: ${frameDescs[idx]}`)
      .join("\n\n");
    const storyPrompt = `${STORY_PROMPT}\n输入分镜：\n${storyInput}`;

    const storyRaw = await generateText(modelId, storyPrompt, undefined, undefined, {
      maxOutputTokens: 2048,
    });

    let parsed: Array<{ frame_index: number; video_clip: string }> = [];
    try {
      parsed = JSON.parse(storyRaw);
    } catch {
      const lines = storyRaw.split("\n").filter((l) => l.trim());
      parsed = lines.map((line, idx) => ({
        frame_index: idx + 1,
        video_clip: line.replace(/^\d+[\.\)]\s*/, "").trim(),
      }));
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      parsed = frameDescs.map((d, idx) => ({
        frame_index: idx + 1,
        video_clip: `5s cinematic shot based on: ${d}`,
      }));
    }

    const clipPlans: ClipPlan[] = frames.map((frameUrl, idx) => {
      const found = parsed.find((p) => p.frame_index === idx + 1);
      return {
        frameUrl,
        frameDesc: frameDescs[idx],
        videoClip: found?.video_clip || `5s cinematic shot based on: ${frameDescs[idx]}`,
      };
    });

    // 3) 为每个分镜创建 Kling 任务
    for (let i = 0; i < clipPlans.length; i++) {
      try {
        const kling = await createKlingTask(clipPlans[i].frameUrl, clipPlans[i].videoClip);
        clipPlans[i].taskId = kling.taskId;
        clipPlans[i].status = kling.status || "pending";
        await logClipTask(user?.email ?? null, clipPlans[i]);
      } catch (err) {
        clipPlans[i].status = "error";
        console.error("创建 Kling 任务失败:", err);
      }
    }

    return NextResponse.json({
      frames: clipPlans,
      storyRaw,
    });
  } catch (error: any) {
    console.error("Narrative 生成错误:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
