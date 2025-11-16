import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = await request.json();
    const { captionPromptJson, characterPromptJson, adjustDimensions } = body;

    if (!captionPromptJson || !characterPromptJson) {
      return NextResponse.json(
        { error: "需要提供 caption prompt 和 character prompt" },
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

    console.log("=== Control Panel: 微调 Prompt ===");
    console.log("Adjust dimensions:", adjustDimensions);

    // Build prompt for adjustment
    const adjustParts: string[] = [];
    if (adjustDimensions.pose === "adjust") {
      adjustParts.push("subject_pose");
    }
    if (adjustDimensions.wardrobe === "adjust") {
      adjustParts.push("subject_wardrobe");
    }
    if (adjustDimensions.environment === "adjust") {
      adjustParts.push("environment");
    }
    if (adjustDimensions.camera === "adjust") {
      adjustParts.push("camera");
    }

    // Build a more structured prompt
    const originalPromptStr = JSON.stringify(captionPromptJson, null, 2);
    const characterDescStr = JSON.stringify(characterPromptJson, null, 2);
    
    const prompt = `You are an AI assistant that adjusts image generation prompts.

Original prompt (JSON):
${originalPromptStr}

Character description (JSON):
${characterDescStr}

Adjust these fields based on the character description: ${adjustParts.join(", ")}

Keep all other fields exactly the same as the original.

Output the complete adjusted JSON prompt. Return ONLY valid JSON, no explanations or markdown.`;

    const contents = [
      {
        parts: [{ text: prompt }],
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
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      throw new Error("微调 prompt 失败");
    }

    const data = await response.json();

    // Check for API errors
    if (data.error) {
      console.error("Gemini API 返回错误:", data.error);
      throw new Error(`Gemini API 错误: ${data.error.message || "未知错误"}`);
    }

    // Check for candidates
    if (!data.candidates || data.candidates.length === 0) {
      console.error("没有 candidates 或为空");
      throw new Error("API 未返回候选结果，请稍后重试");
    }

    const candidate = data.candidates[0];

    // Check finish reason
    if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
      console.error("内容被安全过滤阻止:", candidate.finishReason);
      throw new Error("内容被安全过滤阻止，请尝试调整输入");
    }

    if (candidate.finishReason === "MAX_TOKENS") {
      console.warn("达到最大令牌数限制");
    }

    // Extract text from response
    let text = "";
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          text += part.text;
        }
      }
    }

    if (!text || text.trim().length === 0) {
      console.error("响应文本为空");
      console.error("Candidate details:", JSON.stringify(candidate, null, 2));
      throw new Error("API 返回空响应，请稍后重试");
    }

    console.log("原始响应长度:", text.length);
    console.log("原始响应预览:", text.substring(0, 500));

    // Try to extract JSON from the response
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.includes("```json")) {
      jsonText = jsonText.split("```json")[1].split("```")[0].trim();
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.split("```")[1].split("```")[0].trim();
    }

    // Remove any leading/trailing text that's not JSON
    // Try to find the JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    // Try to parse JSON
    let adjustedPrompt;
    try {
      adjustedPrompt = JSON.parse(jsonText);
      
      // Validate that we got a proper object
      if (!adjustedPrompt || typeof adjustedPrompt !== "object" || Array.isArray(adjustedPrompt)) {
        throw new Error("解析结果不是有效的对象");
      }
      
      // Check if it's empty
      if (Object.keys(adjustedPrompt).length === 0) {
        throw new Error("解析结果为空对象");
      }
    } catch (parseError: any) {
      console.error("JSON解析失败:", parseError);
      console.error("尝试解析的文本:", jsonText.substring(0, 500));
      console.error("完整响应:", text);
      
      // If parsing failed, try to use the original prompt as fallback
      console.warn("使用原始 prompt 作为后备方案");
      adjustedPrompt = { ...captionPromptJson };
      
      // Still throw error to let user know
      throw new Error(`无法解析JSON格式的调整后的prompt。错误: ${parseError.message}。原始响应预览: ${text.substring(0, 300)}`);
    }

    console.log("解析后的JSON字段:", Object.keys(adjustedPrompt));
    console.log("解析后的JSON预览:", JSON.stringify(adjustedPrompt, null, 2).substring(0, 500));

    return NextResponse.json({
      adjustedPrompt,
    });
  } catch (error: any) {
    console.error("Error in adjust prompt:", error);
    console.error("Error stack:", error.stack);

    return NextResponse.json(
      {
        error: error.message || "微调 prompt 失败",
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

