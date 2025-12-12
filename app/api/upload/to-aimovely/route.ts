import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { getAimovelyCredentials, uploadImageWithFallback } from "@/lib/upload";

/**
 * Upload image to Aimovely (with Supabase Storage fallback) and return the URL
 * This is used for images that need to be used as input for other services
 */
export async function POST(request: NextRequest) {
  console.log("=== Upload to Aimovely API Called ===");
  
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    console.error("认证失败");
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    console.log("收到文件:", file ? `name=${file.name}, size=${file.size}, type=${file.type}` : "null");

    if (!file) {
      return NextResponse.json(
        { error: "需要提供文件" },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "文件必须是图片" },
        { status: 400 }
      );
    }

    // Check file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "文件太大，最大支持 10MB" },
        { status: 413 }
      );
    }

    // Convert file to data URL
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Get Aimovely credentials
    const credentials = await getAimovelyCredentials();

    // Upload with fallback to Supabase Storage
    const result = await uploadImageWithFallback(
      dataUrl,
      credentials?.token || null,
      "upload-api"
    );

    if (!result) {
      console.error("上传失败：Aimovely 和 Supabase Storage 都失败了");
      return NextResponse.json(
        { error: "上传失败" },
        { status: 500 }
      );
    }

    console.log("上传成功:", result.url, `(${result.source})`);
    return NextResponse.json({
      url: result.url,
      resource_id: result.resource_id,
      source: result.source,
    });

  } catch (error: any) {
    console.error("上传图片错误:", error);
    console.error("错误堆栈:", error.stack);
    return NextResponse.json(
      { error: error.message || "服务器内部错误" },
      { status: 500 }
    );
  }
}
