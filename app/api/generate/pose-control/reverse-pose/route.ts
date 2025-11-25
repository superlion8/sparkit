import { NextRequest, NextResponse } from 'next/server';
import { getVertexAIClient } from '@/lib/vertexai';
import { HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

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

    console.log('[Pose Control - Reverse] Starting pose caption generation (Vertex AI SDK)...');

    // Convert pose image to base64
    const poseBuffer = Buffer.from(await poseImage.arrayBuffer());
    const poseBase64 = poseBuffer.toString('base64');
    const poseMimeType = poseImage.type || 'image/png';

    // Build request body
    const prompt = "反推图中人物的pose和拍摄角度。请只描述pose和拍摄角度，不要写其他的。用英文输出";

    const parts: any[] = [
      {
        inlineData: {
          mimeType: poseMimeType,
          data: poseBase64,
        },
      },
      {
        text: prompt,
      },
    ];

    // Call Vertex AI SDK using gemini-3-pro-preview model
    const modelId = "gemini-3-pro-preview";
    console.log(`[Pose Control - Reverse] 使用模型: ${modelId} (Vertex AI SDK)`);

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
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });

    // Check for prompt feedback
    const promptFeedback = response.response.promptFeedback;
    if (promptFeedback && (promptFeedback as any).blockReason) {
      console.error('[Pose Control - Reverse] Prompt was blocked:', promptFeedback);
      return NextResponse.json(
        {
          error: 'API 未返回候选结果，请稍后重试',
          details: { response: promptFeedback },
        },
        { status: 500 }
      );
    }

    const candidates = response.response.candidates;
    if (!candidates || candidates.length === 0) {
      console.error('[Pose Control - Reverse] No candidates returned');
      return NextResponse.json(
        {
          error: 'API 未返回候选结果，请稍后重试',
          details: { response: response.response },
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
      if ((part as any).text) {
        poseCaption += (part as any).text;
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

