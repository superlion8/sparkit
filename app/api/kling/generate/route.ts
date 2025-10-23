import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { generateKlingJWT } from "@/lib/klingAuth";

const KLING_API_URL = "https://api-singapore.klingai.com/v1/videos/image2video";

/**
 * Generate video using Kling API with start and end frame
 * Reference: https://app.klingai.com/global/dev/document-api/apiReference/model/imageToVideo
 */
export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = await request.json();
    const { startImageUrl, endImageUrl, prompt } = body;

    if (!startImageUrl || !endImageUrl || !prompt) {
      return NextResponse.json(
        { error: "需要提供首帧图、尾帧图和提示词" },
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

    // Prepare request body for Kling API
    const requestBody = {
      model_name: "kling-v2-1",
      mode: "pro",
      duration: "5",
      image: startImageUrl,
      image_tail: endImageUrl,
      prompt: prompt,
      cfg_scale: 0.5,
    };

    console.log("调用 Kling API:", {
      url: KLING_API_URL,
      body: requestBody,
    });

    // Call Kling API
    const response = await fetch(KLING_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Kling API 错误:", response.status, errorText);
      return NextResponse.json(
        { error: `Kling API 请求失败: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Kling API 响应:", JSON.stringify(data, null, 2));

    // Return task ID for polling
    return NextResponse.json({
      taskId: data.data?.task_id,
      status: data.data?.task_status,
      message: "视频生成任务已提交",
    });

  } catch (error) {
    console.error("Kling 视频生成错误:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}

