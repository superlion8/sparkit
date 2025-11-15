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
    const characterImages = formData.getAll("characterImage") as File[];
    const aspectRatio = formData.get("aspectRatio") as string;
    const numImages = parseInt(formData.get("numImages") as string) || 1;
    const keepBackground = formData.get("keepBackground") === "true";

    if (!referenceImage || !characterImages || characterImages.length === 0) {
      return NextResponse.json(
        { error: "需要提供参考图和至少一张角色图" },
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

    // Convert reference image to base64
    const referenceBuffer = await referenceImage.arrayBuffer();
    const referenceBase64 = Buffer.from(referenceBuffer).toString("base64");

    // Convert all character images to base64
    const characterImagesData: Array<{ base64: string; mimeType: string; file: File }> = [];
    for (const characterImage of characterImages) {
      const characterBuffer = await characterImage.arrayBuffer();
      const characterBase64 = Buffer.from(characterBuffer).toString("base64");
      characterImagesData.push({
        base64: characterBase64,
        mimeType: characterImage.type,
        file: characterImage,
      });
    }
    
    console.log(`收到 ${characterImagesData.length} 张角色图`);

    console.log("=== Mimic Generation Started ===");

    // Upload input images to Aimovely first
    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;
    let aimovelyToken: string | null = null;
    let uploadedReferenceImageUrl: string | null = null;
    const uploadedCharacterImageUrls: string[] = [];

    if (aimovelyEmail && aimovelyVcode) {
      try {
        aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
        if (aimovelyToken) {
          console.log("开始上传输入图片到 Aimovely...");
          
          // Upload reference image
          const referenceDataUrl = `data:${referenceImage.type};base64,${referenceBase64}`;
          const referenceUploadResult = await uploadImageToAimovely(
            referenceDataUrl,
            aimovelyToken,
            "reference"
          );
          if (referenceUploadResult?.url) {
            uploadedReferenceImageUrl = referenceUploadResult.url;
            console.log("参考图上传成功:", uploadedReferenceImageUrl);
          }

          // Upload all character images
          for (let i = 0; i < characterImagesData.length; i++) {
            const characterImageData = characterImagesData[i];
            const characterDataUrl = `data:${characterImageData.mimeType};base64,${characterImageData.base64}`;
            const characterUploadResult = await uploadImageToAimovely(
              characterDataUrl,
              aimovelyToken,
              `character-${i}`
            );
            if (characterUploadResult?.url) {
              uploadedCharacterImageUrls.push(characterUploadResult.url);
              console.log(`角色图 ${i + 1}/${characterImagesData.length} 上传成功:`, characterUploadResult.url);
            }
          }
        }
      } catch (uploadError) {
        console.error("上传输入图片到 Aimovely 失败:", uploadError);
        // Continue with generation even if upload fails
      }
    }

    // Step 1: 反推提示词（使用 gemini-2.5-flash 文本模型）
    console.log("Step 1: 反推提示词...");
    const captionPrompt = await reverseCaptionPrompt(
      referenceBase64,
      referenceImage.type,
      apiKey
    );
    console.log("反推得到的提示词:", captionPrompt);

    // Step 2: 去掉人物（使用 gemini-2.5-flash-image 图像生成模型）
    // Only generate background image if user wants to keep it
    let backgroundImage: string | null = null;
    if (keepBackground) {
      console.log("Step 2: 去掉人物（生成背景图）...");
      backgroundImage = await removeCharacter(
        referenceBase64,
        referenceImage.type,
        aspectRatio,
        apiKey
      );
      console.log("背景图生成完成");
    } else {
      console.log("Step 2: 跳过背景图生成（用户选择不保留背景）");
    }

    // Step 3: 生成最终图片（使用 gemini-2.5-flash-image 图像生成模型）
    console.log("Step 3: 生成最终图片...");
    console.log(`保留背景图: ${keepBackground}`);
    const finalImages: string[] = [];
    const finalImageErrors: string[] = [];

    // 生成多张图片，成功几张就输出几张
    for (let i = 0; i < numImages; i++) {
      try {
        console.log(`正在生成第 ${i + 1}/${numImages} 张图片...`);
        const finalImage = await generateFinalImage(
          characterImagesData, // Pass all character images
          keepBackground ? backgroundImage : null,
          captionPrompt,
          aspectRatio,
          apiKey
        );
        finalImages.push(finalImage);
        console.log(`第 ${i + 1} 张图片生成成功`);
      } catch (error: any) {
        console.error(`生成第 ${i + 1} 张图片失败:`, error);
        finalImageErrors.push(`第 ${i + 1} 张: ${error.message}`);
        // 继续生成其他图片，不中断流程
        console.warn(`跳过第 ${i + 1} 张图片，继续生成剩余图片`);
      }
    }

    // 检查是否至少生成了一张图片
    if (finalImages.length === 0) {
      throw new Error("所有图片生成都失败，请重试");
    }

    console.log(`成功生成 ${finalImages.length}/${numImages} 张图片`);
    if (finalImageErrors.length > 0) {
      console.warn("部分图片生成失败:", finalImageErrors);
    }

    console.log("=== Mimic Generation Completed ===");

    // Upload generated images to Aimovely
    let uploadedBackgroundImageUrl: string | null = null;
    const uploadedFinalImageUrls: string[] = [];

    if (aimovelyToken) {
      try {
        console.log("开始上传生成的图片到 Aimovely...");
        
        // Upload background image only if it was generated
        if (backgroundImage) {
          const bgUploadResult = await uploadImageToAimovely(
            backgroundImage,
            aimovelyToken,
            "background"
          );
          if (bgUploadResult?.url) {
            uploadedBackgroundImageUrl = bgUploadResult.url;
            console.log("背景图上传成功:", uploadedBackgroundImageUrl);
          }
        } else {
          console.log("跳过背景图上传（用户选择不保留背景）");
        }

        // Upload final images
        for (let i = 0; i < finalImages.length; i++) {
          try {
            const finalUploadResult = await uploadImageToAimovely(
              finalImages[i],
              aimovelyToken,
              `final-${i}`
            );
            if (finalUploadResult?.url) {
              uploadedFinalImageUrls.push(finalUploadResult.url);
              console.log(`最终图片 ${i + 1} 上传成功:`, finalUploadResult.url);
            } else {
              // Fallback to base64 if upload fails
              uploadedFinalImageUrls.push(finalImages[i]);
              console.warn(`最终图片 ${i + 1} 上传失败，使用 base64`);
            }
          } catch (uploadError) {
            console.error(`上传最终图片 ${i + 1} 失败:`, uploadError);
            // Fallback to base64
            uploadedFinalImageUrls.push(finalImages[i]);
          }
        }
      } catch (uploadError) {
        console.error("上传生成的图片到 Aimovely 失败:", uploadError);
        // Fallback to base64 images
        uploadedFinalImageUrls.push(...finalImages);
      }
    } else {
      // No Aimovely token, use base64
      uploadedFinalImageUrls.push(...finalImages);
    }

    return NextResponse.json({
      captionPrompt,
      // Input image URLs
      referenceImageUrl: uploadedReferenceImageUrl,
      characterImageUrls: uploadedCharacterImageUrls,
      // Generated image URLs
      backgroundImageUrl: uploadedBackgroundImageUrl,
      finalImageUrls: uploadedFinalImageUrls,
      // Base64 images for display (fallback)
      backgroundImageBase64: backgroundImage,
      finalImagesBase64: finalImages,
      // Generation stats
      generatedCount: finalImages.length,
      requestedCount: numImages,
      errors: finalImageErrors.length > 0 ? finalImageErrors : undefined,
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
  // 用英文反推提示词，包含环境、氛围、光影、场景信息、色调的描述，镜头和构图的描述，人物姿势、穿着、神态的描述，但不描述身材、长相、发型等和人物外貌相关的信息
  const prompt = "用英文反推下这张图片的提示词，包含环境、氛围、光影、场景信息、色调的描述，镜头和构图的描述，人物姿势、穿着、神态的描述。请不要描述身材、长相、发型等和人物外貌相关的信息。请直接输出英文反推词。";

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

  // 增加 maxOutputTokens 以避免 MAX_TOKENS 错误
  // 同时使用较低的 temperature 以获得更简洁、一致的输出
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
          temperature: 0.5, // 降低 temperature 以获得更简洁的输出
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048, // 增加到 2048 以避免 MAX_TOKENS 错误
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
  console.log("=== Gemini API 响应 (reverse caption) ===");
  console.log("响应 keys:", Object.keys(data));
  console.log("Candidates 数量:", data.candidates?.length || 0);
  
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
  console.log("第一个 candidate 的 keys:", Object.keys(candidate));
  console.log("Finish reason:", candidate.finishReason);
  console.log("Has content:", !!candidate.content);
  console.log("Has parts:", !!candidate.content?.parts);
  console.log("Parts count:", candidate.content?.parts?.length || 0);
  
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
    
    // MAX_TOKENS 意味着可能生成了部分文本，我们需要检查是否有文本
    if (candidate.finishReason === "MAX_TOKENS") {
      console.warn("检测到 MAX_TOKENS finishReason，将检查是否有部分生成的文本");
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
  
  // 如果有文本，即使 finishReason 是 MAX_TOKENS，也使用已生成的文本
  if (trimmedText) {
    if (candidate.finishReason === "MAX_TOKENS") {
      console.warn("达到最大令牌数限制，但已生成部分文本，将使用已生成的文本");
      console.log("生成的文本长度:", trimmedText.length);
      console.log("生成的文本预览:", trimmedText.substring(0, 200));
    }
    console.log("成功提取反推的提示词，长度:", trimmedText.length);
    return trimmedText;
  }
  
  // 只有在完全没有文本时才抛出错误
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
      errorMsg += "。达到最大令牌数限制，且未生成任何文本";
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
  characterImagesData: Array<{ base64: string; mimeType: string; file: File }>,
  backgroundImage: string | null,
  captionPrompt: string,
  aspectRatio: string | null,
  apiKey: string
): Promise<string> {
  // Build final prompt: take autentic photo of the character, use instagram friendly composition, scene setup from caption prompt
  const finalPrompt = `take autentic photo of the character, use instagram friendly composition. Shot on the character should have identical face, features, skin tone, hairstyle, body proportions, and vibe. 

scene setup: ${captionPrompt}`;

  // Build contents array - include all character images first
  const parts: any[] = [];
  
  // Add all character images
  for (const characterImageData of characterImagesData) {
    parts.push({
      inlineData: {
        mimeType: characterImageData.mimeType,
        data: characterImageData.base64,
      },
    });
  }

  // Add background image only if keepBackground is true
  if (backgroundImage) {
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

    parts.push({
      inlineData: {
        mimeType: backgroundMimeType,
        data: backgroundBase64,
      },
    });
  }

  parts.push({ text: finalPrompt });

  const contents = [
    {
      parts,
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

