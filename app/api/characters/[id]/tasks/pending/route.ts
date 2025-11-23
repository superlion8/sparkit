import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// GET: 获取角色的进行中任务（pending + processing）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { id: characterId } = params;

    // 验证角色属于当前用户
    const { data: character } = await supabaseAdminClient
      .from("characters")
      .select("id")
      .eq("id", characterId)
      .eq("user_id", user!.id)
      .single();

    if (!character) {
      return NextResponse.json(
        { error: "角色不存在或无权限" },
        { status: 404 }
      );
    }

    // 获取进行中的任务（pending, processing, failed）
    const { data: pendingTasks, error } = await supabaseAdminClient
      .from("generation_tasks")
      .select("*")
      .eq("character_id", characterId)
      .eq("email", user!.email)
      .in("status", ["pending", "processing", "failed"])
      .order("started_at", { ascending: false });

    if (error) {
      console.error("[Get Pending Tasks] Error:", error);
      return NextResponse.json(
        { error: "获取进行中任务失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      pendingTasks: pendingTasks || [],
      count: (pendingTasks || []).length
    });
  } catch (error: any) {
    console.error("[Get Pending Tasks] Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "获取进行中任务失败" },
      { status: 500 }
    );
  }
}

