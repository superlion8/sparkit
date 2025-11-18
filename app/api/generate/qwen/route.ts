import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

// Qwen workflow configuration (base64 encoded)
const QWEN_WORKFLOW_BASE64 = Buffer.from(JSON.stringify({
  "prompt": {
    "199": {
      "inputs": {
        "shift": 3,
        "model": ["262", 0]
      },
      "class_type": "ModelSamplingAuraFlow",
      "_meta": { "title": "ModelSamplingAuraFlow" }
    },
    "200": {
      "inputs": {
        "unet_name": "Qwen_Image_Edit_2509_FP8.safetensors",
        "weight_dtype": "fp8_e4m3fn"
      },
      "class_type": "UNETLoader",
      "_meta": { "title": "Load Diffusion Model" }
    },
    "201": {
      "inputs": {
        "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
        "type": "qwen_image",
        "device": "default"
      },
      "class_type": "CLIPLoader",
      "_meta": { "title": "Load CLIP" }
    },
    "202": {
      "inputs": {
        "prompt": "",
        "clip": ["201", 0],
        "vae": ["203", 0]
      },
      "class_type": "TextEncodeQwenImageEditPlus",
      "_meta": { "title": "TextEncodeQwenImageEditPlus" }
    },
    "203": {
      "inputs": {
        "vae_name": "qwen_image_vae.safetensors"
      },
      "class_type": "VAELoader",
      "_meta": { "title": "Load VAE" }
    },
    "204": {
      "inputs": {
        "strength": 1,
        "model": ["199", 0]
      },
      "class_type": "CFGNorm",
      "_meta": { "title": "CFGNorm" }
    },
    "205": {
      "inputs": {
        "pixels": ["211", 0],
        "vae": ["203", 0]
      },
      "class_type": "VAEEncode",
      "_meta": { "title": "VAE Encode" }
    },
    "206": {
      "inputs": {
        "samples": ["213", 0],
        "vae": ["203", 0]
      },
      "class_type": "VAEDecode",
      "_meta": { "title": "VAE Decode" }
    },
    "211": {
      "inputs": {
        "upscale_method": "nearest-exact",
        "megapixels": 1,
        "image": ["269", 0]
      },
      "class_type": "ImageScaleToTotalPixels",
      "_meta": { "title": "Scale Image to Total Pixels" }
    },
    "212": {
      "inputs": {
        "lora_name": "Qwen-Image-Lightning-8steps-V1.1-bf16.safetensors",
        "strength_model": 1,
        "model": ["200", 0]
      },
      "class_type": "LoraLoaderModelOnly",
      "_meta": { "title": "LoraLoaderModelOnly" }
    },
    "213": {
      "inputs": {
        "seed": 239190065754742,
        "steps": 6,
        "cfg": 1,
        "sampler_name": "euler",
        "scheduler": "simple",
        "denoise": 1,
        "model": ["204", 0],
        "positive": ["216", 0],
        "negative": ["202", 0],
        "latent_image": ["205", 0]
      },
      "class_type": "KSampler",
      "_meta": { "title": "KSampler" }
    },
    "214": {
      "inputs": {
        "image": "6.jpg"
      },
      "class_type": "LoadImage",
      "_meta": { "title": "Load Image" }
    },
    "216": {
      "inputs": {
        "prompt": "把图中的人物换装成兔女郎装扮",
        "clip": ["201", 0],
        "vae": ["203", 0],
        "image1": ["211", 0]
      },
      "class_type": "TextEncodeQwenImageEditPlus",
      "_meta": { "title": "TextEncodeQwenImageEditPlus" }
    },
    "262": {
      "inputs": {
        "lora_name": "majicbeauty-Qwen.safetensors",
        "strength_model": 0.8,
        "model": ["212", 0]
      },
      "class_type": "LoraLoaderModelOnly",
      "_meta": { "title": "LoraLoaderModelOnly" }
    },
    "268": {
      "inputs": {
        "filename_prefix": "ComfyUI",
        "images": ["206", 0]
      },
      "class_type": "SaveImage",
      "_meta": { "title": "Save Image" }
    },
    "269": {
      "inputs": {
        "desire_size": 1024,
        "sampling_method": "bilinear",
        "base_pixel_number": 8,
        "image": ["214", 0]
      },
      "class_type": "HOXI_BasePixelResizeImage",
      "_meta": { "title": "HOXI_BasePixelResizeImage" }
    }
  },
  "meta_data": {},
  "extra_data": {
    "extra_pnginfo": {
      "workflow": {
        "id": "91f6bbe2-ed41-4fd6-bac7-71d5b5864ecb",
        "revision": 0,
        "last_node_id": 273,
        "last_link_id": 435,
        "nodes": [],
        "links": [],
        "groups": [],
        "config": {},
        "extra": {},
        "version": 0.4
      }
    }
  }
})).toString('base64');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const image = formData.get("image") as File;
    const seed = formData.get("seed") as string || "10";

    if (!prompt) {
      return NextResponse.json(
        { error: "缺少必需参数: prompt" },
        { status: 400 }
      );
    }

    if (!image) {
      return NextResponse.json(
        { error: "缺少必需参数: image" },
        { status: 400 }
      );
    }

    console.log("=== Qwen Hot Mode API ===");
    console.log("Prompt:", prompt);
    console.log("Image size:", image.size);
    console.log("Seed:", seed);

    // Convert image to base64
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const imageBase64 = imageBuffer.toString('base64');

    // Get Qwen API URL from environment variable
    const qwenApiUrl = process.env.QWEN_API_URL;
    if (!qwenApiUrl) {
      console.error("QWEN_API_URL environment variable is not set");
      return NextResponse.json(
        { error: "Qwen API 配置错误" },
        { status: 500 }
      );
    }

    // Prepare request body
    const requestBody = {
      workflow: QWEN_WORKFLOW_BASE64,
      image: imageBase64,
      prompt: prompt,
      seed: parseInt(seed),
      output_image: ""
    };

    console.log("Calling Qwen API...");
    const startTime = Date.now();

    // Call Qwen API
    const response = await fetch(qwenApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Qwen API response received (${elapsed}s), status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Qwen API error:", errorText);
      return NextResponse.json(
        { error: `Qwen API 错误: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Qwen API response:", {
      code: data.code,
      hasImage: !!data.data?.image,
      imageLength: data.data?.image?.length || 0
    });

    if (data.code !== 0) {
      console.error("Qwen API returned error code:", data.code);
      return NextResponse.json(
        { error: `Qwen API 返回错误代码: ${data.code}` },
        { status: 500 }
      );
    }

    if (!data.data?.image) {
      console.error("No image in Qwen API response");
      return NextResponse.json(
        { error: "Qwen API 未返回图片" },
        { status: 500 }
      );
    }

    // Return the generated image as data URL
    const generatedImageDataUrl = `data:image/png;base64,${data.data.image}`;

    console.log(`Successfully generated image with Qwen (total time: ${elapsed}s)`);

    return NextResponse.json({
      images: [generatedImageDataUrl],
      message: "成功生成图片"
    });

  } catch (error: any) {
    console.error("Error in Qwen API route:", error);
    return NextResponse.json(
      {
        error: error.message || "生成图片失败",
        details: error.stack
      },
      { status: 500 }
    );
  }
}

