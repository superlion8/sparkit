import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const referenceImage = formData.get("referenceImage") as File;

    if (!referenceImage) {
      return NextResponse.json(
        { error: "需要提供参考图" },
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

    console.log("=== Control Panel: 反推 Reference 图提示词 ===");

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
    const imageBuffer = await referenceImage.arrayBuffer();
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
          "X-Goog-Upload-Header-Content-Type": referenceImage.type || "image/jpeg",
          "Content-Type": `application/json; charset=utf-8`,
        },
        body: JSON.stringify({
          file: {
            displayName: "control-panel-reference",
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
        "Content-Type": referenceImage.type || "image/jpeg",
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
              mimeType: referenceImage.type || "image/jpeg",
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
            maxOutputTokens: 4096, // Increased to handle complete JSON output
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
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      throw new Error("反推提示词失败");
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
    const finishReason = candidate.finishReason;
    const isMaxTokens = finishReason === "MAX_TOKENS";
    
    if (finishReason === "SAFETY" || finishReason === "RECITATION") {
      console.error("内容被安全过滤阻止:", finishReason);
      throw new Error("内容被安全过滤阻止，请尝试其他图片");
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

    console.log("原始响应:", text);
    console.log("Finish reason:", finishReason);

    // Try to extract JSON from the response
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.includes("```json")) {
      jsonText = jsonText.split("```json")[1].split("```")[0].trim();
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.split("```")[1].split("```")[0].trim();
    }

    // Try to parse JSON
    let captionData;
    try {
      captionData = JSON.parse(jsonText);
    } catch (parseError: any) {
      console.error("JSON解析失败:", parseError);
      console.error("尝试解析的文本:", jsonText);
      console.error("尝试解析的文本结尾:", jsonText.substring(Math.max(0, jsonText.length - 500)));
      
      // If MAX_TOKENS, try to fix incomplete JSON
      if (isMaxTokens) {
        console.warn("由于 MAX_TOKENS，尝试修复不完整的 JSON...");
        try {
          // Try to find JSON object start
          const jsonMatch = jsonText.match(/\{[\s\S]*/);
          if (jsonMatch) {
            let incompleteJson = jsonMatch[0];
            
            // Count braces and brackets to see what's missing
            let openBraces = (incompleteJson.match(/\{/g) || []).length;
            let closeBraces = (incompleteJson.match(/\}/g) || []).length;
            let openBrackets = (incompleteJson.match(/\[/g) || []).length;
            let closeBrackets = (incompleteJson.match(/\]/g) || []).length;
            
            // Check if we're in the middle of a string by parsing backwards
            // Find the last quote that's not escaped
            let lastUnescapedQuote = -1;
            for (let i = incompleteJson.length - 1; i >= 0; i--) {
              if (incompleteJson[i] === '"') {
                // Check if it's escaped
                let escapeCount = 0;
                for (let j = i - 1; j >= 0 && incompleteJson[j] === '\\'; j--) {
                  escapeCount++;
                }
                if (escapeCount % 2 === 0) {
                  // Found unescaped quote
                  lastUnescapedQuote = i;
                  break;
                }
              }
            }
            
            // If we found a quote, check if we're in a string value
            if (lastUnescapedQuote !== -1) {
              // Look backwards from the quote to find the colon
              let colonIndex = incompleteJson.lastIndexOf(':', lastUnescapedQuote);
              let commaIndex = incompleteJson.lastIndexOf(',', lastUnescapedQuote);
              let openBraceIndex = incompleteJson.lastIndexOf('{', lastUnescapedQuote);
              
              // If colon is after the last comma/brace, we're likely in a string value
              if (colonIndex > Math.max(commaIndex, openBraceIndex)) {
                // Check if the quote is the start of a string (followed by colon or comma)
                const afterQuote = incompleteJson.substring(lastUnescapedQuote + 1);
                // If there's no closing quote after this one, we're in an unclosed string
                if (!afterQuote.includes('"') || afterQuote.trim()[0] !== '"') {
                  // Close the string
                  incompleteJson += '"';
                }
              }
            } else {
              // No quote found, but we might be in the middle of a string value
              // Check if the last non-whitespace character before end is a colon
              const trimmed = incompleteJson.trim();
              if (trimmed.endsWith(':')) {
                // We're starting a value, might be a string
                // Add empty string as fallback
                incompleteJson += '""';
              }
            }
            
            // Add missing closing brackets
            for (let i = 0; i < openBrackets - closeBrackets; i++) {
              incompleteJson += ']';
            }
            
            // Add missing closing braces
            for (let i = 0; i < openBraces - closeBraces; i++) {
              incompleteJson += '}';
            }
            
            console.log("修复后的 JSON 预览:", incompleteJson.substring(0, 500));
            
            try {
              captionData = JSON.parse(incompleteJson);
              console.log("成功修复并解析 JSON");
            } catch (fixError) {
              // If fixing failed, try to extract individual fields
              console.warn("修复失败，尝试提取字段...");
              throw fixError;
            }
          } else {
            throw new Error("无法找到 JSON 对象");
          }
        } catch (fixError: any) {
          console.error("修复 JSON 失败:", fixError);
          // Try to extract JSON object using regex as fallback
          const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              captionData = JSON.parse(jsonMatch[0]);
            } catch (e) {
              throw new Error(`无法解析JSON格式的提示词。原因: ${finishReason}。错误: ${parseError.message}。原始响应预览: ${text.substring(0, 300)}`);
            }
          } else {
            throw new Error(`无法解析JSON格式的提示词。原因: ${finishReason}。错误: ${parseError.message}。原始响应预览: ${text.substring(0, 300)}`);
          }
        }
      } else {
        // Not MAX_TOKENS, try simple extraction
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            captionData = JSON.parse(jsonMatch[0]);
          } catch (e) {
            throw new Error(`无法解析JSON格式的提示词。错误: ${parseError.message}。原始响应预览: ${text.substring(0, 300)}`);
          }
        } else {
          throw new Error(`无法解析JSON格式的提示词。错误: ${parseError.message}。原始响应预览: ${text.substring(0, 300)}`);
        }
      }
    }

    console.log("解析后的JSON:", JSON.stringify(captionData, null, 2));

    return NextResponse.json({
      captionPrompt: captionData,
    });
  } catch (error: any) {
    console.error("Error in reverse caption:", error);
    console.error("Error stack:", error.stack);

    return NextResponse.json(
      {
        error: error.message || "反推提示词失败",
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

