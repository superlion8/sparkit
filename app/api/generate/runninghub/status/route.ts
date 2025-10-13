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
    console.log(`Making request to: ${RUNNINGHUB_API_URL}/task/openapi/query`);
    console.log(`Request body:`, { apiKey: "***", taskId });
    
    const response = await fetch(`${RUNNINGHUB_API_URL}/task/openapi/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Creator-AI-Toolkit/1.0",
      },
      body: JSON.stringify({
        apiKey: apiKey,
        taskId: taskId,
      }),
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RunningHub status query error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        taskId: taskId
      });
      return NextResponse.json(
        { 
          error: "Failed to query task status",
          details: {
            status: response.status,
            statusText: response.statusText,
            taskId: taskId
          }
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log("Task status response:", data);

    if (data.code !== 0) {
      console.error("RunningHub API returned error:", data);
      
      // 如果状态查询失败，尝试直接获取结果
      console.log("Status query failed, trying to get result directly...");
      
      try {
        const resultResponse = await fetch(`${RUNNINGHUB_API_URL}/task/openapi/result`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Creator-AI-Toolkit/1.0",
          },
          body: JSON.stringify({
            apiKey: apiKey,
            taskId: taskId,
          }),
        });

        if (resultResponse.ok) {
          const resultData = await resultResponse.json();
          console.log("Direct result query response:", resultData);
          
          if (resultData.code === 0 && resultData.data) {
            // 直接返回结果
            return NextResponse.json({
              taskId,
              status: "SUCCESS",
              completed: true,
              videoUrl: resultData.data.resultUrl || resultData.data.url,
              error: null,
            });
          }
        }
      } catch (resultError) {
        console.error("Direct result query failed:", resultError);
      }
      
      return NextResponse.json(
        { 
          error: data.msg || "Task query failed",
          details: data
        },
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
