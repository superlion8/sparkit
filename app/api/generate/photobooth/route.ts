import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

interface PoseDescription {
  pose: string;
  cameraPosition: string;
  composition: string;
}

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;
    const aspectRatio = formData.get("aspectRatio") as string;

    if (!image) {
      return NextResponse.json(
        { error: "需要提供图片" },
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

    // Convert image to base64
    const imageBuffer = await image.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    console.log("=== PhotoBooth Generation Started ===");

    // Upload input image to Aimovely first
    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;
    let aimovelyToken: string | null = null;
    let uploadedImageUrl: string | null = null;

    if (aimovelyEmail && aimovelyVcode) {
      try {
        aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
        if (aimovelyToken) {
          console.log("开始上传输入图片到 Aimovely...");
          
          // Upload input image
          const imageDataUrl = `data:${image.type};base64,${imageBase64}`;
          const uploadResult = await uploadImageToAimovely(
            imageDataUrl,
            aimovelyToken,
            "photobooth-input"
          );
          if (uploadResult?.url) {
            uploadedImageUrl = uploadResult.url;
            console.log("输入图片上传成功:", uploadedImageUrl);
          }
        }
      } catch (uploadError) {
        console.error("上传输入图片到 Aimovely 失败:", uploadError);
        // Continue with generation even if upload fails
      }
    }

    // Step 1: 生成5个pose描述（使用 gemini-2.5-flash 文本模型）
    console.log("Step 1: 生成pose描述...");
    const poseDescriptions = await generatePoseDescriptions(
      imageBase64,
      image.type,
      apiKey
    );
    
    if (poseDescriptions.length === 0) {
      throw new Error("未能解析任何pose描述，请重试");
    }
    
    if (poseDescriptions.length < 5) {
      console.warn(`只解析到 ${poseDescriptions.length} 个pose描述，将生成 ${poseDescriptions.length} 张图片`);
    } else {
      console.log(`成功解析 ${poseDescriptions.length} 个pose描述`);
    }

    // Step 2: 根据pose描述生成图片（使用 gemini-2.5-flash-image 图像生成模型）
    console.log(`Step 2: 根据 ${poseDescriptions.length} 个pose描述生成图片...`);
    const generatedImages: string[] = [];
    const generatedImageErrors: string[] = [];

    for (let i = 0; i < poseDescriptions.length; i++) {
      try {
        console.log(`正在生成第 ${i + 1}/${poseDescriptions.length} 张图片...`);
        const generatedImage = await generatePoseImage(
          imageBase64,
          image.type,
          poseDescriptions[i],
          aspectRatio,
          apiKey
        );
        generatedImages.push(generatedImage);
        console.log(`第 ${i + 1} 张图片生成成功`);
      } catch (error: any) {
        console.error(`生成第 ${i + 1} 张图片失败:`, error);
        generatedImageErrors.push(`第 ${i + 1} 张: ${error.message}`);
        // Continue generating other images
        console.warn(`跳过第 ${i + 1} 张图片，继续生成剩余图片`);
      }
    }

    // Check if we have at least one generated image
    if (generatedImages.length === 0) {
      throw new Error("所有图片生成都失败，请重试");
    }

    console.log(`成功生成 ${generatedImages.length}/${poseDescriptions.length} 张图片`);
    if (generatedImageErrors.length > 0) {
      console.warn("部分图片生成失败:", generatedImageErrors);
    }

    console.log("=== PhotoBooth Generation Completed ===");

    // Upload generated images to Aimovely
    const uploadedImageUrls: string[] = [];

    if (aimovelyToken) {
      try {
        console.log("开始上传生成的图片到 Aimovely...");
        
        // Upload generated images
        for (let i = 0; i < generatedImages.length; i++) {
          try {
            const uploadResult = await uploadImageToAimovely(
              generatedImages[i],
              aimovelyToken,
              `photobooth-${i}`
            );
            if (uploadResult?.url) {
              uploadedImageUrls.push(uploadResult.url);
              console.log(`图片 ${i + 1} 上传成功:`, uploadResult.url);
            } else {
              // Fallback to base64 if upload fails
              uploadedImageUrls.push(generatedImages[i]);
              console.warn(`图片 ${i + 1} 上传失败，使用 base64`);
            }
          } catch (uploadError) {
            console.error(`上传图片 ${i + 1} 失败:`, uploadError);
            // Fallback to base64
            uploadedImageUrls.push(generatedImages[i]);
          }
        }
      } catch (uploadError) {
        console.error("上传生成的图片到 Aimovely 失败:", uploadError);
        // Fallback to base64 images
        uploadedImageUrls.push(...generatedImages);
      }
    } else {
      // No Aimovely token, use base64
      uploadedImageUrls.push(...generatedImages);
    }

    return NextResponse.json({
      // Input image URL
      inputImageUrl: uploadedImageUrl,
      // Pose descriptions
      poseDescriptions: poseDescriptions,
      // Generated image URLs
      generatedImageUrls: uploadedImageUrls,
      // Base64 images for display (fallback)
      generatedImagesBase64: generatedImages,
      // Generation stats
      generatedCount: generatedImages.length,
      requestedCount: poseDescriptions.length, // Use actual parsed pose count
      errors: generatedImageErrors.length > 0 ? generatedImageErrors : undefined,
    });
  } catch (error: any) {
    console.error("Error in PhotoBooth generation:", error);
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

// Step 1: 生成5个pose描述（使用 gemini-2.5-flash 文本模型）
async function generatePoseDescriptions(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<PoseDescription[]> {
  const prompt = `你现在是一个专门拍摄ins风格写真照的职业摄影师，请你分析一下这个模特所在的环境、模特的特征还有她现在在做的动作，让她换5个不同的pose，可以把这几个连续的pose发成一个instagram的组图，请你给出这5个pose的指令。

尽量避免指令过于复杂，导致在一张图片里传达了过多的信息、或者让模特做出过于dramatic的姿势，不要改变光影。

请你用英文按照这个格式来写：

- Pose1:

- Camera Position1:

- Composition1:

- Pose2:

- Camera Position2:

- Composition2:

- Pose3:

- Camera Position3:

- Composition3:

- Pose4:

- Camera Position4:

- Composition4:

- Pose5:

- Camera Position5:

- Composition5:`;

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

  // Use higher maxOutputTokens for detailed pose descriptions
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
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini API error (generate pose descriptions):", error);
    throw new Error("生成pose描述失败");
  }

  const data = await response.json();
  console.log("=== Gemini API 响应 (generate pose descriptions) ===");
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
    
    // MAX_TOKENS means we got partial text
    if (candidate.finishReason === "MAX_TOKENS") {
      console.warn("检测到 MAX_TOKENS finishReason，将检查是否有部分生成的文本");
    }
    
    console.log("Finish reason:", candidate.finishReason);
  }

  // Check for content
  if (!candidate.content || !candidate.content.parts) {
    console.error("候选结果中没有 content 或 parts");
    console.error("候选结果详情:", JSON.stringify(candidate, null, 2));
    let errorMsg = "未找到pose描述";
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
  
  // If we have text, use it (even if finishReason is MAX_TOKENS)
  if (trimmedText) {
    if (candidate.finishReason === "MAX_TOKENS") {
      console.warn("达到最大令牌数限制，但已生成部分文本，将使用已生成的文本");
      console.log("生成的文本长度:", trimmedText.length);
      console.log("生成的文本预览:", trimmedText.substring(0, 500));
    }
    console.log("成功提取pose描述，长度:", trimmedText.length);
    
    // Parse the pose descriptions
    const poses = parsePoseDescriptions(trimmedText);
    if (poses.length > 0) {
      return poses;
    } else {
      throw new Error("未能解析pose描述，请重试");
    }
  }
  
  // Only throw error if we have no text at all
  console.error("提取的文本为空");
  console.error("所有 parts:", JSON.stringify(candidate.content.parts, null, 2));
  console.error("Finish reason:", candidate.finishReason);
  console.error("Safety ratings:", candidate.safetyRatings);
  
  let errorMsg = "未找到pose描述";
  
  // Check finish reason
  if (candidate.finishReason) {
    if (candidate.finishReason === "STOP") {
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

// Parse pose descriptions from text
function parsePoseDescriptions(text: string): PoseDescription[] {
  const poses: PoseDescription[] = [];
  console.log("开始解析pose描述文本...");
  console.log("文本长度:", text.length);
  console.log("文本预览:", text.substring(0, 500));
  
  // Try multiple parsing strategies
  // Strategy 1: Parse format with numbered poses (Pose1, Pose2, etc.)
  // Use [\s\S] instead of . with s flag for ES5 compatibility
  const poseRegex = /(?:^|\n)\s*[-*]?\s*Pose\s*(\d+)\s*:?\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:Pose|Camera|Composition)\s*\d+|$)/gi;
  const cameraRegex = /(?:^|\n)\s*[-*]?\s*Camera\s*Position\s*(\d+)\s*:?\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:Pose|Camera|Composition)\s*\d+|$)/gi;
  const compositionRegex = /(?:^|\n)\s*[-*]?\s*Composition\s*(\d+)\s*:?\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:Pose|Camera|Composition)\s*\d+|$)/gi;
  
  // Extract all matches
  const poseMatches = Array.from(text.matchAll(poseRegex));
  const cameraMatches = Array.from(text.matchAll(cameraRegex));
  const compositionMatches = Array.from(text.matchAll(compositionRegex));
  
  console.log(`找到 ${poseMatches.length} 个pose, ${cameraMatches.length} 个camera, ${compositionMatches.length} 个composition`);
  
  // Create a map to store pose data by index
  const poseMap = new Map<number, Partial<PoseDescription>>();
  
  // Process pose matches
  for (const match of poseMatches) {
    const index = parseInt(match[1]);
    const pose = match[2].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (pose && pose.length > 0) {
      if (!poseMap.has(index)) {
        poseMap.set(index, {});
      }
      poseMap.get(index)!.pose = pose;
      console.log(`Pose ${index}: ${pose.substring(0, 50)}...`);
    }
  }
  
  // Process camera position matches
  for (const match of cameraMatches) {
    const index = parseInt(match[1]);
    const cameraPosition = match[2].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (cameraPosition && cameraPosition.length > 0) {
      if (!poseMap.has(index)) {
        poseMap.set(index, {});
      }
      poseMap.get(index)!.cameraPosition = cameraPosition;
      console.log(`Camera Position ${index}: ${cameraPosition.substring(0, 50)}...`);
    }
  }
  
  // Process composition matches
  for (const match of compositionMatches) {
    const index = parseInt(match[1]);
    const composition = match[2].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (composition && composition.length > 0) {
      if (!poseMap.has(index)) {
        poseMap.set(index, {});
      }
      poseMap.get(index)!.composition = composition;
      console.log(`Composition ${index}: ${composition.substring(0, 50)}...`);
    }
  }
  
  // Convert map to array and validate (try to get 5 poses, but accept any valid ones)
  const sortedIndices = Array.from(poseMap.keys()).sort((a, b) => a - b);
  for (const index of sortedIndices) {
    const poseData = poseMap.get(index);
    if (poseData && poseData.pose && poseData.cameraPosition && poseData.composition) {
      poses.push({
        pose: poseData.pose,
        cameraPosition: poseData.cameraPosition,
        composition: poseData.composition,
      });
    } else {
      console.warn(`Pose ${index} 缺少部分数据:`, poseData);
    }
  }
  
  // If we couldn't parse using the expected format, try a simpler approach
  if (poses.length === 0) {
    console.warn("未能使用标准格式解析，尝试简单解析...");
    // Split by double newlines or markers
    const sections = text.split(/\n\s*\n|Pose\s*\d+|Camera\s*Position\s*\d+|Composition\s*\d+/i);
    let currentPose: Partial<PoseDescription> = {};
    let currentIndex = 0;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section) continue;
      
      const lowerSection = section.toLowerCase();
      
      // Check if this section contains pose, camera, or composition info
      if (lowerSection.includes('pose') || (i > 0 && !lowerSection.includes('camera') && !lowerSection.includes('composition'))) {
        // Try to extract pose description
        const poseMatch = section.match(/(?:pose\s*\d*:?\s*)?(.+?)(?:\n|$)/i);
        if (poseMatch && poseMatch[1]) {
          const poseText = poseMatch[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          if (poseText && poseText.length > 10) { // Minimum length check
            currentPose.pose = poseText;
            currentIndex = poses.length + 1;
          }
        }
      }
      
      if (lowerSection.includes('camera')) {
        const cameraMatch = section.match(/(?:camera\s*position\s*\d*:?\s*)?(.+?)(?:\n|$)/i);
        if (cameraMatch && cameraMatch[1]) {
          const cameraText = cameraMatch[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          if (cameraText && cameraText.length > 5) {
            currentPose.cameraPosition = cameraText;
          }
        }
      }
      
      if (lowerSection.includes('composition')) {
        const compositionMatch = section.match(/(?:composition\s*\d*:?\s*)?(.+?)(?:\n|$)/i);
        if (compositionMatch && compositionMatch[1]) {
          const compositionText = compositionMatch[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          if (compositionText && compositionText.length > 5) {
            currentPose.composition = compositionText;
          }
        }
      }
      
      // If we have all three, add to poses and reset
      if (currentPose.pose && currentPose.cameraPosition && currentPose.composition) {
        poses.push({
          pose: currentPose.pose,
          cameraPosition: currentPose.cameraPosition,
          composition: currentPose.composition,
        });
        console.log(`简单解析成功，添加 Pose ${poses.length}`);
        currentPose = {};
        currentIndex = 0;
      }
    }
  }
  
  // Limit to 5 poses maximum
  const finalPoses = poses.slice(0, 5);
  console.log(`成功解析 ${finalPoses.length} 个pose描述`);
  
  if (finalPoses.length === 0) {
    console.error("未能解析任何pose描述");
    console.error("原始文本:", text);
  }
  
  return finalPoses;
}

// Step 2: 根据pose描述生成图片（使用 gemini-2.5-flash-image 图像生成模型）
async function generatePoseImage(
  imageBase64: string,
  mimeType: string,
  poseDescription: PoseDescription,
  aspectRatio: string | null,
  apiKey: string
): Promise<string> {
  // Build prompt combining pose, camera position, and composition
  const prompt = `Change the pose to: ${poseDescription.pose}. Camera position: ${poseDescription.cameraPosition}. Composition: ${poseDescription.composition}. Keep the same environment, lighting, and overall style.`;

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
    console.error("Gemini API error (generate pose image):", error);
    throw new Error("生成图片失败");
  }

  const data = await response.json();
  console.log("Gemini API 响应 (generate pose image):", JSON.stringify(data, null, 2));

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
      throw new Error("内容被安全过滤阻止，请尝试调整图片");
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
  let errorMsg = "未找到生成的图片";
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

async function uploadImageToAimovely(dataUrl: string, token: string, prefix: string): Promise<UploadResult | null> {
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
  const fileName = `photobooth-${prefix}-${Date.now()}.${mimeType.split("/")[1] ?? "png"}`;

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

