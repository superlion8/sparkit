import { NextRequest, NextResponse } from "next/server";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

export async function POST(request: NextRequest) {
  try {
    console.log("=== Resource Upload API Called ===");
    
    const formData = await request.formData();
    console.log("FormData received");
    
    const file = formData.get("file") as File;
    console.log("File from formData:", file ? `name=${file.name}, size=${file.size}, type=${file.type}` : "null");
    console.log("File object type:", typeof file);
    console.log("File constructor:", file?.constructor?.name);
    console.log("File instanceof File:", file instanceof File);
    
    const authHeader = request.headers.get("Authorization");
    console.log("Auth header:", authHeader ? "present" : "missing");

    if (!file) {
      console.error("No file provided in request");
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!authHeader) {
      console.error("No Authorization header provided");
      return NextResponse.json(
        { error: "Authorization token is required" },
        { status: 401 }
      );
    }

    // 检查文件类型
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // 检查文件大小 (限制为 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 413 }
      );
    }

    console.log(`Uploading image to Aimovely: ${file.name}, size: ${file.size} bytes`);

    // 创建FormData用于上传到Aimovely
    const uploadFormData = new FormData();
    // 确保文件对象正确传递
    uploadFormData.append("file", file, file.name);
    // 添加业务类型参数
    uploadFormData.append("biz", "img2video");
    
    console.log("Created FormData for Aimovely upload");
    console.log("FormData entries:");
    // 使用 Array.from 来兼容 TypeScript 编译目标
    const entries = Array.from(uploadFormData.entries());
    for (const [key, value] of entries) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
    console.log("Uploading to:", `${AIMOVELY_API_URL}/v1/resource/upload`);
    console.log("Auth token:", authHeader.substring(0, 20) + "...");

    const response = await fetch(`${AIMOVELY_API_URL}/v1/resource/upload`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
      },
      body: uploadFormData,
    });

    console.log(`Aimovely upload response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Aimovely upload error:", errorText);
      return NextResponse.json(
        { error: `Failed to upload image: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Aimovely upload response:", JSON.stringify(data, null, 2));

    if (data.code !== 0) {
      console.error(`Aimovely upload API error: code=${data.code}, msg=${data.msg}`);
      console.error("Full response data:", data);
      return NextResponse.json(
        { error: `Upload failed: ${data.msg} (code: ${data.code})` },
        { status: 500 }
      );
    }

    console.log("Upload successful, returning:", {
      url: data.data.url,
      resource_id: data.data.resource_id,
      biz: data.data.biz,
    });

    return NextResponse.json({
      url: data.data.url,
      resource_id: data.data.resource_id,
      biz: data.data.biz,
    });

  } catch (error: any) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
