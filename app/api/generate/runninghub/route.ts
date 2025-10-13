import { NextRequest, NextResponse } from "next/server";

// RunningHub API 配置
const RUNNINGHUB_API_URL = "https://www.runninghub.cn";
const WORKFLOW_ID = "1977672819733684226"; // 视频主体替换 workflow

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;
    const subjectImage = formData.get("subjectImage") as File | null;

    if (!videoFile) {
      return NextResponse.json(
        { error: "Video file is required" },
        { status: 400 }
      );
    }

    if (!subjectImage) {
      return NextResponse.json(
        { error: "Subject image is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RUNNINGHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "RunningHub API key not configured" },
        { status: 500 }
      );
    }

    console.log("Starting RunningHub ComfyUI task...");

    // 步骤 1: 上传视频文件
    console.log("Uploading video file...");
    const videoUploadResult = await uploadFile(videoFile, apiKey);
    if (!videoUploadResult.success) {
      throw new Error(`Video upload failed: ${videoUploadResult.error}`);
    }
    console.log("Video uploaded:", videoUploadResult.url);

    // 步骤 2: 上传主体图片
    console.log("Uploading subject image...");
    const imageUploadResult = await uploadFile(subjectImage, apiKey);
    if (!imageUploadResult.success) {
      throw new Error(`Image upload failed: ${imageUploadResult.error}`);
    }
    console.log("Image uploaded:", imageUploadResult.url);

    // 步骤 3: 创建 ComfyUI 任务
    console.log("Creating ComfyUI task...");
    const taskResponse = await fetch(`${RUNNINGHUB_API_URL}/task/openapi/create`, {
      method: "POST",
      headers: {
        "Host": "www.runninghub.cn",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: apiKey,
        workflowId: WORKFLOW_ID,
      }),
    });

    if (!taskResponse.ok) {
      const errorText = await taskResponse.text();
      console.error("RunningHub API error:", errorText);
      return NextResponse.json(
        { error: "Failed to create ComfyUI task" },
        { status: taskResponse.status }
      );
    }

    const taskData = await taskResponse.json();
    console.log("Task created:", taskData);

    if (taskData.code !== 0) {
      return NextResponse.json(
        { error: taskData.msg || "Task creation failed" },
        { status: 500 }
      );
    }

    const { taskId, taskStatus, netWssUrl } = taskData.data;

    // 步骤 4: 轮询任务状态
    console.log(`Task ID: ${taskId}, Status: ${taskStatus}`);
    const result = await pollTaskResult(apiKey, taskId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Task execution failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      taskId,
      status: result.status,
      videoUrl: result.videoUrl,
      message: "Video subject replacement completed successfully",
    });
  } catch (error: any) {
    console.error("Error in RunningHub generation:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// 上传文件到 RunningHub
async function uploadFile(file: File, apiKey: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("apiKey", apiKey);
    formData.append("file", file);

    const uploadResponse = await fetch(`${RUNNINGHUB_API_URL}/task/openapi/upload`, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return { success: false, error: errorText };
    }

    const uploadData = await uploadResponse.json();
    
    if (uploadData.code !== 0) {
      return { success: false, error: uploadData.msg || "Upload failed" };
    }

    return { success: true, url: uploadData.data.url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 轮询任务结果
async function pollTaskResult(
  apiKey: string,
  taskId: string,
  maxAttempts: number = 240 // 240 attempts * 5 seconds = 1200 seconds = 20 minutes
): Promise<{ success: boolean; status?: string; videoUrl?: string; error?: string }> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待 5 秒

    try {
      const response = await fetch(`${RUNNINGHUB_API_URL}/task/openapi/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: apiKey,
          taskId: taskId,
        }),
      });

      if (!response.ok) {
        attempts++;
        continue;
      }

      const data = await response.json();
      console.log(`Poll attempt ${attempts + 1}:`, data);

      if (data.code !== 0) {
        attempts++;
        continue;
      }

      const taskStatus = data.data.taskStatus;

      if (taskStatus === "SUCCESS") {
        // 任务完成，提取视频 URL
        const outputs = data.data.outputs;
        let videoUrl = null;

        // 从 outputs 中查找视频文件
        if (outputs && Array.isArray(outputs)) {
          for (const output of outputs) {
            if (output.type === "video" || output.url?.match(/\.(mp4|mov|avi|webm)$/i)) {
              videoUrl = output.url;
              break;
            }
          }
        }

        if (!videoUrl && data.data.resultUrl) {
          videoUrl = data.data.resultUrl;
        }

        return {
          success: true,
          status: "SUCCESS",
          videoUrl: videoUrl || undefined,
        };
      } else if (taskStatus === "FAILED" || taskStatus === "ERROR") {
        return {
          success: false,
          status: taskStatus,
          error: data.data.errorMessage || "Task failed",
        };
      }

      // 任务还在运行中
      attempts++;
    } catch (error: any) {
      console.error(`Poll error at attempt ${attempts + 1}:`, error);
      attempts++;
    }
  }

  return {
    success: false,
    error: "Task timeout - took too long to complete",
  };
}

