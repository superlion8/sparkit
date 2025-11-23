import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

export async function DELETE(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "缺少 taskId 参数" },
        { status: 400 }
      );
    }

    // 验证任务属于当前用户
    const { data: task, error: fetchError } = await supabaseAdminClient
      .from("generation_tasks")
      .select("email")
      .eq("task_id", taskId)
      .single();

    if (fetchError || !task) {
      return NextResponse.json(
        { error: "任务不存在" },
        { status: 404 }
      );
    }

    if (task.email !== user?.email) {
      return NextResponse.json(
        { error: "无权限删除此任务" },
        { status: 403 }
      );
    }

    // 删除任务
    const { error: deleteError } = await supabaseAdminClient
      .from("generation_tasks")
      .delete()
      .eq("task_id", taskId);

    if (deleteError) {
      console.error("Failed to delete task:", deleteError);
      return NextResponse.json(
        { error: "删除失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const taskType = searchParams.get("taskType") || undefined;

    const offset = (page - 1) * pageSize;

    // Build query
    let query = supabaseAdminClient
      .from("generation_tasks")
      .select("*", { count: "exact" })
      .eq("email", user?.email)
      .order("task_time", { ascending: false });

    // Filter by task type if specified
    if (taskType && taskType !== "all") {
      query = query.eq("task_type", taskType);
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Failed to fetch history:", error);
      return NextResponse.json(
        { error: "Failed to fetch history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error: any) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

