import { NextRequest, NextResponse } from "next/server";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

export async function POST(request: NextRequest) {
  try {
    const { category_id } = await request.json();
    const authHeader = request.headers.get("Authorization");

    if (!category_id) {
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization token is required" },
        { status: 401 }
      );
    }

    console.log(`Fetching templates for category: ${category_id}`);

    const response = await fetch(`${AIMOVELY_API_URL}/v1/feeds/template_list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        category_id: category_id,
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
