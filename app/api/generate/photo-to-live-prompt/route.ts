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

    // Convert image to base64
    const imageBuffer = await image.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    // Prepare the prompt for Gemini
    const promptText = `你是一个专业的摄影师，擅长拍摄适合instagram、tiktok等社交媒体风格的视频。请你基于对图像的理解，给出一段5s的镜头描述，目标是拍摄出一段适合发在instagram上的5s短视频。请直接输出英文描述。`;

    // Build request for Gemini API
    const contents = [
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
            maxOutputTokens: 1024,
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

