import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { category_id, index = 0, size = 20, page_info = "" } = await request.json();
    const aimovelyToken = request.headers.get("X-Aimovely-Token");

    if (!category_id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    if (!aimovelyToken) {
      return NextResponse.json(
        { error: "Aimovely token is required" },
        { status: 401 }
      );
    }

    console.log(`Fetching templates for category: ${category_id} index=${index} size=${size}`);

    const response = await fetch(`${AIMOVELY_API_URL}/v1/feeds/template/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": aimovelyToken,
      },
      body: JSON.stringify({
        category_id: category_id,
        index,
        size,
        page_info,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AIMOVELY template list error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch templates" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Template list response:", data);

    if (data.code !== 0) {
      return NextResponse.json(
        { error: data.msg || "Failed to fetch templates" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
