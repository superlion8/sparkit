import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const image = formData.get("image") as File | null;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.BFL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "BFL API key not configured" },
        { status: 500 }
      );
    }

    // Build request body
    const requestBody: any = {
      prompt,
    };

    // If image is provided, convert to base64
    if (image) {
      const buffer = await image.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      requestBody.input_image = base64;
    }

    // Call BFL API to start generation
    const response = await fetch(
      "https://api.bfl.ai/v1/flux-kontext-pro",
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "x-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("BFL API error:", error);
      return NextResponse.json(
        { error: "Failed to start generation" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Poll for result
    const pollingUrl = data.polling_url;
    const requestId = data.id;
    
    let result = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const pollResponse = await fetch(pollingUrl, {
        headers: {
          "accept": "application/json",
          "x-key": apiKey,
        },
      });

      if (!pollResponse.ok) {
        throw new Error("Polling failed");
      }

      const pollData = await pollResponse.json();
      
      if (pollData.status === "Ready") {
        result = pollData.result;
        break;
      } else if (pollData.status === "Error") {
        throw new Error("Generation failed");
      }
      
      attempts++;
    }

    if (!result) {
      return NextResponse.json(
        { error: "Generation timeout" },
        { status: 408 }
      );
    }

    // 下载图片并上传（优先 Aimovely，失败回退 Supabase Storage）
    const { getAimovelyCredentials, uploadImageWithFallback } = await import("@/lib/upload");
    const credentials = await getAimovelyCredentials();

    try {
      // Download image from BFL URL
      const imageResponse = await fetch(result.sample);
      if (!imageResponse.ok) {
        console.error("Failed to download image from BFL");
        return NextResponse.json({ 
          images: [result.sample],
          requestId 
        });
      }

      const imageBlob = await imageResponse.blob();
      const buffer = Buffer.from(await imageBlob.arrayBuffer());
      const base64 = buffer.toString("base64");
      const mimeType = imageBlob.type || "image/png";
      const dataUrl = `data:${mimeType};base64,${base64}`;

      // Upload with fallback
      const uploadResult = await uploadImageWithFallback(
        dataUrl,
        credentials?.token || null,
        "flux-image"
      );

      if (uploadResult?.url) {
        console.log("Flux image uploaded:", uploadResult.url, `(${uploadResult.source})`);
        return NextResponse.json({ 
          images: [uploadResult.url],
          requestId 
        });
      }
    } catch (uploadError) {
      console.error("Failed to upload Flux image:", uploadError);
    }

    // Fallback to original URL
    return NextResponse.json({ 
      images: [result.sample],
      requestId 
    });
  } catch (error) {
    console.error("Error in Flux generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 上传函数已移至 @/lib/upload
