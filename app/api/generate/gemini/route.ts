import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const images = formData.getAll("images") as File[];
    const aspectRatio = formData.get("aspectRatio") as string;

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

    // Build generation config
    const generationConfig: any = {
      responseModalities: ["IMAGE"],
    };

    // Add aspect ratio if provided
    if (aspectRatio) {
      generationConfig.imageConfig = {
        aspectRatio: aspectRatio,
      };
    }

    console.log("Generation config:", JSON.stringify(generationConfig, null, 2));

    // Call Gemini API (using image generation model)
    // 根据官方文档: https://ai.google.dev/gemini-api/docs/image-generation
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

    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;

    if (!aimovelyEmail || !aimovelyVcode) {
      console.error("Aimovely credentials missing");
      return NextResponse.json(
        { error: "Aimovely credentials not configured" },
        { status: 500 }
      );
    }

    const aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
    if (!aimovelyToken) {
      return NextResponse.json(
        { error: "Failed to acquire Aimovely token" },
        { status: 500 }
      );
    }

    const uploadedUrls: string[] = [];
    const base64Images: string[] = [];
    
    for (let index = 0; index < generatedImages.length; index++) {
      const dataUrl = generatedImages[index];
      base64Images.push(dataUrl); // Keep original base64
      
      try {
        const result = await uploadImageToAimovely(dataUrl, aimovelyToken, index);
        if (result?.url) {
          uploadedUrls.push(result.url);
        } else {
          console.warn("Upload result missing URL, keeping base64 fallback");
          uploadedUrls.push(dataUrl);
        }
      } catch (uploadError) {
        console.error("上传生成图片失败:", uploadError);
        uploadedUrls.push(dataUrl);
      }
    }

    return NextResponse.json({ 
      images: uploadedUrls,
      base64Images: base64Images // Also return base64 for client-side use
    });
  } catch (error) {
    console.error("Error in Gemini generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


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

async function uploadImageToAimovely(dataUrl: string, token: string, index: number): Promise<UploadResult | null> {
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
  const fileName = `gemini-image-${Date.now()}-${index}.${mimeType.split("/")[1] ?? "png"}`;

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
