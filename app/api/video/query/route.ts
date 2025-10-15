import { NextRequest, NextResponse } from "next/server";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

export async function POST(request: NextRequest) {
  try {
    const { task_id } = await request.json();
    const authHeader = request.headers.get("Authorization");

    if (!task_id) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization token is required" },
        { status: 401 }
      );
    }

    console.log(`Querying task status: ${task_id}`);

    const response = await fetch(`${AIMOVELY_API_URL}/v1/task/video/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        task_id: task_id,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AIMOVELY task query error:", errorText);
      return NextResponse.json(
        { error: "Failed to query task status" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Task query response:", data);

    if (data.code !== 0) {
      return NextResponse.json(
        { error: data.msg || "Failed to query task status" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Error querying task status:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
