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
    const characterImage = formData.get("characterImage") as File;
    const finalPromptJson = formData.get("finalPromptJson") as string;

    if (!characterImage) {
      return NextResponse.json(
        { error: "需要提供角色图" },
        { status: 400 }
      );
    }

    if (!finalPromptJson) {
      return NextResponse.json(
        { error: "需要提供最终的prompt JSON" },
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

    // Parse final prompt JSON
    let finalPromptData;
    try {
      finalPromptData = JSON.parse(finalPromptJson);
    } catch (e) {
      return NextResponse.json(
        { error: "无效的prompt JSON格式" },
        { status: 400 }
      );
    }

    console.log("=== Control Panel: 生成最终图片 ===");
    console.log("Final prompt data:", JSON.stringify(finalPromptData, null, 2));

    // Construct the final prompt
    // Extract variate_prompt from finalPromptData (which contains the adjusted JSON)
    const variatePromptJson = JSON.stringify(finalPromptData);
    const finalPrompt = `take autentic photo of the character, use instagram friendly composition. Shot on the character should have identical face. 

scene setup: ${variatePromptJson}

negatives: beauty-filter/airbrushed skin; poreless look, exaggerated or distorted anatomy, fake portrait-mode blur, CGI/illustration look`;

    console.log("Final prompt:", finalPrompt);

    // Use Gemini File API to avoid base64 token limit
    const imageBuffer = await characterImage.arrayBuffer();
    const fileData = Buffer.from(imageBuffer);
    
    // Step 1: Upload file to Gemini File API
    const fileUploadResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": fileData.length.toString(),
          "X-Goog-Upload-Header-Content-Type": characterImage.type || "image/jpeg",
          "Content-Type": `application/json; charset=utf-8`,
        },
        body: JSON.stringify({
          file: {
            displayName: "control-panel-character-generate",
          },
        }),
      }
    );

    if (!fileUploadResponse.ok) {
      const errorText = await fileUploadResponse.text();
      console.error("Gemini file upload start failed:", errorText);
      throw new Error(`文件上传失败: ${fileUploadResponse.status}`);
    }

    const uploadUrl = fileUploadResponse.headers.get("X-Goog-Upload-URL");
    if (!uploadUrl) {
      throw new Error("未能获取上传 URL");
    }

    // Step 2: Upload the actual file data
    const fileUploadResponse2 = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
        "Content-Type": characterImage.type || "image/jpeg",
        "Content-Length": fileData.length.toString(),
      },
      body: fileData,
    });

    if (!fileUploadResponse2.ok) {
      const errorText = await fileUploadResponse2.text();
      console.error("Gemini file data upload failed:", errorText);
      throw new Error(`文件数据上传失败: ${fileUploadResponse2.status}`);
    }

    const fileDataResponse = await fileUploadResponse2.json();
    const fileUri = fileDataResponse.file?.uri || fileDataResponse.uri;

    if (!fileUri) {
      throw new Error("未能获取文件 URI");
    }

    console.log("文件上传成功，fileUri:", fileUri);

    // Step 3: Use fileUri in generateContent request
    const contents = [
      {
        parts: [
          {
            fileData: {
              mimeType: characterImage.type || "image/jpeg",
              fileUri: fileUri,
            },
          },
          { text: finalPrompt },
        ],
      },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.4,
            topP: 0.95,
            topK: 40,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      throw new Error("生成图片失败");
    }

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      console.error("Gemini API 返回错误:", data.error);
      throw new Error(`Gemini API 错误: ${data.error.message || "未知错误"}`);
    }

    // Check promptFeedback FIRST
    if (data.promptFeedback) {
      const blockReason = data.promptFeedback.blockReason;
      console.error("Prompt被阻止 (control panel generate):", {
        blockReason,
        blockReasonMessage: data.promptFeedback.blockReasonMessage
      });
      
      if (blockReason === "IMAGE_SAFETY" || blockReason === "PROHIBITED_CONTENT") {
        throw new Error(`内容被安全过滤阻止: ${blockReason}`);
      } else if (blockReason) {
        throw new Error(`请求被阻止: ${data.promptFeedback.blockReasonMessage || blockReason}`);
      }
    }

    // Check for candidates
    if (!data.candidates || data.candidates.length === 0) {
      console.error("没有 candidates 或为空");
      console.error("完整 API 响应:", JSON.stringify(data, null, 2));
      throw new Error("API 未返回候选结果，请稍后重试");
    }

    const candidate = data.candidates[0];

    // Check finish reason
    if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
      console.error("内容被安全过滤阻止:", candidate.finishReason);
      throw new Error("内容被安全过滤阻止，请尝试调整提示词或图片");
    }

    // Extract image from response
    let generatedImageBase64: string | null = null;
    let generatedImageMimeType: string | null = null;

    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith("image/")) {
          generatedImageBase64 = part.inlineData.data;
          generatedImageMimeType = part.inlineData.mimeType;
          break;
        }
      }
    }

    if (!generatedImageBase64) {
      console.error("未找到生成的图片");
      console.error("候选结果详情:", JSON.stringify(candidate, null, 2));
      throw new Error("未找到生成的图片");
    }

    const generatedImage = `data:${generatedImageMimeType};base64,${generatedImageBase64}`;

    console.log("图片生成成功");

    // Upload to Aimovely
    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;
    let uploadedCharacterImageUrl: string | null = null;
    let uploadedFinalImageUrl: string | null = null;

    if (aimovelyEmail && aimovelyVcode) {
      try {
        const aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
        if (aimovelyToken) {
          console.log("开始上传图片到 Aimovely...");
          
          // Upload character image
          const characterBuffer = await characterImage.arrayBuffer();
          const characterBase64 = Buffer.from(characterBuffer).toString("base64");
          const characterDataUrl = `data:${characterImage.type};base64,${characterBase64}`;
          const characterUploadResult = await uploadImageToAimovely(
            characterDataUrl,
            aimovelyToken,
            "character"
          );
          if (characterUploadResult?.url) {
            uploadedCharacterImageUrl = characterUploadResult.url;
            console.log("角色图上传成功:", uploadedCharacterImageUrl);
          }

          // Upload final image
          const finalUploadResult = await uploadImageToAimovely(
            generatedImage,
            aimovelyToken,
            "final"
          );
          if (finalUploadResult?.url) {
            uploadedFinalImageUrl = finalUploadResult.url;
            console.log("最终图片上传成功:", uploadedFinalImageUrl);
          }
        }
      } catch (uploadError) {
        console.error("上传图片到 Aimovely 失败:", uploadError);
        // Continue with base64 images
      }
    }

    // Get character image base64 for response
    const characterBuffer = await characterImage.arrayBuffer();
    const characterBase64 = Buffer.from(characterBuffer).toString("base64");

    return NextResponse.json({
      finalImageUrl: uploadedFinalImageUrl || generatedImage,
      characterImageUrl: uploadedCharacterImageUrl || `data:${characterImage.type};base64,${characterBase64}`,
      // Also include base64 for display
      finalImageBase64: generatedImage,
    });
  } catch (error: any) {
    console.error("Error in Control Panel generate:", error);
    console.error("Error stack:", error.stack);

    return NextResponse.json(
      {
        error: error.message || "生成图片失败",
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

// Helper functions
async function fetchAimovelyToken(email: string, vcode: string): Promise<string | null> {
  try {
    const response = await fetch(`${AIMOVELY_API_URL}/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, vcode }),
    });

    if (!response.ok) {
      console.error("Aimovely login failed:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.data?.token || null;
  } catch (error) {
    console.error("Error fetching Aimovely token:", error);
    return null;
  }
}

async function uploadImageToAimovely(
  dataUrl: string,
  token: string,
  filename: string
): Promise<{ url: string } | null> {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append("file", blob, filename);
    formData.append("biz", "external_tool");

    const uploadResponse = await fetch(`${AIMOVELY_API_URL}/v1/resource/upload`, {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Aimovely upload failed:", uploadResponse.status, errorText);
      
      // Handle 401 - token expired, try to refresh
      if (uploadResponse.status === 401) {
        const aimovelyEmail = process.env.AIMOVELY_EMAIL;
        const aimovelyVcode = process.env.AIMOVELY_VCODE;
        if (aimovelyEmail && aimovelyVcode) {
          const newToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
          if (newToken) {
            // Retry with new token
            return uploadImageToAimovely(dataUrl, newToken, filename);
          }
        }
      }
      
      return null;
    }

    const uploadData = await uploadResponse.json();
    return { url: uploadData.data?.url || null };
  } catch (error) {
    console.error("Error uploading to Aimovely:", error);
    return null;
  }
}

