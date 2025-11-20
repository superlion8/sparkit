import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

// Set max duration to 5 minutes for Vercel Serverless Functions
export const maxDuration = 300;

const AIMOVELY_API_URL = "https://dev.aimovely.com";

interface SnapshotPrompt {
  background: string;
  scene: string;
  lightingAndVibe: string;
  poseAndExpression: string;
  composition: string;
  cameraPosition: string;
  // Combined snapshot_prompt for final generation
  snapshotPrompt: string;
}

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;
    const aspectRatio = formData.get("aspectRatio") as string;

    if (!image) {
      return NextResponse.json(
        { error: "需要提供图片" },
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
    const imageBuffer = await image.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

    console.log("=== Snapshot Generation Started ===");
    const startTime = Date.now();

    // Upload input image to Aimovely first
    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;
    let aimovelyToken: string | null = null;
    let uploadedImageUrl: string | null = null;

    if (aimovelyEmail && aimovelyVcode) {
      try {
        aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
        if (aimovelyToken) {
          console.log("开始上传输入图片到 Aimovely...");
          
          const imageDataUrl = `data:${image.type};base64,${imageBase64}`;
          const uploadResult = await uploadImageToAimovely(
            imageDataUrl,
            aimovelyToken,
            "snapshot-input",
            aimovelyEmail,
            aimovelyVcode
          );
          if (uploadResult?.url) {
            uploadedImageUrl = uploadResult.url;
            console.log("输入图片上传成功:", uploadedImageUrl);
          }
        }
      } catch (uploadError) {
        console.error("上传输入图片到 Aimovely 失败:", uploadError);
      }
    }

    // Step 1: 生成5个snapshot prompt（使用 gemini-2.5-flash 文本模型）
    console.log("Step 1: 生成snapshot prompts...");
    const step1Start = Date.now();
    const snapshotPrompts = await generateSnapshotPrompts(
      imageBase64,
      image.type,
      apiKey
    );
    const step1Time = ((Date.now() - step1Start) / 1000).toFixed(2);
    console.log(`Step 1 完成，耗时: ${step1Time} 秒`);
    
    if (snapshotPrompts.length === 0) {
      throw new Error("未能解析任何snapshot prompt，请重试");
    }
    
    if (snapshotPrompts.length < 5) {
      console.warn(`只解析到 ${snapshotPrompts.length} 个snapshot prompt，将生成 ${snapshotPrompts.length} 张图片`);
    } else {
      console.log(`成功解析 ${snapshotPrompts.length} 个snapshot prompt`);
    }

    // Step 2: 并行生成5张背景图（使用 gemini-2.5-flash-image 图像生成模型）
    console.log(`Step 2: 根据 ${snapshotPrompts.length} 个background描述并行生成背景图...`);
    const step2Start = Date.now();
    
    const backgroundImagePromises = snapshotPrompts.map((snapshotPrompt, index) => {
      const bgStart = Date.now();
      console.log(`启动第 ${index + 1}/${snapshotPrompts.length} 张背景图的生成任务...`);
      
      return generateBackgroundImage(
        imageBase64,
        image.type,
        snapshotPrompt.background,
        aspectRatio,
        apiKey
      )
        .then((backgroundImage) => {
          const bgTime = ((Date.now() - bgStart) / 1000).toFixed(2);
          console.log(`第 ${index + 1} 张背景图生成成功，耗时: ${bgTime} 秒`);
          return {
            index,
            success: true,
            image: backgroundImage,
            time: bgTime,
          };
        })
        .catch((error: any) => {
          const bgTime = ((Date.now() - bgStart) / 1000).toFixed(2);
          console.error(`第 ${index + 1} 张背景图生成失败（耗时: ${bgTime} 秒）:`, error);
          return {
            index,
            success: false,
            error: error.message || "未知错误",
            time: bgTime,
          };
        });
    });

    const backgroundImageResults = await Promise.all(backgroundImagePromises);
    const backgroundImages: Array<{ index: number; image: string }> = [];
    const backgroundImageErrors: string[] = [];
    
    backgroundImageResults.forEach((result) => {
      if (result.success && 'image' in result) {
        backgroundImages.push({ index: result.index, image: result.image });
      } else if (!result.success && 'error' in result) {
        backgroundImageErrors.push(`第 ${result.index + 1} 张背景图: ${result.error}`);
      }
    });
    
    backgroundImages.sort((a, b) => a.index - b.index);

    const step2Time = ((Date.now() - step2Start) / 1000).toFixed(2);
    console.log(`Step 2 完成，总耗时: ${step2Time} 秒（并行生成 ${snapshotPrompts.length} 张背景图）`);
    console.log(`成功: ${backgroundImages.length} 张，失败: ${backgroundImageErrors.length} 张`);

    // Check if we have background images
    if (backgroundImages.length === 0) {
      throw new Error("所有背景图生成失败，请重试");
    }

    // Step 3: 并行生成5张最终图片（使用 gemini-2.5-flash-image 图像生成模型）
    console.log(`Step 3: 根据 ${backgroundImages.length} 张背景图和snapshot prompts并行生成最终图片...`);
    const step3Start = Date.now();
    
    const finalImagePromises = backgroundImages.map((bgItem) => {
      const finalStart = Date.now();
      const index = bgItem.index;
      const snapshotPrompt = snapshotPrompts[index];
      console.log(`启动第 ${index + 1}/${backgroundImages.length} 张最终图片的生成任务...`);
      
      return generateFinalSnapshotImage(
        imageBase64,
        image.type,
        bgItem.image,
        snapshotPrompt.snapshotPrompt,
        aspectRatio,
        apiKey
      )
        .then((finalImage) => {
          const finalTime = ((Date.now() - finalStart) / 1000).toFixed(2);
          console.log(`第 ${index + 1} 张最终图片生成成功，耗时: ${finalTime} 秒`);
          return {
            index,
            success: true,
            image: finalImage,
            time: finalTime,
          };
        })
        .catch((error: any) => {
          const finalTime = ((Date.now() - finalStart) / 1000).toFixed(2);
          console.error(`第 ${index + 1} 张最终图片生成失败（耗时: ${finalTime} 秒）:`, error);
          return {
            index,
            success: false,
            error: error.message || "未知错误",
            time: finalTime,
          };
        });
    });

    const finalImageResults = await Promise.all(finalImagePromises);
    const finalImages: Array<{ index: number; image: string }> = [];
    const finalImageErrors: string[] = [];
    
    finalImageResults.forEach((result) => {
      if (result.success && 'image' in result) {
        finalImages.push({ index: result.index, image: result.image });
      } else if (!result.success && 'error' in result) {
        finalImageErrors.push(`第 ${result.index + 1} 张最终图片: ${result.error}`);
      }
    });
    
    finalImages.sort((a, b) => a.index - b.index);

    const step3Time = ((Date.now() - step3Start) / 1000).toFixed(2);
    console.log(`Step 3 完成，总耗时: ${step3Time} 秒（并行生成 ${backgroundImages.length} 张最终图片）`);
    console.log(`成功: ${finalImages.length} 张，失败: ${finalImageErrors.length} 张`);

    // Check if we have any final images
    if (finalImages.length === 0) {
      throw new Error("所有最终图片生成失败，请重试");
    }

    // Upload generated images to Aimovely (parallel upload)
    console.log("开始并行上传生成的图片到 Aimovely...");
    const uploadStart = Date.now();
    const uploadedFinalImageUrls: Array<{ originalIndex: number; url: string }> = [];
    const uploadErrors: string[] = [];

    if (aimovelyToken && aimovelyEmail && aimovelyVcode) {
      try {
        const uploadPromises = finalImages.map((imageItem) => {
          const index = imageItem.index;
          const imageData = imageItem.image;
          const uploadImageStart = Date.now();
          console.log(`启动第 ${index + 1}/${finalImages.length} 张图片的上传任务...`);
          
          return uploadImageToAimovely(
            imageData,
            aimovelyToken!,
            `snapshot-${index}`,
            aimovelyEmail,
            aimovelyVcode
          )
            .then((uploadResult) => {
              const uploadImageTime = ((Date.now() - uploadImageStart) / 1000).toFixed(2);
              if (uploadResult?.url) {
                console.log(`图片 ${index + 1} 上传成功（耗时: ${uploadImageTime} 秒）`);
                return {
                  originalIndex: index,
                  success: true,
                  url: uploadResult.url,
                  time: uploadImageTime,
                };
              } else {
                return {
                  originalIndex: index,
                  success: false,
                  error: "无法获取 URL",
                  time: uploadImageTime,
                };
              }
            })
            .catch((uploadError: any) => {
              const uploadImageTime = ((Date.now() - uploadImageStart) / 1000).toFixed(2);
              console.error(`上传图片 ${index + 1} 失败（耗时: ${uploadImageTime} 秒）:`, uploadError);
              return {
                originalIndex: index,
                success: false,
                error: uploadError.message || "未知错误",
                time: uploadImageTime,
              };
            });
        });

        const uploadResults = await Promise.all(uploadPromises);

        uploadResults.forEach((result) => {
          if (result.success && 'url' in result && result.url) {
            uploadedFinalImageUrls.push({ originalIndex: result.originalIndex, url: result.url });
          } else if (!result.success && 'error' in result) {
            uploadErrors.push(`图片 ${result.originalIndex + 1} 上传失败：${result.error}`);
          }
        });
        
        uploadedFinalImageUrls.sort((a, b) => a.originalIndex - b.originalIndex);
        
        const uploadTime = ((Date.now() - uploadStart) / 1000).toFixed(2);
        console.log(`图片上传完成，总耗时: ${uploadTime} 秒（并行上传 ${finalImages.length} 张图片）`);
        console.log(`成功: ${uploadedFinalImageUrls.length} 张，失败: ${uploadErrors.length} 张`);
        
        if (uploadErrors.length > 0) {
          console.warn(`部分图片上传失败: ${uploadErrors.length}/${finalImages.length}`);
        }
      } catch (uploadError: any) {
        const uploadTime = ((Date.now() - uploadStart) / 1000).toFixed(2);
        console.error(`上传生成的图片到 Aimovely 时发生异常（总耗时: ${uploadTime} 秒）:`, uploadError);
        uploadErrors.push(`上传过程异常：${uploadError.message || "未知错误"}`);
      }
    }

    // Helper function to sanitize strings for JSON serialization
    const sanitizeString = (str: string | null | undefined): string => {
      if (!str) return "";
      let sanitized = String(str);
      sanitized = sanitized.replace(/\r\n/g, " ").replace(/\n/g, " ").replace(/\r/g, " ");
      sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, " ");
      sanitized = sanitized.replace(/[\u200B-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g, " ");
      sanitized = sanitized.replace(/[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g, " ");
      sanitized = sanitized.trim();
      if (sanitized.length > 1000) {
        sanitized = sanitized.substring(0, 997) + "...";
      }
      if (sanitized.length === 0 && str) {
        return "[内容已清理]";
      }
      return sanitized;
    };

    // Prepare response data - align snapshot prompts with successfully uploaded images
    const successfulSnapshotPrompts: SnapshotPrompt[] = [];
    const successfulImageUrls: string[] = [];

    uploadedFinalImageUrls.forEach((item) => {
      if (snapshotPrompts[item.originalIndex] && item.url) {
        const snapshotPrompt = snapshotPrompts[item.originalIndex];
        const sanitizedPrompt: SnapshotPrompt = {
          background: sanitizeString(snapshotPrompt.background),
          scene: sanitizeString(snapshotPrompt.scene),
          lightingAndVibe: sanitizeString(snapshotPrompt.lightingAndVibe),
          poseAndExpression: sanitizeString(snapshotPrompt.poseAndExpression),
          composition: sanitizeString(snapshotPrompt.composition),
          cameraPosition: sanitizeString(snapshotPrompt.cameraPosition),
          snapshotPrompt: sanitizeString(snapshotPrompt.snapshotPrompt),
        };
        successfulSnapshotPrompts.push(sanitizedPrompt);
        successfulImageUrls.push(item.url);
      }
    });

    const allErrors = [...backgroundImageErrors, ...finalImageErrors, ...uploadErrors];
    
    const responseData: any = {
      inputImageUrl: uploadedImageUrl || null,
      snapshotPrompts: successfulSnapshotPrompts,
      generatedImageUrls: successfulImageUrls,
      generatedCount: successfulImageUrls.length,
      requestedCount: snapshotPrompts.length,
    };
    
    if (allErrors.length > 0) {
      responseData.errors = allErrors.map((err: string) => sanitizeString(err));
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`=== Snapshot 总执行时间: ${totalTime} 秒 ===`);

    // Return response with proper headers
    try {
      const validatedData = {
        inputImageUrl: responseData.inputImageUrl || null,
        snapshotPrompts: (responseData.snapshotPrompts || []).map((prompt: SnapshotPrompt) => ({
          background: sanitizeString(prompt.background),
          scene: sanitizeString(prompt.scene),
          lightingAndVibe: sanitizeString(prompt.lightingAndVibe),
          poseAndExpression: sanitizeString(prompt.poseAndExpression),
          composition: sanitizeString(prompt.composition),
          cameraPosition: sanitizeString(prompt.cameraPosition),
          snapshotPrompt: sanitizeString(prompt.snapshotPrompt),
        })),
        generatedImageUrls: (responseData.generatedImageUrls || []).filter((url: string) => url && typeof url === 'string'),
        generatedCount: Number(responseData.generatedCount) || 0,
        requestedCount: Number(responseData.requestedCount) || 0,
        ...(responseData.errors && responseData.errors.length > 0 ? {
          errors: (responseData.errors || []).map((err: string) => sanitizeString(err))
        } : {})
      };
      
      const responseJsonString = JSON.stringify(validatedData);
      JSON.parse(responseJsonString); // Verify valid JSON

      return new NextResponse(responseJsonString, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Response-Time': `${totalTime}s`,
        },
      });
    } catch (jsonError: any) {
      console.error("JSON 序列化失败:", jsonError);
      const safeResponseData = {
        inputImageUrl: null,
        snapshotPrompts: [],
        generatedImageUrls: [],
        generatedCount: 0,
        requestedCount: snapshotPrompts.length,
        errors: [`响应序列化失败: ${sanitizeString(jsonError.message || '未知错误')}`],
      };
      return NextResponse.json(safeResponseData, { status: 500 });
    }

  } catch (error: any) {
    console.error("Snapshot generation error:", error);
    const statusCode = error.message?.includes("安全") ? 400 : 
                      error.message?.includes("超时") ? 504 : 500;
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        details: error.details || null
      },
      { status: statusCode }
    );
  }
}

// Step 1: 生成5个snapshot prompt（使用 gemini-2.5-flash 文本模型）
async function generateSnapshotPrompts(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<SnapshotPrompt[]> {
  const prompt = `请基于你对这个模特的理解,给出5个适合instagram有生活感的随手拍prompt,不需要拘泥于当前照片的背景和穿着. 5张照片需要是under在不同的故事下的. 为了提升真实感和生活感，scene可以适当带一些城市名字。
请你按照以下的格式，用英文来输出5张照片的prompt:
- {{background1}}：xxxx
- {{scene1}}：xxxx
- {{lighting and vibe1}}：xxxx
- {{pose and expression1}}：xxxx
- {{Composition1}}：xxxx
- {{camera position1}}：xxxx
以此类推。不要输出图片，只输出文字。`;

  const contents = [
    {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
        { text: prompt },
      ],
    },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
          maxOutputTokens: 8000,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini API error (generate snapshot prompts):", error);
    throw new Error("生成snapshot prompts失败");
  }

  const data = await response.json();

  if (data.error) {
    console.error("Gemini API 返回错误:", data.error);
    throw new Error(`Gemini API 错误: ${data.error.message || '未知错误'}`);
  }

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error("API 未返回候选结果，请稍后重试");
  }

  let text = "";
  const candidate = data.candidates[0];
  
  if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
    throw new Error("内容被安全过滤阻止，请尝试其他图片");
  }

  if (candidate.content && candidate.content.parts) {
    for (const part of candidate.content.parts) {
      if (part.text) {
        text += part.text;
      }
    }
  }

  if (!text) {
    throw new Error("Gemini 未返回有效的文本");
  }

  return parseSnapshotPrompts(text);
}

// Parse snapshot prompts from Gemini output
function parseSnapshotPrompts(text: string): SnapshotPrompt[] {
  const prompts: SnapshotPrompt[] = [];
  
  // Try to extract 5 snapshot prompts
  for (let i = 1; i <= 5; i++) {
    const snapshotData: Partial<SnapshotPrompt> = {};
    
    // Extract background
    const bgMatch = text.match(new RegExp(`-?\\s*\\{\\{?background${i}\\}\\}?[:：]\\s*([^\\n-]+)`, 'i'));
    if (bgMatch && bgMatch[1]) {
      snapshotData.background = bgMatch[1].trim();
    }
    
    // Extract scene
    const sceneMatch = text.match(new RegExp(`-?\\s*\\{\\{?scene${i}\\}\\}?[:：]\\s*([^\\n-]+)`, 'i'));
    if (sceneMatch && sceneMatch[1]) {
      snapshotData.scene = sceneMatch[1].trim();
    }
    
    // Extract lighting and vibe
    const lightingMatch = text.match(new RegExp(`-?\\s*\\{\\{?lighting\\s+and\\s+vibe${i}\\}\\}?[:：]\\s*([^\\n-]+)`, 'i'));
    if (lightingMatch && lightingMatch[1]) {
      snapshotData.lightingAndVibe = lightingMatch[1].trim();
    }
    
    // Extract pose and expression
    const poseMatch = text.match(new RegExp(`-?\\s*\\{\\{?pose\\s+and\\s+expression${i}\\}\\}?[:：]\\s*([^\\n-]+)`, 'i'));
    if (poseMatch && poseMatch[1]) {
      snapshotData.poseAndExpression = poseMatch[1].trim();
    }
    
    // Extract composition
    const compMatch = text.match(new RegExp(`-?\\s*\\{\\{?[Cc]omposition${i}\\}\\}?[:：]\\s*([^\\n-]+)`, 'i'));
    if (compMatch && compMatch[1]) {
      snapshotData.composition = compMatch[1].trim();
    }
    
    // Extract camera position
    const cameraMatch = text.match(new RegExp(`-?\\s*\\{\\{?camera\\s+position${i}\\}\\}?[:：]\\s*([^\\n-]+)`, 'i'));
    if (cameraMatch && cameraMatch[1]) {
      snapshotData.cameraPosition = cameraMatch[1].trim();
    }
    
    // If we have all required fields, create the snapshot prompt
    if (snapshotData.background && snapshotData.scene && snapshotData.lightingAndVibe && 
        snapshotData.poseAndExpression && snapshotData.composition && snapshotData.cameraPosition) {
      // Combine into snapshot_prompt string
      const snapshotPromptStr = `${snapshotData.background}, ${snapshotData.scene}, ${snapshotData.lightingAndVibe}, ${snapshotData.poseAndExpression}, ${snapshotData.composition}, ${snapshotData.cameraPosition}`;
      
      prompts.push({
        background: snapshotData.background,
        scene: snapshotData.scene,
        lightingAndVibe: snapshotData.lightingAndVibe,
        poseAndExpression: snapshotData.poseAndExpression,
        composition: snapshotData.composition,
        cameraPosition: snapshotData.cameraPosition,
        snapshotPrompt: snapshotPromptStr,
      });
      
      console.log(`成功解析 Snapshot ${i}:`);
      console.log(`  Background: ${snapshotData.background.substring(0, 50)}...`);
      console.log(`  Scene: ${snapshotData.scene.substring(0, 50)}...`);
    } else {
      console.warn(`Snapshot ${i} 字段不完整，跳过`);
    }
  }
  
  return prompts.slice(0, 5); // Limit to 5
}

// Step 2: 生成背景图（使用 gemini-2.5-flash-image 图像生成模型）
async function generateBackgroundImage(
  imageBase64: string,
  mimeType: string,
  backgroundDescription: string,
  aspectRatio: string | null,
  apiKey: string
): Promise<string> {
  const prompt = `Generate a background image based on this description: ${backgroundDescription}. The image should be suitable as a background for a portrait photo.`;

  const contents = [
    {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
        { text: prompt },
      ],
    },
  ];

  const generationConfig: any = {
    responseModalities: ["IMAGE"],
  };

  if (aspectRatio) {
    generationConfig.imageConfig = {
      aspectRatio: aspectRatio,
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini API error (generate background image):", error);
    throw new Error("生成背景图失败");
  }

  const data = await response.json();

  if (data.error) {
    console.error("Gemini API 返回错误:", data.error);
    throw new Error(`Gemini API 错误: ${data.error.message || '未知错误'}`);
  }

  // Check promptFeedback FIRST
  if (data.promptFeedback) {
    const blockReason = data.promptFeedback.blockReason;
    console.error("Prompt被阻止 (generate background):", {
      blockReason,
      blockReasonMessage: data.promptFeedback.blockReasonMessage
    });
    
    if (blockReason === "IMAGE_SAFETY" || blockReason === "PROHIBITED_CONTENT") {
      throw new Error(`内容被安全过滤阻止: ${blockReason}`);
    } else if (blockReason) {
      throw new Error(`请求被阻止: ${data.promptFeedback.blockReasonMessage || blockReason}`);
    }
  }

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error("API 未返回候选结果，请稍后重试");
  }

  for (const candidate of data.candidates) {
    if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
      throw new Error("内容被安全过滤阻止，请尝试其他图片");
    }

    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
  }

  throw new Error("未找到生成的背景图");
}

// Step 3: 生成最终snapshot图片（使用 gemini-2.5-flash-image 图像生成模型）
async function generateFinalSnapshotImage(
  imageBase64: string,
  mimeType: string,
  backgroundImage: string,
  snapshotPrompt: string,
  aspectRatio: string | null,
  apiKey: string
): Promise<string> {
  // Convert background image (data URL) back to base64 if needed
  let backgroundBase64 = backgroundImage;
  let backgroundMimeType = "image/png";

  if (backgroundImage.startsWith("data:")) {
    const parts = backgroundImage.split(",");
    const metadata = parts[0];
    backgroundBase64 = parts[1];
    const mimeMatch = metadata.match(/data:(.*?);base64/);
    if (mimeMatch) {
      backgroundMimeType = mimeMatch[1];
    }
  }

  const finalPrompt = `take autentic photo of the character, use instagram friendly composition. Shot on the character should have identical face, features, skin tone, hairstyle, body proportions, and vibe. 
setup：${snapshotPrompt}

negatives: beauty-filter/airbrushed skin; poreless look, exaggerated or distorted anatomy, fake portrait-mode blur, CGI/illustration look`;

  const contents = [
    {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64,
          },
        },
        {
          inlineData: {
            mimeType: backgroundMimeType,
            data: backgroundBase64,
          },
        },
        { text: finalPrompt },
      ],
    },
  ];

  const generationConfig: any = {
    responseModalities: ["IMAGE"],
  };

  if (aspectRatio) {
    generationConfig.imageConfig = {
      aspectRatio: aspectRatio,
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini API error (generate final snapshot image):", error);
    throw new Error("生成最终图片失败");
  }

  const data = await response.json();

  if (data.error) {
    console.error("Gemini API 返回错误:", data.error);
    throw new Error(`Gemini API 错误: ${data.error.message || '未知错误'}`);
  }

  // Check promptFeedback FIRST
  if (data.promptFeedback) {
    const blockReason = data.promptFeedback.blockReason;
    console.error("Prompt被阻止 (generate final snapshot):", {
      blockReason,
      blockReasonMessage: data.promptFeedback.blockReasonMessage
    });
    
    if (blockReason === "IMAGE_SAFETY" || blockReason === "PROHIBITED_CONTENT") {
      throw new Error(`内容被安全过滤阻止: ${blockReason}`);
    } else if (blockReason) {
      throw new Error(`请求被阻止: ${data.promptFeedback.blockReasonMessage || blockReason}`);
    }
  }

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error("API 未返回候选结果，请稍后重试");
  }

  for (const candidate of data.candidates) {
    if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
      throw new Error("内容被安全过滤阻止，请尝试其他图片");
    }

    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
  }

  throw new Error("未找到生成的最终图片");
}

// Helper functions for Aimovely integration
async function fetchAimovelyToken(email: string, vcode: string): Promise<string | null> {
  try {
    const response = await fetch(`${AIMOVELY_API_URL}/v1/user/verifyvcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        vcode,
      }),
    });

    if (!response.ok) {
      console.error("Aimovely token request failed:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    if (data.code !== 0 || !data.data?.access_token) {
      console.error("Aimovely token response invalid:", data);
      return null;
    }

    return data.data.access_token as string;
  } catch (error) {
    console.error("Error fetching Aimovely token:", error);
    return null;
  }
}

interface UploadResult {
  url?: string;
  error?: string;
}

async function uploadImageToAimovely(
  imageDataUrl: string,
  token: string,
  filename: string,
  email?: string,
  vcode?: string
): Promise<UploadResult | null> {
  try {
    if (!imageDataUrl.startsWith("data:")) {
      console.warn("Unsupported image format, expected data URL");
      return { error: "Invalid image format" };
    }

    // Parse data URL
    const [metadata, base64Data] = imageDataUrl.split(",");
    const mimeMatch = metadata.match(/data:(.*?);base64/);
    if (!mimeMatch) {
      console.warn("Failed to parse data URL metadata");
      return { error: "Failed to parse image data" };
    }

    const mimeType = mimeMatch[1] || "image/png";
    const buffer = Buffer.from(base64Data, "base64");
    const fileName = `snapshot-${filename}-${Date.now()}.${mimeType.split("/")[1] ?? "png"}`;

    const file = new File([buffer], fileName, { type: mimeType });

    // Create FormData
    const formData = new FormData();
    formData.append("file", file);
    formData.append("biz", "external_tool");

    // Upload to Aimovely
    let uploadResponse = await fetch(`${AIMOVELY_API_URL}/v1/resource/upload`, {
      method: "POST",
      headers: {
        Authorization: token, // Use token directly, not Bearer token
      },
      body: formData,
    });

    // If 401, try to refresh token and retry once
    if (uploadResponse.status === 401 && email && vcode) {
      console.warn("Aimovely token expired (401), refreshing token and retrying...");
      const newToken = await fetchAimovelyToken(email, vcode);
      if (newToken) {
        // Retry with new token
        uploadResponse = await fetch(`${AIMOVELY_API_URL}/v1/resource/upload`, {
          method: "POST",
          headers: {
            Authorization: newToken,
          },
          body: formData,
        });
      } else {
        console.error("Failed to refresh Aimovely token");
        const errorText = await uploadResponse.text();
        return { error: `Token refresh failed: ${errorText}` };
      }
    }

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Aimovely upload failed:", uploadResponse.status, errorText);
      return { error: errorText };
    }

    const uploadData = await uploadResponse.json();
    if (uploadData.code !== 0 || !uploadData.data?.url) {
      console.error("Aimovely upload response invalid:", uploadData);
      return { error: "Invalid response from Aimovely" };
    }

    return { url: uploadData.data.url };
  } catch (error) {
    console.error("Error uploading image to Aimovely:", error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
