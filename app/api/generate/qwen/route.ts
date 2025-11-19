import { NextRequest, NextResponse } from "next/server";
import { QWEN_WORKFLOW_BASE64 } from "@/lib/qwen-workflow";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const image = formData.get("image") as File;
    // Generate a random seed if not provided
    const providedSeed = formData.get("seed") as string;
    const seed = providedSeed || Math.floor(Math.random() * 1000000).toString();

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
    console.log("Seed:", seed, "(", providedSeed ? "provided" : "random", ")");

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
    const requestBody = {
      workflow: QWEN_WORKFLOW_BASE64,
      image: imageBase64,
      prompt: prompt,  // Changed from "propmt" to "prompt"
      seed: parseInt(seed),
      output_image: ""
    };

    console.log("=== Qwen API Request ===");
    console.log("Prompt:", prompt);
    console.log("Seed:", seed);
    console.log("Image size (bytes):", imageBase64.length);
    console.log("Workflow size (bytes):", QWEN_WORKFLOW_BASE64.length);
    console.log("Qwen API URL:", qwenApiUrl);
    console.log("Calling Qwen API...");
    const startTime = Date.now();

    // Set up timeout (120 seconds for image generation)
    const timeoutMs = 120000; // 2 minutes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error(`[Qwen] Request timeout after ${timeoutMs}ms`);
    }, timeoutMs);

    let response: Response;
    try {
      // Call Qwen API with timeout
      response = await fetch(qwenApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout specifically
      if (fetchError.name === 'AbortError' || fetchError.code === 'UND_ERR_CONNECT_TIMEOUT') {
        console.error("[Qwen] Connection timeout - API server may be unreachable or slow");
        return NextResponse.json(
          { 
            error: "Qwen API 连接超时",
            details: "服务器响应时间过长，请稍后重试。如果问题持续，请联系管理员。"
          },
          { status: 504 } // Gateway Timeout
        );
      }
      
      // Handle other network errors
      if (fetchError.code === 'UND_ERR_CONNECT_TIMEOUT' || fetchError.message?.includes('timeout')) {
        console.error("[Qwen] Network timeout:", fetchError.message);
        return NextResponse.json(
          { 
            error: "Qwen API 连接超时",
            details: "无法连接到 Qwen 服务器，请检查网络连接或稍后重试。"
          },
          { status: 504 }
        );
      }
      
      // Handle connection errors
      if (fetchError.message?.includes('fetch failed') || fetchError.cause) {
        console.error("[Qwen] Connection failed:", fetchError.message, fetchError.cause);
        return NextResponse.json(
          { 
            error: "Qwen API 连接失败",
            details: "无法连接到 Qwen 服务器。请检查服务器状态或稍后重试。"
          },
          { status: 503 } // Service Unavailable
        );
      }
      
      // Re-throw other errors
      throw fetchError;
    }

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
    
    // Log the full response structure for debugging
    console.log("=== Qwen API Full Response ===");
    console.log("Response keys:", Object.keys(data));
    console.log("Code:", data.code);
    console.log("Data keys:", data.data ? Object.keys(data.data) : "No data");
    console.log("Has image:", !!data.data?.image);
    console.log("Image length:", data.data?.image?.length || 0);
    
    // Check if input image and output image are the same (first 100 chars)
    if (data.data?.image) {
      const outputImagePreview = data.data.image.substring(0, 100);
      const inputImagePreview = imageBase64.substring(0, 100);
      console.log("Output image preview:", outputImagePreview);
      console.log("Input image preview:", inputImagePreview);
      console.log("Are they the same?", outputImagePreview === inputImagePreview);
    }

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

