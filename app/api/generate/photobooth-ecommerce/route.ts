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
    const aspectRatio = formData.get("aspectRatio") as string;
    const imageSize = formData.get("imageSize") as string;

    console.log(`=== PhotoBooth E-commerce Generation Started ===`);

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

    // Convert image to base64
    const imageBuffer = await image.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");

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
            "photobooth-ecom-input"
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

    // Step 1: 使用 Gemini 生成 5 个电商 pose 描述
    console.log("Step 1: 生成5个电商pose描述...");
    const step1Start = Date.now();
    
    const posePrompt = `你现在是一个专门拍摄电商商品棚拍图的职业摄影师，请你分析一下这个模特所展示的商品、模特所在的环境、模特的特征还有她现在在做的动作，让她换5个不同的展示商品的pose，适合作为电商平台或品牌官网展示的模特棚拍图，请你给出这5个pose的指令。

尽量避免指令过于复杂，导致在一张图片里传达了过多的信息、或者让模特做出过于dramatic的姿势，不要改变光影。

请你严格用英文按照下面这个格式来写，不需要输出其他额外的东西：

- {{Pose1}}:

- {{Camera Position1}}:

- {{Composition1}}:

- {{Pose2}}:

- {{Camera Position2}}:

- {{Composition2}}:

- {{Pose3}}:

- {{Camera Position3}}:

- {{Composition3}}:

- {{Pose4}}:

- {{Camera Position4}}:

- {{Composition4}}:

- {{Pose5}}:

- {{Camera Position5}}:

- {{Composition5}}:`;

    // 调用 Gemini VLM 模型生成 pose 描述
    const poseResponseText = await generateText(
      "gemini-3-pro-preview",
      posePrompt,
      imageBase64,
      image.type
    );

    const step1Time = ((Date.now() - step1Start) / 1000).toFixed(2);
    console.log(`Step 1 完成，耗时: ${step1Time} 秒`);
    console.log("Pose 描述原文:", poseResponseText.substring(0, 500) + "...");

    // 解析 pose 描述
    const poseDescriptions = parsePoseDescriptions(poseResponseText);
    
    if (poseDescriptions.length === 0) {
      throw new Error("未能解析任何pose描述，请重试");
    }
    
    console.log(`成功解析 ${poseDescriptions.length} 个pose描述`);

    // Step 2: 并行生成 5 张电商图
    console.log(`Step 2: 根据 ${poseDescriptions.length} 个pose描述生成电商图片...`);
    const step2Start = Date.now();

    const imagePromises = poseDescriptions.map((poseDesc, index) => {
      const imageStart = Date.now();
      console.log(`启动第 ${index + 1}/${poseDescriptions.length} 张图片的生成任务...`);
      
      // 构建电商版 prompt
      const instructPrompt = `Pose: ${poseDesc.pose}\nCamera Position: ${poseDesc.cameraPosition}\nComposition: ${poseDesc.composition}`;
      const finalPrompt = `请为图中的模特拍摄一张身穿图中展示的商品的专业影棚商品棚拍图。

拍摄指令：${instructPrompt}

negatives: beauty-filter/airbrushed skin; poreless look, exaggerated or distorted anatomy, fake portrait-mode blur, CGI/illustration look`;

      return generateImage(
        process.env.GEMINI_IMAGE_MODEL_ID || "gemini-3-pro-image-preview",
        finalPrompt,
        {
          imageBase64,
          mimeType: image.type,
          aspectRatio: aspectRatio || undefined,
          imageSize: (imageSize as "1K" | "2K" | "4K" | undefined) || undefined,
        }
      )
        .then((generatedImageBase64) => {
          const imageTime = ((Date.now() - imageStart) / 1000).toFixed(2);
          console.log(`第 ${index + 1} 张图片生成成功，耗时: ${imageTime} 秒`);
          return {
            index,
            success: true,
            image: `data:image/png;base64,${generatedImageBase64}`,
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

    console.log(`等待 ${imagePromises.length} 个图片生成任务完成...`);
    const imageResults = await Promise.all(imagePromises);

    // 收集成功的图片
    const generatedImages: Array<{ index: number; image: string }> = [];
    const generatedImageErrors: string[] = [];

    imageResults.forEach((result) => {
      if (result.success && 'image' in result && result.image) {
        generatedImages.push({ index: result.index, image: result.image });
      } else if (!result.success && 'error' in result) {
        generatedImageErrors.push(`第 ${result.index + 1} 张: ${result.error}`);
      }
    });

    generatedImages.sort((a, b) => a.index - b.index);

    const step2Time = ((Date.now() - step2Start) / 1000).toFixed(2);
    console.log(`Step 2 完成，总耗时: ${step2Time} 秒`);
    console.log(`成功: ${generatedImages.length} 张，失败: ${generatedImageErrors.length} 张`);

    if (generatedImages.length === 0) {
      throw new Error("所有图片生成都失败，请重试");
    }

    // 上传生成的图片到 Aimovely
    console.log("开始上传生成的图片到 Aimovely...");
    const uploadedImageUrls: Array<{ originalIndex: number; url: string }> = [];

    if (aimovelyToken) {
      const uploadPromises = generatedImages.map((imageItem) => {
        return uploadImageToAimovely(
          imageItem.image,
          aimovelyToken!,
          `photobooth-ecom-${imageItem.index}`
        )
          .then((uploadResult) => {
            if (uploadResult?.url) {
              return {
                originalIndex: imageItem.index,
                success: true,
                url: uploadResult.url,
              };
            }
            return { originalIndex: imageItem.index, success: false };
          })
          .catch(() => ({ originalIndex: imageItem.index, success: false }));
      });

      const uploadResults = await Promise.all(uploadPromises);
      uploadResults.forEach((result) => {
        if (result.success && 'url' in result && result.url) {
          uploadedImageUrls.push({ originalIndex: result.originalIndex, url: result.url });
        }
      });
      uploadedImageUrls.sort((a, b) => a.originalIndex - b.originalIndex);
    }

    // 准备响应数据
    const successfulPoseDescriptions: PoseDescription[] = [];
    const successfulImageUrls: string[] = [];

    uploadedImageUrls.forEach((item) => {
      if (poseDescriptions[item.originalIndex] && item.url) {
        successfulPoseDescriptions.push(poseDescriptions[item.originalIndex]);
        successfulImageUrls.push(item.url);
      }
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`=== PhotoBooth E-commerce 总执行时间: ${totalTime} 秒 ===`);

    return NextResponse.json({
      inputImageUrl: uploadedImageUrl,
      poseDescriptions: successfulPoseDescriptions,
      generatedImageUrls: successfulImageUrls,
      generatedCount: successfulImageUrls.length,
      requestedCount: poseDescriptions.length,
      errors: generatedImageErrors.length > 0 ? generatedImageErrors : undefined,
    });
  } catch (error: any) {
    console.error("PhotoBooth E-commerce generation error:", error);
    return NextResponse.json(
      { error: error.message || "生成失败，请重试" },
      { status: 500 }
    );
  }
}

// 解析 pose 描述
function parsePoseDescriptions(text: string): PoseDescription[] {
  const poses: PoseDescription[] = [];
  
  // 支持多种格式：
  // - {{Pose1}}: content
  // - **Pose1**: content
  // - Pose1: content
  
  for (let i = 1; i <= 5; i++) {
    const poseData: Partial<PoseDescription> = {};
    
    // 匹配 Pose
    const poseRegex = new RegExp(`(?:\\{\\{|\\*\\*)?Pose${i}(?:\\}\\}|\\*\\*)?\\s*:\\s*([^\\n]+(?:\\n(?!\\s*[-*]?\\s*(?:\\{\\{|\\*\\*)?(?:Camera|Composition|Pose))[^\\n]*)*)`, 'i');
    const poseMatch = text.match(poseRegex);
    if (poseMatch && poseMatch[1]) {
      poseData.pose = poseMatch[1].trim().replace(/\*\*/g, '').replace(/\{\{|\}\}/g, '').trim();
    }
    
    // 匹配 Camera Position
    const cameraRegex = new RegExp(`(?:\\{\\{|\\*\\*)?Camera\\s*Position${i}(?:\\}\\}|\\*\\*)?\\s*:\\s*([^\\n]+(?:\\n(?!\\s*[-*]?\\s*(?:\\{\\{|\\*\\*)?(?:Camera|Composition|Pose))[^\\n]*)*)`, 'i');
    const cameraMatch = text.match(cameraRegex);
    if (cameraMatch && cameraMatch[1]) {
      poseData.cameraPosition = cameraMatch[1].trim().replace(/\*\*/g, '').replace(/\{\{|\}\}/g, '').trim();
    }
    
    // 匹配 Composition
    const compositionRegex = new RegExp(`(?:\\{\\{|\\*\\*)?Composition${i}(?:\\}\\}|\\*\\*)?\\s*:\\s*([^\\n]+(?:\\n(?!\\s*[-*]?\\s*(?:\\{\\{|\\*\\*)?(?:Camera|Composition|Pose))[^\\n]*)*)`, 'i');
    const compositionMatch = text.match(compositionRegex);
    if (compositionMatch && compositionMatch[1]) {
      poseData.composition = compositionMatch[1].trim().replace(/\*\*/g, '').replace(/\{\{|\}\}/g, '').trim();
    }
    
    // 如果三个字段都有，添加到结果
    if (poseData.pose && poseData.cameraPosition && poseData.composition) {
      poses.push({
        pose: poseData.pose,
        cameraPosition: poseData.cameraPosition,
        composition: poseData.composition,
      });
      console.log(`成功解析 Pose ${i}`);
    } else {
      console.warn(`Pose ${i} 缺少字段:`, {
        hasPose: !!poseData.pose,
        hasCamera: !!poseData.cameraPosition,
        hasComposition: !!poseData.composition
      });
    }
  }
  
  return poses;
}

// Helper functions for Aimovely integration
async function fetchAimovelyToken(email: string, vcode: string): Promise<string | null> {
  try {
    const response = await fetch(`${AIMOVELY_API_URL}/v1/user/verifyvcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, vcode }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.code !== 0 || !data.data?.access_token) {
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
    return null;
  }

  const [metadata, base64Data] = dataUrl.split(",");
  const mimeMatch = metadata.match(/data:(.*?);base64/);
  if (!mimeMatch) {
    return null;
  }

  const mimeType = mimeMatch[1] || "image/png";
  const buffer = Buffer.from(base64Data, "base64");
  const fileName = `${prefix}-${Date.now()}.${mimeType.split("/")[1] ?? "png"}`;

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
    return null;
  }

  const result = await response.json();
  if (result.code !== 0) {
    return null;
  }

  return {
    url: result.data?.url,
    resource_id: result.data?.resource_id,
  };
}

