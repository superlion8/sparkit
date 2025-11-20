import { NextRequest, NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const aspectRatio = (formData.get("aspectRatio") as string) || "16:9";
    const imageSize = (formData.get("imageSize") as string) || "2K";

    if (!prompt) {
      return NextResponse.json(
        { error: "缺少必需参数: prompt" },
        { status: 400 }
      );
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || "composite-silo-470413-r9";
    const location = process.env.GOOGLE_CLOUD_LOCATION || "global";
    const modelId = process.env.GEMINI_IMAGE_MODEL_ID || "gemini-3-pro-image-preview";

    console.log("=== Gemini Image API (SDK Mode) ===");
    console.log("Prompt:", prompt);
    console.log("Project ID:", projectId);
    console.log("Location:", location);
    console.log("Model ID:", modelId);
    console.log("Aspect Ratio:", aspectRatio);
    console.log("Image Size:", imageSize);

    // Initialize Vertex AI client
    // SDK will automatically use:
    // 1. GOOGLE_APPLICATION_CREDENTIALS environment variable (service account JSON)
    // 2. Application Default Credentials (gcloud auth application-default login)
    // 3. GCE/Cloud Run metadata service (if running on GCP)
    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });

    const model = vertexAI.getGenerativeModel({
      model: modelId,
    });

    console.log("Calling Gemini Image API via SDK...");
    const startTime = Date.now();

    // Generate content with image configuration
    // Use type assertion to bypass strict SDK type checking
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: {
          aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16",
          imageSize: imageSize as "1K" | "2K",
        },
      } as any, // Type assertion to bypass SDK type checking
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Gemini Image API response received (${elapsed}s)`);

    // Extract images from response
    const images: string[] = [];
    const responseData = response.response;

    if (responseData.candidates && Array.isArray(responseData.candidates)) {
      for (const candidate of responseData.candidates) {
        // Check finish reason
        if (candidate.finishReason && candidate.finishReason !== "STOP") {
          console.warn(`Finish reason: ${candidate.finishReason}`);
        }

        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            // Skip thought parts
            if (part.thought) {
              continue;
            }

            // Check for inline data (base64)
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || "image/png";
              images.push(`data:${mimeType};base64,${part.inlineData.data}`);
            }
            // Check for URI reference
            else if (part.uri) {
              images.push(part.uri);
            }
          }
        }
      }
    }

    if (images.length === 0) {
      console.error("No images in Gemini Image API response");
      console.log("Response structure:", JSON.stringify(responseData, null, 2));
      return NextResponse.json(
        {
          error: "API 未返回图片",
          details: "响应中没有找到图片数据",
          response: responseData,
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

