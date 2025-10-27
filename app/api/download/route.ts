import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy download endpoint for external resources
 * Bypasses CORS restrictions by downloading on server-side
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      console.error("Download proxy: Missing URL parameter");
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    console.log("Proxying download for:", url);

    // Fetch the resource from the external URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DownloadProxy/1.0)',
      }
    });

    console.log("External fetch response:", {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
      url: response.url
    });

    if (!response.ok) {
      console.error("Failed to fetch resource:", {
        status: response.status,
        statusText: response.statusText,
        url
      });
      return NextResponse.json(
        { error: `Failed to fetch resource: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the content type
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    
    // Stream the response
    const blob = await response.blob();
    
    console.log("Successfully proxied download:", {
      blobSize: blob.size,
      contentType,
      originalUrl: url
    });
    
    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "attachment",
        "Cache-Control": "public, max-age=31536000",
      },
    });

  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

