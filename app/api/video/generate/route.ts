import { NextRequest, NextResponse } from "next/server";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

export async function POST(request: NextRequest) {
  try {
    const { generate_type, origin_resource_id } = await request.json();
    const authHeader = request.headers.get("Authorization");

    if (!generate_type || !origin_resource_id) {
      return NextResponse.json(
        { error: "generate_type and origin_resource_id are required" },
        { status: 400 }
      );
    }

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization token is required" },
        { status: 401 }
      );
    }

    console.log(`Creating video generation task for type: ${generate_type}`);
    console.log(`Origin resource ID: ${origin_resource_id}`);

    const response = await fetch(`${AIMOVELY_API_URL}/v1/task/video/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        generate_type: generate_type,
        origin_resource_id: origin_resource_id,
      }),
    });

    console.log(`AIMOVELY API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AIMOVELY video create error:", errorText);
      return NextResponse.json(
        { error: `Failed to create video generation task: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Video creation response:", data);

    if (data.code !== 0) {
      console.error(`AIMOVELY API error: code=${data.code}, msg=${data.msg}`);
      return NextResponse.json(
        { error: `API Error: ${data.msg} (code: ${data.code})` },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Error creating video generation task:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
