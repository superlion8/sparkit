import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

function getFilenameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const last = segments.pop();
    if (!last) {
      return `video-${Date.now()}.mp4`;
    }
    if (last.includes(".")) {
      return last;
    }
    return `${last}.mp4`;
  } catch {
    return `video-${Date.now()}.mp4`;
  }
}

export async function GET(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const targetUrl = request.nextUrl.searchParams.get("target");
  if (!targetUrl) {
    return NextResponse.json({ error: "Missing target parameter" }, { status: 400 });
  }

  try {
    const remoteResponse = await fetch(targetUrl);
    if (!remoteResponse.ok) {
      const message = await remoteResponse.text();
      return NextResponse.json(
        { error: `Failed to fetch video: ${remoteResponse.status} ${message}` },
        { status: 502 }
      );
    }

    const contentType = remoteResponse.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await remoteResponse.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${getFilenameFromUrl(targetUrl)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Video download proxy error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to download video" },
      { status: 500 }
    );
  }
}
