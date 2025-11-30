import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// GET: 获取单个服饰详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; outfitId: string } }
) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { data: outfit, error } = await supabaseAdminClient
      .from("character_outfits")
      .select("*")
      .eq("id", params.outfitId)
      .eq("character_id", params.id)
      .eq("user_id", user!.id)
      .single();

    if (error || !outfit) {
      return NextResponse.json(
        { error: "服饰不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ outfit });
  } catch (error: any) {
    console.error("Error fetching outfit:", error);
    return NextResponse.json(
      { error: error?.message ?? "获取服饰详情失败" },
      { status: 500 }
    );
  }
}

// PATCH: 更新服饰信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; outfitId: string } }
) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    // 验证服饰存在且属于当前用户
    const { data: existingOutfit, error: fetchError } = await supabaseAdminClient
      .from("character_outfits")
      .select("*")
      .eq("id", params.outfitId)
      .eq("character_id", params.id)
      .eq("user_id", user!.id)
      .single();

    if (fetchError || !existingOutfit) {
      return NextResponse.json(
        { error: "服饰不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.outfit_name !== undefined) {
      updates.outfit_name = body.outfit_name.trim();
    }
    if (body.outfit_type !== undefined) {
      updates.outfit_type = body.outfit_type;
    }
    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "没有需要更新的字段" },
        { status: 400 }
      );
    }

    const { data: outfit, error: updateError } = await supabaseAdminClient
      .from("character_outfits")
      .update(updates)
      .eq("id", params.outfitId)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update outfit:", updateError);
      return NextResponse.json(
        { error: "更新服饰失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ outfit });
  } catch (error: any) {
    console.error("Error updating outfit:", error);
    return NextResponse.json(
      { error: error?.message ?? "更新服饰失败" },
      { status: 500 }
    );
  }
}

// DELETE: 删除服饰
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; outfitId: string } }
) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    // 获取服饰信息（用于删除存储的图片）
    const { data: outfit, error: fetchError } = await supabaseAdminClient
      .from("character_outfits")
      .select("*")
      .eq("id", params.outfitId)
      .eq("character_id", params.id)
      .eq("user_id", user!.id)
      .single();

    if (fetchError || !outfit) {
      return NextResponse.json(
        { error: "服饰不存在" },
        { status: 404 }
      );
    }

    // 删除存储的图片
    if (outfit.outfit_image_url) {
      const imagePath = outfit.outfit_image_url.split("/character-assets/")[1];
      if (imagePath) {
        await supabaseAdminClient.storage
          .from("character-assets")
          .remove([imagePath]);
        console.log('[Outfit API] Deleted outfit image:', imagePath);
      }
    }

    // 删除服饰记录
    const { error: deleteError } = await supabaseAdminClient
      .from("character_outfits")
      .delete()
      .eq("id", params.outfitId);

    if (deleteError) {
      console.error("Failed to delete outfit:", deleteError);
      return NextResponse.json(
        { error: "删除服饰失败" },
        { status: 500 }
      );
    }

    console.log('[Outfit API] Outfit deleted successfully:', params.outfitId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting outfit:", error);
    return NextResponse.json(
      { error: error?.message ?? "删除服饰失败" },
      { status: 500 }
    );
  }
}

