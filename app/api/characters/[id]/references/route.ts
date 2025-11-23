import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// GET: 获取角色的所有参考图
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // 获取参考图列表
    const { data: references, error } = await supabaseAdminClient
      .from("character_references")
      .select("*")
      .eq("character_id", params.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Get References] Error:", error);
      return NextResponse.json(
        { error: "获取参考图列表失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ references: references || [] });
  } catch (error: any) {
    console.error("[Get References] Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "获取参考图列表失败" },
      { status: 500 }
    );
  }
}

