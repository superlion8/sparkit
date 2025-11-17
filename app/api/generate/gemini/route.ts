import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    console.log("=== Gemini 图生图 API 调用开始 ===");
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const images = formData.getAll("images") as File[];
    const aspectRatio = formData.get("aspectRatio") as string;

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
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

    // Build request body
    const contents = [
      {
        parts: [
          { text: promptWithNegatives },
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
    console.log("请求体大小:", JSON.stringify({ contents, generationConfig }).length, "字符");
    console.log("Parts 数量:", contents[0].parts.length);

    // Call Gemini API (using image generation model)
    // 根据官方文档: https://ai.google.dev/gemini-api/docs/image-generation
    console.log("开始调用 Gemini API...");
    const apiStartTime = Date.now();
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
          safetySettings: [
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH"
            }
          ],
        }),
      }
    );
    const apiEndTime = Date.now();
    console.log(`Gemini API 响应时间: ${apiEndTime - apiStartTime}ms`);
    console.log("响应状态:", response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API HTTP 错误:", response.status, response.statusText);
      console.error("错误响应内容:", error);
      return NextResponse.json(
        { 
          error: "Failed to generate image",
          details: {
            status: response.status,
            statusText: response.statusText,
            error: error
          }
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Gemini API 响应状态: OK");
    console.log("响应数据 keys:", Object.keys(data));
    console.log("Candidates 数量:", data.candidates?.length || 0);
    if (data.candidates && data.candidates.length > 0) {
      console.log("第一个 candidate 的 keys:", Object.keys(data.candidates[0]));
    }
    console.log("完整 API 响应:", JSON.stringify(data, null, 2));
    
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
      for (let i = 0; i < data.candidates.length; i++) {
        const candidate = data.candidates[i];
        console.log(`处理 candidate ${i + 1}:`, {
          finishReason: candidate.finishReason,
          hasContent: !!candidate.content,
          hasParts: !!candidate.content?.parts,
          partsCount: candidate.content?.parts?.length || 0
        });
        
        // Check finish reason
        if (candidate.finishReason) {
          finishReason = candidate.finishReason;
          console.log(`Candidate ${i + 1} finish reason:`, finishReason);
        }
        
        // Check safety ratings
        if (candidate.safetyRatings) {
          safetyRatings = candidate.safetyRatings;
          console.log(`Candidate ${i + 1} safety ratings:`, JSON.stringify(safetyRatings, null, 2));
        }
        
        if (candidate.content && candidate.content.parts) {
          console.log(`Candidate ${i + 1} 处理 parts:`, candidate.content.parts.length);
          for (let j = 0; j < candidate.content.parts.length; j++) {
            const part = candidate.content.parts[j];
            console.log(`  Part ${j + 1}:`, {
              hasInlineData: !!part.inlineData,
              hasText: !!part.text,
              mimeType: part.inlineData?.mimeType,
              dataLength: part.inlineData?.data?.length
            });
            
            if (part.inlineData) {
              console.log(`找到图片数据 (candidate ${i + 1}, part ${j + 1}), mimeType:`, part.inlineData.mimeType);
              console.log(`图片数据长度:`, part.inlineData.data?.length || 0);
              // Convert to data URL
              const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              generatedImages.push(dataUrl);
              console.log(`成功添加图片到数组，当前图片数量:`, generatedImages.length);
            } else if (part.text) {
              console.log(`文本内容 (candidate ${i + 1}, part ${j + 1}):`, part.text.substring(0, 100));
            } else {
              console.warn(`Part ${j + 1} 既没有 inlineData 也没有 text:`, Object.keys(part));
            }
          }
        } else {
          console.warn(`Candidate ${i + 1} 没有 content 或 parts:`, {
            hasContent: !!candidate.content,
            hasParts: !!candidate.content?.parts
          });
        }
      }
    } else {
      console.error("没有 candidates 或为空");
      console.error("完整 API 响应:", JSON.stringify(data, null, 2));
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
        } else if (finishReason === "IMAGE_OTHER") {
          errorMessage += "。图片生成遇到问题，可能是图片格式、大小或内容不符合要求";
          console.error("IMAGE_OTHER finishReason - 可能的原因:");
          console.error("- 图片格式不支持");
          console.error("- 图片太大或太小");
          console.error("- 图片内容不适合生成");
          console.error("- API 限制或配额问题");
        } else {
          errorMessage += `。原因: ${finishReason}`;
          console.error(`未知的 finishReason: ${finishReason}`);
        }
      } else {
        errorMessage += "。请检查提示词和图片内容，或稍后重试";
        console.error("没有 finishReason，可能是 API 响应格式异常");
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
          partsCount: c.content?.parts?.length || 0,
          parts: c.content?.parts?.map((p: any) => ({
            hasInlineData: !!p.inlineData,
            hasText: !!p.text,
            mimeType: p.inlineData?.mimeType,
            textPreview: p.text ? p.text.substring(0, 100) : null
          })) || []
        }));
      } else {
        // If no candidates, include full response for debugging
        errorDetails.fullResponse = data;
      }
      
      // Log detailed error information
      console.error("=== Gemini API 错误详情 ===");
      console.error("错误消息:", errorMessage);
      console.error("Finish reason:", finishReason);
      console.error("Safety ratings:", safetyRatings);
      console.error("生成的图片数量:", generatedImages.length);
      console.error("Candidates 数量:", data.candidates?.length || 0);
      console.error("错误详情:", JSON.stringify(errorDetails, null, 2));
      console.error("=== 错误详情结束 ===");
      
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
