import { NextRequest, NextResponse } from "next/server";
import { getVertexAIClient } from "@/lib/vertexai";
import { HarmCategory, HarmBlockThreshold } from "@google/genai";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const aspectRatio = formData.get("aspectRatio") as string | null;
    const imageSize = (formData.get("imageSize") as string) || "2K";

    if (!prompt) {
      return NextResponse.json(
        { error: "缺少必需参数: prompt" },
        { status: 400 }
      );
    }

    const modelId = process.env.GEMINI_IMAGE_MODEL_ID || "gemini-3-pro-image-preview";

    console.log("=== Gemini Image API (SDK Mode) ===");
    console.log("Prompt:", prompt);
    console.log("Model ID:", modelId);
    console.log("Aspect Ratio:", aspectRatio);
    console.log("Image Size:", imageSize);

    // Get Vertex AI client
    const client = getVertexAIClient();

    console.log("Calling Gemini Image API via SDK...");
    const startTime = Date.now();

    // Build config with image settings and safety settings
    const config: any = {
      responseModalities: ["IMAGE", "TEXT"],
      imageSize: imageSize as "1K" | "2K",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    };
    if (aspectRatio && aspectRatio !== "default") {
      config.aspectRatio = aspectRatio as "1:1" | "16:9" | "9:16";
    }

    const response = await client.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: config,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Gemini Image API response received (${elapsed}s)`);

    // Extract images from response
    const images: string[] = [];

    if (response.candidates && Array.isArray(response.candidates)) {
      for (const candidate of response.candidates) {
        // Check finish reason
        if (candidate.finishReason && candidate.finishReason !== "STOP") {
          console.warn(`Finish reason: ${candidate.finishReason}`);
        }

        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            // Skip thought parts (use type assertion to check for thought property)
            if ((part as any).thought) {
              continue;
            }

            // Check for inline data (base64)
            if ((part as any).inlineData && (part as any).inlineData.data) {
              const mimeType = (part as any).inlineData.mimeType || "image/png";
              images.push(`data:${mimeType};base64,${(part as any).inlineData.data}`);
            }
            // Check for URI reference
            else if ((part as any).uri) {
              images.push((part as any).uri);
            }
          }
        }
      }
    }

    if (images.length === 0) {
      console.error("No images in Gemini Image API response");
      console.log("Response structure:", JSON.stringify(response, null, 2));
      return NextResponse.json(
        {
          error: "API 未返回图片",
          details: "响应中没有找到图片数据",
          response: response,
        },
        { status: 500 }
      );
    }

    console.log(`Successfully generated ${images.length} image(s) (total time: ${elapsed}s)`);

    return NextResponse.json({
      images: images,
      message: `成功生成 ${images.length} 张图片`,
    });
  } catch (error: any) {
    console.error("Error in Gemini Image API route:", error);
    return NextResponse.json(
      {
        error: error.message || "生成图片失败",
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

