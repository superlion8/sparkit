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
      const finalImage = await generateFinalImage(
        characterBase64,
        characterImage.type,
        backgroundImage,
        captionPrompt,
        aspectRatio,
        apiKey
      );
      if (finalImage) {
        finalImages.push(finalImage);
      }
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
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
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

  if (data.candidates && data.candidates.length > 0) {
    const candidate = data.candidates[0];
    if (candidate.content && candidate.content.parts) {
      let text = "";
      for (const part of candidate.content.parts) {
        if (part.text) {
          text += part.text;
        }
      }
      return text.trim();
    }
  }

  throw new Error("未找到反推的提示词");
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

  // Extract generated image
  if (data.candidates && data.candidates.length > 0) {
    for (const candidate of data.candidates) {
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            return dataUrl;
          }
        }
      }
    }
  }

  throw new Error("未找到生成的背景图");
}

// Step 3: 生成最终图片（使用 gemini-2.5-flash-image 图像生成模型）
async function generateFinalImage(
  characterBase64: string,
  characterMimeType: string,
  backgroundImage: string,
  captionPrompt: string,
  aspectRatio: string | null,
  apiKey: string
): Promise<string | null> {
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

  // Extract generated image
  if (data.candidates && data.candidates.length > 0) {
    for (const candidate of data.candidates) {
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            return dataUrl;
          }
        }
      }
    }
  }

  return null;
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

