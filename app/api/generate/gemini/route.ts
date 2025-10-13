import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const images = formData.getAll("images") as File[];

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
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

    // Convert images to base64 if provided
    const imageParts = await Promise.all(
      images.map(async (image) => {
        const buffer = await image.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        return {
          inlineData: {
            mimeType: image.type,
            data: base64,
          },
        };
      })
    );

    // Build request body
    const contents = [
      {
        parts: [
          { text: prompt },
          ...imageParts,
        ],
      },
    ];

    // Call Gemini API (using image generation model)
    // 根据官方文档: https://ai.google.dev/gemini-api/docs/image-generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contents }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API error:", error);
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Gemini API 响应:", JSON.stringify(data, null, 2));
    
    // Extract generated images
    const generatedImages: string[] = [];
    if (data.candidates && data.candidates.length > 0) {
      console.log("找到 candidates:", data.candidates.length);
      for (const candidate of data.candidates) {
        if (candidate.content && candidate.content.parts) {
          console.log("处理 parts:", candidate.content.parts.length);
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              console.log("找到图片数据, mimeType:", part.inlineData.mimeType);
              // Convert to data URL
              const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              generatedImages.push(dataUrl);
            } else if (part.text) {
              console.log("文本内容:", part.text);
            }
          }
        }
      }
    } else {
      console.log("没有 candidates 或为空");
    }

    console.log("生成的图片数量:", generatedImages.length);
    return NextResponse.json({ images: generatedImages });
  } catch (error) {
    console.error("Error in Gemini generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

