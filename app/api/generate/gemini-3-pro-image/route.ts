import { NextRequest, NextResponse } from "next/server";
import { getVertexAIClient } from "@/lib/vertexai";
import { HarmCategory, HarmBlockThreshold } from "@google/genai";
import { validateRequestAuth } from "@/lib/auth";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const aspectRatio = formData.get("aspectRatio") as string | null;
    const imageSize = (formData.get("imageSize") as string) || "2K";
    const images = formData.getAll("images") as File[];

    if (!prompt) {
      return NextResponse.json(
        { error: "缺少必需参数: prompt" },
        { status: 400 }
      );
    }

    const modelId = process.env.GEMINI_IMAGE_MODEL_ID || "gemini-3-pro-image-preview";

    console.log("=== Gemini 3 Pro Image Preview API ===");
    console.log("Prompt:", prompt);
    console.log("Model ID:", modelId);
    console.log("Aspect Ratio:", aspectRatio);
    console.log("Image Size:", imageSize);
    console.log("Input Images Count:", images.length);

    // Get Vertex AI client
    const client = getVertexAIClient();

    console.log("Preparing content parts...");
    const startTime = Date.now();

    // Build parts array
    const parts: any[] = [{ text: prompt }];

    // Add input images if provided (for image-to-image)
    if (images.length > 0) {
      console.log(`Converting ${images.length} input image(s) to base64...`);
      for (const image of images) {
        const buffer = await image.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        parts.push({
          inlineData: {
            mimeType: image.type || "image/png",
            data: base64,
          },
        });
      }
      console.log("Input images converted successfully");
    }

    // Build config
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

    console.log("Calling Gemini 3 Pro Image Preview API via SDK...");
    const response = await client.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts }],
      config: config,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Gemini 3 Pro Image Preview API response received (${elapsed}s)`);

    // Extract images from response
    const generatedImages: string[] = [];

    if (response.candidates && Array.isArray(response.candidates)) {
      for (const candidate of response.candidates) {
        // Check finish reason
        if (candidate.finishReason && candidate.finishReason !== "STOP") {
          console.warn(`Finish reason: ${candidate.finishReason}`);
          if (candidate.finishReason === "SAFETY") {
            return NextResponse.json(
              {
                error: "内容被安全过滤阻止，请尝试调整提示词或图片",
                details: {
                  finishReason: candidate.finishReason,
                  safetyRatings: candidate.safetyRatings,
                },
              },
              { status: 400 }
            );
          }
        }

        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            // Skip thought parts
            if ((part as any).thought) {
              continue;
            }

            // Check for inline data (base64)
            if ((part as any).inlineData && (part as any).inlineData.data) {
              const mimeType = (part as any).inlineData.mimeType || "image/png";
              generatedImages.push(`data:${mimeType};base64,${(part as any).inlineData.data}`);
            }
            // Check for URI reference
            else if ((part as any).uri) {
              generatedImages.push((part as any).uri);
            }
          }
        }
      }
    }

    if (generatedImages.length === 0) {
      console.error("No images in Gemini 3 Pro Image Preview API response");
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

    console.log(`Successfully generated ${generatedImages.length} image(s) (total time: ${elapsed}s)`);

    // Prepare base64 images for return
    const base64Images: string[] = [...generatedImages];

    // 上传图片（优先 Aimovely，失败回退 Supabase Storage）
    const { getAimovelyCredentials, uploadImagesWithFallback } = await import("@/lib/upload");
    
    let uploadedUrls: string[] = [];
    const credentials = await getAimovelyCredentials();
    const uploadResults = await uploadImagesWithFallback(
      generatedImages,
      credentials?.token || null,
      "gemini-3-pro-image"
    );
    
    // 处理上传结果
    for (let i = 0; i < generatedImages.length; i++) {
      const result = uploadResults[i];
      if (result?.url) {
        uploadedUrls.push(result.url);
      } else {
        console.warn(`图片 ${i + 1} 上传失败，使用 base64`);
        uploadedUrls.push(generatedImages[i]);
      }
    }

    return NextResponse.json({
      images: uploadedUrls.length > 0 ? uploadedUrls : base64Images,
      base64Images: base64Images, // Always return base64 for client-side use
      message: `成功生成 ${generatedImages.length} 张图片`,
    });
  } catch (error: any) {
    console.error("Error in Gemini 3 Pro Image Preview API route:", error);
    return NextResponse.json(
      {
        error: error.message || "生成图片失败",
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

// 上传函数已移至 @/lib/upload

