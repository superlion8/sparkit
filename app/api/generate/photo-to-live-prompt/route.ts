import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { getVertexAIClient } from "@/lib/vertexai";
import { HarmCategory, HarmBlockThreshold } from "@google/genai";

/**
 * Generate prompt for Photo to Live using Vertex AI SDK
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
    const userPrompt = formData.get("userPrompt") as string | null;

    if (!image) {
      return NextResponse.json(
        { error: "需要提供图片" },
        { status: 400 }
      );
    }

    // Prepare the prompt for Gemini
    let promptText = `你是一个专业的摄影师，擅长拍摄适合instagram、tiktok等社交媒体风格的视频。请你基于对图像的理解，给出一段5s的镜头描述，目标是拍摄出一段适合发在instagram上的5s短视频。`;

    // Add user custom requirements if provided
    if (userPrompt && userPrompt.trim()) {
      promptText += `\n\n用户要求：${userPrompt.trim()}\n\n请根据用户的要求，结合图像内容，生成符合要求的5s视频镜头描述。`;
    }

    promptText += `\n请直接输出英文描述。`;

    console.log("Photo to Live prompt with user requirements:", userPrompt || "无");

    // Convert image to base64
    const imageBuffer = await image.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    // Build content parts for SDK
    const parts: any[] = [
      {
        inlineData: {
          mimeType: image.type,
          data: imageBase64,
        },
      },
      { text: promptText },
    ];

    // Call Gemini API using gemini-3-pro-preview model
    const modelId = "gemini-3-pro-preview";
    console.log(`使用模型: ${modelId} (Google GenAI SDK) 生成 Photo to Live prompt`);

    const client = getVertexAIClient();
    const response = await client.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts }],
      config: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
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
      },
    });

    console.log(`Gemini API 响应完成`);

    // Extract the generated text
    let prompt = "";
    const candidates = response.candidates;

    if (candidates && candidates.length > 0) {
      const candidate = candidates[0];

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
          if ((part as any).text) {
            prompt += (part as any).text;
          }
        }
      }

      // Check for MAX_TOKENS finish reason
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

