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

    console.log("=== Control Panel: 反推 Character 图描述 ===");

    const prompt = `用英文反推下这张图片的提示词，用以下json格式来输出：

{
  "scene": "",
  "subject_desc": {
    "gender_presentation": "",
    "age_bracket": "",
    "ethnicity": "",
    "build": "",
    "skin_tone": "",
    "hair": { "length": "", "style": "", "color": "" }
  },
  "subject_pose": "",
  "subject_expression": "",
  "subject_wardrobe": {
    "top": "",
    "bottom": "",
    "socks": "",
    "accessories": {}
  },
  "environment": {
    "description": "",
    "objects": [],
    "lighting": {
      "source": "",
      "quality": "",
      "white_balance_K": ""
    }
  },
  "camera": {
    "mode": "",
    "focal_length_eq_mm": "",
    "exposure": { "aperture_f": "", "iso": "", "shutter_s": "", "ev_comp": "" },
    "focus": "",
    "depth_of_field": "",
    "framing": {
      "aspect_ratio": "",
      "crop": "",
      "angle": "",
      "composition_notes": ""
    }
  }
}

请直接输出JSON格式，不要包含其他文字说明。`;

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
            displayName: "control-panel-character",
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

