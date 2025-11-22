import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// GET: 获取单个 character 详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { data, error } = await supabaseAdminClient
      .from("characters")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user!.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "角色不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ character: data });
  } catch (error: any) {
    console.error("Error fetching character:", error);
    return NextResponse.json(
      { error: error?.message ?? "获取角色详情失败" },
      { status: 500 }
    );
  }
}

// DELETE: 删除 character
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    // 先获取 character 信息（用于删除存储的文件）
    const { data: character, error: fetchError } = await supabaseAdminClient
      .from("characters")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user!.id)
      .single();

    if (fetchError || !character) {
      return NextResponse.json(
        { error: "角色不存在" },
        { status: 404 }
      );
    }

    // 删除存储的文件
    if (character.char_avatar) {
      const avatarPath = character.char_avatar.split("/character-assets/")[1];
      if (avatarPath) {
        await supabaseAdminClient.storage
          .from("character-assets")
          .remove([avatarPath]);
      }
    }

    if (character.char_image) {
      const imagePath = character.char_image.split("/character-assets/")[1];
      if (imagePath) {
        await supabaseAdminClient.storage
          .from("character-assets")
          .remove([imagePath]);
      }
    }

    // 删除 character 记录
    const { error: deleteError } = await supabaseAdminClient
      .from("characters")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user!.id);

    if (deleteError) {
      console.error("Failed to delete character:", deleteError);
      return NextResponse.json(
        { error: "删除角色失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting character:", error);
    return NextResponse.json(
      { error: error?.message ?? "删除角色失败" },
      { status: 500 }
    );
  }
}

