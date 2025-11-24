import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// GET: 获取 character 的所有收藏
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    // 验证 character 属于当前用户
    const { data: character, error: charError } = await supabaseAdminClient
      .from("characters")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user!.id)
      .single();

    if (charError || !character) {
      return NextResponse.json(
        { error: "角色不存在" },
        { status: 404 }
      );
    }

    // 查询收藏的 tasks
    const { data: favorites, error: favoritesError } = await supabaseAdminClient
      .from("character_favorites")
      .select("task_id")
      .eq("character_id", params.id)
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (favoritesError) {
      console.error("Failed to fetch favorites:", favoritesError);
      return NextResponse.json(
        { error: "获取收藏列表失败" },
        { status: 500 }
      );
    }

    // 根据 task_id 查询对应的任务详情
    const taskIds = (favorites || []).map((f: any) => f.task_id);
    
    if (taskIds.length === 0) {
      return NextResponse.json({ favorites: [] });
    }

    const { data: tasks, error: tasksError } = await supabaseAdminClient
      .from("generation_tasks")
      .select("*")
      .in("task_id", taskIds)
      .eq("status", "completed")  // 🆕 只返回已完成的任务
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
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: error?.message ?? "获取收藏列表失败" },
      { status: 500 }
    );
  }
}

// POST: 添加收藏
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const body = await request.json();
    const { task_id, image_url } = body;

    if (!task_id) {
      return NextResponse.json(
        { error: "task_id 是必填项" },
        { status: 400 }
      );
    }

    // 验证 character 属于当前用户
    const { data: character, error: charError } = await supabaseAdminClient
      .from("characters")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user!.id)
      .single();

    if (charError || !character) {
      return NextResponse.json(
        { error: "角色不存在" },
        { status: 404 }
      );
    }

    // 检查是否已收藏（考虑 image_url）
    let query = supabaseAdminClient
      .from("character_favorites")
      .select("id")
      .eq("character_id", params.id)
      .eq("task_id", task_id)
      .eq("user_id", user!.id);

    if (image_url) {
      query = query.eq("image_url", image_url);
    } else {
      query = query.is("image_url", null);
    }

    const { data: existing } = await query.single();

    if (existing) {
      return NextResponse.json({ success: true, message: "已收藏" });
    }

    // 添加收藏
    const { error: insertError } = await supabaseAdminClient
      .from("character_favorites")
      .insert({
        character_id: params.id,
        task_id,
        user_id: user!.id,
        image_url: image_url || null,
      });

    if (insertError) {
      console.error("Failed to add favorite:", insertError);
      return NextResponse.json(
        { error: "添加收藏失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error adding favorite:", error);
    return NextResponse.json(
      { error: error?.message ?? "添加收藏失败" },
      { status: 500 }
    );
  }
}

// DELETE: 取消收藏
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .from("character_favorites")
      .delete()
      .eq("character_id", params.id)
      .eq("task_id", task_id)
      .eq("user_id", user!.id);

    if (deleteError) {
      console.error("Failed to remove favorite:", deleteError);
      return NextResponse.json(
        { error: "取消收藏失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing favorite:", error);
    return NextResponse.json(
      { error: error?.message ?? "取消收藏失败" },
      { status: 500 }
    );
  }
}

