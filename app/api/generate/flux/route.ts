import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

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

