import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// DELETE: 删除参考图
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; referenceId: string } }
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

    // 删除参考图记录
    const { error: deleteError } = await supabaseAdminClient
      .from("character_references")
      .delete()
      .eq("id", params.referenceId)
      .eq("character_id", params.id);

    if (deleteError) {
      console.error("[Delete Reference] Failed:", deleteError);
      return NextResponse.json(
        { error: "删除失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Delete Reference] Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "删除参考图失败" },
      { status: 500 }
    );
  }
}

