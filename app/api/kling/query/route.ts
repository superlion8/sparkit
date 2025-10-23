import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { generateKlingJWT } from "@/lib/klingAuth";

const KLING_QUERY_URL = "https://api-singapore.klingai.com/v1/videos/image2video";

/**
 * Query video generation status using Kling API
 * Reference: https://app.klingai.com/global/dev/document-api/apiReference/model/imageToVideo
 */
export async function GET(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "需要提供任务ID" },
        { status: 400 }
      );
    }

    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;

    if (!accessKey || !secretKey) {
      return NextResponse.json(
        { error: "Kling API 凭证未配置" },
        { status: 500 }
      );
    }

    // Generate JWT token for authentication
    const jwtToken = generateKlingJWT(accessKey, secretKey);

    // Query task status
    const queryUrl = `${KLING_QUERY_URL}/${taskId}`;
    console.log("查询 Kling 任务状态:", queryUrl);

    const response = await fetch(queryUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Kling 查询 API 错误:", response.status, errorText);
      return NextResponse.json(
        { error: `Kling API 查询失败: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Kling 查询响应:", JSON.stringify(data, null, 2));

    // Extract video information
    const taskData = data.data;
    const status = taskData?.task_status;
    const videoUrl = taskData?.task_result?.videos?.[0]?.url;

    return NextResponse.json({
      status,
      videoUrl,
      taskId,
      data: taskData,
    });

  } catch (error) {
    console.error("Kling 查询错误:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}

