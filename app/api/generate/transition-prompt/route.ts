import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

/**
 * Generate transition prompt using Gemini API
 * Takes two images (start frame and end frame) and generates a professional
 * 5-second video transition description
 */
export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const startImage = formData.get("startImage") as File;
    const endImage = formData.get("endImage") as File;

    if (!startImage || !endImage) {
      return NextResponse.json(
        { error: "需要提供首帧图和尾帧图" },
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

    // Convert images to base64
    const startBuffer = await startImage.arrayBuffer();
    const endBuffer = await endImage.arrayBuffer();
    const startBase64 = Buffer.from(startBuffer).toString("base64");
    const endBase64 = Buffer.from(endBuffer).toString("base64");

    // Prepare the prompt for Gemini
    const promptText = `你现在是一个专业的导演，请根据输入给你的两张图，想一个专业的5s视频内容的转场镜头描述prompt，视频生成模型可以使用prompt生成一段5s的流畅的首尾帧视频。你首先要理解两张图的含义和变化，输出的镜头描述要尽可能的贴合两张图作为首尾帧所表达的含义，中间的转场元素要流畅、贴合含义。请直接输出镜头描述，不要有任何其他说明或标题。`;

    // Build request for Gemini API
    const contents = [
      {
        parts: [
          {
            inlineData: {
              mimeType: startImage.type,
              data: startBase64,
            },
          },
          {
            inlineData: {
              mimeType: endImage.type,
              data: endBase64,
            },
          },
          { text: promptText },
        ],
      },
    ];

    // Call Gemini API using gemini-2.5-flash model
    const model = "gemini-2.5-flash";
    console.log(`使用模型: ${model}`);
    console.log(`图片类型: startImage=${startImage.type}, endImage=${endImage.type}`);
    
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
            maxOutputTokens: 500,
          },
        }),
      }
    );
    
    console.log(`Gemini API 响应状态: ${response.status}`);

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API 错误:", error);
      return NextResponse.json(
        { error: "生成转场描述失败" },
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
    let transitionPrompt = "";
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      
      // Check if content was blocked
      if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
        console.error("内容被安全过滤阻止:", candidate.finishReason);
        console.error("安全评级:", candidate.safetyRatings);
        return NextResponse.json(
          { error: "内容被安全过滤阻止，请尝试其他图片" },
          { status: 400 }
        );
      }
      
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            transitionPrompt += part.text;
          }
        }
      }
      
      // Log if no text found
      if (!transitionPrompt) {
        console.error("候选项中未找到文本内容");
        console.error("候选项详情:", JSON.stringify(candidate, null, 2));
      }
    } else {
      console.error("响应中没有候选项");
      console.error("完整响应:", JSON.stringify(data, null, 2));
    }

    if (!transitionPrompt) {
      console.error("未找到生成的转场描述");
      return NextResponse.json(
        { error: "Gemini 未返回有效的转场描述，请查看服务器日志" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      prompt: transitionPrompt.trim() 
    });

  } catch (error) {
    console.error("生成转场描述时出错:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}

