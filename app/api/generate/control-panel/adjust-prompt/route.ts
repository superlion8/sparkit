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

    const prompt = `You are an AI assistant that adjusts image generation prompts. 

Given:
1. Original reference image prompt (JSON format): ${JSON.stringify(captionPromptJson)}
2. Character description (JSON format): ${JSON.stringify(characterPromptJson)}
3. Dimensions to adjust: ${adjustParts.join(", ")}

Please adjust the following parts of the original prompt based on the character description:
${adjustParts.map(part => `- ${part}`).join("\n")}

For parts NOT in the adjust list, keep them exactly the same as the original.

Output the complete adjusted prompt in the same JSON format as the original, ensuring:
- All fields from the original are preserved
- Only the specified dimensions are adjusted based on the character description
- The adjusted parts should be different from the original but consistent with the character description

Return only the JSON, no other text.`;

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

    // Extract text from response
    let text = "";
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          text += part.text;
        }
      }
    }

    console.log("原始响应:", text);

    // Try to extract JSON from the response
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.includes("```json")) {
      jsonText = jsonText.split("```json")[1].split("```")[0].trim();
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.split("```")[1].split("```")[0].trim();
    }

    // Try to parse JSON
    let adjustedPrompt;
    try {
      adjustedPrompt = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON解析失败:", parseError);
      console.error("尝试解析的文本:", jsonText);
      // Try to extract JSON object using regex
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          adjustedPrompt = JSON.parse(jsonMatch[0]);
        } catch (e) {
          throw new Error("无法解析JSON格式的调整后的prompt。原始响应: " + text.substring(0, 200));
        }
      } else {
        throw new Error("无法解析JSON格式的调整后的prompt。原始响应: " + text.substring(0, 200));
      }
    }

    console.log("解析后的JSON:", JSON.stringify(adjustedPrompt, null, 2));

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

