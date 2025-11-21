import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const poseImage = formData.get('poseImage') as File;

    if (!poseImage) {
      return NextResponse.json(
        { error: 'Pose image is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    console.log('[Pose Control - Reverse] Starting pose caption generation...');

    // Convert pose image to base64
    const poseBuffer = Buffer.from(await poseImage.arrayBuffer());
    const poseBase64 = poseBuffer.toString('base64');
    const poseMimeType = poseImage.type || 'image/png';

    // Build request body
    const prompt = "反推图中人物的pose和拍摄角度。请只描述pose和拍摄角度，不要写其他的。用英文输出";
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: poseMimeType,
                data: poseBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
      ],
    };

    // Call Gemini 3 Pro to reverse engineer the pose
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
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
      console.error('[Pose Control - Reverse] API error:', errorText);
      return NextResponse.json(
        { error: `Gemini API错误: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Check for prompt feedback
    if (data.promptFeedback && data.promptFeedback.blockReason) {
      console.error('[Pose Control - Reverse] Prompt was blocked:', data.promptFeedback);
      return NextResponse.json(
        {
          error: 'API 未返回候选结果，请稍后重试',
          details: { response: data.promptFeedback },
        },
        { status: 500 }
      );
    }

    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      console.error('[Pose Control - Reverse] No candidates returned');
      return NextResponse.json(
        {
          error: 'API 未返回候选结果，请稍后重试',
          details: { response: data },
        },
        { status: 500 }
      );
    }

    const candidate = candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      console.error('[Pose Control - Reverse] No content in candidate');
      return NextResponse.json(
        {
          error: 'API 返回的内容为空',
          details: { candidate },
        },
        { status: 500 }
      );
    }

    // Extract text from response
    let poseCaption = '';
    for (const part of candidate.content.parts) {
      if (part.text) {
        poseCaption += part.text;
      }
    }

    if (!poseCaption.trim()) {
      console.error('[Pose Control - Reverse] Empty pose caption');
      return NextResponse.json(
        { error: 'Pose反推结果为空' },
        { status: 500 }
      );
    }

    console.log('[Pose Control - Reverse] Pose caption generated successfully');
    console.log('[Pose Control - Reverse] Caption preview:', poseCaption.substring(0, 200));

    return NextResponse.json({
      poseCaption: poseCaption.trim(),
    });
  } catch (error: any) {
    console.error('[Pose Control - Reverse] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Pose反推失败',
        details: error,
      },
      { status: 500 }
    );
  }
}

