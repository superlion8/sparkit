import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { logGenerationTask, TaskLogPayload } from "@/lib/tasks";

export async function POST(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = (await request.json()) as TaskLogPayload;

    if (!body.task_id || !body.task_type) {
      return NextResponse.json(
        { error: "task_id and task_type are required" },
        { status: 400 }
      );
    }

    const payload: TaskLogPayload = {
      ...body,
      username: body.username ?? (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? null,
      email: body.email ?? user?.email ?? null,
      task_time: body.task_time ?? new Date().toISOString(),
    };

    await logGenerationTask(payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to log generation task:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to log generation task" },
      { status: 500 }
    );
  }
}
