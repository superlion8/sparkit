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
    const referenceImage = formData.get("referenceImage") as File;
    const characterImage = formData.get("characterImage") as File;
    const aspectRatio = formData.get("aspectRatio") as string;
    const numImages = parseInt(formData.get("numImages") as string) || 1;

    if (!referenceImage || !characterImage) {
      return NextResponse.json(
        { error: "需要提供参考图和角色图" },
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

    // Convert images to base64
    const referenceBuffer = await referenceImage.arrayBuffer();
    const referenceBase64 = Buffer.from(referenceBuffer).toString("base64");
    const characterBuffer = await characterImage.arrayBuffer();
    const characterBase64 = Buffer.from(characterBuffer).toString("base64");

    console.log("=== Mimic Generation Started ===");

    // Step 1: 反推提示词（使用 gemini-2.5-flash 文本模型）
    console.log("Step 1: 反推提示词...");
    const captionPrompt = await reverseCaptionPrompt(
      referenceBase64,
      referenceImage.type,
      apiKey
    );
    console.log("反推得到的提示词:", captionPrompt);

    // Step 2: 去掉人物（使用 gemini-2.5-flash-image 图像生成模型）
    console.log("Step 2: 去掉人物...");
    const backgroundImage = await removeCharacter(
      referenceBase64,
      referenceImage.type,
      aspectRatio,
      apiKey
    );
    console.log("背景图生成完成");

    // Step 3: 生成最终图片（使用 gemini-2.5-flash-image 图像生成模型）
    console.log("Step 3: 生成最终图片...");
    const finalImages: string[] = [];

    for (let i = 0; i < numImages; i++) {
      try {
        const finalImage = await generateFinalImage(
          characterBase64,
          characterImage.type,
          backgroundImage,
          captionPrompt,
          aspectRatio,
          apiKey
        );
        finalImages.push(finalImage);
      } catch (error: any) {
        console.error(`生成第 ${i + 1} 张图片失败:`, error);
        // If this is the first image and it fails, throw error
        // Otherwise, continue with successfully generated images
        if (i === 0 && finalImages.length === 0) {
          throw new Error(`生成最终图片失败: ${error.message}`);
        }
        // Log warning for subsequent failures
        console.warn(`跳过第 ${i + 1} 张图片，继续处理已生成的图片`);
      }
    }

    // Check if we have at least one final image
    if (finalImages.length === 0) {
      throw new Error("所有图片生成都失败，请重试");
    }

    console.log("=== Mimic Generation Completed ===");

    // Upload images to Aimovely if configured
    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;

    let uploadedBackgroundImage = backgroundImage;
    const uploadedFinalImages: string[] = [];

    if (aimovelyEmail && aimovelyVcode) {
      try {
        const aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
        if (aimovelyToken) {
          // Upload background image
          const bgUploadResult = await uploadImageToAimovely(
            backgroundImage,
            aimovelyToken,
            "background"
          );
          if (bgUploadResult?.url) {
            uploadedBackgroundImage = bgUploadResult.url;
          }

          // Upload final images
          for (const finalImage of finalImages) {
            const finalUploadResult = await uploadImageToAimovely(
              finalImage,
              aimovelyToken,
              "final"
            );
            if (finalUploadResult?.url) {
              uploadedFinalImages.push(finalUploadResult.url);
            } else {
              uploadedFinalImages.push(finalImage);
            }
          }
        }
      } catch (uploadError) {
        console.error("上传到 Aimovely 失败:", uploadError);
        // Fallback to base64 images
        uploadedFinalImages.push(...finalImages);
      }
    } else {
      uploadedFinalImages.push(...finalImages);
    }

    return NextResponse.json({
      captionPrompt,
      backgroundImage: uploadedBackgroundImage,
      finalImages: uploadedFinalImages.length > 0 ? uploadedFinalImages : finalImages,
      backgroundImageBase64: backgroundImage, // Also return base64 for display
      finalImagesBase64: finalImages, // Also return base64 for display
    });
  } catch (error: any) {
    console.error("Error in Mimic generation:", error);
    console.error("Error stack:", error.stack);
    
    // Determine status code based on error type
    let statusCode = 500;
    if (error.message?.includes("安全过滤") || error.message?.includes("SAFETY")) {
      statusCode = 400;
    } else if (error.message?.includes("未找到") || error.message?.includes("未返回")) {
      statusCode = 500;
    }
    
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        details: error.details || null
      },
      { status: statusCode }
    );
  }
}

// Step 1: 反推提示词（使用 gemini-2.5-flash 文本模型）
async function reverseCaptionPrompt(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<string> {
  const prompt = "反推下这张图片的提示词，不要包含人物的样貌信息";

  const contents = [
    {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
        { text: prompt },
      ],
    },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini API error (reverse caption):", error);
    throw new Error("反推提示词失败");
  }

  const data = await response.json();
  console.log("Gemini API 响应 (reverse caption):", JSON.stringify(data, null, 2));

  // Check for API errors
  if (data.error) {
    console.error("Gemini API 返回错误:", data.error);
    throw new Error(`Gemini API 错误: ${data.error.message || '未知错误'}`);
  }

  // Check for candidates
  if (!data.candidates || data.candidates.length === 0) {
    console.error("没有 candidates 或为空");
    console.error("完整 API 响应:", JSON.stringify(data, null, 2));
    const error: any = new Error("API 未返回候选结果，请稍后重试");
    error.details = { response: data };
    throw error;
  }

  const candidate = data.candidates[0];
  
  // Check finish reason first (before checking content)
  if (candidate.finishReason) {
    if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
      console.error("内容被安全过滤阻止:", candidate.finishReason);
      console.error("安全评级:", candidate.safetyRatings);
      const error: any = new Error("内容被安全过滤阻止，请尝试其他图片");
      error.details = {
        finishReason: candidate.finishReason,
        safetyRatings: candidate.safetyRatings
      };
      throw error;
    }
    
    // Other finish reasons like "STOP" usually mean success
    console.log("Finish reason:", candidate.finishReason);
  }

  // Check for content
  if (!candidate.content || !candidate.content.parts) {
    console.error("候选结果中没有 content 或 parts");
    console.error("候选结果详情:", JSON.stringify(candidate, null, 2));
    let errorMsg = "未找到反推的提示词";
    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      errorMsg += `。原因: ${candidate.finishReason}`;
    }
    const error: any = new Error(errorMsg);
    error.details = {
      finishReason: candidate.finishReason,
      safetyRatings: candidate.safetyRatings,
      candidate: candidate
    };
    throw error;
  }

  // Extract text from parts
  let text = "";
  for (const part of candidate.content.parts) {
    if (part.text) {
      text += part.text;
    } else {
      console.log("部分内容不是文本:", part);
    }
  }

  const trimmedText = text.trim();
  
  if (!trimmedText) {
    console.error("提取的文本为空");
    console.error("所有 parts:", JSON.stringify(candidate.content.parts, null, 2));
    console.error("Finish reason:", candidate.finishReason);
    console.error("Safety ratings:", candidate.safetyRatings);
    
    let errorMsg = "未找到反推的提示词";
    
    // Check finish reason
    if (candidate.finishReason) {
      if (candidate.finishReason === "STOP") {
        // STOP usually means success, but we got no text
        errorMsg += "。API 返回成功但未生成文本内容";
      } else if (candidate.finishReason === "MAX_TOKENS") {
        errorMsg += "。达到最大令牌数限制";
      } else {
        errorMsg += `。原因: ${candidate.finishReason}`;
      }
    }
    
    // Check safety ratings
    if (candidate.safetyRatings && Array.isArray(candidate.safetyRatings)) {
      const blockedCategories = candidate.safetyRatings
        .filter((rating: any) => rating.probability === "HIGH" || rating.probability === "MEDIUM")
        .map((rating: any) => rating.category);
      if (blockedCategories.length > 0) {
        errorMsg += `。可能触发了安全过滤: ${blockedCategories.join(", ")}`;
      }
    }
    
    const error: any = new Error(errorMsg);
    error.details = {
      finishReason: candidate.finishReason,
      safetyRatings: candidate.safetyRatings,
      parts: candidate.content.parts,
      fullCandidate: candidate
    };
    throw error;
  }

  console.log("成功提取反推的提示词，长度:", trimmedText.length);
  return trimmedText;
}

// Step 2: 去掉人物（使用 gemini-2.5-flash-image 图像生成模型）
async function removeCharacter(
  imageBase64: string,
  mimeType: string,
  aspectRatio: string | null,
  apiKey: string
): Promise<string> {
  const prompt = "去掉这张图片中的人物";

  const contents = [
    {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
        { text: prompt },
      ],
    },
  ];

  const generationConfig: any = {
    responseModalities: ["IMAGE"],
  };

  if (aspectRatio) {
    generationConfig.imageConfig = {
      aspectRatio: aspectRatio,
    };
  }

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
    console.error("Gemini API error (remove character):", error);
    throw new Error("去掉人物失败");
  }

  const data = await response.json();
  console.log("Gemini API 响应 (remove character):", JSON.stringify(data, null, 2));

  // Check for API errors
  if (data.error) {
    console.error("Gemini API 返回错误:", data.error);
    throw new Error(`Gemini API 错误: ${data.error.message || '未知错误'}`);
  }

  // Check for candidates
  if (!data.candidates || data.candidates.length === 0) {
    console.error("没有 candidates 或为空");
    throw new Error("API 未返回候选结果，请稍后重试");
  }

  // Extract generated image and check finish reason
  for (const candidate of data.candidates) {
    // Check finish reason
    if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
      console.error("内容被安全过滤阻止:", candidate.finishReason);
      throw new Error("内容被安全过滤阻止，请尝试其他图片");
    }

    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          return dataUrl;
        }
      }
    }
  }

  // No image found
  let errorMsg = "未找到生成的背景图";
  const candidate = data.candidates[0];
  if (candidate.finishReason) {
    errorMsg += `。原因: ${candidate.finishReason}`;
  }
  if (candidate.safetyRatings) {
    errorMsg += `。安全评级: ${JSON.stringify(candidate.safetyRatings)}`;
  }
  throw new Error(errorMsg);
}

// Step 3: 生成最终图片（使用 gemini-2.5-flash-image 图像生成模型）
async function generateFinalImage(
  characterBase64: string,
  characterMimeType: string,
  backgroundImage: string,
  captionPrompt: string,
  aspectRatio: string | null,
  apiKey: string
): Promise<string> {
  // Convert background image (data URL) back to base64 if needed
  let backgroundBase64 = backgroundImage;
  let backgroundMimeType = "image/png";

  if (backgroundImage.startsWith("data:")) {
    const parts = backgroundImage.split(",");
    const metadata = parts[0];
    backgroundBase64 = parts[1];
    const mimeMatch = metadata.match(/data:(.*?);base64/);
    if (mimeMatch) {
      backgroundMimeType = mimeMatch[1];
    }
  }

  // Build prompt combining caption and character instruction
  // 将角色图中的角色替换到背景图中，保持背景场景不变，角色应该自然地融入背景
  const prompt = `根据以下描述生成图片：${captionPrompt}。将提供的角色图替换到背景图中，保持背景场景和风格不变，确保角色自然地融入背景环境。`;

  const contents = [
    {
      parts: [
        {
          inlineData: {
            mimeType: characterMimeType,
            data: characterBase64,
          },
        },
        {
          inlineData: {
            mimeType: backgroundMimeType,
            data: backgroundBase64,
          },
        },
        { text: prompt },
      ],
    },
  ];

  const generationConfig: any = {
    responseModalities: ["IMAGE"],
  };

  if (aspectRatio) {
    generationConfig.imageConfig = {
      aspectRatio: aspectRatio,
    };
  }

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
    console.error("Gemini API error (generate final):", error);
    throw new Error("生成最终图片失败");
  }

  const data = await response.json();
  console.log("Gemini API 响应 (generate final):", JSON.stringify(data, null, 2));

  // Check for API errors
  if (data.error) {
    console.error("Gemini API 返回错误:", data.error);
    throw new Error(`Gemini API 错误: ${data.error.message || '未知错误'}`);
  }

  // Check for candidates
  if (!data.candidates || data.candidates.length === 0) {
    console.error("没有 candidates 或为空");
    throw new Error("API 未返回候选结果，请稍后重试");
  }

  // Extract generated image and check finish reason
  for (const candidate of data.candidates) {
    // Check finish reason
    if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
      console.error("内容被安全过滤阻止:", candidate.finishReason);
      throw new Error("内容被安全过滤阻止，请尝试调整提示词或图片");
    }

    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          return dataUrl;
        }
      }
    }
  }

  // No image found
  let errorMsg = "未找到生成的最终图片";
  const candidate = data.candidates[0];
  if (candidate.finishReason) {
    errorMsg += `。原因: ${candidate.finishReason}`;
  }
  if (candidate.safetyRatings) {
    errorMsg += `。安全评级: ${JSON.stringify(candidate.safetyRatings)}`;
  }
  throw new Error(errorMsg);
}

// Helper functions for Aimovely integration
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

async function uploadImageToAimovely(
  dataUrl: string,
  token: string,
  prefix: string
): Promise<UploadResult | null> {
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
  const fileName = `mimic-${prefix}-${Date.now()}.${mimeType.split("/")[1] ?? "png"}`;

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

