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
    const image = formData.get("image") as File | null;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.BFL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "BFL API key not configured" },
        { status: 500 }
      );
    }

    // Build request body
    const requestBody: any = {
      prompt,
    };

    // If image is provided, convert to base64
    if (image) {
      const buffer = await image.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      requestBody.input_image = base64;
    }

    // Call BFL API to start generation
    const response = await fetch(
      "https://api.bfl.ai/v1/flux-kontext-pro",
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "x-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("BFL API error:", error);
      return NextResponse.json(
        { error: "Failed to start generation" },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Poll for result
    const pollingUrl = data.polling_url;
    const requestId = data.id;
    
    let result = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const pollResponse = await fetch(pollingUrl, {
        headers: {
          "accept": "application/json",
          "x-key": apiKey,
        },
      });

      if (!pollResponse.ok) {
        throw new Error("Polling failed");
      }

      const pollData = await pollResponse.json();
      
      if (pollData.status === "Ready") {
        result = pollData.result;
        break;
      } else if (pollData.status === "Error") {
        throw new Error("Generation failed");
      }
      
      attempts++;
    }

    if (!result) {
      return NextResponse.json(
        { error: "Generation timeout" },
        { status: 408 }
      );
    }

    // Upload result to Aimovely
    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;

    if (!aimovelyEmail || !aimovelyVcode) {
      console.error("Aimovely credentials missing, returning original URL");
      return NextResponse.json({ 
        images: [result.sample],
        requestId 
      });
    }

    const aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
    if (!aimovelyToken) {
      console.error("Failed to get Aimovely token, returning original URL");
      return NextResponse.json({ 
        images: [result.sample],
        requestId 
      });
    }

    // Download and upload to Aimovely
    try {
      const uploadedUrl = await uploadImageToAimovely(result.sample, aimovelyToken);
      if (uploadedUrl) {
        console.log("Flux image uploaded to Aimovely:", uploadedUrl);
        return NextResponse.json({ 
          images: [uploadedUrl],
          requestId 
        });
      }
    } catch (uploadError) {
      console.error("Failed to upload to Aimovely:", uploadError);
    }

    // Fallback to original URL
    return NextResponse.json({ 
      images: [result.sample],
      requestId 
    });
  } catch (error) {
    console.error("Error in Flux generation:", error);
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
      console.error("Aimovely token request failed:", response.status);
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

async function uploadImageToAimovely(imageUrl: string, token: string): Promise<string | null> {
  try {
    // Download image from BFL URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error("Failed to download image from BFL");
      return null;
    }

    const imageBlob = await imageResponse.blob();
    const fileName = `flux-image-${Date.now()}.png`;
    const file = new File([imageBlob], fileName, { type: imageBlob.type || "image/png" });

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
      console.error("Aimovely upload failed:", response.status);
      return null;
    }

    const result = await response.json();
    if (result.code !== 0) {
      console.error("Aimovely upload API error:", result);
      return null;
    }

    return result.data?.url;
  } catch (error) {
    console.error("Error uploading to Aimovely:", error);
    return null;
  }
}
