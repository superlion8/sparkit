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

    // 查询任务状态 - 使用正确的API端点
    console.log(`Making request to: ${RUNNINGHUB_API_URL}/task/openapi/status`);
    console.log(`Request body:`, { apiKey: "***", taskId });
    
    const response = await fetch(`${RUNNINGHUB_API_URL}/task/openapi/status`, {
      method: "POST",
      headers: {
        "Host": "www.runninghub.cn",
        "Content-Type": "application/json",
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
        const resultResponse = await fetch(`${RUNNINGHUB_API_URL}/task/openapi/outputs`, {
          method: "POST",
          headers: {
            "Host": "www.runninghub.cn",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiKey: apiKey,
            taskId: taskId,
          }),
        });

        if (resultResponse.ok) {
          const resultData = await resultResponse.json();
          console.log("Direct outputs query response:", resultData);
          
          if (resultData.code === 0 && resultData.data && Array.isArray(resultData.data)) {
            // 查找视频文件
            let videoUrl = null;
            for (const output of resultData.data) {
              if (output.fileType === "mp4" || output.fileUrl?.match(/\.(mp4|mov|avi|webm)$/i)) {
                videoUrl = output.fileUrl;
                break;
              }
            }
            
            if (videoUrl) {
              return NextResponse.json({
                taskId,
                status: "SUCCESS",
                completed: true,
                videoUrl: videoUrl,
                error: null,
              });
            }
          }
        }
      } catch (resultError) {
        console.error("Direct outputs query failed:", resultError);
      }
      
      return NextResponse.json(
        { 
          error: data.msg || "Task query failed",
          details: data
        },
        { status: 500 }
      );
    }

    // RunningHub API 返回的 data 可能是字符串 "SUCCESS" 而不是对象
    const taskStatus = typeof data.data === 'string' ? data.data : data.data.taskStatus;
    let result = {
      taskId,
      status: taskStatus,
      completed: false,
      videoUrl: null as string | null,
      error: null as string | null,
    };

    console.log(`Task status: ${taskStatus} (type: ${typeof data.data})`);

    if (taskStatus === "SUCCESS") {
      // 任务完成，需要调用 outputs 接口获取结果
      console.log("Task completed, fetching outputs...");
      
      try {
        const outputsResponse = await fetch(`${RUNNINGHUB_API_URL}/task/openapi/outputs`, {
          method: "POST",
          headers: {
            "Host": "www.runninghub.cn",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiKey: apiKey,
            taskId: taskId,
          }),
        });

        if (outputsResponse.ok) {
          const outputsData = await outputsResponse.json();
          console.log("Outputs response:", outputsData);

          if (outputsData.code === 0 && outputsData.data && Array.isArray(outputsData.data)) {
            // 查找视频文件
            let videoUrl = null;
            for (const output of outputsData.data) {
              if (output.fileType === "mp4" || output.fileUrl?.match(/\.(mp4|mov|avi|webm)$/i)) {
                videoUrl = output.fileUrl;
                break;
              }
            }

            result = {
              taskId,
              status: "SUCCESS",
              completed: true,
              videoUrl: videoUrl,
              error: null,
            };
          } else {
            result = {
              taskId,
              status: "SUCCESS",
              completed: true,
              videoUrl: null,
              error: "No outputs found",
            };
          }
        } else {
          result = {
            taskId,
            status: "SUCCESS",
            completed: true,
            videoUrl: null,
            error: "Failed to fetch outputs",
          };
        }
      } catch (outputsError) {
        console.error("Error fetching outputs:", outputsError);
        result = {
          taskId,
          status: "SUCCESS",
          completed: true,
          videoUrl: null,
          error: "Error fetching outputs",
        };
      }
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
