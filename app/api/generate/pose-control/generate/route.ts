import { NextRequest, NextResponse } from 'next/server';
import { getVertexAIClient } from '@/lib/vertexai';
import { HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

export const maxDuration = 300;

const AIMOVELY_API_URL = "https://dev.aimovely.com";

// Fetch Aimovely access token
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
      console.error("[Pose Control] Aimovely token request failed:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    if (data.code !== 0 || !data.data?.access_token) {
      console.error("[Pose Control] Aimovely token response invalid:", data);
      return null;
    }

    return data.data.access_token as string;
  } catch (error) {
    console.error("[Pose Control] Error fetching Aimovely token:", error);
    return null;
  }
}

interface UploadResult {
  url: string;
  resource_id: string;
}

// Upload image to Aimovely
async function uploadImageToAimovely(
  dataUrl: string,
  token: string,
  prefix: string
): Promise<UploadResult | null> {
  if (!dataUrl.startsWith("data:")) {
    console.warn("[Pose Control] Unsupported image format, expected data URL");
    return null;
  }

  const [metadata, base64Data] = dataUrl.split(",");
  const mimeMatch = metadata.match(/data:(.*?);base64/);
  if (!mimeMatch) {
    console.warn("[Pose Control] Failed to parse data URL metadata");
    return null;
  }

  const mimeType = mimeMatch[1] || "image/png";
  const buffer = Buffer.from(base64Data, "base64");
  const fileName = `pose-control-${prefix}-${Date.now()}.${mimeType.split("/")[1] ?? "png"}`;

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
    console.error("[Pose Control] Aimovely upload failed:", response.status, await response.text());
    return null;
  }

  const result = await response.json();
  if (result.code !== 0) {
    console.error("[Pose Control] Aimovely upload API error:", result);
    return null;
  }

  return {
    url: result.data?.url,
    resource_id: result.data?.resource_id,
  };
}

async function generateImage(
  charImageBase64: string,
  poseImageBase64: string,
  finalPrompt: string,
  aspectRatio: string
): Promise<{ success: boolean; imageBase64?: string; error?: string }> {
  try {
    // Log input parameters for verification
    console.log('[Pose Control - Generate Image] Input verification (Vertex AI SDK):');
    console.log(`  - charImageBase64 length: ${charImageBase64.length}`);
    console.log(`  - poseImageBase64 length: ${poseImageBase64.length}`);
    console.log(`  - finalPrompt length: ${finalPrompt.length}`);
    console.log(`  - finalPrompt: ${finalPrompt.substring(0, 150)}...`);

    // Build content parts
    const parts: any[] = [
      {
        inlineData: {
          mimeType: 'image/png',
          data: charImageBase64,  // 角色图
        },
      },
      {
        inlineData: {
          mimeType: 'image/png',
          data: poseImageBase64,  // Pose 图
        },
      },
      {
        text: finalPrompt,  // 用户改好的 final_prompt
      },
    ];

    // Build generation config
    const generationConfig: any = {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseModalities: ['IMAGE'],
    };

    // Only add aspectRatio if it's not "default"
    if (aspectRatio && aspectRatio !== 'default') {
      generationConfig.imageConfig = {
        aspectRatio,
      };
    }

    console.log('[Pose Control - Generate Image] Calling Vertex AI SDK with:');
    console.log(`  - parts[0]: charImage (${charImageBase64.length} bytes)`);
    console.log(`  - parts[1]: poseImage (${poseImageBase64.length} bytes)`);
    console.log(`  - parts[2]: finalPrompt (${finalPrompt.length} chars)`);
    console.log(`  - aspectRatio: ${aspectRatio}`);

    // Call Vertex AI SDK using gemini-3-pro-image-preview model
    const modelId = "gemini-3-pro-image-preview";
    const client = getVertexAIClient();
    const model = client.getGenerativeModel({
      model: modelId,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    const response = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
    });

    // Check for prompt feedback
    const promptFeedback = response.response.promptFeedback;
    if (promptFeedback && (promptFeedback as any).blockReason) {
      console.error('[Pose Control - Generate] Prompt was blocked:', promptFeedback);
      return {
        success: false,
        error: `图片生成被阻止: ${(promptFeedback as any).blockReason}`
      };
    }

    const candidates = response.response.candidates;
    if (!candidates || candidates.length === 0) {
      console.error('[Pose Control - Generate] No candidates returned');
      console.error('[Pose Control - Generate] Full response:', JSON.stringify(response.response, null, 2));
      return { success: false, error: 'API未返回图片结果' };
    }

    const candidate = candidates[0];
    console.log('[Pose Control - Generate] Finish reason:', candidate.finishReason);
    console.log('[Pose Control - Generate] Has content:', !!candidate.content);
    console.log('[Pose Control - Generate] Has parts:', !!candidate.content?.parts);

    // Check finish reason first
    if (candidate.finishReason) {
      if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
        console.error('[Pose Control - Generate] Content blocked by safety filter:', candidate.finishReason);
        console.error('[Pose Control - Generate] Safety ratings:', candidate.safetyRatings);
        return {
          success: false,
          error: `内容被安全过滤阻止 (${candidate.finishReason})，请尝试其他图片或提示词`
        };
      }
    }

    if (!candidate.content || !candidate.content.parts) {
      console.error('[Pose Control - Generate] No content in candidate');
      console.error('[Pose Control - Generate] Candidate details:', JSON.stringify(candidate, null, 2));
      let errorMsg = '未能生成图片';
      if (candidate.finishReason && candidate.finishReason !== "STOP") {
        errorMsg += `，原因: ${candidate.finishReason}`;
      }
      if (candidate.safetyRatings) {
        errorMsg += `。安全评级: ${JSON.stringify(candidate.safetyRatings)}`;
      }
      return { success: false, error: errorMsg };
    }

    // Extract image from response
    let imageBase64 = '';
    for (const part of candidate.content.parts) {
      if ((part as any).inlineData && (part as any).inlineData.data) {
        imageBase64 = (part as any).inlineData.data;
        break;
      }
    }

    if (!imageBase64) {
      console.error('[Pose Control - Generate] No image data in response');
      console.error('[Pose Control - Generate] Response structure:', JSON.stringify(candidate, null, 2));
      return { success: false, error: '未能从API响应中提取图片' };
    }

    console.log('[Pose Control - Generate] Image generated successfully');
    return { success: true, imageBase64 };
  } catch (error: any) {
    console.error('[Pose Control - Generate] Error:', error);
    return { success: false, error: error.message || '图片生成失败' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const charImage = formData.get('charImage') as File;
    const poseImage = formData.get('poseImage') as File;
    const finalPrompt = formData.get('finalPrompt') as string;
    const numImages = parseInt(formData.get('numImages') as string) || 1;
    const aspectRatio = formData.get('aspectRatio') as string || 'default';

    if (!charImage || !poseImage || !finalPrompt) {
      return NextResponse.json(
        { error: 'Character image, pose image and final prompt are required' },
        { status: 400 }
      );
    }

    if (numImages < 1 || numImages > 4) {
      return NextResponse.json(
        { error: 'Number of images must be between 1 and 4' },
        { status: 400 }
      );
    }

    console.log(`[Pose Control - Generate] Starting generation of ${numImages} image(s)...`);

    // Convert images to base64
    const charBuffer = Buffer.from(await charImage.arrayBuffer());
    const charBase64 = charBuffer.toString('base64');
    const charMimeType = charImage.type || 'image/png';

    const poseBuffer = Buffer.from(await poseImage.arrayBuffer());
    const poseBase64 = poseBuffer.toString('base64');
    const poseMimeType = poseImage.type || 'image/png';

    // Upload images to Aimovely
    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;
    let charImageUrl: string | null = null;
    let poseImageUrl: string | null = null;
    let aimovelyToken: string | null = null;

    if (aimovelyEmail && aimovelyVcode) {
      try {
        aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
        if (aimovelyToken) {
          console.log('[Pose Control - Generate] Uploading images...');
          
          // Upload character image
          const charDataUrl = `data:${charMimeType};base64,${charBase64}`;
          const charUploadResult = await uploadImageToAimovely(charDataUrl, aimovelyToken, "char");
          if (charUploadResult?.url) {
            charImageUrl = charUploadResult.url;
            console.log('[Pose Control - Generate] Character image uploaded:', charImageUrl);
          }

          // Upload pose image
          const poseDataUrl = `data:${poseMimeType};base64,${poseBase64}`;
          const poseUploadResult = await uploadImageToAimovely(poseDataUrl, aimovelyToken, "pose");
          if (poseUploadResult?.url) {
            poseImageUrl = poseUploadResult.url;
            console.log('[Pose Control - Generate] Pose image uploaded:', poseImageUrl);
          }
        }
      } catch (uploadError) {
        console.error('[Pose Control - Generate] Image upload failed:', uploadError);
      }
    }

    // Generate images in parallel
    console.log(`[Pose Control - Generate] Generating ${numImages} image(s) in parallel...`);
    console.log(`[Pose Control - Generate] Input parameters:`);
    console.log(`  - charImageBase64 length: ${charBase64.length}`);
    console.log(`  - poseImageBase64 length: ${poseBase64.length}`);
    console.log(`  - finalPrompt length: ${finalPrompt.length}`);
    console.log(`  - finalPrompt preview: ${finalPrompt.substring(0, 100)}...`);
    console.log(`  - aspectRatio: ${aspectRatio}`);
    
    const generatePromises = Array.from({ length: numImages }, (_, i) => {
      console.log(`[Pose Control - Generate] Creating promise for image ${i + 1}/${numImages}`);
      return generateImage(charBase64, poseBase64, finalPrompt, aspectRatio);
    });

    const results = await Promise.all(generatePromises);

    // Upload all successful images to Aimovely
    const generatedImages: string[] = [];
    const generatedImageUrls: string[] = [];
    
    if (results.length === 0 || !results.some(r => r.success)) {
      const errors = results.map(r => r.error).filter(Boolean);
      return NextResponse.json(
        { error: '所有图片生成失败', details: errors },
        { status: 500 }
      );
    }

    // Process results and upload
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.success && result.imageBase64) {
        const dataUrl = `data:image/png;base64,${result.imageBase64}`;
        generatedImages.push(dataUrl);
        
        // Upload to Aimovely
        if (aimovelyToken) {
          try {
            const uploadResult = await uploadImageToAimovely(dataUrl, aimovelyToken, `output-${i + 1}`);
            if (uploadResult?.url) {
              generatedImageUrls.push(uploadResult.url);
              console.log(`[Pose Control - Generate] Image ${i + 1} uploaded:`, uploadResult.url);
            } else {
              generatedImageUrls.push('');
            }
          } catch (uploadError) {
            console.error(`[Pose Control - Generate] Image ${i + 1} upload failed:`, uploadError);
            generatedImageUrls.push('');
          }
        }
      }
    }

    console.log(`[Pose Control - Generate] Generation complete. ${generatedImages.length}/${numImages} images generated`);

    return NextResponse.json({
      images: generatedImages,
      inputImageUrl: charImageUrl,
      outputImageUrls: generatedImageUrls.length > 0 ? generatedImageUrls.filter(Boolean) : null,
    });
  } catch (error: any) {
    console.error('[Pose Control - Generate] Error:', error);
    return NextResponse.json(
      {
        error: error.message || '图片生成失败',
        details: error,
      },
      { status: 500 }
    );
  }
}

