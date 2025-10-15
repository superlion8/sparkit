import { NextRequest, NextResponse } from "next/server";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const authHeader = request.headers.get("Authorization");

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!authHeader) {
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
    uploadFormData.append("file", file);

    const response = await fetch(`${AIMOVELY_API_URL}/v1/resource/upload`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
      },
      body: uploadFormData,
    });

    console.log(`Aimovely upload response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Aimovely upload error:", errorText);
      return NextResponse.json(
        { error: `Failed to upload image: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Aimovely upload response:", data);

    if (data.code !== 0) {
      console.error(`Aimovely upload API error: code=${data.code}, msg=${data.msg}`);
      return NextResponse.json(
        { error: `Upload failed: ${data.msg} (code: ${data.code})` },
        { status: 500 }
      );
    }

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
