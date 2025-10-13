import { NextRequest, NextResponse } from "next/server";

// RunningHub API 配置
const RUNNINGHUB_API_URL = "https://www.runninghub.cn";
const WORKFLOW_ID = "1977672819733684226"; // 视频主体替换 workflow

export async function POST(request: NextRequest) {
  try {
    // 检查文件大小限制（更严格的限制）
    const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB 总大小限制

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

    const totalSize = videoFile.size + subjectImage.size;
    console.log(`File sizes - Video: ${(videoFile.size / (1024 * 1024)).toFixed(1)}MB, Image: ${(subjectImage.size / (1024 * 1024)).toFixed(1)}MB, Total: ${(totalSize / (1024 * 1024)).toFixed(1)}MB`);

    // 检查总文件大小
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { 
          error: `Files too large. Total size: ${(totalSize / (1024 * 1024)).toFixed(1)}MB, Maximum: ${MAX_TOTAL_SIZE / (1024 * 1024)}MB`,
          suggestion: "Please use smaller files. Video should be under 5MB, image under 2MB for best results."
        },
        { status: 413 }
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
    
    // 构建 nodeInfoList 来替换用户上传的文件
    const nodeInfoList = [
      {
        nodeId: "193",  // LoadImage 节点
        fieldName: "image",
        fieldValue: imageUploadResult.filename || imageUploadResult.url.split('/').pop()
      },
      {
        nodeId: "63",   // VHS_LoadVideo 节点
        fieldName: "video", 
        fieldValue: videoUploadResult.filename || videoUploadResult.url.split('/').pop()
      }
    ];
    
    console.log("Using nodeInfoList:", nodeInfoList);
    
    const taskResponse = await fetch(`${RUNNINGHUB_API_URL}/task/openapi/create`, {
      method: "POST",
      headers: {
        "Host": "www.runninghub.cn",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: apiKey,
        workflowId: WORKFLOW_ID,
        nodeInfoList: nodeInfoList,
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

    // 步骤 4: 返回任务ID，让前端轮询
    console.log(`Task created successfully. Task ID: ${taskId}, Status: ${taskStatus}`);

    return NextResponse.json({
      taskId,
      status: taskStatus,
      message: "Task created successfully. Please use the task ID to check status.",
      pollingRequired: true,
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
async function uploadFile(file: File, apiKey: string): Promise<{ success: boolean; url?: string; filename?: string; error?: string }> {
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

    // 从 URL 中提取文件名
    const url = uploadData.data.url;
    const filename = url.split('/').pop();
    
    console.log(`File uploaded successfully: ${filename}, URL: ${url}`);

    return { 
      success: true, 
      url: url,
      filename: filename 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


