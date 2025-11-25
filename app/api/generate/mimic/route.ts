import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";
import { generateText, generateImage } from "@/lib/vertexai";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

// 设置 API 路由的最大执行时间为 5 分钟（与 PhotoBooth 等功能保持一致）
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  // 在外层定义，以便 catch 块可以访问
  let baseTaskId = `mimic-${Date.now()}`;
  let createdPendingTaskIds: string[] = [];

  try {
    const formData = await request.formData();
    const referenceImage = formData.get("referenceImage") as File;
    const characterImage = formData.get("characterImage") as File;
    const charAvatar = formData.get("charAvatar") as File | null; // 可选的 char_avatar（如果提供了 char_image）
    const aspectRatio = formData.get("aspectRatio") as string;
    const numImages = parseInt(formData.get("numImages") as string) || 1;
    const hotMode = formData.get("hotMode") === "true";
    const keepBackground = formData.get("keepBackground") === "true";
    const customCaptionPrompt = formData.get("customCaptionPrompt") as string | null;
    const existingBackgroundImage = formData.get("existingBackgroundImage") as File | null;
    const characterId = formData.get("characterId") as string | null; // 角色 ID（用于保存到角色资源）

    // 如果提供了自定义 captionPrompt，说明是重新生成，不需要参考图
    if (customCaptionPrompt && !characterImage) {
      return NextResponse.json(
        { error: "需要提供角色图" },
        { status: 400 }
      );
    }

    if (!customCaptionPrompt && (!referenceImage || !characterImage)) {
      return NextResponse.json(
        { error: "需要提供参考图和角色图" },
        { status: 400 }
      );
    }

    console.log(`=== Mimic Generation Started (Hot Mode: ${hotMode}, Keep Background: ${keepBackground}) ===`);

    // 检查 Vertex AI 配置
    const projectId = process.env.VERTEX_AI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json(
        { error: "VERTEX_AI_PROJECT_ID or GOOGLE_CLOUD_PROJECT_ID environment variable is required" },
        { status: 500 }
      );
    }

    // 如果提供了 characterId，先创建 pending 任务
    if (characterId && user) {
      try {
        // 验证角色属于当前用户
        const { data: character } = await supabaseAdminClient
          .from("characters")
          .select("id")
          .eq("id", characterId)
          .eq("user_id", user.id)
          .single();

        if (character) {
          // 🆕 清理该角色所有旧的 pending/processing/failed 任务（避免界面显示历史遗留任务）
          // 同时清理 completed 但没有输出图片的任务（这些是失败的任务）
          try {
            // 1. 清理 pending/processing/failed 任务
            const { data: oldPendingTasks } = await supabaseAdminClient
              .from("generation_tasks")
              .select("task_id, status")
              .eq("character_id", characterId)
              .eq("email", user.email)
              .in("status", ["pending", "processing", "failed"]);
            
            if (oldPendingTasks && oldPendingTasks.length > 0) {
              console.log(`[Mimic API] Cleaning up ${oldPendingTasks.length} old pending/processing/failed tasks`);
              
              await supabaseAdminClient
                .from("generation_tasks")
                .delete()
                .eq("character_id", characterId)
                .eq("email", user.email)
                .in("status", ["pending", "processing", "failed"]);
            }
            
            // 2. 清理 completed 但没有输出图片的任务（这些是失败但标记为 completed 的任务）
            const { data: emptyCompletedTasks } = await supabaseAdminClient
              .from("generation_tasks")
              .select("task_id")
              .eq("character_id", characterId)
              .eq("email", user.email)
              .eq("status", "completed")
              .eq("task_type", "mimic")
              .is("output_image_url", null);
            
            if (emptyCompletedTasks && emptyCompletedTasks.length > 0) {
              console.log(`[Mimic API] Cleaning up ${emptyCompletedTasks.length} empty completed tasks`);
              
              const taskIdsToDelete = emptyCompletedTasks.map(t => t.task_id);
              await supabaseAdminClient
                .from("generation_tasks")
                .delete()
                .in("task_id", taskIdsToDelete);
            }
          } catch (cleanupError) {
            console.error("[Mimic API] Failed to cleanup old tasks:", cleanupError);
            // 不中断流程
          }
          
          console.log(`[Mimic API] Creating ${numImages} pending tasks for character ${characterId}`);
          
          // 创建 numImages 个 pending 任务
          const pendingTasksToInsert = [];
          
          for (let i = 0; i < numImages; i++) {
            const taskId = `${baseTaskId}-${i}-${Math.random().toString(36).substr(2, 9)}`;
            createdPendingTaskIds.push(taskId);
            
            pendingTasksToInsert.push({
              task_id: taskId,
              task_type: "mimic",
              email: user.email,
              username: user.user_metadata?.full_name || user.email,
              prompt: customCaptionPrompt || "等待反推提示词...",
              character_id: characterId,
              status: "pending",
              started_at: new Date().toISOString(),
              task_time: new Date().toISOString(),
            });
          }
          
          if (pendingTasksToInsert.length > 0) {
            await supabaseAdminClient
              .from("generation_tasks")
              .insert(pendingTasksToInsert);
            
            console.log(`[Mimic API] Created ${pendingTasksToInsert.length} pending tasks`);
          }
        }
      } catch (error) {
        console.error("[Mimic API] Failed to create pending tasks:", error);
        // 不中断流程，继续生成
      }
    }

    // Convert images to base64
    let referenceBase64: string = "";
    let uploadedReferenceImageUrl: string | null = null;
    
    if (referenceImage) {
      const referenceBuffer = await referenceImage.arrayBuffer();
      referenceBase64 = Buffer.from(referenceBuffer).toString("base64");
    }
    
    const characterBuffer = await characterImage.arrayBuffer();
    const characterBase64 = Buffer.from(characterBuffer).toString("base64");
    
    // 处理 charAvatar（如果提供）
    let charAvatarBase64: string | null = null;
    let charAvatarMimeType: string | null = null;
    if (charAvatar) {
      const charAvatarBuffer = await charAvatar.arrayBuffer();
      charAvatarBase64 = Buffer.from(charAvatarBuffer).toString("base64");
      charAvatarMimeType = charAvatar.type || "image/jpeg";
      console.log("[Mimic API] charAvatar provided:", charAvatar.name);
    }

    // Upload input images to Aimovely first
    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;
    let aimovelyToken: string | null = null;
    let uploadedCharacterImageUrl: string | null = null;

    if (aimovelyEmail && aimovelyVcode) {
      try {
        aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
        if (aimovelyToken) {
          console.log("开始上传输入图片到 Aimovely...");
          
          // Upload reference image (only if not using custom prompt)
          if (referenceImage && !customCaptionPrompt) {
            const referenceDataUrl = `data:${referenceImage.type};base64,${referenceBase64}`;
            const referenceUploadResult = await uploadImageToAimovely(
              referenceDataUrl,
              aimovelyToken,
              "reference"
            );
            if (referenceUploadResult?.url) {
              uploadedReferenceImageUrl = referenceUploadResult.url;
              console.log("参考图上传成功:", uploadedReferenceImageUrl);
            }
          }

          // Upload character image
          const characterDataUrl = `data:${characterImage.type};base64,${characterBase64}`;
          const characterUploadResult = await uploadImageToAimovely(
            characterDataUrl,
            aimovelyToken,
            "character"
          );
          if (characterUploadResult?.url) {
            uploadedCharacterImageUrl = characterUploadResult.url;
            console.log("角色图上传成功:", uploadedCharacterImageUrl);
          }
        }
      } catch (uploadError) {
        console.error("上传输入图片到 Aimovely 失败:", uploadError);
        // Continue with generation even if upload fails
      }
    }

    // Step 1 & 2: 如果提供了自定义 captionPrompt，跳过反推和背景图生成
    let captionPrompt: string;
    let backgroundImage: string = "";
    let backgroundImageBase64: string = "";
    let uploadedBackgroundImageUrl: string | null = null;
    
    if (customCaptionPrompt) {
      // 使用用户提供的自定义 prompt
      console.log("=== 重新生成模式：使用自定义 captionPrompt，跳过 Step 1 ===");
      console.log("自定义 captionPrompt:", customCaptionPrompt);
      console.log("keepBackground:", keepBackground);
      console.log("existingBackgroundImage 是否提供:", existingBackgroundImage ? "Yes" : "No");
      captionPrompt = customCaptionPrompt;
      
      // Step 2: 处理背景图
      if (keepBackground && existingBackgroundImage) {
        // 如果用户选择了保留背景，且提供了背景图，使用它
        console.log("重新生成模式 Step 2: 使用前端提供的现有背景图");
        const bgBuffer = await existingBackgroundImage.arrayBuffer();
        const bgBase64 = Buffer.from(bgBuffer).toString("base64");
        backgroundImage = `data:${existingBackgroundImage.type};base64,${bgBase64}`;
        backgroundImageBase64 = bgBase64;
        console.log("背景图已加载，长度:", bgBase64.length);
      } else if (keepBackground && referenceImage) {
        // 如果选择了保留背景但没提供背景图，说明是首次生成，需要去人物
        console.log("重新生成模式 Step 2: 需要从参考图去掉人物生成背景");
        const refBuffer = await referenceImage.arrayBuffer();
        const refBase64 = Buffer.from(refBuffer).toString("base64");
        backgroundImage = await removeCharacter(
          refBase64,
          referenceImage.type,
          aspectRatio
        );
        if (backgroundImage.startsWith("data:")) {
          backgroundImageBase64 = backgroundImage.split(",")[1];
        } else {
          backgroundImageBase64 = backgroundImage;
        }
        console.log("背景图生成完成");
      } else {
        // 不保留背景，让 AI 根据 captionPrompt 自由发挥
        console.log("重新生成模式 Step 2: 不使用背景图，仅使用 character image + captionPrompt");
      }
    } else {
      // 正常流程：反推提示词和生成背景图
      // Step 1: 反推提示词（使用 gemini-3-pro-preview 文本模型）
      console.log("Step 1: 反推提示词...");
      captionPrompt = await reverseCaptionPrompt(
        referenceBase64,
        referenceImage.type
      );
      console.log("反推得到的提示词:", captionPrompt);

      // Step 2: 准备背景图
      if (keepBackground) {
        // 如果保留背景，去掉人物得到纯背景图（保留场景环境）
        console.log("Step 2: 去掉人物生成纯背景图（keepBackground=true，保留参考图场景）...");
        backgroundImage = await removeCharacter(
          referenceBase64,
          referenceImage.type,
          aspectRatio
        );
        console.log("背景图生成完成");
      } else {
        // 如果不保留背景，直接使用原始参考图（让AI自由发挥）
        console.log("Step 2: 使用原始参考图（keepBackground=false，不保留参考图背景）");
        backgroundImage = `data:${referenceImage.type};base64,${referenceBase64}`;
      }
      
      // Extract base64 for upload
      if (backgroundImage.startsWith("data:")) {
        backgroundImageBase64 = backgroundImage.split(",")[1];
      } else {
        backgroundImageBase64 = backgroundImage;
      }
      
      // Upload background image to Aimovely
      if (aimovelyToken && backgroundImageBase64) {
        try {
          const backgroundUploadResult = await uploadImageToAimovely(
            backgroundImage.startsWith("data:") ? backgroundImage : `data:image/png;base64,${backgroundImage}`,
            aimovelyToken,
            "background"
          );
          if (backgroundUploadResult?.url) {
            uploadedBackgroundImageUrl = backgroundUploadResult.url;
            console.log("背景图上传成功:", uploadedBackgroundImageUrl);
          }
        } catch (uploadError) {
          console.error("上传背景图到 Aimovely 失败:", uploadError);
        }
      }
    }

    // Step 3: 并行生成最终图片（节省时间，避免超时）
    console.log(`Step 3: 并行生成 ${numImages} 张图片 (${hotMode ? 'Qwen' : 'Gemini'})...`);
    const finalImages: string[] = [];
    const finalImageErrors: string[] = [];

    // 并行生成，大幅减少总耗时
    type GenerateResult = 
      | { success: true; image: string; index: number }
      | { success: false; error: string; index: number };

    const generatePromises = Array.from({ length: numImages }, (_, i) => {
      return (async (): Promise<GenerateResult> => {
        try {
          console.log(`开始生成第 ${i + 1}/${numImages} 张图片...`);
          
          let finalImage: string;
          if (hotMode) {
            // Use Qwen API for Hot Mode
            finalImage = await generateFinalImageWithQwen(
              characterImage,
              captionPrompt
            );
          } else {
            // Use Gemini API
            finalImage = await generateFinalImage(
              characterBase64,
              characterImage.type,
              backgroundImage,
              captionPrompt,
              aspectRatio,
              charAvatarBase64,
              charAvatarMimeType
            );
          }
          
          console.log(`第 ${i + 1} 张图片生成成功`);
          return { success: true, image: finalImage, index: i };
        } catch (error: any) {
          console.error(`生成第 ${i + 1} 张图片失败:`, error);
          return { success: false, error: error.message, index: i };
        }
      })();
    });

    // 等待所有图片生成完成
    const results = await Promise.all(generatePromises);
    
    // 处理结果
    results.forEach((result) => {
      if (result.success) {
        finalImages.push(result.image);
      } else {
        finalImageErrors.push(`第 ${result.index + 1} 张: ${result.error}`);
      }
    });

    // 检查是否至少生成了一张图片
    if (finalImages.length === 0) {
      throw new Error("所有图片生成都失败，请重试");
    }

    console.log(`成功生成 ${finalImages.length}/${numImages} 张图片`);
    if (finalImageErrors.length > 0) {
      console.warn("部分图片生成失败:", finalImageErrors);
    }

    console.log("=== Mimic Generation Completed ===");

    // Upload generated images to Aimovely
    const uploadedFinalImageUrls: (string | null)[] = [];

    if (aimovelyToken) {
      try {
        console.log("开始上传生成的图片到 Aimovely...");
        
        // Upload background image (only if not already uploaded and exists)
        if (backgroundImage && !uploadedBackgroundImageUrl) {
          const bgUploadResult = await uploadImageToAimovely(
            backgroundImage,
            aimovelyToken,
            "background"
          );
          if (bgUploadResult?.url) {
            uploadedBackgroundImageUrl = bgUploadResult.url;
            console.log("背景图上传成功:", uploadedBackgroundImageUrl);
          }
        }

        // 并行上传所有最终图片（节省时间）
        console.log(`并行上传 ${finalImages.length} 张最终图片...`);
        const uploadPromises = finalImages.map((image, i) => {
          return (async () => {
            try {
              const finalUploadResult = await uploadImageToAimovely(
                image,
                aimovelyToken,
                `final-${i}`
              );
              if (finalUploadResult?.url) {
                console.log(`最终图片 ${i + 1} 上传成功:`, finalUploadResult.url);
                return finalUploadResult.url;
              } else {
                console.warn(`最终图片 ${i + 1} 上传失败`);
                return null;
              }
            } catch (uploadError) {
              console.error(`上传最终图片 ${i + 1} 失败:`, uploadError);
              return null;
            }
          })();
        });
        
        const uploadResults = await Promise.all(uploadPromises);
        uploadedFinalImageUrls.push(...uploadResults);
      } catch (uploadError) {
        console.error("上传生成的图片到 Aimovely 失败:", uploadError);
        // 全部失败，数组保持为空
      }
    }
    // 如果没有Aimovely token，uploadedFinalImageUrls保持为空数组

    // 如果提供了 characterId，更新任务状态或保存到角色资源
    if (characterId && user) {
      try {
        // 验证角色属于当前用户
        const { data: character } = await supabaseAdminClient
          .from("characters")
          .select("id")
          .eq("id", characterId)
          .eq("user_id", user.id)
          .single();

        if (character) {
          // 如果之前创建了 pending 任务，必须更新它们（无论是否上传成功）
          if (createdPendingTaskIds.length > 0) {
            console.log(`[Mimic API] Updating ${createdPendingTaskIds.length} pending tasks`);
            
            // 更新每个 pending 任务
            for (let i = 0; i < createdPendingTaskIds.length; i++) {
              const taskId = createdPendingTaskIds[i];
              
              // 检查是否有对应的上传成功的图片
              if (uploadedFinalImageUrls[i]) {
                // 上传成功，更新为 completed
          await supabaseAdminClient
            .from("generation_tasks")
                  .update({
                    output_image_url: uploadedFinalImageUrls[i]!,
                    input_image_url: uploadedReferenceImageUrl || uploadedCharacterImageUrl,
                    background_image_url: uploadedBackgroundImageUrl || null,
                    prompt: captionPrompt,
                    status: "completed",
                    completed_at: new Date().toISOString(),
                  })
                  .eq("task_id", taskId);
                
                console.log(`[Mimic API] Task ${i + 1} updated to completed`);
              } else {
                // 上传失败或生成失败，更新为 failed
                let errorMsg = "图片生成或上传失败";
                if (finalImageErrors.length > 0) {
                  // 如果有生成错误，使用第一个错误信息
                  errorMsg = finalImageErrors[0];
                }
                
                await supabaseAdminClient
                  .from("generation_tasks")
                  .update({
                    status: "failed",
                    error_message: errorMsg,
                    completed_at: new Date().toISOString(),
                    prompt: captionPrompt || "等待反推提示词...",
                  })
                  .eq("task_id", taskId);
                
                console.log(`[Mimic API] Task ${i + 1} updated to failed: ${errorMsg}`);
              }
            }
            
            console.log(`[Mimic API] All ${createdPendingTaskIds.length} tasks updated`);
          } else if (uploadedFinalImageUrls.length > 0) {
            // 兼容旧逻辑：如果没有创建 pending 任务，且有上传成功的图片，才插入
            const tasksToInsert = [];
            
            for (let i = 0; i < uploadedFinalImageUrls.length; i++) {
              if (uploadedFinalImageUrls[i]) {
                tasksToInsert.push({
                  task_id: `${baseTaskId}-${i}-${Math.random().toString(36).substr(2, 9)}`,
              task_type: "mimic",
              email: user.email,
              username: user.user_metadata?.full_name || user.email,
              prompt: captionPrompt,
              input_image_url: uploadedReferenceImageUrl || uploadedCharacterImageUrl,
                  output_image_url: uploadedFinalImageUrls[i]!,
                  background_image_url: uploadedBackgroundImageUrl || null,
              character_id: characterId,
                  status: "completed",
                  started_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
              task_time: new Date().toISOString(),
            });
              }
            }
            
            if (tasksToInsert.length > 0) {
              await supabaseAdminClient
                .from("generation_tasks")
                .insert(tasksToInsert);

              console.log(`[Mimic API] Saved ${tasksToInsert.length} tasks to character ${characterId}`);
            }
          }

          // 保存参考图（reference image）到 character_references 表
          if (uploadedReferenceImageUrl) {
            try {
              // 检查是否已存在相同的参考图（避免重复）
              const { data: existingRef } = await supabaseAdminClient
                .from("character_references")
                .select("id")
                .eq("character_id", characterId)
                .eq("reference_image_url", uploadedReferenceImageUrl)
                .maybeSingle();

              if (!existingRef) {
                await supabaseAdminClient
                  .from("character_references")
                  .insert({
                    character_id: characterId,
                    reference_image_url: uploadedReferenceImageUrl,
                    created_at: new Date().toISOString(),
                  });
                
                console.log(`[Mimic API] Saved reference image to character ${characterId}`);
              } else {
                console.log(`[Mimic API] Reference image already exists for character ${characterId}`);
              }
            } catch (refError) {
              console.error("[Mimic API] Failed to save reference image:", refError);
              // 不中断流程
            }
          }
        }
      } catch (saveError) {
        console.error("[Mimic API] Failed to save task to character:", saveError);
        // 不中断流程，继续返回结果
      }
    }

    // 优化响应：优先返回URL，只在必要时返回base64
    // 如果Aimovely上传成功，就不返回base64以减少响应大小
    // 这样可以大幅减少响应大小，避免"Failed to fetch"错误
    const responseData: any = {
      captionPrompt,
      // Input image URLs
      referenceImageUrl: uploadedReferenceImageUrl,
      characterImageUrl: uploadedCharacterImageUrl,
      // Generated image URLs
      backgroundImageUrl: uploadedBackgroundImageUrl,
      // Generation stats
      generatedCount: finalImages.length,
      requestedCount: numImages,
      errors: finalImageErrors.length > 0 ? finalImageErrors : undefined,
    };

    // 不返回 base64，避免响应体过大
    // 如果上传失败，直接在错误数组中报告
    responseData.finalImageUrls = uploadedFinalImageUrls;
    responseData.backgroundImageUrl = uploadedBackgroundImageUrl;
    
    // 检查是否有上传失败的情况
    const hasUploadFailures = uploadedFinalImageUrls.some(url => !url) || 
                              (keepBackground && !uploadedBackgroundImageUrl);
    
    if (hasUploadFailures) {
      // 有上传失败，添加到错误信息中
      const uploadErrors: string[] = [];
      
      if (keepBackground && !uploadedBackgroundImageUrl) {
        uploadErrors.push("背景图上传失败");
      }
      
      uploadedFinalImageUrls.forEach((url, index) => {
        if (!url) {
          uploadErrors.push(`图片 ${index + 1} 上传失败`);
      }
      });
      
      // 如果所有图片都上传失败，返回错误
      if (uploadedFinalImageUrls.every(url => !url)) {
        return NextResponse.json({
          error: "图片上传失败，请重试",
          details: uploadErrors.join("; "),
        }, { status: 500 });
      }
      
      // 部分上传失败，在响应中标记
      responseData.uploadWarnings = uploadErrors;
    }

    return NextResponse.json(responseData, {
      headers: {
        'Content-Type': 'application/json',
        // 增加超时时间提示（实际超时由平台控制）
        'X-Response-Time': 'long',
      },
    });
  } catch (error: any) {
    console.error("Error in Mimic generation:", error);
    console.error("Error stack:", error.stack);
    
    // 如果创建了 pending 任务，更新为 failed
    if (createdPendingTaskIds.length > 0) {
      try {
        console.log(`[Mimic API] Updating ${createdPendingTaskIds.length} pending tasks to failed`);
        
        for (const taskId of createdPendingTaskIds) {
          await supabaseAdminClient
            .from("generation_tasks")
            .update({
              status: "failed",
              error_message: error.message || "生成失败",
              completed_at: new Date().toISOString(),
            })
            .eq("task_id", taskId);
        }
      } catch (updateError) {
        console.error("[Mimic API] Failed to update tasks to failed:", updateError);
      }
    }
    
    // Determine status code based on error type
    let statusCode = 500;
    if (error.message?.includes("安全过滤") || error.message?.includes("SAFETY")) {
      statusCode = 400;
    } else if (error.message?.includes("未找到") || error.message?.includes("未返回")) {
      statusCode = 500;
    }
    
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        details: error.details || null
      },
      { status: statusCode }
    );
  }
}

// Step 1: 反推提示词（使用 gemini-3-pro-preview 文本模型）
async function reverseCaptionPrompt(
  imageBase64: string,
  mimeType: string
): Promise<string> {
  // 用英文反推提示词，包含环境、氛围、光影、场景信息、色调的描述，镜头和构图的描述，人物姿势、穿着、神态的描述，但不描述身材、长相、发型等和人物外貌相关的信息
  const prompt = "用英文反推下这张图片的提示词，包含环境、氛围、光影、场景信息、色调的描述，镜头和构图的描述，人物姿势、穿着、神态的描述。请不要描述身材、长相、发型等和人物外貌相关的信息。请直接输出英文反推词。";

  const modelId = process.env.GEMINI_TEXT_MODEL_ID || "gemini-3-pro-preview";
  
  try {
    const responseText = await generateText(
      modelId,
      prompt,
      imageBase64,
      mimeType,
      {
        temperature: 0.5,
        topP: 0.8,
        maxOutputTokens: 2048,
      }
    );

    console.log("成功提取反推的提示词，长度:", responseText.length);
    return responseText;
  } catch (error: any) {
    console.error("反推提示词失败:", error);
    throw new Error(`反推提示词失败: ${error.message || "未知错误"}`);
  }
}

// Step 2: 去掉人物（使用 gemini-3-pro-image-preview 图像生成模型）
async function removeCharacter(
  imageBase64: string,
  mimeType: string,
  aspectRatio: string | null
): Promise<string> {
  const prompt = "去掉这张图片中的人物";
  const modelId = process.env.GEMINI_IMAGE_MODEL_ID || "gemini-3-pro-image-preview";
  
  try {
    const imageData = await generateImage(
      modelId,
      prompt,
      {
        imageBase64: imageBase64,
        mimeType: mimeType,
        aspectRatio: aspectRatio || undefined,
      }
    );
    
    // 返回 data URL 格式
    return `data:image/png;base64,${imageData}`;
  } catch (error: any) {
    console.error("去掉人物失败:", error);
    throw new Error(`去掉人物失败: ${error.message || "未知错误"}`);
  }
}

// Step 3: 生成最终图片（使用 gemini-3-pro-image-preview 图像生成模型）
async function generateFinalImage(
  characterBase64: string,
  characterMimeType: string,
  backgroundImage: string,
  captionPrompt: string,
  aspectRatio: string | null,
  charAvatarBase64?: string | null,
  charAvatarMimeType?: string | null
): Promise<string> {
  // Build final prompt according to user requirements
  const finalPrompt = `take autentic photo of the character, use instagram friendly composition. Shot on the character should have identical face, features, skin tone, hairstyle, body proportions, and vibe. 

characters are shown in {{char_avatar}} and {{char_image}}. ${backgroundImage ? 'backgorund is shown in {{background_image}}.' : ''}

scene setup: ${captionPrompt}

negatives: beauty-filter/airbrushed skin; poreless look, exaggerated or distorted anatomy, fake portrait-mode blur, CGI/illustration look`;

  const modelId = process.env.GEMINI_IMAGE_MODEL_ID || "gemini-3-pro-image-preview";
  
  // 处理背景图 base64
  let backgroundBase64: string | undefined;
  let backgroundMimeType: string | undefined;
  
  if (backgroundImage && backgroundImage.length > 0) {
    if (backgroundImage.startsWith("data:")) {
      const parts = backgroundImage.split(",");
      backgroundBase64 = parts[1];
      const metadata = parts[0];
      const mimeMatch = metadata.match(/data:(.*?);base64/);
      if (mimeMatch) {
        backgroundMimeType = mimeMatch[1];
      }
    } else {
      backgroundBase64 = backgroundImage;
      backgroundMimeType = "image/png";
    }
    console.log("已添加背景图到生成请求");
  } else {
    console.log("未使用背景图，仅使用 character image 生成");
  }
  
  if (charAvatarBase64 && charAvatarMimeType) {
    console.log("已添加 char_avatar 到生成请求");
  }
  
  try {
    const imageData = await generateImage(
      modelId,
      finalPrompt,
      {
        charAvatarBase64: charAvatarBase64 || undefined,
        charAvatarMimeType: charAvatarMimeType || undefined,
        characterImageBase64: characterBase64,
        characterImageType: characterMimeType,
        imageBase64: backgroundBase64,
        mimeType: backgroundMimeType,
        aspectRatio: aspectRatio || undefined,
      }
    );
    
    // 返回 data URL 格式
    return `data:image/png;base64,${imageData}`;
  } catch (error: any) {
    console.error("生成最终图片失败:", error);
    throw new Error(`生成最终图片失败: ${error.message || "未知错误"}`);
  }
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
  url: string;
  resource_id: string;
}

async function uploadImageToAimovely(
  dataUrl: string,
  token: string,
  prefix: string
): Promise<UploadResult | null> {
  if (!dataUrl.startsWith("data:")) {
    console.warn("Unsupported image format, expected data URL");
    return null;
  }

  const [metadata, base64Data] = dataUrl.split(",");
  const mimeMatch = metadata.match(/data:(.*?);base64/);
  if (!mimeMatch) {
    console.warn("Failed to parse data URL metadata");
    return null;
  }

  const mimeType = mimeMatch[1] || "image/png";
  const buffer = Buffer.from(base64Data, "base64");
  const fileName = `mimic-${prefix}-${Date.now()}.${mimeType.split("/")[1] ?? "png"}`;

  const file = new File([buffer], fileName, { type: mimeType });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("biz", "external_tool");
  formData.append("template_id", "1");

  const response = await fetch(`${AIMOVELY_API_URL}/v1/resource/upload`, {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body: formData,
  });

  if (!response.ok) {
    console.error("Aimovely upload failed:", response.status, await response.text());
    return null;
  }

  const result = await response.json();
  if (result.code !== 0) {
    console.error("Aimovely upload API error:", result);
    return null;
  }

  return {
    url: result.data?.url,
    resource_id: result.data?.resource_id,
  };
}

// Generate final image using Qwen API (Hot Mode)
async function generateFinalImageWithQwen(
  characterImage: File,
  captionPrompt: string
): Promise<string> {
  const qwenApiUrl = process.env.QWEN_API_URL;
  if (!qwenApiUrl) {
    throw new Error("Qwen API URL not configured");
  }

  console.log("=== Calling Qwen API (Mimic Hot Mode) ===");
  console.log("Prompt:", captionPrompt);
  console.log("Character image size:", characterImage.size);

  // Generate random seed
  const seed = Math.floor(Math.random() * 1000000);

  // Convert character image to base64
  const imageBuffer = Buffer.from(await characterImage.arrayBuffer());
  const imageBase64 = imageBuffer.toString('base64');

  // Import the Qwen workflow
  const { QWEN_WORKFLOW_BASE64 } = await import("@/lib/qwen-workflow");

  // Prepare request body
  const requestBody = {
    workflow: QWEN_WORKFLOW_BASE64,
    image: imageBase64,
    prompt: captionPrompt,
    seed: seed,
    output_image: ""
  };

  console.log("Seed:", seed);
  console.log("Calling Qwen API...");
  const startTime = Date.now();

  // Call Qwen API
  const response = await fetch(qwenApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Qwen API response received (${elapsed}s), status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Qwen API error:", errorText);
    throw new Error(`Qwen API 错误: ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 0) {
    console.error("Qwen API returned error code:", data.code);
    throw new Error(`Qwen API 返回错误代码: ${data.code}`);
  }

  if (!data.data?.image) {
    console.error("No image in Qwen API response");
    throw new Error("Qwen API 未返回图片");
  }

  console.log(`Successfully generated image with Qwen (total time: ${elapsed}s)`);

  // Return as data URL
  return `data:image/png;base64,${data.data.image}`;
}

