import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
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

    console.log(`Uploading image: ${file.name}, size: ${file.size} bytes`);

    // 这里我们使用一个临时的上传服务
    // 在实际应用中，您可能需要使用 AWS S3、Cloudinary 或其他云存储服务
    
    // 为了演示，我们创建一个临时的数据URL
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;
    
    // 在实际应用中，您应该上传到真实的存储服务并返回真实的URL
    const imageUrl = `https://temp-storage.example.com/images/${Date.now()}-${file.name}`;
    
    console.log(`Image uploaded successfully: ${imageUrl}`);

    return NextResponse.json({
      url: imageUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    });

  } catch (error: any) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
