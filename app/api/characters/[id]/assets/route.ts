import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// GET: 获取 character 的所有 assets（图片和视频）
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

    // 从 generation_tasks 表中查询该角色的所有生成内容
    // 只返回 completed 状态的任务，pending/processing/failed 任务通过单独的 API 获取
    const { data: tasks, error: tasksError } = await supabaseAdminClient
      .from("generation_tasks")
      .select("*")
      .eq("character_id", params.id)
      .eq("status", "completed")  // 🆕 只返回已完成的任务
      .order("task_time", { ascending: false });

    if (tasksError) {
      console.error("Failed to fetch assets:", tasksError);
      return NextResponse.json(
        { error: "获取资源列表失败" },
        { status: 500 }
      );
    }

    // 格式化 assets 数据
    const assets = (tasks || []).map((task) => ({
      id: task.id,
      task_id: task.task_id,
      task_type: task.task_type,
      output_image_url: task.output_image_url,
      output_video_url: task.output_video_url,
      prompt: task.prompt,
      task_time: task.task_time,
      is_favorite: false, // 需要从 favorites 表查询
    }));

    // 查询收藏状态
    const { data: favorites } = await supabaseAdminClient
      .from("character_favorites")
      .select("task_id")
      .eq("character_id", params.id)
      .eq("user_id", user!.id);

    const favoriteTaskIds = new Set((favorites || []).map((f) => f.task_id));
    
    const assetsWithFavorites = assets.map((asset) => ({
      ...asset,
      is_favorite: favoriteTaskIds.has(asset.task_id),
    }));

    return NextResponse.json({ assets: assetsWithFavorites });
  } catch (error: any) {
    console.error("Error fetching assets:", error);
    return NextResponse.json(
      { error: error?.message ?? "获取资源列表失败" },
      { status: 500 }
    );
  }
}

