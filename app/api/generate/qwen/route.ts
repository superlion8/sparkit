import { NextRequest, NextResponse } from "next/server";
import { QWEN_WORKFLOW_BASE64 } from "@/lib/qwen-workflow";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const image = formData.get("image") as File;
    const seed = formData.get("seed") as string || "10";

    if (!prompt) {
      return NextResponse.json(
        { error: "缺少必需参数: prompt" },
        { status: 400 }
      );
    }

    if (!image) {
      return NextResponse.json(
        { error: "缺少必需参数: image" },
        { status: 400 }
      );
    }

    console.log("=== Qwen Hot Mode API ===");
    console.log("Prompt:", prompt);
    console.log("Image size:", image.size);
    console.log("Seed:", seed);

    // Convert image to base64
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const imageBase64 = imageBuffer.toString('base64');

    // Get Qwen API URL from environment variable
    const qwenApiUrl = process.env.QWEN_API_URL;
    if (!qwenApiUrl) {
      console.error("QWEN_API_URL environment variable is not set");
      return NextResponse.json(
        { error: "Qwen API 配置错误" },
        { status: 500 }
      );
    }

    // Prepare request body
    // Note: The API expects "propmt" (typo in the API, not "prompt")
    const requestBody = {
      workflow: QWEN_WORKFLOW_BASE64,
      image: imageBase64,
      propmt: prompt,  // API expects "propmt" (typo)
      seed: parseInt(seed),
      output_image: ""
    };

    console.log("Calling Qwen API...");
    const startTime = Date.now();

    // Call Qwen API
    const response = await fetch(qwenApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Qwen API response received (${elapsed}s), status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Qwen API error:", errorText);
      return NextResponse.json(
        { error: `Qwen API 错误: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Qwen API response:", {
      code: data.code,
      hasImage: !!data.data?.image,
      imageLength: data.data?.image?.length || 0
    });

    if (data.code !== 0) {
      console.error("Qwen API returned error code:", data.code);
      return NextResponse.json(
        { error: `Qwen API 返回错误代码: ${data.code}` },
        { status: 500 }
      );
    }

    if (!data.data?.image) {
      console.error("No image in Qwen API response");
      return NextResponse.json(
        { error: "Qwen API 未返回图片" },
        { status: 500 }
      );
    }

    // Return the generated image as data URL
    const generatedImageDataUrl = `data:image/png;base64,${data.data.image}`;

    console.log(`Successfully generated image with Qwen (total time: ${elapsed}s)`);

    return NextResponse.json({
      images: [generatedImageDataUrl],
      message: "成功生成图片"
    });

  } catch (error: any) {
    console.error("Error in Qwen API route:", error);
    return NextResponse.json(
      {
        error: error.message || "生成图片失败",
        details: error.stack
      },
      { status: 500 }
    );
  }
}

