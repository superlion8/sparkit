import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AIMOVELY_API_URL = "https://dev.aimovely.com";

// OPTIONS method for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// Helper to upload to Aimovely
async function uploadToAimovely(base64Image: string, mimeType: string = "image/png"): Promise<string | null> {
    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;

  if (!aimovelyEmail || !aimovelyVcode) return null;

  try {
    // 1. Get Token
    const tokenRes = await fetch(`${AIMOVELY_API_URL}/v1/user/verifyvcode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: aimovelyEmail, vcode: aimovelyVcode }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.code !== 0 || !tokenData.data?.access_token) return null;
    const token = tokenData.data.access_token;

    // 2. Upload
    const buffer = Buffer.from(base64Image, "base64");
    const fileName = `mimic-${Date.now()}.png`;
    const file = new File([buffer], fileName, { type: mimeType });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("biz", "external_tool");
    formData.append("template_id", "1");

    const uploadRes = await fetch(`${AIMOVELY_API_URL}/v1/resource/upload`, {
      method: "POST",
      headers: { Authorization: token },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    
    if (uploadData.code === 0 && uploadData.data?.url) {
      return uploadData.data.url;
    }
    return null;
  } catch (e) {
    console.error("Aimovely upload failed:", e);
    return null;
  }
}

// Helper to call Gemini
async function callGemini(model: string, contents: any[], generationConfig: any = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
      method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents, generationConfig }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API Error (${model}): ${response.status} - ${text}`);
  }

  return await response.json();
}

export async function POST(request: NextRequest) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // 1. Auth Check
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    // Clone the error response to add headers
    const response = new NextResponse(errorResponse.body, {
      status: errorResponse.status,
      statusText: errorResponse.statusText,
      headers: errorResponse.headers
    });
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  try {
    const { reference_image, character_id, keep_background } = await request.json();

    if (!reference_image || !character_id) {
      const response = NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    }

    console.log(`[Mimic] Starting for CharID: ${character_id}, KeepBG: ${keep_background}`);

    // 2. Fetch Character Details
    const { data: character, error: charError } = await supabaseAdminClient
      .from("characters")
      .select("*")
      .eq("id", character_id)
      .single();

    if (charError || !character) {
      const response = NextResponse.json({ error: "Character not found" }, { status: 404 });
      Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    }

    // Helper to fetch image as base64
    const fetchImageAsBase64 = async (url: string) => {
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer).toString("base64");
    };

    const refImageBase64 = reference_image.startsWith("data:") 
      ? reference_image.split(",")[1] 
      : await fetchImageAsBase64(reference_image);

    const charAvatarBase64 = await fetchImageAsBase64(character.char_avatar);
    const charImageBase64 = character.char_image ? await fetchImageAsBase64(character.char_image) : null;

    // 3. Workflow Step A: Captioning (Reference Image -> Text)
    console.log("[Mimic] Step A: Captioning...");
    const captionPromptResult = await callGemini("gemini-3-pro", [{
      parts: [
        { text: "Describe the scene, composition, lighting, and background of this image in detail. Do not describe the person's identity, just the visual vibe." },
        { inlineData: { mimeType: "image/jpeg", data: refImageBase64 } }
      ]
    }]);
    const captionPrompt = captionPromptResult.candidates?.[0]?.content?.parts?.[0]?.text || "A photo";
    console.log("[Mimic] Caption:", captionPrompt.substring(0, 50) + "...");

    // 4. Workflow Step B: Background Removal (Optional)
    let backgroundImageBase64 = null;
    if (keep_background) {
      console.log("[Mimic] Step B: Generating Background (Removing Person)...");
      // Note: Using image generation model for editing/inpainting as requested
      // In a real scenario, this might require a specific 'edit' endpoint or prompt structure
      const bgResult = await callGemini("gemini-3-pro-image-preview", [{
        parts: [
          { text: "Remove the person from this image. Keep the background exactly the same. Output only the background." },
          { inlineData: { mimeType: "image/jpeg", data: refImageBase64 } }
        ]
      }], { responseModalities: ["IMAGE"] });
      
      // Extract image from response
      const bgPart = bgResult.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      if (bgPart) {
        backgroundImageBase64 = bgPart.inlineData.data;
      } else {
        console.warn("[Mimic] Failed to generate background, proceeding without it.");
      }
    }

    // 5. Workflow Step C: Final Generation
    console.log("[Mimic] Step C: Final Generation...");
    
    const finalPromptText = `take autentic photo of the character, use instagram friendly composition. Shot on the character should have identical face, features, skin tone, hairstyle, body proportions, and vibe. 

characters are shown in images provided. ${backgroundImageBase64 ? "background is provided in image." : ""}

scene setup: ${captionPrompt}

negatives: beauty-filter/airbrushed skin; poreless look, exaggerated or distorted anatomy, fake portrait-mode blur, CGI/illustration look`;

    const finalInputs = [
      { text: finalPromptText },
      { inlineData: { mimeType: "image/jpeg", data: charAvatarBase64 } },
    ];
    
    if (charImageBase64) {
      finalInputs.push({ inlineData: { mimeType: "image/jpeg", data: charImageBase64 } });
    }
    
    if (backgroundImageBase64) {
      finalInputs.push({ inlineData: { mimeType: "image/png", data: backgroundImageBase64 } });
    }

    // Generate 2 images
    const finalResult = await callGemini("gemini-3-pro-image-preview", [{
      parts: finalInputs
    }], { 
    responseModalities: ["IMAGE"],
      candidateCount: 2 
    });

    // Process Results
    const generatedImages = [];
    const candidates = finalResult.candidates || [];
    
    for (const candidate of candidates) {
      const part = candidate.content?.parts?.find((p: any) => p.inlineData);
      if (part) {
        const base64 = part.inlineData.data;
        // Upload to Aimovely for persistence
        const url = await uploadToAimovely(base64);
        if (url) {
          generatedImages.push(url);
          
          // 6. Save to Database (generation_tasks)
          await supabaseAdminClient.from("generation_tasks").insert({
            task_id: `mimic-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            character_id: character_id,
            user_id: user?.id, // Assuming table has user_id or it's derived
            task_type: "mimic",
            output_image_url: url,
            prompt: finalPromptText,
            task_time: new Date().toISOString(),
            status: "success"
          });
        }
      }
    }

    const response = NextResponse.json({ 
      success: true, 
      images: generatedImages,
      caption: captionPrompt 
    });
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
    return response;

  } catch (error: any) {
    console.error("[Mimic] Error:", error);
    const response = NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }
}
