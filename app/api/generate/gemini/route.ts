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
    const images = formData.getAll("images") as File[];
    const aspectRatio = formData.get("aspectRatio") as string;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    // Convert images to base64 if provided
    const imageParts = await Promise.all(
      images.map(async (image) => {
        const buffer = await image.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return {
          inlineData: {
            mimeType: image.type,
            data: base64,
          },
        };
      })
    );

    // Build request body
    const contents = [
      {
        parts: [
          { text: prompt },
          ...imageParts,
        ],
      },
    ];

    // Build generation config
    const generationConfig: any = {
      responseModalities: ["IMAGE"],
    };

    // Add aspect ratio if provided
    if (aspectRatio) {
      generationConfig.imageConfig = {
        aspectRatio: aspectRatio,
      };
    }

    console.log("Generation config:", JSON.stringify(generationConfig, null, 2));

    // Call Gemini API (using image generation model)
    // 根据官方文档: https://ai.google.dev/gemini-api/docs/image-generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          contents,
          generationConfig,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Gemini API 响应:", JSON.stringify(data, null, 2));
    
    // Check for API errors
    if (data.error) {
      console.error("Gemini API 返回错误:", data.error);
      return NextResponse.json(
        { error: `Gemini API 错误: ${data.error.message || '未知错误'}` },
        { status: 500 }
      );
    }
    
    // Extract generated images
    const generatedImages: string[] = [];
    let finishReason = null;
    let safetyRatings = null;
    
    if (data.candidates && data.candidates.length > 0) {
      console.log("找到 candidates:", data.candidates.length);
      for (const candidate of data.candidates) {
        // Check finish reason
        if (candidate.finishReason) {
          finishReason = candidate.finishReason;
          console.log("Finish reason:", finishReason);
        }
        
        // Check safety ratings
        if (candidate.safetyRatings) {
          safetyRatings = candidate.safetyRatings;
          console.log("Safety ratings:", JSON.stringify(safetyRatings, null, 2));
        }
        
        if (candidate.content && candidate.content.parts) {
          console.log("处理 parts:", candidate.content.parts.length);
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              console.log("找到图片数据, mimeType:", part.inlineData.mimeType);
              // Convert to data URL
              const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              generatedImages.push(dataUrl);
            } else if (part.text) {
              console.log("文本内容:", part.text);
            }
          }
        }
      }
    } else {
      console.log("没有 candidates 或为空");
    }

    console.log("生成的图片数量:", generatedImages.length);
    
    // Check if generation was blocked by safety filters
    if (finishReason === "SAFETY" || finishReason === "RECITATION") {
      console.error("内容被安全过滤阻止:", finishReason);
      return NextResponse.json(
        { 
          error: "内容被安全过滤阻止，请尝试调整提示词或图片",
          details: {
            finishReason,
            safetyRatings
          }
        },
        { status: 400 }
      );
    }
    
    // Check if no images were generated
    if (generatedImages.length === 0) {
      console.error("未生成任何图片");
      console.error("API 响应详情:", JSON.stringify(data, null, 2));
      
      let errorMessage = "未生成任何图片";
      let errorDetails: any = {
        finishReason,
        safetyRatings,
      };
      
      if (finishReason) {
        if (finishReason === "STOP") {
          errorMessage += "。API 返回成功但未生成图片，可能是提示词或图片不合适";
        } else if (finishReason === "MAX_TOKENS") {
          errorMessage += "。达到最大令牌数限制";
        } else {
          errorMessage += `。原因: ${finishReason}`;
        }
      } else {
        errorMessage += "。请检查提示词和图片内容，或稍后重试";
      }
      
      if (safetyRatings && Array.isArray(safetyRatings)) {
        const blockedCategories = safetyRatings.filter((rating: any) => 
          rating.probability === "HIGH" || rating.probability === "MEDIUM"
        ).map((rating: any) => rating.category);
        if (blockedCategories.length > 0) {
          errorMessage += `。可能触发了安全过滤: ${blockedCategories.join(", ")}`;
        }
      }
      
      // Add candidates info for debugging
      if (data.candidates && data.candidates.length > 0) {
        errorDetails.candidates = data.candidates.map((c: any) => ({
          finishReason: c.finishReason,
          safetyRatings: c.safetyRatings,
          hasContent: !!c.content,
          partsCount: c.content?.parts?.length || 0
        }));
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorDetails
        },
        { status: 500 }
      );
    }

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
      base64Images: base64Images // Always return base64 for client-side use
    });
  } catch (error) {
    console.error("Error in Gemini generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
  const fileName = `gemini-image-${Date.now()}-${index}.${mimeType.split("/")[1] ?? "png"}`;

  const file = new File([buffer], fileName, { type: mimeType });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("biz", "external_tool");

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
