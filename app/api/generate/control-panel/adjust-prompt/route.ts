import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = await request.json();
    const { refPromptJson, charPromptJson, controlDimensions } = body;

    if (!refPromptJson || !charPromptJson) {
      return NextResponse.json(
        { error: "需要提供 ref prompt 和 char prompt" },
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
    console.log("Control dimensions:", controlDimensions);

    // Build prompt for adjustment - only fields that need "adjust"
    const adjustParts: string[] = [];
    if (controlDimensions.pose === "adjust") {
      adjustParts.push("subject_pose");
    }
    if (controlDimensions.expression === "adjust") {
      adjustParts.push("subject_expression");
    }
    if (controlDimensions.wardrobe === "adjust") {
      adjustParts.push("subject_wardrobe");
    }
    if (controlDimensions.environment === "adjust") {
      adjustParts.push("environment");
    }
    if (controlDimensions.camera === "adjust") {
      adjustParts.push("camera");
    }

    // If no fields need adjustment, build final prompt directly from control dimensions
    if (adjustParts.length === 0) {
      const finalPrompt: any = {
        scene: controlDimensions.environment === "ref" 
          ? refPromptJson.scene 
          : charPromptJson.scene,
        subject_desc: charPromptJson.subject_desc, // Always use char
        subject_pose: controlDimensions.pose === "ref" 
          ? refPromptJson.subject_pose 
          : charPromptJson.subject_pose,
        subject_expression: controlDimensions.expression === "ref" 
          ? refPromptJson.subject_expression 
          : charPromptJson.subject_expression,
        subject_wardrobe: controlDimensions.wardrobe === "ref" 
          ? refPromptJson.subject_wardrobe 
          : charPromptJson.subject_wardrobe,
        environment: controlDimensions.environment === "ref" 
          ? refPromptJson.environment 
          : charPromptJson.environment,
        camera: controlDimensions.camera === "ref" 
          ? refPromptJson.camera 
          : charPromptJson.camera,
      };
      
      return NextResponse.json({
        adjustedPrompt: finalPrompt,
      });
    }

    // Build base prompt - start with ref_prompt, but use char_prompt for subject_desc
    const charDesc = charPromptJson.subject_desc;
    const refPromptStr = JSON.stringify(refPromptJson, null, 2);
    const charDescStr = JSON.stringify(charDesc, null, 2);
    
    // Map adjust parts to Chinese names for prompt
    const adjustPartsMap: Record<string, string> = {
      "subject_pose": "pose (人物动作)",
      "subject_expression": "expression (人物表情)",
      "subject_wardrobe": "wardrobe (人物着装)",
      "environment": "environment (环境)",
      "camera": "camera (镜头)",
    };
    
    const adjustFieldsList = adjustParts.map(part => adjustPartsMap[part] || part).join("、");
    
    const prompt = `你是一个人像拍摄大师，擅长拍摄适合instagram的人像照片。

你要拍的角色是${charDescStr}，参考的图像是${refPromptStr}。

现在，你的用户想要调整${refPromptStr}中的${adjustFieldsList}，请你不要修改${refPromptStr}中的其他部分，重新输出一个包含${charDescStr}信息的完整JSON prompt。

重要要求：
1. 只调整以下字段：${adjustFieldsList}
2. 其他字段必须保持与参考图像 ${refPromptStr} 完全一致
3. subject_desc 必须使用角色描述 ${charDescStr}，不要使用参考图中的 subject_desc
4. 输出格式必须和原始prompt完全一致，包含所有字段：scene, subject_desc, subject_pose, subject_expression, subject_wardrobe, environment, camera

请直接输出JSON格式，不要包含其他文字说明。`;

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
            maxOutputTokens: 4096, // Increase to handle larger JSON responses
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

    const isMaxTokens = candidate.finishReason === "MAX_TOKENS";
    if (isMaxTokens) {
      console.warn("达到最大令牌数限制，响应可能被截断");
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
    console.log("Finish reason:", candidate.finishReason);
    console.log("原始响应预览:", text.substring(0, 500));
    console.log("原始响应结尾:", text.substring(Math.max(0, text.length - 500)));

    // Try to extract JSON from the response
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.includes("```json")) {
      jsonText = jsonText.split("```json")[1].split("```")[0].trim();
    } else if (jsonText.includes("```")) {
      jsonText = jsonText.split("```")[1].split("```")[0].trim();
    }

    // Try to find the JSON object - use a more robust approach
    let jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to find JSON starting from the first {
      const firstBrace = jsonText.indexOf('{');
      if (firstBrace !== -1) {
        jsonText = jsonText.substring(firstBrace);
        jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      }
    }
    
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    } else {
      // If no JSON found, try to find from first brace to end
      const firstBrace = jsonText.indexOf('{');
      if (firstBrace !== -1) {
        jsonText = jsonText.substring(firstBrace);
      } else {
        throw new Error("响应中未找到 JSON 格式的内容");
      }
    }

    // If MAX_TOKENS, try to fix incomplete JSON
    if (isMaxTokens && jsonText) {
      // Count braces to see if JSON is incomplete
      const openBraces = (jsonText.match(/\{/g) || []).length;
      const closeBraces = (jsonText.match(/\}/g) || []).length;
      const openBrackets = (jsonText.match(/\[/g) || []).length;
      const closeBrackets = (jsonText.match(/\]/g) || []).length;
      
      console.log(`JSON 括号计数 - 大括号: ${openBraces}/${closeBraces}, 方括号: ${openBrackets}/${closeBrackets}`);
      
      // Try to fix incomplete JSON by adding missing closing braces/brackets
      if (openBraces > closeBraces || openBrackets > closeBrackets) {
        console.warn("检测到不完整的 JSON，尝试修复...");
        // Add missing closing brackets first, then braces
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          jsonText += ']';
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          jsonText += '}';
        }
        console.log("修复后的 JSON 预览:", jsonText.substring(0, 500));
      }
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
      console.error("尝试解析的文本长度:", jsonText.length);
      console.error("尝试解析的文本开头:", jsonText.substring(0, 500));
      console.error("尝试解析的文本结尾:", jsonText.substring(Math.max(0, jsonText.length - 500)));
      
      // If parsing failed and we have MAX_TOKENS, try to merge with original
      if (isMaxTokens) {
        console.warn("由于 MAX_TOKENS，尝试合并原始 prompt 和部分调整...");
        try {
          // Start with ref prompt as base
          adjustedPrompt = JSON.parse(JSON.stringify(refPromptJson)); // Deep copy
          
          // Try to extract individual fields from partial JSON
          // For simple string fields
          const stringFields = ['scene', 'subject_pose', 'subject_expression'];
          for (const field of stringFields) {
            const fieldRegex = new RegExp(`"${field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 's');
            const fieldMatch = jsonText.match(fieldRegex);
            if (fieldMatch && fieldMatch[1]) {
              try {
                adjustedPrompt[field] = JSON.parse(`"${fieldMatch[1]}"`);
                console.log(`成功提取字符串字段 ${field}`);
              } catch (e) {
                // Ignore field extraction errors
              }
            }
          }
          
          // For complex object fields, try simpler extraction
          const objectFields = ['subject_wardrobe', 'environment', 'camera'];
          for (const field of objectFields) {
            const fieldStart = jsonText.indexOf(`"${field}"`);
            if (fieldStart !== -1) {
              const colonPos = jsonText.indexOf(':', fieldStart);
              if (colonPos !== -1) {
                // Find the opening brace
                let braceStart = colonPos + 1;
                while (braceStart < jsonText.length && jsonText[braceStart] !== '{') {
                  braceStart++;
                }
                if (braceStart < jsonText.length) {
                  // Try to find matching closing brace
                  let braceCount = 1;
                  let braceEnd = braceStart + 1;
                  while (braceEnd < jsonText.length && braceCount > 0) {
                    if (jsonText[braceEnd] === '{') braceCount++;
                    if (jsonText[braceEnd] === '}') braceCount--;
                    braceEnd++;
                  }
                  if (braceCount === 0) {
                    const fieldValueStr = jsonText.substring(braceStart, braceEnd);
                    try {
                      const fieldValue = JSON.parse(fieldValueStr);
                      adjustedPrompt[field] = fieldValue;
                      console.log(`成功提取对象字段 ${field}`);
                    } catch (e) {
                      // Ignore field extraction errors
                    }
                  }
                }
              }
            }
          }
          
          // Validate that we got something useful
          if (Object.keys(adjustedPrompt).length > 0) {
            console.log("使用合并后的 prompt，包含字段:", Object.keys(adjustedPrompt));
          } else {
            throw new Error("无法从部分响应中提取有效字段");
          }
        } catch (mergeError: any) {
          console.error("合并失败:", mergeError);
          throw new Error(`无法解析JSON格式的调整后的prompt。错误: ${parseError.message}。原始响应预览: ${text.substring(0, 300)}`);
        }
      } else {
        throw new Error(`无法解析JSON格式的调整后的prompt。错误: ${parseError.message}。原始响应预览: ${text.substring(0, 300)}`);
      }
    }

    console.log("解析后的JSON字段:", Object.keys(adjustedPrompt));
    console.log("解析后的JSON预览:", JSON.stringify(adjustedPrompt, null, 2).substring(0, 500));

    // Build final prompt: use adjusted fields + non-adjusted fields based on controlDimensions
    const finalAdjustedPrompt: any = {
      scene: controlDimensions.environment === "ref" 
        ? (adjustedPrompt.scene || refPromptJson.scene)
        : charPromptJson.scene,
      subject_desc: charPromptJson.subject_desc, // Always use char
      subject_pose: controlDimensions.pose === "adjust"
        ? adjustedPrompt.subject_pose
        : (controlDimensions.pose === "ref" ? refPromptJson.subject_pose : charPromptJson.subject_pose),
      subject_expression: controlDimensions.expression === "adjust"
        ? adjustedPrompt.subject_expression
        : (controlDimensions.expression === "ref" ? refPromptJson.subject_expression : charPromptJson.subject_expression),
      subject_wardrobe: controlDimensions.wardrobe === "adjust"
        ? adjustedPrompt.subject_wardrobe
        : (controlDimensions.wardrobe === "ref" ? refPromptJson.subject_wardrobe : charPromptJson.subject_wardrobe),
      environment: controlDimensions.environment === "adjust"
        ? adjustedPrompt.environment
        : (controlDimensions.environment === "ref" ? refPromptJson.environment : charPromptJson.environment),
      camera: controlDimensions.camera === "adjust"
        ? adjustedPrompt.camera
        : (controlDimensions.camera === "ref" ? refPromptJson.camera : charPromptJson.camera),
    };

    console.log("最终返回的 prompt (已替换 subject_desc):", JSON.stringify(finalAdjustedPrompt, null, 2).substring(0, 500));

    return NextResponse.json({
      adjustedPrompt: finalAdjustedPrompt,
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

