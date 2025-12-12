import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { generateText, generateImage } from "@/lib/vertexai";

// Set max duration to 5 minutes for Vercel Serverless Functions
export const maxDuration = 300;

const AIMOVELY_API_URL = "https://dev.aimovely.com";

interface PoseDescription {
  pose: string;
  cameraPosition: string;
  composition: string;
}

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;
    const characterImage = formData.get("characterImage") as File | null;
    const aspectRatio = formData.get("aspectRatio") as string;
    const imageSize = formData.get("imageSize") as string;
    const hotMode = formData.get("hotMode") === "true";

    console.log(`=== PhotoBooth Generation Started (Hot Mode: ${hotMode}, Character Image: ${characterImage ? 'Yes' : 'No'}, ImageSize: ${imageSize || 'default'}) ===`);

    if (!image) {
      return NextResponse.json(
        { error: "需要提供起始图片" },
        { status: 400 }
      );
    }

    // 检查 Vertex AI 配置
    const projectId = process.env.VERTEX_AI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json(
        { error: "VERTEX_AI_PROJECT_ID or GOOGLE_CLOUD_PROJECT_ID environment variable is required" },
        { status: 500 }
      );
    }

    // Convert images to base64
    const imageBuffer = await image.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    
    let characterImageBase64: string | null = null;
    let characterImageType: string | null = null;
    if (characterImage) {
      const charImageBuffer = await characterImage.arrayBuffer();
      characterImageBase64 = Buffer.from(charImageBuffer).toString("base64");
      characterImageType = characterImage.type;
      console.log("角色面部图已转换为 base64");
    }

    const startTime = Date.now();

    // 上传输入图片（优先 Aimovely，失败回退 Supabase Storage）
    const { getAimovelyCredentials, uploadImageWithFallback } = await import("@/lib/upload");
    const credentials = await getAimovelyCredentials();
    const aimovelyToken = credentials?.token || null;
    let uploadedImageUrl: string | null = null;

    console.log("开始上传输入图片...");
    const imageDataUrl = `data:${image.type};base64,${imageBase64}`;
    const uploadResult = await uploadImageWithFallback(
      imageDataUrl,
      aimovelyToken,
      "photobooth-input"
    );
    if (uploadResult?.url) {
      uploadedImageUrl = uploadResult.url;
      console.log("输入图片上传成功:", uploadedImageUrl, `(${uploadResult.source})`);
    }

    // Step 1: 生成pose描述（使用 gemini-3-pro-preview 文本模型）
    const targetPoseCount = hotMode ? 3 : 6; // Hot Mode 生成3张，Gemini Mode 生成6张
    console.log(`Step 1: 生成${targetPoseCount}个pose描述...`);
    const step1Start = Date.now();
    const poseDescriptions = await generatePoseDescriptions(
      imageBase64,
      image.type,
      targetPoseCount
    );
    const step1Time = ((Date.now() - step1Start) / 1000).toFixed(2);
    console.log(`Step 1 完成，耗时: ${step1Time} 秒`);
    
    if (poseDescriptions.length === 0) {
      throw new Error("未能解析任何pose描述，请重试");
    }
    
    if (poseDescriptions.length < targetPoseCount) {
      console.warn(`只解析到 ${poseDescriptions.length} 个pose描述，将生成 ${poseDescriptions.length} 张图片`);
    } else {
      console.log(`成功解析 ${poseDescriptions.length} 个pose描述`);
    }

    // Step 2: 根据pose描述生成图片
    console.log(`Step 2: 根据 ${poseDescriptions.length} 个pose描述生成图片 (${hotMode ? 'Qwen串行' : 'Gemini并行'})...`);
    const step2Start = Date.now();
    
    let imageResults: Array<{
      index: number;
      success: boolean;
      image?: string;
      error?: string;
      time: string;
    }> = [];

    if (hotMode) {
      // Hot Mode: 串行生成（避免 Qwen API 并发限制）
      console.log("Hot Mode: 串行生成图片，避免并发限制...");
      for (let index = 0; index < poseDescriptions.length; index++) {
        const poseDesc = poseDescriptions[index];
        const imageStart = Date.now();
        console.log(`\n[${index + 1}/${poseDescriptions.length}] 开始生成...`);
        
        try {
          const generatedImage = await generatePoseImageWithQwen(image, poseDesc);
          const imageTime = ((Date.now() - imageStart) / 1000).toFixed(2);
          console.log(`[${index + 1}/${poseDescriptions.length}] ✅ 成功，耗时: ${imageTime}秒`);
          imageResults.push({
            index,
            success: true,
            image: generatedImage,
            time: imageTime,
          });
        } catch (error: any) {
          const imageTime = ((Date.now() - imageStart) / 1000).toFixed(2);
          console.error(`[${index + 1}/${poseDescriptions.length}] ❌ 失败，耗时: ${imageTime}秒`);
          console.error("错误详情:", error.message || error);
          imageResults.push({
            index,
            success: false,
            error: error.message || "未知错误",
            time: imageTime,
          });
        }
        
        // 添加小延迟，避免过快请求
        if (index < poseDescriptions.length - 1) {
          console.log("等待 1 秒后继续...");
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else {
      // Gemini Mode: 并行生成
      console.log("Gemini Mode: 并行生成图片...");
      const imagePromises = poseDescriptions.map((poseDesc, index) => {
        const imageStart = Date.now();
        console.log(`启动第 ${index + 1}/${poseDescriptions.length} 张图片的生成任务...`);
        
        return generatePoseImage(imageBase64, image.type, poseDesc, aspectRatio, imageSize, characterImageBase64, characterImageType)
          .then((generatedImage) => {
            const imageTime = ((Date.now() - imageStart) / 1000).toFixed(2);
            console.log(`第 ${index + 1} 张图片生成成功，耗时: ${imageTime} 秒`);
            return {
              index,
              success: true,
              image: generatedImage,
              time: imageTime,
            };
          })
          .catch((error: any) => {
            const imageTime = ((Date.now() - imageStart) / 1000).toFixed(2);
            console.error(`第 ${index + 1} 张图片生成失败（耗时: ${imageTime} 秒）:`, error);
            return {
              index,
              success: false,
              error: error.message || "未知错误",
              time: imageTime,
            };
          });
      });

      console.log(`等待 ${imagePromises.length} 个图片生成任务完成（并行执行）...`);
      imageResults = await Promise.all(imagePromises);
    }

    // 处理结果：收集成功和失败的图片，保持索引对应关系
    const generatedImages: Array<{ index: number; image: string }> = [];
    const generatedImageErrors: string[] = [];
    
    // Helper function to sanitize strings for JSON serialization (defined early)
    // IMPORTANT: This function removes problematic characters that could break JSON parsing
    // Note: We do NOT escape quotes/backslashes here because JSON.stringify() will handle that
    // Escaping here would cause double-escaping
    // This function ensures strings are safe for JSON serialization by removing/replacing
    // characters that can cause JSON parsing errors, even when properly escaped
    const sanitizeString = (str: string | null | undefined): string => {
      if (!str) return "";
      
      // Convert to string if not already
      let sanitized = String(str);
      
      // Step 1: Replace line breaks with spaces (these can break JSON if not properly handled)
      sanitized = sanitized.replace(/\r\n/g, " ").replace(/\n/g, " ").replace(/\r/g, " ");
      
      // Step 2: Remove null bytes and control characters (except space, tab)
      // These characters can break JSON strings even if escaped
      // Remove: null (\x00), start of heading (\x01), start of text (\x02), etc.
      // Keep: space (0x20), tab (0x09) - but we'll normalize whitespace later
      sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, " ");
      
      // Step 3: Remove or replace problematic Unicode characters that might cause issues
      // This includes various Unicode control characters and formatting characters
      sanitized = sanitized.replace(/[\u200B-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g, " ");
      
      // Step 4: Normalize whitespace (multiple spaces/tabs to single space)
      sanitized = sanitized.replace(/[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/g, " ");
      
      // Step 5: Trim leading/trailing whitespace
      sanitized = sanitized.trim();
      
      // Step 6: Limit length to prevent extremely long strings that might cause issues
      if (sanitized.length > 1000) {
        sanitized = sanitized.substring(0, 997) + "...";
      }
      
      // Step 7: Final check - ensure the result is a valid non-empty string
      // If somehow we ended up with an empty string, return a placeholder
      if (sanitized.length === 0 && str) {
        console.warn("sanitizeString: 字符串被清理后为空，使用占位符");
        return "[内容已清理]";
      }
      
      return sanitized;
    };
    
    // 按照原始顺序排序结果（Promise.all保持顺序）
    imageResults.forEach((result) => {
      if (result.success && 'image' in result && result.image) {
        generatedImages.push({ index: result.index, image: result.image });
      } else if (!result.success && 'error' in result) {
        // Sanitize error message immediately when collecting
        const sanitizedError = sanitizeString(result.error || "未知错误");
        generatedImageErrors.push(`第 ${result.index + 1} 张: ${sanitizedError}`);
      }
    });
    
    // 按索引排序，确保顺序正确
    generatedImages.sort((a, b) => a.index - b.index);

    const step2Time = ((Date.now() - step2Start) / 1000).toFixed(2);
    console.log(`Step 2 完成，总耗时: ${step2Time} 秒（并行生成 ${poseDescriptions.length} 张图片）`);
    console.log(`成功: ${generatedImages.length} 张，失败: ${generatedImageErrors.length} 张`);

    // Check if we have at least one generated image
    if (generatedImages.length === 0) {
      throw new Error("所有图片生成都失败，请重试");
    }

    console.log(`成功生成 ${generatedImages.length}/${poseDescriptions.length} 张图片`);
    if (generatedImageErrors.length > 0) {
      console.warn("部分图片生成失败:", generatedImageErrors);
    }

    console.log("=== PhotoBooth Generation Completed ===");

    // 上传生成的图片（优先 Aimovely，失败回退 Supabase Storage）
    console.log("开始上传生成的图片...");
    const uploadStart = Date.now();
    const uploadedImageUrls: Array<{ originalIndex: number; url: string }> = [];
    const uploadErrors: string[] = [];

    // 并行上传所有图片（带回退）
    const { uploadImagesWithFallback } = await import("@/lib/upload");
    const imagesToUpload = generatedImages.map(item => item.image);
    const uploadResults = await uploadImagesWithFallback(
      imagesToUpload,
      aimovelyToken,
      "photobooth"
    );

    // 处理上传结果：按照原始索引收集URL
    uploadResults.forEach((result, idx) => {
      const originalIndex = generatedImages[idx].index;
      if (result?.url) {
        uploadedImageUrls.push({ originalIndex, url: result.url });
      } else {
        const sanitizedError = sanitizeString("上传失败");
        uploadErrors.push(`图片 ${originalIndex + 1} 上传失败：${sanitizedError}`);
      }
    });
    
    // 按原始索引排序
    uploadedImageUrls.sort((a, b) => a.originalIndex - b.originalIndex);
    
    const uploadTime = ((Date.now() - uploadStart) / 1000).toFixed(2);
    console.log(`图片上传完成，总耗时: ${uploadTime} 秒`);
    console.log(`成功: ${uploadedImageUrls.length} 张，失败: ${uploadErrors.length} 张`);
    
    // Warn if some uploads failed
    if (uploadErrors.length > 0) {
      console.warn(`部分图片上传失败: ${uploadErrors.length}/${generatedImages.length}`);
    }
    
    // If we have generated images but no uploaded URLs, we need to handle this gracefully
    if (generatedImages.length > 0 && uploadedImageUrls.length === 0) {
      console.warn("有生成的图片但上传失败，响应中将不包含图片URL");
    }

    // Combine generation errors and upload errors
    const allErrors = [...generatedImageErrors, ...uploadErrors];

    // Prepare response data - include all generated images
    // If upload succeeded, use URL; if upload failed, use base64 data URL
    // This ensures users can see results even if upload fails
    // Note: sanitizeString is already defined above
    const responsePoseDescriptions: PoseDescription[] = [];
    const responseImageUrls: string[] = [];

    // Create a map of uploaded URLs by index
    const uploadedUrlMap = new Map<number, string>();
    uploadedImageUrls.forEach((item) => {
      uploadedUrlMap.set(item.originalIndex, item.url);
    });

    // Process all generated images (sorted by index)
    generatedImages.forEach((imageItem) => {
      const index = imageItem.index;
      const poseDesc = poseDescriptions[index];
      
      // Ensure pose description is valid
      if (poseDesc && poseDesc.pose && poseDesc.cameraPosition && poseDesc.composition) {
        // Sanitize pose description strings to prevent JSON serialization issues
        const sanitizedPoseDesc: PoseDescription = {
          pose: sanitizeString(poseDesc.pose),
          cameraPosition: sanitizeString(poseDesc.cameraPosition),
          composition: sanitizeString(poseDesc.composition),
        };
        responsePoseDescriptions.push(sanitizedPoseDesc);
        
        // Use uploaded URL if available, otherwise use base64 data URL
        const uploadedUrl = uploadedUrlMap.get(index);
        if (uploadedUrl) {
          // Upload succeeded, use URL
          responseImageUrls.push(uploadedUrl);
          console.log(`图片 ${index + 1} 使用上传的 URL`);
        } else {
          // Upload failed, use base64 data URL as fallback
          responseImageUrls.push(imageItem.image);
          console.log(`图片 ${index + 1} 上传失败，使用 base64 数据 URL`);
        }
      } else {
        console.warn(`Pose ${index + 1} 描述不完整，跳过`);
      }
    });
    
    // Log summary
    const uploadedCount = uploadedUrlMap.size;
    const fallbackCount = generatedImages.length - uploadedCount;
    if (fallbackCount > 0) {
      console.warn(`⚠️ ${fallbackCount} 张图片上传失败，使用 base64 数据 URL 作为后备方案`);
      console.warn("建议：检查 Aimovely 配置或网络连接");
    }
    
    // Ensure all fields are properly serializable (no undefined, no circular references)
    // Clean and validate all string fields
    const responseData: any = {
      inputImageUrl: uploadedImageUrl || null,
      poseDescriptions: responsePoseDescriptions, // All poses with generated images
      generatedImageUrls: responseImageUrls, // URLs or base64 data URLs
      generatedCount: responseImageUrls.length,
      requestedCount: poseDescriptions.length,
    };
    
    // Only include errors if there are any (error messages already sanitized when collected)
    if (allErrors.length > 0) {
      // Errors are already sanitized when collected, but sanitize again to be extra safe
      responseData.errors = allErrors.map((err: string) => sanitizeString(err));
    }

    // Calculate total execution time
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`=== PhotoBooth 总执行时间: ${totalTime} 秒 ===`);

    // Log response size for debugging
    let responseSizeKB = "0";
    try {
      // Verify response does not contain base64 image data
      const responseJsonString = JSON.stringify(responseData);
      
      // Check if response contains base64 data URLs (this is expected if upload failed)
      const hasBase64Data = responseJsonString.includes('data:image/') || responseJsonString.includes('iVBORw0KGgo');
      if (hasBase64Data) {
        console.warn("⚠️ 响应中包含 base64 图片数据（上传失败时的后备方案）");
        console.warn("这会导致响应较大，但确保用户能看到生成结果");
      }
      
      responseSizeKB = (responseJsonString.length / 1024).toFixed(2);
      
      console.log(`生成的图片数量: ${responseImageUrls.length}`);
      console.log(`Pose 描述数量: ${responsePoseDescriptions.length} / ${poseDescriptions.length} (请求)`);
      console.log(`输入图片 URL: ${uploadedImageUrl || 'null'}`);
      console.log(`上传成功: ${uploadedUrlMap.size} 张，使用 base64: ${fallbackCount} 张`);
      
      // Log first few URLs for debugging (only first 50 chars to avoid long URLs)
      if (responseImageUrls.length > 0) {
        const urlPreview = responseImageUrls.slice(0, 3).map(url => {
          if (url.startsWith('data:')) {
            return 'data:image/... (base64)';
          }
          return url.length > 50 ? url.substring(0, 50) + '...' : url;
        });
        console.log(`生成的图片 URLs (前3个):`, urlPreview);
      }
      
      // Check if response is too large (Vercel may have issues with > 4MB uncompressed)
      const responseSizeMB = parseFloat(responseSizeKB) / 1024;
      if (responseSizeMB > 4) {
        console.warn(`⚠️ 响应体较大: ${responseSizeMB.toFixed(2)} MB (> 4 MB)`);
        if (hasBase64Data) {
          console.warn("包含 base64 图片数据（上传失败时的后备方案），响应会较大");
        } else {
          console.warn("响应体可能过大，请检查数据");
        }
      } else if (responseSizeMB > 1) {
        console.warn(`⚠️ 响应体较大: ${responseSizeMB.toFixed(2)} MB，可能影响传输速度`);
        if (hasBase64Data) {
          console.warn("包含 base64 图片数据（上传失败时的后备方案）");
        }
      } else {
        console.log(`✅ 响应体大小正常: ${responseSizeMB.toFixed(2)} MB`);
      }
      
      // Check if total time is approaching limit (warn if > 250 seconds)
      if (parseFloat(totalTime) > 250) {
        console.warn(`⚠️ 总执行时间接近超时限制 (${totalTime} 秒 > 250 秒)`);
      }
    } catch (logError) {
      console.error("记录响应日志失败:", logError);
    }

    // Validate response data before returning (reuse already serialized JSON)
    try {
      console.log("验证响应数据...");
      
      // Check if poseDescriptions is too large (estimate based on count)
      const avgPoseDescSize = 500; // Estimated average size per pose description in chars
      const estimatedPoseSize = poseDescriptions.length * avgPoseDescSize;
      if (estimatedPoseSize > 50000) { // 50KB
        console.warn(`Pose descriptions 可能较大: 估计 ${(estimatedPoseSize / 1024).toFixed(2)} KB (${poseDescriptions.length} 个)`);
      }
      
      // Check if URLs array is reasonable
      if (responseImageUrls.length > 10) {
        console.warn(`生成的图片数量较多: ${responseImageUrls.length}`);
      }
      
      // Verify response data structure is valid (already serialized above)
      console.log("响应数据验证通过");
    } catch (validationError) {
      console.error("响应数据验证失败:", validationError);
      throw new Error(`响应数据验证失败: ${validationError instanceof Error ? validationError.message : '未知错误'}`);
    }

    // Return response with proper headers
    try {
      const responseCreateStart = Date.now();
      console.log("开始创建响应对象...");
      
      // Pre-serialize JSON to check final size and avoid double serialization
      // Use a try-catch to handle any JSON serialization errors
      let responseJsonString: string;
      try {
        // Systematically sanitize ALL string fields before JSON serialization
        // This includes URLs, pose descriptions, error messages, etc.
        const validatedData = {
          inputImageUrl: responseData.inputImageUrl ? sanitizeString(responseData.inputImageUrl) : null,
          poseDescriptions: (responseData.poseDescriptions || []).map((pose: PoseDescription) => {
            // Triple-check: sanitize again even though already sanitized
            return {
              pose: sanitizeString(pose.pose || ''),
              cameraPosition: sanitizeString(pose.cameraPosition || ''),
              composition: sanitizeString(pose.composition || ''),
            };
          }),
          generatedImageUrls: (responseData.generatedImageUrls || [])
            .filter((url: any) => url && typeof url === 'string')
            .map((url: string) => sanitizeString(url)), // Sanitize URLs too (though they should be safe)
          generatedCount: Number(responseData.generatedCount) || 0,
          requestedCount: Number(responseData.requestedCount) || 0,
          ...(responseData.errors && responseData.errors.length > 0 ? {
            errors: (responseData.errors || []).map((err: any) => {
              // Triple-check: sanitize error messages again
              return sanitizeString(typeof err === 'string' ? err : String(err || ''));
            })
          } : {})
        };
        
        // Log data structure before serialization for debugging
        console.log("准备序列化响应数据:", {
          inputImageUrl: validatedData.inputImageUrl ? `${validatedData.inputImageUrl.substring(0, 50)}...` : null,
          poseDescriptionsCount: validatedData.poseDescriptions.length,
          generatedImageUrlsCount: validatedData.generatedImageUrls.length,
          errorsCount: validatedData.errors?.length || 0,
        });
        
        // Attempt JSON serialization
        responseJsonString = JSON.stringify(validatedData);
        
        // Test parsing to ensure valid JSON
        const parsedTest = JSON.parse(responseJsonString);
        console.log("✅ JSON 序列化和解析测试通过");
      } catch (jsonError: any) {
        console.error("❌ JSON 序列化失败:", jsonError);
        console.error("错误详情:", {
          message: jsonError.message,
          name: jsonError.name,
          stack: jsonError.stack,
        });
        
        // Try to identify which field is causing the issue by serializing one at a time
        console.error("尝试定位问题字段...");
        try {
          const testFields: Record<string, any> = {
            inputImageUrl: responseData.inputImageUrl ? sanitizeString(responseData.inputImageUrl) : null,
            poseDescriptions: responseData.poseDescriptions || [],
            generatedImageUrls: responseData.generatedImageUrls || [],
            errors: responseData.errors || [],
          };
          
          for (const [fieldName, fieldValue] of Object.entries(testFields)) {
            try {
              JSON.stringify({ [fieldName]: fieldValue });
              console.log(`✅ ${fieldName} 序列化成功`);
            } catch (fieldError: any) {
              console.error(`❌ ${fieldName} 序列化失败:`, fieldError.message);
              // If it's poseDescriptions, try each one individually
              if (fieldName === 'poseDescriptions' && Array.isArray(fieldValue)) {
                fieldValue.forEach((pose: any, index: number) => {
                  try {
                    JSON.stringify({ test: pose });
                    console.log(`  ✅ Pose ${index + 1} 序列化成功`);
                  } catch (poseError: any) {
                    console.error(`  ❌ Pose ${index + 1} 序列化失败:`, poseError.message);
                    console.error(`  Pose 内容预览:`, {
                      pose: pose?.pose?.substring(0, 50),
                      cameraPosition: pose?.cameraPosition?.substring(0, 50),
                      composition: pose?.composition?.substring(0, 50),
                    });
                  }
                });
              }
            }
          }
        } catch (testError) {
          console.error("定位问题字段时出错:", testError);
        }
        
        console.error("原始响应数据结构:", {
          inputImageUrl: typeof responseData.inputImageUrl,
          inputImageUrlLength: responseData.inputImageUrl ? String(responseData.inputImageUrl).length : 0,
          poseDescriptionsCount: responseData.poseDescriptions?.length,
          generatedImageUrlsCount: responseData.generatedImageUrls?.length,
          hasErrors: !!responseData.errors,
          errorsCount: responseData.errors?.length || 0,
        });
        
        // Try to create a safe response with minimal data
        // Only include successfully processed data that we know is safe
        const safeResponseData: any = {
          inputImageUrl: null,
          poseDescriptions: [],
          generatedImageUrls: [],
          generatedCount: 0,
          requestedCount: poseDescriptions.length,
          errors: [`响应序列化失败: ${sanitizeString(jsonError.message || '未知错误')}`],
        };
        
        // Try to include at least the successfully generated images if possible
        // But sanitize everything very carefully
        try {
          if (responseImageUrls.length > 0) {
            // Try to include successfully generated images with very careful sanitization
            const safeUrls: string[] = [];
            for (const url of responseImageUrls) {
              try {
                const sanitizedUrl = sanitizeString(url);
                // Test if this URL can be serialized
                JSON.stringify({ test: sanitizedUrl });
                safeUrls.push(sanitizedUrl);
              } catch (urlError) {
                console.error("URL 序列化失败，跳过:", url?.substring(0, 50));
              }
            }
            if (safeUrls.length > 0) {
              safeResponseData.generatedImageUrls = safeUrls;
              safeResponseData.generatedCount = safeUrls.length;
            }
          }
          
          responseJsonString = JSON.stringify(safeResponseData);
          // Verify it's valid JSON
          const parsedSafe = JSON.parse(responseJsonString);
          console.log("✅ 安全响应创建成功，包含数据:", {
            generatedCount: parsedSafe.generatedCount,
            errorsCount: parsedSafe.errors?.length || 0,
          });
        } catch (safeError: any) {
          console.error("❌ 创建安全响应也失败:", safeError);
          console.error("安全响应错误详情:", safeError.message);
          // Last resort: return a minimal error message (guaranteed to be valid JSON)
          responseJsonString = JSON.stringify({
            error: "服务器响应序列化失败",
            generatedCount: 0,
            requestedCount: poseDescriptions.length,
            details: null,
          });
        }
      }
      
      const finalResponseSizeKB = (responseJsonString.length / 1024).toFixed(2);
      const finalResponseSizeMB = parseFloat(finalResponseSizeKB) / 1024;
      
      console.log(`最终响应体大小: ${finalResponseSizeKB} KB (${finalResponseSizeMB.toFixed(2)} MB)`);
      
      // Warn if response is still large after optimization
      if (finalResponseSizeMB > 1.5) {
        console.warn(`⚠️ 响应体较大 (${finalResponseSizeMB.toFixed(2)} MB)，可能影响传输`);
        if (responseImageUrls.some(url => url.startsWith('data:'))) {
          console.warn("包含 base64 图片数据（上传失败时的后备方案）");
        }
      }
      
      // Parse the pre-serialized JSON back to object for NextResponse.json()
      // This ensures Vercel handles Content-Length and compression correctly
      // Use a different variable name to avoid shadowing the outer responseData
      const parsedResponseData = JSON.parse(responseJsonString);
      
      // Use NextResponse.json() instead of manual NextResponse creation
      // This matches Mimic API and avoids Content-Length mismatch issues
      const response = NextResponse.json(parsedResponseData, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Response-Time': `${totalTime}s`,
          'X-Content-Size': `${finalResponseSizeKB}KB`,
          'X-Execution-Time': `${totalTime}s`,
          'X-Generated-Count': responseImageUrls.length.toString(),
          'X-Requested-Count': poseDescriptions.length.toString(),
        },
      });
      
      const responseCreateTime = ((Date.now() - responseCreateStart) / 1000).toFixed(3);
      console.log(`响应对象创建成功（耗时: ${responseCreateTime} 秒）`);
      console.log(`响应体大小: ${finalResponseSizeKB} KB`);
      console.log("响应准备完成，开始返回...");
      
      const totalTimeActual = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`总耗时: ${totalTimeActual} 秒（执行: ${totalTime} 秒，响应创建: ${responseCreateTime} 秒）`);
      
      // Log a final checkpoint before returning
      console.log(`[${new Date().toISOString()}] 开始返回响应...`);
      console.log(`响应体大小: ${finalResponseSizeKB} KB (${finalResponseSizeMB.toFixed(2)} MB)`);
      console.log(`生成的图片数量: ${responseImageUrls.length}, Pose 描述数量: ${responsePoseDescriptions.length}`);
      
      return response;
    } catch (responseError) {
      const createResponseTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`创建响应失败（总耗时: ${createResponseTime} 秒）:`, responseError);
      const responseDataSize = responseSizeKB || "未知";
      console.error("响应错误详情:", {
        message: responseError instanceof Error ? responseError.message : String(responseError),
        stack: responseError instanceof Error ? responseError.stack : undefined,
        name: responseError instanceof Error ? responseError.name : undefined,
        responseDataSize: responseDataSize + ' KB',
        poseDescriptionsCount: poseDescriptions.length,
        generatedImageUrlsCount: responseImageUrls.length,
      });
      throw new Error(`创建响应失败: ${responseError instanceof Error ? responseError.message : '未知错误'}`);
    }
  } catch (error: any) {
    console.error("=== PhotoBooth Generation Error ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Error details:", error.details);
    
    // Determine status code based on error type
    let statusCode = 500;
    let errorMessage = error.message || "Internal server error";
    
    if (error.message?.includes("安全过滤") || error.message?.includes("SAFETY")) {
      statusCode = 400;
    } else if (error.message?.includes("未找到") || error.message?.includes("未返回")) {
      statusCode = 500;
    } else if (error.message?.includes("超时") || error.message?.includes("timeout")) {
      statusCode = 504;
      errorMessage = "请求超时，请稍后重试";
    } else if (error.message?.includes("上传")) {
      statusCode = 500;
    }
    
    try {
      const errorResponse = NextResponse.json(
        { 
          error: errorMessage,
          details: error.details || null,
          timestamp: new Date().toISOString(),
        },
        { 
          status: statusCode,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      );
      console.log("错误响应准备完成，状态码:", statusCode);
      return errorResponse;
    } catch (responseError) {
      console.error("创建错误响应失败:", responseError);
      // Last resort: return a simple text response
      return new NextResponse(
        JSON.stringify({ error: "服务器内部错误", details: null }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
}

// Step 1: 生成6个pose描述（使用 gemini-3-pro-preview 文本模型）
async function generatePoseDescriptions(
  imageBase64: string,
  mimeType: string,
  count: number = 6
): Promise<PoseDescription[]> {
  // 动态生成格式示例
  const formatExample = Array.from({ length: count }, (_, i) => {
    const num = i + 1;
    return `- {{Pose${num}}}:\n\n- {{Camera Position${num}}}:\n\n- {{Composition${num}}}:`;
  }).join('\n\n');

  const prompt = `你现在是一个专门拍摄ins风格写真照的职业摄影师，请你分析一下这个模特所在的环境、模特的特征还有她现在在做的动作，让她换${count - 1}个不同的pose，可以把这几个连续的pose发成一个instagram的组图，请你给出这${count}个pose的指令。

尽量避免指令过于复杂，导致在一张图片里传达了过多的信息、或者让模特做出过于dramatic的姿势，不要改变光影。

请你严格用英文按照这个格式来写：

${formatExample}`;

  // 使用 Vertex AI generateText 函数
  const modelId = process.env.GEMINI_TEXT_MODEL_ID || "gemini-3-pro-preview";
  
  try {
    const trimmedText = await generateText(
      modelId,
      prompt,
      imageBase64,
      mimeType,
      {
        temperature: 0.7,
        topP: 0.8,
        maxOutputTokens: 10000, // Increased to avoid truncation
      }
    );
    
    console.log("成功提取pose描述，长度:", trimmedText.length);
    
    // Parse the pose descriptions
    const poses = parsePoseDescriptions(trimmedText);
    console.log(`✅ 成功解析 ${poses.length} 个pose描述`);
    if (poses.length > 0) {
      return poses;
    } else {
      console.error("❌ 解析结果为空，文本可能不符合预期格式");
      console.error("文本预览 (前1000字符):", trimmedText.substring(0, 1000));
      throw new Error("未能解析pose描述，文本格式可能不正确");
    }
  } catch (error: any) {
    console.error("生成pose描述失败:", error);
    throw new Error(`生成pose描述失败: ${error.message || '未知错误'}`);
  }
}

// Parse pose descriptions from text
function parsePoseDescriptions(text: string): PoseDescription[] {
  const poses: PoseDescription[] = [];
  console.log("开始解析pose描述文本...");
  console.log("文本长度:", text.length);
  console.log("文本预览:", text.substring(0, 1000));
  
  // 新策略：直接按编号查找每个字段
  // 支持格式：- **Pose1**: , - **Camera Position1**: , - **Composition1**:
  for (let i = 1; i <= 10; i++) { // 尝试查找前10个pose
    const poseData: Partial<PoseDescription> = {};
    
    // 查找 Pose N
    const poseRegex = new RegExp(`[-*\\s]*\\*?\\*?Pose\\s*${i}\\s*\\*?\\*?\\s*:[\\s\\S]*?([\\s\\S]+?)(?=[-*\\s]*\\*?\\*?Camera\\s*Position\\s*${i}\\s*\\*?\\*?\\s*:|$)`, 'i');
    const poseMatch = text.match(poseRegex);
    if (poseMatch && poseMatch[1]) {
      poseData.pose = poseMatch[1]
        .trim()
        .replace(/\*\*/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // 查找 Camera Position N
    const cameraRegex = new RegExp(`[-*\\s]*\\*?\\*?Camera\\s*Position\\s*${i}\\s*\\*?\\*?\\s*:[\\s\\S]*?([\\s\\S]+?)(?=[-*\\s]*\\*?\\*?Composition\\s*${i}\\s*\\*?\\*?\\s*:|$)`, 'i');
    const cameraMatch = text.match(cameraRegex);
    if (cameraMatch && cameraMatch[1]) {
      poseData.cameraPosition = cameraMatch[1]
        .trim()
        .replace(/\*\*/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // 查找 Composition N
    const compositionRegex = new RegExp(`[-*\\s]*\\*?\\*?Composition\\s*${i}\\s*\\*?\\*?\\s*:[\\s\\S]*?([\\s\\S]+?)(?=[-*\\s]*\\*?\\*?(?:Pose|Camera\\s*Position|Composition)\\s*${i + 1}\\s*\\*?\\*?\\s*:|$)`, 'i');
    const compositionMatch = text.match(compositionRegex);
    if (compositionMatch && compositionMatch[1]) {
      poseData.composition = compositionMatch[1]
        .trim()
        .replace(/\*\*/g, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // 验证并添加
    if (poseData.pose && poseData.cameraPosition && poseData.composition) {
      if (poseData.pose.length >= 10 && poseData.cameraPosition.length >= 5 && poseData.composition.length >= 5) {
        poses.push({
          pose: poseData.pose,
          cameraPosition: poseData.cameraPosition,
          composition: poseData.composition,
        });
        console.log(`✅ 成功解析 Pose ${i}:`);
        console.log(`  Pose (${poseData.pose.length} chars): ${poseData.pose.substring(0, 60)}...`);
        console.log(`  Camera (${poseData.cameraPosition.length} chars): ${poseData.cameraPosition.substring(0, 60)}...`);
        console.log(`  Composition (${poseData.composition.length} chars): ${poseData.composition.substring(0, 60)}...`);
      } else {
        console.warn(`⚠️ Pose ${i} 字段长度不足，跳过`);
        break; // 如果某个pose字段太短，停止查找
      }
    } else {
      // 如果找不到完整的pose，停止查找（假设后面也不会有）
      console.log(`未找到完整的 Pose ${i}，停止查找`);
      break;
    }
  }
  
  // 如果新策略成功，直接返回
  if (poses.length > 0) {
    console.log(`✅ 新策略成功解析 ${poses.length} 个pose`);
    return poses.slice(0, 6); // 最多返回6个
  }
  
  // 否则尝试旧的备用策略
  console.log("⚠️ 新策略失败，尝试备用策略...");
  
  // Strategy 1: Find all Pose blocks using matchAll
  // This handles formats like:
  // - Pose1:
  //   **Pose:** ...
  //   **Camera Position:** ...
  //   **Composition:** ...
  // Create a map to store pose data by number
  const poseMap = new Map<number, Partial<PoseDescription>>();
  
  // Strategy 1: Find all Pose blocks using matchAll
  // Support formats: {{Pose1}}:, Pose1:, **Pose1**:, - **Pose1**:, etc.
  // Try multiple regex patterns to handle different formats
  let poseBlockMatches: RegExpMatchArray[] = [];
  
  // Pattern 1: Try **Pose1**: format first (most common in recent outputs)
  // Updated to handle format like: -   **Pose1**: (with dash and multiple spaces)
  const pose1Regex = /(?:^|\n)\s*-?\s*\*\*Pose\s*(\d+)\s*:\*\*\s*([\s\S]+?)(?=(?:^|\n)\s*-?\s*\*\*Pose\s*\d+\s*:\*\*|$)/gi;
  poseBlockMatches = Array.from(text.matchAll(pose1Regex));
  console.log(`Pattern 1 (**Pose1**:) 找到 ${poseBlockMatches.length} 个pose区块`);
  
  // Pattern 2: If not found, try {{Pose1}}: format
  if (poseBlockMatches.length === 0) {
    const pose2Regex = /(?:^|\n)\s*[-*]?\s*\{\{Pose\s*(\d+)\}\}\s*:?\s*([\s\S]+?)(?=(?:^|\n)\s*[-*]?\s*\{\{Pose\s*\d+\}\}|$)/gi;
    poseBlockMatches = Array.from(text.matchAll(pose2Regex));
    console.log(`Pattern 2 ({{Pose1}}:) 找到 ${poseBlockMatches.length} 个pose区块`);
  }
  
  // Pattern 3: If still not found, try simple Pose1: format
  if (poseBlockMatches.length === 0) {
    const pose3Regex = /(?:^|\n)\s*[-*]?\s*Pose\s*(\d+)\s*:?\s*([\s\S]+?)(?=(?:^|\n)\s*[-*]?\s*Pose\s*\d+\s*:?|$)/gi;
    poseBlockMatches = Array.from(text.matchAll(pose3Regex));
    console.log(`Pattern 3 (Pose1:) 找到 ${poseBlockMatches.length} 个pose区块`);
  }
  
  // Process each pose block - extract pose field (Action/Pose)
  for (const match of poseBlockMatches) {
    const poseNumber = parseInt(match[1]);
    const block = match[2];
    
    if (!block || block.trim().length === 0) continue;
    
    console.log(`处理 Pose ${poseNumber} 区块，长度: ${block.length}`);
    console.log(`区块内容预览: ${block.substring(0, 300)}`);
    
    const poseData: Partial<PoseDescription> = {};
    
    // Try to extract fields with ** markers
    // Support formats: **Pose1**: or **Pose**: or - **Pose1**: etc.
    // The block should already contain content from **Pose1**: to the next **Pose2**:
    
    // Extract pose content (first line/section of the block, before **Camera Position** or **Composition**)
    const poseMatch = block.match(/^([\s\S]+?)(?=\n\s*[-*]?\s*\*\*(?:Camera\s*Position|Composition)\s*\d*\s*:\*\*|$)/i);
    if (poseMatch && poseMatch[1]) {
      poseData.pose = poseMatch[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`找到 Pose 字段 (Pose ${poseNumber}): ${poseData.pose.substring(0, 50)}...`);
    }
    
    // Extract Camera Position (supports **Camera Position1**: format with optional dash)
    const cameraMatch = block.match(/(?:^|\n)\s*-?\s*\*\*Camera\s*Position\s*\d*\s*:\*\*\s*([\s\S]+?)(?=\n\s*-?\s*\*\*(?:Composition|Pose)\s*\d*\s*:\*\*|$)/i);
    if (cameraMatch && cameraMatch[1]) {
      poseData.cameraPosition = cameraMatch[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`找到 Camera Position 字段 (Pose ${poseNumber}): ${poseData.cameraPosition.substring(0, 50)}...`);
    }
    
    // Extract Composition (supports **Composition1**: format with optional dash)
    const compositionMatch = block.match(/(?:^|\n)\s*-?\s*\*\*Composition\s*\d*\s*:\*\*\s*([\s\S]+?)(?=\n\s*-?\s*\*\*(?:Pose|Camera\s*Position)\s*\d*\s*:\*\*|$)/i);
    if (compositionMatch && compositionMatch[1]) {
      poseData.composition = compositionMatch[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`找到 Composition 字段 (Pose ${poseNumber}): ${poseData.composition.substring(0, 50)}...`);
    }
    
    // If we didn't find pose field, try Action field without ** markers or Pose without markers
    if (!poseData.pose) {
      // Try **Action:** (already handled above, but also try without **)
      const actionWithoutMarkers = block.match(/(?:^|\n)\s*[-*]?\s*Action\s*:?\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:Camera\s*Position|Composition|Pose|Action)\s*\d*\s*:?|$)/i);
      if (actionWithoutMarkers && actionWithoutMarkers[1]) {
        poseData.pose = actionWithoutMarkers[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        console.log(`找到 Action: 字段（无标记）: ${poseData.pose.substring(0, 50)}...`);
      } else {
        // Try format: Pose: content (without **)
        const poseWithoutMarkers = block.match(/(?:^|\n)\s*[-*]?\s*Pose\s*:?\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:Camera\s*Position|Composition|Pose|Action)\s*\d*\s*:?|$)/i);
        if (poseWithoutMarkers && poseWithoutMarkers[1]) {
          poseData.pose = poseWithoutMarkers[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          console.log(`找到 Pose: 字段（无标记）: ${poseData.pose.substring(0, 50)}...`);
        } else {
          // If still not found, the block might start directly with pose content (after Pose1:)
          // Check if block starts with content (not a field marker like Camera Position or Composition)
          const trimmedBlock = block.trim();
          // If block doesn't start with Camera Position or Composition, treat the first part as pose
          if (!trimmedBlock.match(/^(?:[-*]?\s*)?(?:\{\{?Camera\s*Position|Composition)/i)) {
            // Extract content until the first Camera Position or Composition field (supporting {{}} format)
            const poseContentMatch = trimmedBlock.match(/^([\s\S]+?)(?=\n\s*[-*]?\s*(?:\{\{?Camera\s*Position|Composition)\s*\d*\}?\}?\s*:?|$)/i);
            if (poseContentMatch && poseContentMatch[1]) {
              poseData.pose = poseContentMatch[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
              console.log(`找到 Pose 字段（块开头）: ${poseData.pose.substring(0, 50)}...`);
            }
          }
        }
      }
    }
    
    // Try to find Camera Position and Composition in block (may be without ** markers and with numbers)
    if (!poseData.cameraPosition) {
      // Try with ** markers first
      const cameraWithMarkers = block.match(/(?:^|\n)\s*[-*]?\s*\*\*Camera\s*Position:\*\*\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:\*\*)?(?:Composition|Pose|Action|Camera\s*Position)|$)/i);
      if (cameraWithMarkers && cameraWithMarkers[1]) {
        poseData.cameraPosition = cameraWithMarkers[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        console.log(`找到 Camera Position: 字段（块内）: ${poseData.cameraPosition.substring(0, 50)}...`);
      } else {
        // Try without ** markers (may have number like Camera Position1: or {{Camera Position1}}:)
        // Match Camera Position followed by optional number and colon, with or without {{}}
        // More flexible regex to handle various formats
        const cameraRegex = /(?:^|\n)\s*[-*]?\s*\{\{?Camera\s*Position\s*(\d+)?\}?\}?\s*:?\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:\{\{?Composition|Pose|Action|Camera\s*Position)\s*(?:\d+)?\}?\}?\s*:?|$)/i;
        const cameraWithoutMarkers = block.match(cameraRegex);
        if (cameraWithoutMarkers && cameraWithoutMarkers[2]) {
          const value = cameraWithoutMarkers[2].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          if (value.length > 5) {
            poseData.cameraPosition = value;
            console.log(`找到 Camera Position: 字段（块内，无标记，数字: ${cameraWithoutMarkers[1] || '无'}）: ${poseData.cameraPosition.substring(0, 50)}...`);
          } else {
            console.warn(`Camera Position 字段长度不足: ${value.length}`);
          }
        } else {
          console.warn(`未找到 Camera Position 字段，块内容预览: ${block.substring(0, 200)}`);
        }
      }
    }
    
    if (!poseData.composition) {
      // Try with ** markers first
      const compositionWithMarkers = block.match(/(?:^|\n)\s*[-*]?\s*\*\*Composition:\*\*\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:\*\*)?(?:Camera\s*Position|Pose|Action|Composition)|$)/i);
      if (compositionWithMarkers && compositionWithMarkers[1]) {
        poseData.composition = compositionWithMarkers[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        console.log(`找到 Composition: 字段（块内）: ${poseData.composition.substring(0, 50)}...`);
      } else {
        // Try without ** markers (may have number like Composition1: or {{Composition1}}:)
        // Match Composition followed by optional number and colon, with or without {{}}
        // More flexible regex to handle various formats
        const compositionRegex = /(?:^|\n)\s*[-*]?\s*\{\{?Composition\s*(\d+)?\}?\}?\s*:?\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:\{\{?Camera\s*Position|Pose|Action|Composition)\s*(?:\d+)?\}?\}?\s*:?|$)/i;
        const compositionWithoutMarkers = block.match(compositionRegex);
        if (compositionWithoutMarkers && compositionWithoutMarkers[2]) {
          const value = compositionWithoutMarkers[2].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
          if (value.length > 5) {
            poseData.composition = value;
            console.log(`找到 Composition: 字段（块内，无标记，数字: ${compositionWithoutMarkers[1] || '无'}）: ${poseData.composition.substring(0, 50)}...`);
          } else {
            console.warn(`Composition 字段长度不足: ${value.length}`);
          }
        } else {
          console.warn(`未找到 Composition 字段，块内容预览: ${block.substring(0, 200)}`);
        }
      }
    }
    
    // Strategy 2: If still missing, try numbered format (Pose1:, Camera Position1:, Composition1:)
    if (!poseData.pose || !poseData.cameraPosition || !poseData.composition) {
      const numberedPose = block.match(/(?:^|\n)\s*[-*]?\s*Pose\s*:?\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:Camera|Composition|Pose)\s*\d+|$)/i);
      if (numberedPose && numberedPose[1] && !poseData.pose) {
        poseData.pose = numberedPose[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        poseData.pose = poseData.pose.replace(/\*\*/g, '').trim();
      }
      
      const numberedCamera = block.match(/(?:^|\n)\s*[-*]?\s*Camera\s*Position\s*:?\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:Pose|Composition|Camera)\s*\d+|$)/i);
      if (numberedCamera && numberedCamera[1] && !poseData.cameraPosition) {
        poseData.cameraPosition = numberedCamera[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        poseData.cameraPosition = poseData.cameraPosition.replace(/\*\*/g, '').trim();
      }
      
      const numberedComposition = block.match(/(?:^|\n)\s*[-*]?\s*Composition\s*:?\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:Pose|Camera|Composition)\s*\d+|$)/i);
      if (numberedComposition && numberedComposition[1] && !poseData.composition) {
        poseData.composition = numberedComposition[1].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        poseData.composition = poseData.composition.replace(/\*\*/g, '').trim();
      }
    }
    
    // Strategy 3: Try to extract from lines (fallback)
    if (!poseData.pose || !poseData.cameraPosition || !poseData.composition) {
      const lines = block.split('\n').filter(line => line.trim().length > 0);
      for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();
        // Support both **Pose:** and **Action:** as pose field
        if ((lowerLine.includes('pose:') || lowerLine.includes('action:')) && !poseData.pose) {
          const match = line.match(/(?:pose|action)\s*:|\*\*(?:pose|action):\*\*\s*(.+)/i);
          if (match && match[1]) {
            poseData.pose = match[1].trim().replace(/\*\*/g, '').trim();
          } else {
            // Try to extract content after the colon
            const colonMatch = line.match(/:\s*(.+)/);
            if (colonMatch && colonMatch[1]) {
              poseData.pose = colonMatch[1].trim().replace(/\*\*/g, '').trim();
            }
          }
        } else if (lowerLine.includes('camera') && lowerLine.includes('position') && !poseData.cameraPosition) {
          const match = line.match(/(?:camera\s*position\s*:|\*\*camera\s*position:\*\*)\s*(.+)/i);
          if (match && match[1]) {
            poseData.cameraPosition = match[1].trim().replace(/\*\*/g, '').trim();
          } else {
            // Try to extract content after the colon
            const colonMatch = line.match(/:\s*(.+)/);
            if (colonMatch && colonMatch[1]) {
              poseData.cameraPosition = colonMatch[1].trim().replace(/\*\*/g, '').trim();
            }
          }
        } else if (lowerLine.includes('composition') && !poseData.composition) {
          const match = line.match(/(?:composition\s*:|\*\*composition:\*\*)\s*(.+)/i);
          if (match && match[1]) {
            poseData.composition = match[1].trim().replace(/\*\*/g, '').trim();
          } else {
            // Try to extract content after the colon
            const colonMatch = line.match(/:\s*(.+)/);
            if (colonMatch && colonMatch[1]) {
              poseData.composition = colonMatch[1].trim().replace(/\*\*/g, '').trim();
            }
          }
        }
      }
    }
    
    // Store pose data even if incomplete, we'll match numbered fields later
    poseMap.set(poseNumber, poseData);
  }
  
  // Strategy 2: Find numbered fields in the full text (Camera Position1:, Composition1:, etc.)
  // This handles formats where fields are outside the pose block or in the block but not yet found
  console.log("在全文查找带数字的字段...");
  
  // Improved regex to match formats:
  // - **Camera Position1**: or **Camera Position**: (with ** markers)
  // - {{Camera Position1}}: or Camera Position1: (without ** markers)
  const cameraPositionRegex = /(?:^|\n)\s*[-*]?\s*\*?\*?\{\{?Camera\s*Position\s*(\d+)\}?\}?\*?\*?\s*:?\s*([\s\S]+?)(?=(?:^|\n)\s*[-*]?\s*\*?\*?(?:\{\{?Camera\s*Position|Composition|Pose)\s*(?:\d+)?\}?\}?\*?\*?\s*:?|$)/gi;
  const cameraPositionMatches = Array.from(text.matchAll(cameraPositionRegex));
  console.log(`找到 ${cameraPositionMatches.length} 个Camera Position字段（全文查找）`);
  
  for (const match of cameraPositionMatches) {
    const number = parseInt(match[1]);
    const value = match[2].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (value && value.length > 5) {
      if (!poseMap.has(number)) {
        poseMap.set(number, {});
        console.log(`创建新的 Pose ${number} 条目`);
      }
      // Only set if not already found in block
      if (!poseMap.get(number)!.cameraPosition) {
        poseMap.get(number)!.cameraPosition = value;
        console.log(`匹配 Camera Position${number}（全文查找）: ${value.substring(0, 50)}...`);
      } else {
        console.log(`Pose ${number} 已有 Camera Position，跳过全文查找结果`);
      }
    }
  }
  
  // Improved regex to match formats:
  // - **Composition1**: or **Composition**: (with ** markers)
  // - {{Composition1}}: or Composition1: (without ** markers)
  const compositionRegex = /(?:^|\n)\s*[-*]?\s*\*?\*?\{\{?Composition\s*(\d+)\}?\}?\*?\*?\s*:?\s*([\s\S]+?)(?=(?:^|\n)\s*[-*]?\s*\*?\*?(?:\{\{?Camera\s*Position|Composition|Pose)\s*(?:\d+)?\}?\}?\*?\*?\s*:?|$)/gi;
  const compositionMatches = Array.from(text.matchAll(compositionRegex));
  console.log(`找到 ${compositionMatches.length} 个Composition字段（全文查找）`);
  
  for (const match of compositionMatches) {
    const number = parseInt(match[1]);
    const value = match[2].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (value && value.length > 5) {
      if (!poseMap.has(number)) {
        poseMap.set(number, {});
        console.log(`创建新的 Pose ${number} 条目`);
      }
      // Only set if not already found in block
      if (!poseMap.get(number)!.composition) {
        poseMap.get(number)!.composition = value;
        console.log(`匹配 Composition${number}（全文查找）: ${value.substring(0, 50)}...`);
      } else {
        console.log(`Pose ${number} 已有 Composition，跳过全文查找结果`);
      }
    }
  }
  
  // Also check for Action field (which maps to pose)
  const actionRegex = /(?:^|\n)\s*[-*]?\s*\*\*Action:\*\*\s*([\s\S]+?)(?=\n\s*[-*]?\s*\*\*(?:Camera\s*Position|Composition|Pose|Action):|$)/gi;
  const actionMatches = Array.from(text.matchAll(actionRegex));
  console.log(`找到 ${actionMatches.length} 个Action字段`);
  
  // Match Action fields to the nearest Pose block
  for (const match of actionMatches) {
    const actionValue = match[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (actionValue && actionValue.length > 10) {
      // Find the nearest Pose number before this Action
      const actionStart = match.index || 0;
      const textBeforeAction = text.substring(0, actionStart);
      const poseBeforeAction = textBeforeAction.match(/Pose\s*(\d+)\s*:?/gi);
      if (poseBeforeAction && poseBeforeAction.length > 0) {
        const lastPoseMatch = poseBeforeAction[poseBeforeAction.length - 1];
        const poseNumberMatch = lastPoseMatch.match(/(\d+)/);
        if (poseNumberMatch) {
          const number = parseInt(poseNumberMatch[1]);
          if (!poseMap.has(number)) {
            poseMap.set(number, {});
          }
          if (!poseMap.get(number)!.pose) {
            poseMap.get(number)!.pose = actionValue;
            console.log(`匹配 Action 到 Pose${number}: ${actionValue.substring(0, 50)}...`);
          }
        }
      }
    }
  }
  
  // Now validate and add complete poses
  const sortedNumbers = Array.from(poseMap.keys()).sort((a, b) => a - b);
  for (const number of sortedNumbers) {
    const poseData = poseMap.get(number);
    if (poseData && poseData.pose && poseData.cameraPosition && poseData.composition) {
      // Clean up the text (remove extra spaces, normalize)
      const cleanPose = poseData.pose.replace(/\s+/g, ' ').trim();
      const cleanCamera = poseData.cameraPosition.replace(/\s+/g, ' ').trim();
      const cleanComposition = poseData.composition.replace(/\s+/g, ' ').trim();
      
      // Minimum length checks
      if (cleanPose.length > 10 && cleanCamera.length > 5 && cleanComposition.length > 5) {
        poses.push({
          pose: cleanPose,
          cameraPosition: cleanCamera,
          composition: cleanComposition,
        });
        console.log(`成功解析 Pose ${number}:`);
        console.log(`  Pose: ${cleanPose.substring(0, 80)}...`);
        console.log(`  Camera: ${cleanCamera.substring(0, 80)}...`);
        console.log(`  Composition: ${cleanComposition.substring(0, 80)}...`);
      } else {
        console.warn(`Pose ${number} 字段长度不足:`, {
          pose: cleanPose.length,
          camera: cleanCamera.length,
          composition: cleanComposition.length
        });
      }
    } else {
      console.warn(`Pose ${number} 缺少字段:`, {
        hasPose: !!poseData?.pose,
        hasCamera: !!poseData?.cameraPosition,
        hasComposition: !!poseData?.composition
      });
    }
  }
  
  // If we still don't have poses, try a more flexible approach
  if (poses.length === 0) {
    console.warn("未能使用区块解析，尝试逐行解析...");
    
    // Strategy: Direct line-by-line parsing for **Pose1**: format
    // First try: Split by **Pose1**: markers
    // Use matchAll to find all **Pose1**: patterns with their numbers
    const poseMatches = Array.from(text.matchAll(/(?:^|\n)\s*[-*]?\s*\*\*Pose\s*(\d+)\s*:\*\*\s*([\s\S]+?)(?=(?:^|\n)\s*[-*]?\s*\*\*Pose\s*\d+\s*:\*\*|$)/gi));
    if (poseMatches.length > 0) {
      console.log(`使用 **Pose1**: 格式匹配，找到 ${poseMatches.length} 个区块`);
      for (const match of poseMatches) {
        const poseNumber = parseInt(match[1]);
        const section = match[2];
        const poseData: Partial<PoseDescription> = {};
        
        // Extract pose content (everything until next **Camera Position** or **Composition**)
        const poseMatch = section.match(/^([\s\S]+?)(?=\n\s*[-*]?\s*\*\*(?:Camera\s*Position|Composition)\s*\d*\s*:\*\*|$)/i);
        if (poseMatch && poseMatch[1]) {
          poseData.pose = poseMatch[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        }
        
        // Extract Camera Position
        const cameraMatch = section.match(/\*\*Camera\s*Position\s*\d*\s*:\*\*\s*([\s\S]+?)(?=\n\s*[-*]?\s*\*\*(?:Composition|Pose)\s*\d*\s*:\*\*|$)/i);
        if (cameraMatch && cameraMatch[1]) {
          poseData.cameraPosition = cameraMatch[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        }
        
        // Extract Composition
        const compositionMatch = section.match(/\*\*Composition\s*\d*\s*:\*\*\s*([\s\S]+?)(?=\n\s*[-*]?\s*\*\*(?:Pose|Camera\s*Position)\s*\d*\s*:\*\*|$)/i);
        if (compositionMatch && compositionMatch[1]) {
          poseData.composition = compositionMatch[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        }
        
        if (poseData.pose && poseData.cameraPosition && poseData.composition) {
          if (poseData.pose.length > 10 && poseData.cameraPosition.length > 5 && poseData.composition.length > 5) {
            poses.push({
              pose: poseData.pose,
              cameraPosition: poseData.cameraPosition,
              composition: poseData.composition,
            });
            console.log(`成功解析 Pose ${poseNumber}（**Pose1**: 格式）`);
          }
        }
      }
    }
    
    // If still no poses, try splitting by Pose markers (supporting {{}} format) and try to extract from each section
    if (poses.length === 0) {
      const sections = text.split(/(?:^|\n)\s*[-*]?\s*\*?\*?\{\{?Pose\s*\d+\}?\}?\*?\*?\s*:?\s*/i).filter(s => s.trim().length > 0);
      
      for (let i = 0; i < sections.length && i < 6; i++) {
        const section = sections[i];
        const poseData: Partial<PoseDescription> = {};
        
        // Try to extract each field with flexible matching (supports - prefix, ** markers, and {{}} format)
        const poseMatch = section.match(/(?:^|\n)\s*[-*]?\s*\*?\*?(?:\{\{?Pose\}?\}?|Pose)\s*\d*\s*:?\*?\*?\s*([\s\S]+?)(?=\n\s*[-*]?\s*\*?\*?(?:\{\{?Camera\s*Position|Composition|Pose)\s*\d*\}?\}?\*?\*?\s*:?|$)/i);
        if (poseMatch && poseMatch[1]) {
          poseData.pose = poseMatch[1].trim().replace(/\{\{|\}\}/g, '').replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        }
        
        const cameraMatch = section.match(/(?:^|\n)\s*[-*]?\s*\*?\*?(?:\{\{?Camera\s*Position\}?\}?|Camera\s*Position)\s*\d*\s*:?\*?\*?\s*([\s\S]+?)(?=\n\s*[-*]?\s*\*?\*?(?:\{\{?Pose|Composition|Camera\s*Position)\s*\d*\}?\}?\*?\*?\s*:?|$)/i);
        if (cameraMatch && cameraMatch[1]) {
          poseData.cameraPosition = cameraMatch[1].trim().replace(/\{\{|\}\}/g, '').replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        }
        
        const compositionMatch = section.match(/(?:^|\n)\s*[-*]?\s*\*?\*?(?:\{\{?Composition\}?\}?|Composition)\s*\d*\s*:?\*?\*?\s*([\s\S]+?)(?=\n\s*[-*]?\s*\*?\*?(?:\{\{?Pose|Camera\s*Position|Composition)\s*\d*\}?\}?\*?\*?\s*:?|$)/i);
        if (compositionMatch && compositionMatch[1]) {
          poseData.composition = compositionMatch[1].trim().replace(/\{\{|\}\}/g, '').replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        }
        
        if (poseData.pose && poseData.cameraPosition && poseData.composition) {
          if (poseData.pose.length > 10 && poseData.cameraPosition.length > 5 && poseData.composition.length > 5) {
            poses.push({
              pose: poseData.pose,
              cameraPosition: poseData.cameraPosition,
              composition: poseData.composition,
            });
            console.log(`逐行解析成功，添加 Pose ${poses.length}`);
          }
        }
      }
    }
  }
  
  // Limit to 6 poses maximum
  const finalPoses = poses.slice(0, 6);
  console.log(`成功解析 ${finalPoses.length} 个pose描述`);
  
  if (finalPoses.length === 0) {
    console.error("未能解析任何pose描述");
    console.error("原始文本（前2000字符）:", text.substring(0, 2000));
    console.error("原始文本（完整）:", text);
  } else {
    console.log("解析结果:", JSON.stringify(finalPoses, null, 2));
  }
  
  return finalPoses;
}

// Step 2: 根据pose描述生成图片（使用 gemini-3-pro-image-preview 图像生成模型）
async function generatePoseImage(
  imageBase64: string,
  mimeType: string,
  poseDescription: PoseDescription,
  aspectRatio: string | null,
  imageSize: string | null,
  characterImageBase64?: string | null,
  characterImageType?: string | null
): Promise<string> {
  // Build prompt combining pose, camera position, and composition
  // Format: base instruction + char_image mention + pose + camera_position + composition
  const charImageText = characterImageBase64 
    ? " A more clear version of the character's face is {{char_image}}." 
    : "";
  
  const prompt = `take autentic photo of the character, use instagram friendly composition. Shot on the character should have identical face, features, skin tone, hairstyle, body proportions, and vibe.${charImageText}

pose:${poseDescription.pose}

camera_position:${poseDescription.cameraPosition}

composition:${poseDescription.composition}

negatives: beauty-filter/airbrushed skin; poreless look, exaggerated or distorted anatomy, fake portrait-mode blur, CGI/illustration look`;

  // Build image parts - include characterImage if provided
  const imageParts: any[] = [
    {
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    },
  ];

  // Add character image if provided
  if (characterImageBase64 && characterImageType) {
    imageParts.push({
      inlineData: {
        mimeType: characterImageType,
        data: characterImageBase64,
      },
    });
    console.log("已添加角色面部图到生成请求");
  }

  // Add prompt
  imageParts.push({ text: prompt });

  const contents = [
    {
      parts: imageParts,
    },
  ];

  // 使用 Vertex AI generateImage 函数
  const modelId = process.env.GEMINI_IMAGE_MODEL_ID || "gemini-3-pro-image-preview";

  try {
    const generatedImageBase64 = await generateImage(
      modelId,
      prompt,
      {
        imageBase64: imageBase64,
        mimeType: mimeType,
        characterImageBase64: characterImageBase64 || undefined,
        characterImageType: characterImageType || undefined,
        aspectRatio: aspectRatio || undefined,
        imageSize: (imageSize as "1K" | "2K" | "4K" | undefined) || undefined,
      }
    );

    // 转换为 data URL 格式
    const dataUrl = `data:image/png;base64,${generatedImageBase64}`;
    return dataUrl;
  } catch (error: any) {
    console.error("生成图片失败:", error);
    throw new Error(`生成图片失败: ${error.message || '未知错误'}`);
  }
}

// 上传函数已移至 @/lib/upload

// Generate pose image using Qwen API (Hot Mode)
async function generatePoseImageWithQwen(
  characterImage: File,
  poseDesc: PoseDescription
): Promise<string> {
  const qwenApiUrl = process.env.QWEN_API_URL;
  if (!qwenApiUrl) {
    const error = "Qwen API URL not configured";
    console.error("[Qwen Error]", error);
    throw new Error(error);
  }

  // Construct prompt from pose description
  const prompt = `${poseDesc.pose}, ${poseDesc.cameraPosition}, ${poseDesc.composition}`;
  
  // Generate random seed
  const seed = Math.floor(Math.random() * 1000000);

  console.log("=== Calling Qwen API (PhotoBooth) ===");
  console.log("Prompt:", prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""));
  console.log("Seed:", seed);

  try {
    // Convert character image to base64
    const imageBuffer = Buffer.from(await characterImage.arrayBuffer());
    const imageBase64 = imageBuffer.toString('base64');
    console.log("Image size (base64):", imageBase64.length, "chars");

    // Import the Qwen workflow
    const { QWEN_WORKFLOW_BASE64 } = await import("@/lib/qwen-workflow");

    // Prepare request body
    const requestBody = {
      workflow: QWEN_WORKFLOW_BASE64,
      image: imageBase64,
      prompt: prompt,
      seed: seed,
      output_image: ""
    };

    const startTime = Date.now();

    // Call Qwen API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

    const response = await fetch(qwenApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Qwen] Response received (${elapsed}s), status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Qwen Error] HTTP error:", response.status, errorText.substring(0, 200));
      throw new Error(`Qwen API HTTP错误 ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    console.log("[Qwen] Response parsed, code:", data.code);

    if (data.code !== 0) {
      console.error("[Qwen Error] API error code:", data.code, "message:", data.message);
      throw new Error(`Qwen API错误 (code ${data.code}): ${data.message || '未知错误'}`);
    }

    if (!data.data?.image) {
      console.error("[Qwen Error] No image in response, data keys:", Object.keys(data.data || {}));
      throw new Error("Qwen API未返回图片数据");
    }

    console.log(`[Qwen] ✅ Success (${elapsed}s), image length:`, data.data.image.length);

    // Return as data URL
    return `data:image/png;base64,${data.data.image}`;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error("[Qwen Error] Request timeout (2 minutes)");
      throw new Error("Qwen API请求超时（2分钟）");
    }
    console.error("[Qwen Error] Exception:", error.message || error);
    throw error;
  }
}

