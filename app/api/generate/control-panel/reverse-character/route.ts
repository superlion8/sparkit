import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const characterImage = formData.get("characterImage") as File;

    if (!characterImage) {
      return NextResponse.json(
        { error: "需要提供角色图" },
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
    const characterBuffer = await characterImage.arrayBuffer();
    const characterBase64 = Buffer.from(characterBuffer).toString("base64");

    console.log("=== Control Panel: 反推 Character 图描述 ===");

    const prompt = `用英文反推下这张图片的提示词，用以下json格式来输出：

{
  "subject_desc": {
    "gender_presentation": "",
    "age_bracket": "",
    "ethnicity": "",
    "build": "",
    "skin_tone": "",
    "hair": { "length": "", "style": "", "color": "" }
  }
}

请直接输出JSON格式，不要包含其他文字说明。`;

    const contents = [
      {
        parts: [
          {
            inlineData: {
              mimeType: characterImage.type || "image/jpeg",
              data: characterBase64,
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
            temperature: 0.5,
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
      throw new Error("反推角色描述失败");
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
    let characterData;
    try {
      characterData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON解析失败:", parseError);
      console.error("尝试解析的文本:", jsonText);
      // Try to extract JSON object using regex
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          characterData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          throw new Error("无法解析JSON格式的角色描述。原始响应: " + text.substring(0, 200));
        }
      } else {
        throw new Error("无法解析JSON格式的角色描述。原始响应: " + text.substring(0, 200));
      }
    }

    console.log("解析后的JSON:", JSON.stringify(characterData, null, 2));

    return NextResponse.json({
      characterPrompt: characterData,
    });
  } catch (error: any) {
    console.error("Error in reverse character:", error);
    console.error("Error stack:", error.stack);

    return NextResponse.json(
      {
        error: error.message || "反推角色描述失败",
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

