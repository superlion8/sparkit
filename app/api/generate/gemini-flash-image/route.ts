import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { getVertexAIClient } from "@/lib/vertexai";
import { HarmCategory, HarmBlockThreshold } from "@google/genai";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    console.log("=== Gemini 2.5 Flash Image API 调用开始 ===");
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const images = formData.getAll("images") as File[];
    const aspectRatio = formData.get("aspectRatio") as string;
    // 注意：gemini-2.5-flash-image 不支持选择分辨率

    console.log("请求参数:", {
      promptLength: prompt?.length || 0,
      imagesCount: images.length,
      aspectRatio: aspectRatio || "未指定"
    });

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Convert images to base64 if provided
    console.log("开始转换图片为 base64...");
    const imageParts = await Promise.all(
      images.map(async (image, index) => {
        console.log(`处理图片 ${index + 1}:`, {
          name: image.name,
          type: image.type,
          size: image.size,
          sizeMB: (image.size / (1024 * 1024)).toFixed(2)
        });
        const buffer = await image.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        console.log(`图片 ${index + 1} base64 长度:`, base64.length);
        return {
          inlineData: {
            mimeType: image.type,
            data: base64,
          },
        };
      })
    );
    console.log(`成功转换 ${imageParts.length} 张图片`);

    // Add negatives to prompt
    const promptWithNegatives = `${prompt}

negatives: beauty-filter/airbrushed skin; poreless look, exaggerated or distorted anatomy, fake portrait-mode blur, CGI/illustration look`;

    // Build parts array
    const parts: any[] = [
      { text: promptWithNegatives },
      ...imageParts,
    ];

    // 使用 gemini-2.5-flash-image 模型
    const modelId = "gemini-2.5-flash-image";

    // Get Vertex AI client
    const client = getVertexAIClient();

    console.log("Calling Gemini 2.5 Flash Image API via SDK...");
    const startTime = Date.now();

    // Build config - gemini-2.5-flash-image 不支持 imageSize
    const config: any = {
      responseModalities: ["IMAGE", "TEXT"],
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

    // Add aspect ratio if specified (in imageConfig object per SDK interface)
    if (aspectRatio && aspectRatio !== "default") {
      config.imageConfig = {
        aspectRatio: aspectRatio
      };
    }

    console.log("Generation config:", JSON.stringify(config, null, 2));

    const response = await client.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts }],
      config: config,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Gemini 2.5 Flash Image API response received (${elapsed}s)`);

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
      console.error("No images in Gemini 2.5 Flash Image API response");
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
      "gemini-flash-image"
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
    console.error("Error in Gemini 2.5 Flash Image API route:", error);
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
