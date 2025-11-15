import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { generateKlingJWT } from "@/lib/klingAuth";

const KLING_API_URL = "https://api-singapore.klingai.com/v1/videos/image2video";

/**
 * Generate video using Kling API for Photo to Live
 * Uses kling-v2-5-turbo model with single image
 * Reference: https://app.klingai.com/global/dev/document-api/apiReference/model/imageToVideo
 */
export async function POST(request: NextRequest) {
  console.log("=== Kling Photo to Live API Called ===");

  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = await request.json();
    const { imageUrl, prompt } = body;

    console.log("请求参数:", {
      imageUrl: imageUrl?.substring(0, 100) + "...",
      promptLength: prompt?.length,
    });

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: "需要提供图片和提示词" },
        { status: 400 }
      );
    }

    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;

    console.log("Kling 凭证检查:", {
      hasAccessKey: !!accessKey,
      hasSecretKey: !!secretKey,
    });

    if (!accessKey || !secretKey) {
      return NextResponse.json(
        { error: "Kling API 凭证未配置" },
        { status: 500 }
      );
    }

    // Generate JWT token for authentication
    console.log("生成 JWT token...");
    const jwtToken = generateKlingJWT(accessKey, secretKey);

    // Prepare request body for Kling API
    // Using kling-v2-5-turbo for Photo to Live (single image, no end frame)
    const requestBody = {
      model_name: "kling-v2-5-turbo",
      mode: "pro",
      duration: "5",
      image: imageUrl,
      prompt: prompt,
      cfg_scale: 0.5,
    };

    console.log("调用 Kling API:", {
      url: KLING_API_URL,
      model: requestBody.model_name,
      duration: requestBody.duration,
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

