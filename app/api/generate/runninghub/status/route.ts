import { NextRequest, NextResponse } from "next/server";

const RUNNINGHUB_API_URL = "https://www.runninghub.cn";

export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json();

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
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

    console.log(`Checking task status for ID: ${taskId}`);

    // 查询任务状态
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
      const errorText = await response.text();
      console.error("RunningHub status query error:", errorText);
      return NextResponse.json(
        { error: "Failed to query task status" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Task status response:", data);

    if (data.code !== 0) {
      return NextResponse.json(
        { error: data.msg || "Task query failed" },
        { status: 500 }
      );
    }

    const taskStatus = data.data.taskStatus;
    let result = {
      taskId,
      status: taskStatus,
      completed: false,
      videoUrl: null as string | null,
      error: null as string | null,
    };

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

      result = {
        taskId,
        status: "SUCCESS",
        completed: true,
        videoUrl: videoUrl || null,
        error: null,
      };
    } else if (taskStatus === "FAILED" || taskStatus === "ERROR") {
      result = {
        taskId,
        status: taskStatus,
        completed: true,
        videoUrl: null,
        error: data.data.errorMessage || "Task failed",
      };
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Error in status query:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
