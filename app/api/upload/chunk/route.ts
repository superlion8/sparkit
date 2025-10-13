import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const chunk = formData.get("chunk") as File;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string);
    const totalChunks = parseInt(formData.get("totalChunks") as string);
    const fileName = formData.get("fileName") as string;
    const fileType = formData.get("fileType") as string;

    if (!chunk || chunkIndex === undefined || totalChunks === undefined) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // 将分片转换为 base64 存储（临时方案）
    const buffer = await chunk.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    
    // 在实际应用中，这里应该存储到临时存储或直接上传到 RunningHub
    // 目前我们返回分片信息，由前端重新组装
    return NextResponse.json({
      success: true,
      chunkIndex,
      chunkSize: chunk.size,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} received`
    });

  } catch (error: any) {
    console.error("Chunk upload error:", error);
    return NextResponse.json(
      { error: error.message || "Chunk upload failed" },
      { status: 500 }
    );
  }
}
