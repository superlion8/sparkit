import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

/**
 * Generate prompt for Photo to Live using Gemini API
 * Takes an image and generates a 5-second video description prompt
 */
export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json(
        { error: "需要提供图片" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key 未配置" },
        { status: 500 }
      );
    }

    // Prepare the prompt for Gemini
    const promptText = `你是一个专业的摄影师，擅长拍摄适合instagram、tiktok等社交媒体风格的视频。请你基于对图像的理解，给出一段5s的镜头描述，目标是拍摄出一段适合发在instagram上的5s短视频。请直接输出英文描述。`;

    // Try to use Gemini FileData API to avoid base64 token limit
    // This uploads the file to Gemini first, then uses fileUri instead of base64
    let contents: any[];
    const imageBuffer = await image.arrayBuffer();
    const fileData = Buffer.from(imageBuffer);
    
    try {
      // Step 1: Upload file to Gemini File API
      const fileUploadResponse = await fetch(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": fileData.length.toString(),
            "X-Goog-Upload-Header-Content-Type": image.type,
            "Content-Type": `application/json; charset=utf-8`,
          },
          body: JSON.stringify({
            file: {
              displayName: "photo-to-live-input",
            },
          }),
        }
      );

      if (!fileUploadResponse.ok) {
        const errorText = await fileUploadResponse.text();
        throw new Error(`Gemini file upload start failed: ${fileUploadResponse.status} - ${errorText}`);
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
          "Content-Type": image.type,
          "Content-Length": fileData.length.toString(),
        },
        body: fileData,
      });

      if (!fileUploadResponse2.ok) {
        const errorText = await fileUploadResponse2.text();
        throw new Error(`Gemini file data upload failed: ${fileUploadResponse2.status} - ${errorText}`);
      }

      const fileDataResponse = await fileUploadResponse2.json();
      const fileUri = fileDataResponse.file?.uri || fileDataResponse.uri;

      if (fileUri) {
        // Use fileUri instead of base64 to avoid token limit
        contents = [
          {
            parts: [
              {
                fileData: {
                  mimeType: image.type,
                  fileUri: fileUri,
                },
              },
              { text: promptText },
            ],
          },
        ];
        console.log("使用 Gemini FileData API (fileUri) - 避免 base64 token 限制");
      } else {
        throw new Error("未能获取 fileUri");
      }
    } catch (fileError: any) {
      console.error("使用 Gemini FileData API 失败，回退到 inlineData:", fileError.message);
      // Fallback to inlineData with base64
      const imageBase64 = Buffer.from(imageBuffer).toString("base64");
      contents = [
        {
          parts: [
            {
              inlineData: {
                mimeType: image.type,
                data: imageBase64,
              },
            },
            { text: promptText },
          ],
        },
      ];
      console.log("使用 inlineData (base64) - 回退方案");
    }

    // Call Gemini API using gemini-2.5-flash model
    const model = "gemini-2.5-flash";
    console.log(`使用模型: ${model} 生成 Photo to Live prompt`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
            maxOutputTokens: 2048, // Increased from 1024 to avoid truncation
          },
        }),
      }
    );

    console.log(`Gemini API 响应状态: ${response.status}`);

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API 错误:", error);
      return NextResponse.json(
        { error: "生成prompt失败" },
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

    // Extract the generated text
    let prompt = "";
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];

      // Check if content was blocked
      if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
        console.error("内容被安全过滤阻止:", candidate.finishReason);
        return NextResponse.json(
          { error: "内容被安全过滤阻止，请尝试其他图片" },
          { status: 400 }
        );
      }

      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            prompt += part.text;
          }
        }
      }
    }

    if (!prompt) {
      console.error("未找到生成的prompt");
      return NextResponse.json(
        { error: "Gemini 未返回有效的prompt" },
        { status: 500 }
      );
    }

    // Check for MAX_TOKENS finish reason
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.finishReason === "MAX_TOKENS") {
        console.warn("提示：生成的prompt可能被截断（MAX_TOKENS），但已返回部分内容");
      }
    }

    if (!prompt) {
      console.error("未找到生成的prompt");
      return NextResponse.json(
        { error: "Gemini 未返回有效的prompt" },
        { status: 500 }
      );
    }

    console.log("成功生成prompt，长度:", prompt.length);
    return NextResponse.json({
      prompt: prompt.trim(),
    });

  } catch (error: any) {
    console.error("生成prompt时出错:", error);
    return NextResponse.json(
      { error: error.message || "服务器内部错误" },
      { status: 500 }
    );
  }
}

