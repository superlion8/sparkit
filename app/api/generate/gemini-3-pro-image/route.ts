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

    // Try to upload to Aimovely if credentials are available
    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;

    let uploadedUrls: string[] = [];

    if (aimovelyEmail && aimovelyVcode) {
      try {
        const aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
        if (aimovelyToken) {
          // Upload images to Aimovely
          for (let index = 0; index < generatedImages.length; index++) {
            const dataUrl = generatedImages[index];

            try {
              const result = await uploadImageToAimovely(dataUrl, aimovelyToken, index);
              if (result?.url) {
                uploadedUrls.push(result.url);
              } else {
                console.warn("Upload result missing URL, keeping base64 fallback");
                uploadedUrls.push(dataUrl);
              }
            } catch (uploadError) {
              console.error("上传生成图片失败:", uploadError);
              uploadedUrls.push(dataUrl);
            }
          }
        } else {
          console.warn("Failed to acquire Aimovely token, using base64 images");
          uploadedUrls = [...generatedImages];
        }
      } catch (uploadError) {
        console.error("Aimovely upload error:", uploadError);
        uploadedUrls = [...generatedImages];
      }
    } else {
      console.warn("Aimovely credentials not configured, using base64 images");
      uploadedUrls = [...generatedImages];
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

async function fetchAimovelyToken(email: string, vcode: string): Promise<string | null> {
  try {
    const response = await fetch(`${AIMOVELY_API_URL}/v1/user/verifyvcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        vcode,
      }),
    });

    if (!response.ok) {
      console.error("Aimovely token request failed:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    if (data.code !== 0 || !data.data?.access_token) {
      console.error("Aimovely token response invalid:", data);
      return null;
    }

    return data.data.access_token as string;
  } catch (error) {
    console.error("Error fetching Aimovely token:", error);
    return null;
  }
}

interface UploadResult {
  url: string;
  resource_id: string;
}

async function uploadImageToAimovely(dataUrl: string, token: string, index: number): Promise<UploadResult | null> {
  if (!dataUrl.startsWith("data:")) {
    console.warn("Unsupported image format, expected data URL");
    return null;
  }

  const [metadata, base64Data] = dataUrl.split(",");
  const mimeMatch = metadata.match(/data:(.*?);base64/);
  if (!mimeMatch) {
    console.warn("Failed to parse data URL metadata");
    return null;
  }

  const mimeType = mimeMatch[1] || "image/png";
  const buffer = Buffer.from(base64Data, "base64");
  const fileName = `gemini-3-pro-image-${Date.now()}-${index}.${mimeType.split("/")[1] ?? "png"}`;

  const file = new File([buffer], fileName, { type: mimeType });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("biz", "external_tool");
  formData.append("template_id", "1");

  const response = await fetch(`${AIMOVELY_API_URL}/v1/resource/upload`, {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body: formData,
  });

  if (!response.ok) {
    console.error("Aimovely upload failed:", response.status, await response.text());
    return null;
  }

  const result = await response.json();
  if (result.code !== 0) {
    console.error("Aimovely upload API error:", result);
    return null;
  }

  return {
    url: result.data?.url,
    resource_id: result.data?.resource_id,
  };
}

