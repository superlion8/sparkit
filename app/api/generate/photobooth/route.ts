import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

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

    console.log("=== PhotoBooth Generation Started ===");
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
          
          // Upload input image
          const imageDataUrl = `data:${image.type};base64,${imageBase64}`;
          const uploadResult = await uploadImageToAimovely(
            imageDataUrl,
            aimovelyToken,
            "photobooth-input"
          );
          if (uploadResult?.url) {
            uploadedImageUrl = uploadResult.url;
            console.log("输入图片上传成功:", uploadedImageUrl);
          }
        }
      } catch (uploadError) {
        console.error("上传输入图片到 Aimovely 失败:", uploadError);
        // Continue with generation even if upload fails
      }
    }

    // Step 1: 生成6个pose描述（使用 gemini-2.5-flash 文本模型）
    console.log("Step 1: 生成pose描述...");
    const step1Start = Date.now();
    const poseDescriptions = await generatePoseDescriptions(
      imageBase64,
      image.type,
      apiKey
    );
    const step1Time = ((Date.now() - step1Start) / 1000).toFixed(2);
    console.log(`Step 1 完成，耗时: ${step1Time} 秒`);
    
    if (poseDescriptions.length === 0) {
      throw new Error("未能解析任何pose描述，请重试");
    }
    
    if (poseDescriptions.length < 6) {
      console.warn(`只解析到 ${poseDescriptions.length} 个pose描述，将生成 ${poseDescriptions.length} 张图片`);
    } else {
      console.log(`成功解析 ${poseDescriptions.length} 个pose描述`);
    }

    // Step 2: 根据pose描述并行生成图片（使用 gemini-2.5-flash-image 图像生成模型）
    console.log(`Step 2: 根据 ${poseDescriptions.length} 个pose描述并行生成图片...`);
    const step2Start = Date.now();
    
    // 并行生成所有图片
    const imagePromises = poseDescriptions.map((poseDesc, index) => {
      const imageStart = Date.now();
      console.log(`启动第 ${index + 1}/${poseDescriptions.length} 张图片的生成任务...`);
      
      return generatePoseImage(
        imageBase64,
        image.type,
        poseDesc,
        aspectRatio,
        apiKey
      )
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

    // 等待所有图片生成完成（并行）
    console.log(`等待 ${imagePromises.length} 个图片生成任务完成（并行执行）...`);
    const imageResults = await Promise.all(imagePromises);

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
      if (result.success && 'image' in result) {
        generatedImages.push({ index: result.index, image: result.image });
      } else if (!result.success && 'error' in result) {
        // Sanitize error message immediately when collecting
        const sanitizedError = sanitizeString(result.error);
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

    // Upload generated images to Aimovely (parallel upload)
    console.log("开始并行上传生成的图片到 Aimovely...");
    const uploadStart = Date.now();
    const uploadedImageUrls: Array<{ originalIndex: number; url: string }> = [];
    const uploadErrors: string[] = [];

    if (aimovelyToken) {
      try {
        // 并行上传所有图片，保持原始索引
        const uploadPromises = generatedImages.map((imageItem) => {
          const index = imageItem.index;
          const imageData = imageItem.image;
          const uploadImageStart = Date.now();
          console.log(`启动第 ${index + 1}/${generatedImages.length} 张图片的上传任务...`);
          
          return uploadImageToAimovely(
            imageData,
            aimovelyToken,
            `photobooth-${index}`
          )
            .then((uploadResult) => {
              const uploadImageTime = ((Date.now() - uploadImageStart) / 1000).toFixed(2);
              if (uploadResult?.url) {
                console.log(`图片 ${index + 1} (原始索引: ${index}) 上传成功（耗时: ${uploadImageTime} 秒）`);
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
              console.error(`上传图片 ${index + 1} (原始索引: ${index}) 失败（耗时: ${uploadImageTime} 秒）:`, uploadError);
              return {
                originalIndex: index,
                success: false,
                error: uploadError.message || "未知错误",
                time: uploadImageTime,
              };
            });
        });

        // 等待所有上传完成（并行）
        console.log(`等待 ${uploadPromises.length} 个图片上传任务完成（并行执行）...`);
        const uploadResults = await Promise.all(uploadPromises);

        // 处理上传结果：按照原始索引收集URL
        uploadResults.forEach((result) => {
          if (result.success && 'url' in result && result.url) {
            uploadedImageUrls.push({ originalIndex: result.originalIndex, url: result.url });
          } else if (!result.success && 'error' in result) {
            // Sanitize error message immediately when collecting (sanitizeString defined above)
            const sanitizedError = sanitizeString(result.error);
            uploadErrors.push(`图片 ${result.originalIndex + 1} 上传失败：${sanitizedError}`);
          }
        });
        
        // 按原始索引排序
        uploadedImageUrls.sort((a, b) => a.originalIndex - b.originalIndex);
        
        const uploadTime = ((Date.now() - uploadStart) / 1000).toFixed(2);
        console.log(`图片上传完成，总耗时: ${uploadTime} 秒（并行上传 ${generatedImages.length} 张图片）`);
        console.log(`成功: ${uploadedImageUrls.length} 张，失败: ${uploadErrors.length} 张`);
        
        // Check if all uploads failed - but don't throw, just log warning
        if (uploadedImageUrls.length === 0 && generatedImages.length > 0) {
          console.error("所有图片上传都失败，但继续处理已生成的图片");
          // Don't throw error, allow the process to continue with base64 images if needed
          // But we'll still return an error in the response data
        }
        
        // Warn if some uploads failed
        if (uploadErrors.length > 0) {
          console.warn(`部分图片上传失败: ${uploadErrors.length}/${generatedImages.length}`);
        }
      } catch (uploadError: any) {
        const uploadTime = ((Date.now() - uploadStart) / 1000).toFixed(2);
        console.error(`上传生成的图片到 Aimovely 时发生异常（总耗时: ${uploadTime} 秒）:`, uploadError);
        // Don't throw error, log it and continue with what we have
        // The uploadedImageUrls array may already contain some successful uploads
        console.warn("上传过程出现异常，但继续处理已成功上传的图片");
        // Sanitize error message immediately (sanitizeString defined above)
        const sanitizedError = sanitizeString(uploadError.message || "未知错误");
        uploadErrors.push(`上传过程异常：${sanitizedError}`);
      }
    } else {
      // No Aimovely token - this is a configuration issue, but don't fail the whole request
      console.error("未配置 Aimovely token，无法上传图片");
      // Don't throw error, just log and continue
      // The response will indicate that uploads failed
    }
    
    // If we have generated images but no uploaded URLs, we need to handle this gracefully
    // For now, we'll continue and let the response indicate the issue
    if (generatedImages.length > 0 && uploadedImageUrls.length === 0) {
      console.warn("有生成的图片但上传失败，响应中将不包含图片URL");
    }

    // Combine generation errors and upload errors
    const allErrors = [...generatedImageErrors, ...uploadErrors];

    // Prepare response data - only include necessary fields, remove undefined
    // IMPORTANT: Do NOT include base64 image data in response, only URLs
    // Only include pose descriptions that have successfully generated and uploaded images
    // Note: sanitizeString is already defined above
    const successfulPoseDescriptions: PoseDescription[] = [];
    const successfulImageUrls: string[] = [];

    uploadedImageUrls.forEach((item) => {
      // item.originalIndex 对应 poseDescriptions 的索引
      if (poseDescriptions[item.originalIndex] && item.url) {
        // Ensure pose description is valid (no undefined or null values)
        const poseDesc = poseDescriptions[item.originalIndex];
        if (poseDesc && poseDesc.pose && poseDesc.cameraPosition && poseDesc.composition) {
          // Sanitize pose description strings to prevent JSON serialization issues
          const sanitizedPoseDesc: PoseDescription = {
            pose: sanitizeString(poseDesc.pose),
            cameraPosition: sanitizeString(poseDesc.cameraPosition),
            composition: sanitizeString(poseDesc.composition),
          };
          successfulPoseDescriptions.push(sanitizedPoseDesc);
          successfulImageUrls.push(item.url);
        } else {
          console.warn(`Pose ${item.originalIndex + 1} 描述不完整，跳过`);
        }
      }
    });
    
    // Ensure we have at least some successful results
    if (successfulImageUrls.length === 0 && generatedImages.length > 0) {
      console.warn("⚠️ 所有图片上传失败，但图片已生成。响应中将不包含图片URL。");
      console.warn("建议：检查 Aimovely 配置或网络连接");
    }
    
    // Ensure all fields are properly serializable (no undefined, no circular references)
    // Clean and validate all string fields
    const responseData: any = {
      inputImageUrl: uploadedImageUrl || null,
      poseDescriptions: successfulPoseDescriptions, // Only poses with successful images (already sanitized)
      generatedImageUrls: successfulImageUrls, // Only URLs, no base64 data
      generatedCount: successfulImageUrls.length,
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
      
      // Check if response accidentally contains base64 data URLs
      if (responseJsonString.includes('data:image/') || responseJsonString.includes('iVBORw0KGgo')) {
        console.error("⚠️ 警告：响应中检测到base64图片数据！这会导致响应过大！");
        console.error("请检查 responseData 是否意外包含了 generatedImages 数组");
      }
      
      responseSizeKB = (responseJsonString.length / 1024).toFixed(2);
      
      console.log(`生成的图片数量: ${successfulImageUrls.length}`);
      console.log(`Pose 描述数量: ${successfulPoseDescriptions.length} (成功) / ${poseDescriptions.length} (请求)`);
      console.log(`输入图片 URL: ${uploadedImageUrl || 'null'}`);
      
      // Log first few URLs for debugging (only first 50 chars to avoid long URLs)
      if (successfulImageUrls.length > 0) {
        const urlPreview = successfulImageUrls.slice(0, 3).map(url => 
          url.length > 50 ? url.substring(0, 50) + '...' : url
        );
        console.log(`生成的图片 URLs (前3个):`, urlPreview);
      }
      
      // Check if response is too large (Vercel may have issues with > 4MB uncompressed)
      const responseSizeMB = parseFloat(responseSizeKB) / 1024;
      if (responseSizeMB > 4) {
        console.error(`⚠️ 响应体过大: ${responseSizeMB.toFixed(2)} MB (> 4 MB)`);
        console.error("这可能导致响应传输失败，请检查是否意外包含了base64图片数据");
      } else if (responseSizeMB > 1) {
        console.warn(`⚠️ 响应体较大: ${responseSizeMB.toFixed(2)} MB，可能影响传输速度`);
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
      if (successfulImageUrls.length > 10) {
        console.warn(`生成的图片数量较多: ${successfulImageUrls.length}`);
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
          if (successfulImageUrls.length > 0) {
            // Try to include successfully generated images with very careful sanitization
            const safeUrls: string[] = [];
            for (const url of successfulImageUrls) {
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
        console.warn(`⚠️ 响应体仍然较大 (${finalResponseSizeMB.toFixed(2)} MB)，可能影响传输`);
      }
      
      // Create response - use pre-serialized JSON string to avoid double serialization
      const response = new NextResponse(responseJsonString, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': responseJsonString.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Response-Time': `${totalTime}s`,
          'X-Content-Size': `${finalResponseSizeKB}KB`,
          'X-Execution-Time': `${totalTime}s`,
          'X-Generated-Count': successfulImageUrls.length.toString(),
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
      console.log(`响应体大小: ${finalResponseSizeKB} KB, Content-Length: ${responseJsonString.length}`);
      
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
        generatedImageUrlsCount: successfulImageUrls.length,
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

// Step 1: 生成6个pose描述（使用 gemini-2.5-flash 文本模型）
async function generatePoseDescriptions(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<PoseDescription[]> {
  const prompt = `你现在是一个专门拍摄ins风格写真照的职业摄影师，请你分析一下这个模特所在的环境、模特的特征还有她现在在做的动作，让她换6个不同的pose，可以把这几个连续的pose发成一个instagram的组图，请你给出这6个pose的指令。

尽量避免指令过于复杂，导致在一张图片里传达了过多的信息、或者让模特做出过于dramatic的姿势，不要改变光影。

请你用英文按照这个格式来写：

- Pose1:

- Camera Position1:

- Composition1:

- Pose2:

- Camera Position2:

- Composition2:

- Pose3:

- Camera Position3:

- Composition3:

- Pose4:

- Camera Position4:

- Composition4:

- Pose5:

- Camera Position5:

- Composition5:

- Pose6:

- Camera Position6:

- Composition6:`;

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

  // Use higher maxOutputTokens for detailed pose descriptions
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
          maxOutputTokens: 10000, // Increased to avoid truncation
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Gemini API error (generate pose descriptions):", error);
    throw new Error("生成pose描述失败");
  }

  const data = await response.json();
  console.log("=== Gemini API 响应 (generate pose descriptions) ===");
  console.log("响应 keys:", Object.keys(data));
  console.log("Candidates 数量:", data.candidates?.length || 0);

  // Check for API errors
  if (data.error) {
    console.error("Gemini API 返回错误:", data.error);
    throw new Error(`Gemini API 错误: ${data.error.message || '未知错误'}`);
  }

  // Check for candidates
  if (!data.candidates || data.candidates.length === 0) {
    console.error("没有 candidates 或为空");
    console.error("完整 API 响应:", JSON.stringify(data, null, 2));
    const error: any = new Error("API 未返回候选结果，请稍后重试");
    error.details = { response: data };
    throw error;
  }

  const candidate = data.candidates[0];
  console.log("第一个 candidate 的 keys:", Object.keys(candidate));
  console.log("Finish reason:", candidate.finishReason);

  // Check finish reason first (before checking content)
  if (candidate.finishReason) {
    if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
      console.error("内容被安全过滤阻止:", candidate.finishReason);
      console.error("安全评级:", candidate.safetyRatings);
      const error: any = new Error("内容被安全过滤阻止，请尝试其他图片");
      error.details = {
        finishReason: candidate.finishReason,
        safetyRatings: candidate.safetyRatings
      };
      throw error;
    }
    
    // MAX_TOKENS means we got partial text
    if (candidate.finishReason === "MAX_TOKENS") {
      console.warn("检测到 MAX_TOKENS finishReason，将检查是否有部分生成的文本");
    }
    
    console.log("Finish reason:", candidate.finishReason);
  }

  // Check for content
  if (!candidate.content || !candidate.content.parts) {
    console.error("候选结果中没有 content 或 parts");
    console.error("候选结果详情:", JSON.stringify(candidate, null, 2));
    let errorMsg = "未找到pose描述";
    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      errorMsg += `。原因: ${candidate.finishReason}`;
    }
    const error: any = new Error(errorMsg);
    error.details = {
      finishReason: candidate.finishReason,
      safetyRatings: candidate.safetyRatings,
      candidate: candidate
    };
    throw error;
  }

  // Extract text from parts
  let text = "";
  for (const part of candidate.content.parts) {
    if (part.text) {
      text += part.text;
    } else {
      console.log("部分内容不是文本:", part);
    }
  }

  const trimmedText = text.trim();
  
  // If we have text, use it (even if finishReason is MAX_TOKENS)
  if (trimmedText) {
    if (candidate.finishReason === "MAX_TOKENS") {
      console.warn("达到最大令牌数限制，但已生成部分文本，将使用已生成的文本");
      console.log("生成的文本长度:", trimmedText.length);
      console.log("生成的文本预览:", trimmedText.substring(0, 500));
    }
    console.log("成功提取pose描述，长度:", trimmedText.length);
    
    // Parse the pose descriptions
    const poses = parsePoseDescriptions(trimmedText);
    if (poses.length > 0) {
      return poses;
    } else {
      throw new Error("未能解析pose描述，请重试");
    }
  }
  
  // Only throw error if we have no text at all
  console.error("提取的文本为空");
  console.error("所有 parts:", JSON.stringify(candidate.content.parts, null, 2));
  console.error("Finish reason:", candidate.finishReason);
  console.error("Safety ratings:", candidate.safetyRatings);
  
  let errorMsg = "未找到pose描述";
  
  // Check finish reason
  if (candidate.finishReason) {
    if (candidate.finishReason === "STOP") {
      errorMsg += "。API 返回成功但未生成文本内容";
    } else if (candidate.finishReason === "MAX_TOKENS") {
      errorMsg += "。达到最大令牌数限制";
    } else {
      errorMsg += `。原因: ${candidate.finishReason}`;
    }
  }
  
  // Check safety ratings
  if (candidate.safetyRatings && Array.isArray(candidate.safetyRatings)) {
    const blockedCategories = candidate.safetyRatings
      .filter((rating: any) => rating.probability === "HIGH" || rating.probability === "MEDIUM")
      .map((rating: any) => rating.category);
    if (blockedCategories.length > 0) {
      errorMsg += `。可能触发了安全过滤: ${blockedCategories.join(", ")}`;
    }
  }
  
  const error: any = new Error(errorMsg);
  error.details = {
    finishReason: candidate.finishReason,
    safetyRatings: candidate.safetyRatings,
    parts: candidate.content.parts,
    fullCandidate: candidate
  };
  throw error;
}

// Parse pose descriptions from text
function parsePoseDescriptions(text: string): PoseDescription[] {
  const poses: PoseDescription[] = [];
  console.log("开始解析pose描述文本...");
  console.log("文本长度:", text.length);
  console.log("文本预览:", text.substring(0, 1000));
  
  // Strategy 1: Find all Pose blocks using matchAll
  // This handles formats like:
  // - Pose1:
  //   **Pose:** ...
  //   **Camera Position:** ...
  //   **Composition:** ...
  // Create a map to store pose data by number
  const poseMap = new Map<number, Partial<PoseDescription>>();
  
  // Strategy 1: Find all Pose blocks using matchAll
  const poseBlockRegex = /(?:^|\n)\s*[-*]?\s*Pose\s*(\d+)\s*:?\s*([\s\S]+?)(?=(?:^|\n)\s*[-*]?\s*Pose\s*\d+\s*:?|$)/gi;
  const poseBlockMatches = Array.from(text.matchAll(poseBlockRegex));
  
  console.log(`找到 ${poseBlockMatches.length} 个pose区块`);
  
  // Process each pose block - extract pose field (Action/Pose)
  for (const match of poseBlockMatches) {
    const poseNumber = parseInt(match[1]);
    const block = match[2];
    
    if (!block || block.trim().length === 0) continue;
    
    console.log(`处理 Pose ${poseNumber} 区块，长度: ${block.length}`);
    console.log(`区块内容预览: ${block.substring(0, 300)}`);
    
    const poseData: Partial<PoseDescription> = {};
    
    // Try to extract fields with ** markers first (most common format)
    // Format: - **Pose:** or **Action:** content (may span multiple lines, may have - prefix)
    // Match until next field (with or without ** markers, with or without numbers) or end of block
    // Support both **Pose:** and **Action:** as pose field
    // Next field could be: Camera Position, Composition, or another Pose/Action
    const poseWithMarkers = block.match(/(?:^|\n)\s*[-*]?\s*\*\*(?:Pose|Action):\*\*\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:\*\*(?:Camera\s*Position|Composition|Pose|Action):|(?:Camera\s*Position|Composition)\s*\d+|$))/i);
    if (poseWithMarkers && poseWithMarkers[1]) {
      poseData.pose = poseWithMarkers[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`找到 **Pose/Action:** 字段: ${poseData.pose.substring(0, 50)}...`);
    }
    
    const cameraWithMarkers = block.match(/(?:^|\n)\s*[-*]?\s*\*\*Camera\s*Position:\*\*\s*([\s\S]+?)(?=\n\s*[-*]?\s*\*\*(?:Pose|Action|Composition):|$)/i);
    if (cameraWithMarkers && cameraWithMarkers[1]) {
      poseData.cameraPosition = cameraWithMarkers[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`找到 **Camera Position:** 字段: ${poseData.cameraPosition.substring(0, 50)}...`);
    }
    
    const compositionWithMarkers = block.match(/(?:^|\n)\s*[-*]?\s*\*\*Composition:\*\*\s*([\s\S]+?)(?=\n\s*[-*]?\s*\*\*(?:Pose|Action|Camera\s*Position):|$)/i);
    if (compositionWithMarkers && compositionWithMarkers[1]) {
      poseData.composition = compositionWithMarkers[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`找到 **Composition:** 字段: ${poseData.composition.substring(0, 50)}...`);
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
          if (!trimmedBlock.match(/^(?:[-*]?\s*)?(?:Camera\s*Position|Composition)/i)) {
            // Extract content until the first Camera Position or Composition field
            const poseContentMatch = trimmedBlock.match(/^([\s\S]+?)(?=\n\s*[-*]?\s*(?:Camera\s*Position|Composition)\s*\d*\s*:?|$)/i);
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
        // Try without ** markers (may have number like Camera Position1:)
        // Match Camera Position followed by optional number and colon
        // More flexible regex to handle various formats
        const cameraRegex = /(?:^|\n)\s*[-*]?\s*Camera\s*Position\s*(\d+)?\s*:?\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:Composition|Pose|Action|Camera\s*Position)\s*(?:\d+)?\s*:?|$)/i;
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
        // Try without ** markers (may have number like Composition1:)
        // Match Composition followed by optional number and colon
        // More flexible regex to handle various formats
        const compositionRegex = /(?:^|\n)\s*[-*]?\s*Composition\s*(\d+)?\s*:?\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:Camera\s*Position|Pose|Action|Composition)\s*(?:\d+)?\s*:?|$)/i;
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
  
  // Improved regex to match Camera Position1: format more reliably
  const cameraPositionRegex = /(?:^|\n)\s*[-*]?\s*Camera\s*Position\s*(\d+)\s*:?\s*([\s\S]+?)(?=(?:^|\n)\s*[-*]?\s*(?:Camera\s*Position|Composition|Pose)\s*(?:\d+)?\s*:?|$)/gi;
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
  
  // Improved regex to match Composition1: format more reliably
  const compositionRegex = /(?:^|\n)\s*[-*]?\s*Composition\s*(\d+)\s*:?\s*([\s\S]+?)(?=(?:^|\n)\s*[-*]?\s*(?:Camera\s*Position|Composition|Pose)\s*(?:\d+)?\s*:?|$)/gi;
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
    // Split by Pose markers and try to extract from each section
    const sections = text.split(/(?:^|\n)\s*Pose\s*\d+\s*:?\s*/i).filter(s => s.trim().length > 0);
    
    for (let i = 0; i < sections.length && i < 6; i++) {
      const section = sections[i];
      const poseData: Partial<PoseDescription> = {};
      
      // Try to extract each field with flexible matching (supports - prefix and ** markers)
      const poseMatch = section.match(/(?:^|\n)\s*[-*]?\s*(?:\*\*Pose:\*\*|Pose\s*:)\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:\*\*)?(?:Camera\s*Position|Composition|Pose):|$)/i);
      if (poseMatch && poseMatch[1]) {
        poseData.pose = poseMatch[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      }
      
      const cameraMatch = section.match(/(?:^|\n)\s*[-*]?\s*(?:\*\*Camera\s*Position:\*\*|Camera\s*Position\s*:)\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:\*\*)?(?:Pose|Composition|Camera\s*Position):|$)/i);
      if (cameraMatch && cameraMatch[1]) {
        poseData.cameraPosition = cameraMatch[1].trim().replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      }
      
      const compositionMatch = section.match(/(?:^|\n)\s*[-*]?\s*(?:\*\*Composition:\*\*|Composition\s*:)\s*([\s\S]+?)(?=\n\s*[-*]?\s*(?:\*\*)?(?:Pose|Camera\s*Position|Composition):|$)/i);
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
          console.log(`逐行解析成功，添加 Pose ${poses.length}`);
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

// Step 2: 根据pose描述生成图片（使用 gemini-2.5-flash-image 图像生成模型）
async function generatePoseImage(
  imageBase64: string,
  mimeType: string,
  poseDescription: PoseDescription,
  aspectRatio: string | null,
  apiKey: string
): Promise<string> {
  // Build prompt combining pose, camera position, and composition
  // Format: base instruction + pose + camera_position + composition
  const prompt = `take autentic photo of the character, use instagram friendly composition. Shot on the character should have identical face, features, skin tone, hairstyle, body proportions, and vibe. 

pose:${poseDescription.pose}

camera_position:${poseDescription.cameraPosition}

composition:${poseDescription.composition}`;

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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
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
    console.error("Gemini API error (generate pose image):", error);
    throw new Error("生成图片失败");
  }

  const data = await response.json();
  
  // Log API response summary (DO NOT log full base64 image data)
  console.log("Gemini API 响应 (generate pose image):", {
    hasCandidates: !!data.candidates,
    candidatesCount: data.candidates?.length || 0,
    hasError: !!data.error,
    error: data.error || null,
    firstCandidateFinishReason: data.candidates?.[0]?.finishReason || null,
    firstCandidateHasInlineData: !!data.candidates?.[0]?.content?.parts?.[0]?.inlineData,
    // Log data length instead of full data
    firstCandidateDataLength: data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data?.length || 0,
  });

  // Check for API errors
  if (data.error) {
    console.error("Gemini API 返回错误:", data.error);
    throw new Error(`Gemini API 错误: ${data.error.message || '未知错误'}`);
  }

  // Check for candidates
  if (!data.candidates || data.candidates.length === 0) {
    console.error("没有 candidates 或为空");
    throw new Error("API 未返回候选结果，请稍后重试");
  }

  // Extract generated image and check finish reason
  for (const candidate of data.candidates) {
    // Check finish reason
    if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
      console.error("内容被安全过滤阻止:", candidate.finishReason);
      throw new Error("内容被安全过滤阻止，请尝试调整图片");
    }

    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          return dataUrl;
        }
      }
    }
  }

  // No image found
  let errorMsg = "未找到生成的图片";
  const candidate = data.candidates[0];
  if (candidate.finishReason) {
    errorMsg += `。原因: ${candidate.finishReason}`;
  }
  // Simplify safetyRatings to avoid complex nested JSON in error message
  // Just include the category and probability, not the full JSON
  if (candidate.safetyRatings && Array.isArray(candidate.safetyRatings)) {
    const ratings = candidate.safetyRatings.map((r: any) => {
      return r.category ? `${r.category}:${r.probability || r.blocked || 'unknown'}` : '';
    }).filter((r: string) => r).join(', ');
    if (ratings) {
      errorMsg += `。安全评级: ${ratings}`;
    }
  }
  throw new Error(errorMsg);
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

async function uploadImageToAimovely(dataUrl: string, token: string, prefix: string): Promise<UploadResult | null> {
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
  const fileName = `photobooth-${prefix}-${Date.now()}.${mimeType.split("/")[1] ?? "png"}`;

  const file = new File([buffer], fileName, { type: mimeType });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("biz", "external_tool");

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

