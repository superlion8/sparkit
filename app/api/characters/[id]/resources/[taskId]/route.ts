import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// DELETE: 删除角色的某个资源
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    // 验证角色属于当前用户
    const { data: character } = await supabaseAdminClient
      .from("characters")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user!.id)
      .single();

    if (!character) {
      return NextResponse.json(
        { error: "角色不存在或无权限" },
        { status: 404 }
      );
    }

    // 获取任务信息（用于删除存储的文件）
    const { data: task } = await supabaseAdminClient
      .from("generation_tasks")
      .select("*")
      .eq("task_id", params.taskId)
      .eq("character_id", params.id)
      .single();

    if (!task) {
      return NextResponse.json(
        { error: "资源不存在" },
        { status: 404 }
      );
    }

    // 删除数据库记录
    const { error: deleteError } = await supabaseAdminClient
      .from("generation_tasks")
      .delete()
      .eq("task_id", params.taskId)
      .eq("character_id", params.id);

    if (deleteError) {
      console.error("[Delete Resource] Failed to delete task:", deleteError);
      return NextResponse.json(
        { error: "删除失败" },
        { status: 500 }
      );
    }

    // TODO: 如果需要，也可以删除 Aimovely 上的图片文件
    // 但这可能需要额外的 API 调用，暂时先只删除数据库记录

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Delete Resource] Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "删除资源失败" },
      { status: 500 }
    );
  }
}

