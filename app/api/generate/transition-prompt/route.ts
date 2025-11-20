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

    // Convert images to base64 with size check
    const startBuffer = await startImage.arrayBuffer();
    const endBuffer = await endImage.arrayBuffer();
    
    const startSizeMB = (startBuffer.byteLength / (1024 * 1024)).toFixed(2);
    const endSizeMB = (endBuffer.byteLength / (1024 * 1024)).toFixed(2);
    
    console.log(`原始图片大小: startImage=${startSizeMB}MB, endImage=${endSizeMB}MB`);
    
    // Check if images are too large (Gemini has limits)
    const MAX_SIZE_MB = 20; // Gemini's limit per image
    if (startBuffer.byteLength > MAX_SIZE_MB * 1024 * 1024 || endBuffer.byteLength > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `图片过大，单张图片不能超过 ${MAX_SIZE_MB}MB。当前：首帧=${startSizeMB}MB，尾帧=${endSizeMB}MB` },
        { status: 400 }
      );
    }
    
    const startBase64 = Buffer.from(startBuffer).toString("base64");
    const endBase64 = Buffer.from(endBuffer).toString("base64");
    
    console.log(`Base64 长度: startImage=${startBase64.length}, endImage=${endBase64.length}`);

    // Prepare the prompt for Gemini
    const promptText = `你现在是一个专业的导演，请根据输入给你的两张图，想一个专业的5s视频内容的转场镜头描述prompt，视频生成模型可以使用prompt生成一段5s的流畅的首尾帧视频。



你首先要理解两张图的含义和变化，输出的镜头描述要尽可能的贴合两张图作为首尾帧所表达的含义，中间的转场元素要流畅、贴合含义。

请直接输出文字，不要输出图片`;

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

    // Call Gemini API using gemini-3-pro-preview model
    const model = "gemini-3-pro-preview";
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
            maxOutputTokens: 2048, // Increase to allow full response
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ],
          systemInstruction: {
            parts: [
              {
                text: "你是一个专业的视频导演。请直接输出简洁的镜头描述，不要包含任何推理过程或解释。"
              }
            ]
          }
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
      console.error("完整 API 响应:", JSON.stringify(data, null, 2));
      
      // Provide more specific error message
      let errorMsg = "Gemini 未返回有效的转场描述";
      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        if (candidate.finishReason) {
          errorMsg += `。原因: ${candidate.finishReason}`;
        }
      }
      
      return NextResponse.json(
        { error: errorMsg },
        { status: 500 }
      );
    }

    console.log("成功生成转场描述，长度:", transitionPrompt.length);
    return NextResponse.json({ 
      prompt: transitionPrompt.trim() 
    });

  } catch (error: any) {
    console.error("生成转场描述时出错:", error);
    console.error("错误堆栈:", error.stack);
    return NextResponse.json(
      { error: error.message || "服务器内部错误" },
      { status: 500 }
    );
  }
}

