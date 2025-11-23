import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// GET: 获取用户的全局收藏（历史记录中的收藏）
export async function GET(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    // 查询全局收藏的 task_id
    const { data: favorites, error: favoritesError } = await supabaseAdminClient
      .from("global_favorites")
      .select("task_id, created_at")
      .eq("user_id", user!.email)
      .order("created_at", { ascending: false });

    if (favoritesError) {
      console.error("Failed to fetch global favorites:", favoritesError);
      return NextResponse.json(
        { error: "获取收藏列表失败" },
        { status: 500 }
      );
    }

    // 查询对应的任务详情
    const taskIds = (favorites || []).map((f: any) => f.task_id);
    
    if (taskIds.length === 0) {
      return NextResponse.json({ favorites: [] });
    }

    const { data: tasks, error: tasksError } = await supabaseAdminClient
      .from("generation_tasks")
      .select("*")
      .in("task_id", taskIds)
      .eq("status", "completed")
      .order("task_time", { ascending: false });

    if (tasksError) {
      console.error("Failed to fetch tasks:", tasksError);
      return NextResponse.json(
        { error: "获取任务详情失败" },
        { status: 500 }
      );
    }

    // 格式化收藏数据
    const favoriteAssets = (tasks || []).map((task: any) => ({
      id: task.id,
      task_id: task.task_id,
      task_type: task.task_type,
      output_image_url: task.output_image_url,
      output_video_url: task.output_video_url,
      prompt: task.prompt,
      task_time: task.task_time,
      is_favorite: true,
    }));

    return NextResponse.json({ favorites: favoriteAssets });
  } catch (error: any) {
    console.error("Error fetching global favorites:", error);
    return NextResponse.json(
      { error: error?.message ?? "获取收藏列表失败" },
      { status: 500 }
    );
  }
}

// POST: 添加全局收藏
export async function POST(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = await request.json();
    const { task_id } = body;

    if (!task_id) {
      return NextResponse.json(
        { error: "task_id 是必填项" },
        { status: 400 }
      );
    }

    // 检查是否已收藏
    const { data: existing } = await supabaseAdminClient
      .from("global_favorites")
      .select("id")
      .eq("task_id", task_id)
      .eq("user_id", user!.email)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, message: "已收藏" });
    }

    // 添加收藏
    const { error: insertError } = await supabaseAdminClient
      .from("global_favorites")
      .insert({
        task_id,
        user_id: user!.email,
      });

    if (insertError) {
      console.error("Failed to add global favorite:", insertError);
      return NextResponse.json(
        { error: "添加收藏失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error adding global favorite:", error);
    return NextResponse.json(
      { error: error?.message ?? "添加收藏失败" },
      { status: 500 }
    );
  }
}

// DELETE: 取消全局收藏
export async function DELETE(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const task_id = searchParams.get("task_id");

    if (!task_id) {
      return NextResponse.json(
        { error: "task_id 是必填项" },
        { status: 400 }
      );
    }

    // 删除收藏
    const { error: deleteError } = await supabaseAdminClient
      .from("global_favorites")
      .delete()
      .eq("task_id", task_id)
      .eq("user_id", user!.email);

    if (deleteError) {
      console.error("Failed to remove global favorite:", deleteError);
      return NextResponse.json(
        { error: "取消收藏失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing global favorite:", error);
    return NextResponse.json(
      { error: error?.message ?? "取消收藏失败" },
      { status: 500 }
    );
  }
}

