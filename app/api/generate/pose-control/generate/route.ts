import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

async function uploadImageToAimovely(
  imageBase64: string,
  accessToken: string,
  retryCount = 0
): Promise<string | null> {
  const maxRetries = 1;
  
  try {
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;
    
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer], { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', blob, `pose-control-${Date.now()}.png`);

    console.log(`[Pose Control - Upload] Attempting upload (try ${retryCount + 1}/${maxRetries + 1})...`);

    const uploadResponse = await fetch(
      'https://aimovely.com/api/system/file/upload',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`[Pose Control - Upload] Upload failed (${uploadResponse.status}):`, errorText);
      
      if (uploadResponse.status === 401 && retryCount < maxRetries) {
        console.log('[Pose Control - Upload] Token expired, refreshing...');
        const refreshResponse = await fetch(
          'https://aimovely.com/api/user/refresh',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.code === 0 && refreshData.data?.accessToken) {
            console.log('[Pose Control - Upload] Token refreshed, retrying upload...');
            return uploadImageToAimovely(imageBase64, refreshData.data.accessToken, retryCount + 1);
          }
        }
      }
      
      return null;
    }

    const uploadData = await uploadResponse.json();
    if (uploadData.code === 0 && uploadData.data?.url) {
      console.log('[Pose Control - Upload] Upload successful');
      return uploadData.data.url;
    } else {
      console.error('[Pose Control - Upload] Unexpected response:', uploadData);
      return null;
    }
  } catch (error) {
    console.error('[Pose Control - Upload] Error:', error);
    return null;
  }
}

async function generateImage(
  charImageBase64: string,
  finalPrompt: string,
  aspectRatio: string
): Promise<{ success: boolean; imageBase64?: string; error?: string }> {
  try {
    const charMimeType = 'image/png';
    
    const generationConfig: any = {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: 'text/plain',
      responseModalities: ['IMAGE'],
    };

    // Only add aspectRatio if it's not "default"
    if (aspectRatio && aspectRatio !== 'default') {
      generationConfig.imageConfig = {
        aspectRatio,
      };
    }

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: charMimeType,
                data: charImageBase64,
              },
            },
            {
              text: finalPrompt,
            },
          ],
        },
      ],
      generationConfig,
    };

    console.log('[Pose Control - Generate] Calling Gemini API...');
    console.log('[Pose Control - Generate] Aspect ratio:', aspectRatio);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Pose Control - Generate] API key not configured');
      return { success: false, error: 'Gemini API key not configured' };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Pose Control - Generate] API error:', errorText);
      return { success: false, error: `Gemini API错误: ${response.status}` };
    }

    const data = await response.json();

    // Check for prompt feedback
    if (data.promptFeedback && data.promptFeedback.blockReason) {
      console.error('[Pose Control - Generate] Prompt was blocked:', data.promptFeedback);
      return { 
        success: false, 
        error: `图片生成被阻止: ${data.promptFeedback.blockReason}` 
      };
    }

    if (!data.candidates || data.candidates.length === 0) {
      console.error('[Pose Control - Generate] No candidates returned');
      return { success: false, error: 'API未返回图片结果' };
    }

    const candidate = data.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      console.error('[Pose Control - Generate] No content in candidate');
      return { success: false, error: 'API返回内容为空' };
    }

    // Extract image from response
    let imageBase64 = '';
    for (const part of candidate.content.parts) {
      if (part.inline_data && part.inline_data.data) {
        imageBase64 = part.inline_data.data;
        break;
      }
    }

    if (!imageBase64) {
      console.error('[Pose Control - Generate] No image data in response');
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
    const finalPrompt = formData.get('finalPrompt') as string;
    const numImages = parseInt(formData.get('numImages') as string) || 1;
    const aspectRatio = formData.get('aspectRatio') as string || 'default';
    const accessToken = formData.get('accessToken') as string;

    if (!charImage || !finalPrompt) {
      return NextResponse.json(
        { error: 'Character image and final prompt are required' },
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

    // Convert char image to base64
    const charBuffer = Buffer.from(await charImage.arrayBuffer());
    const charBase64 = charBuffer.toString('base64');

    // Upload char image to Aimovely
    let charImageUrl: string | null = null;
    if (accessToken) {
      console.log('[Pose Control - Generate] Uploading character image...');
      charImageUrl = await uploadImageToAimovely(`data:image/png;base64,${charBase64}`, accessToken);
      if (charImageUrl) {
        console.log('[Pose Control - Generate] Character image uploaded:', charImageUrl);
      } else {
        console.warn('[Pose Control - Generate] Character image upload failed, continuing without URL');
      }
    }

    // Generate images in parallel
    console.log(`[Pose Control - Generate] Generating ${numImages} image(s) in parallel...`);
    const generatePromises = Array.from({ length: numImages }, (_, i) => 
      generateImage(charBase64, finalPrompt, aspectRatio)
    );

    const results = await Promise.all(generatePromises);

    // Upload all successful images to Aimovely
    const generatedImages: string[] = [];
    const uploadPromises: Promise<string | null>[] = [];
    
    results.forEach((result, index) => {
      if (result.success && result.imageBase64) {
        generatedImages.push(`data:image/png;base64,${result.imageBase64}`);
        if (accessToken) {
          uploadPromises.push(
            uploadImageToAimovely(`data:image/png;base64,${result.imageBase64}`, accessToken)
          );
        }
      }
    });

    if (generatedImages.length === 0) {
      const errors = results.map(r => r.error).filter(Boolean);
      return NextResponse.json(
        { error: '所有图片生成失败', details: errors },
        { status: 500 }
      );
    }

    let generatedImageUrls: (string | null)[] = [];
    if (accessToken && uploadPromises.length > 0) {
      console.log(`[Pose Control - Generate] Uploading ${uploadPromises.length} generated image(s)...`);
      generatedImageUrls = await Promise.all(uploadPromises);
      console.log('[Pose Control - Generate] Upload results:', generatedImageUrls.filter(Boolean).length, 'succeeded');
    }

    console.log(`[Pose Control - Generate] Generation complete. ${generatedImages.length}/${numImages} images generated`);

    return NextResponse.json({
      images: generatedImages,
      inputImageUrl: charImageUrl,
      outputImageUrls: generatedImageUrls.filter(Boolean),
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

