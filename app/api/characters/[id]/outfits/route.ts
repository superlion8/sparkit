import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// GET: 获取角色的所有服饰
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

    // 获取服饰列表
    const { data: outfits, error: outfitsError } = await supabaseAdminClient
      .from("character_outfits")
      .select("*")
      .eq("character_id", params.id)
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (outfitsError) {
      console.error("Failed to fetch outfits:", outfitsError);
      return NextResponse.json(
        { error: "获取服饰列表失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ outfits: outfits || [] });
  } catch (error: any) {
    console.error("Error fetching outfits:", error);
    return NextResponse.json(
      { error: error?.message ?? "获取服饰列表失败" },
      { status: 500 }
    );
  }
}

// POST: 上传新服饰
export async function POST(
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

    const formData = await request.formData();
    const outfitName = formData.get("outfit_name") as string;
    const outfitImage = formData.get("outfit_image") as File | null;
    const outfitType = (formData.get("outfit_type") as string) || "general";
    const description = formData.get("description") as string | null;

    if (!outfitName || !outfitName.trim()) {
      return NextResponse.json(
        { error: "服饰名称是必填项" },
        { status: 400 }
      );
    }

    if (!outfitImage) {
      return NextResponse.json(
        { error: "服饰图片是必填项" },
        { status: 400 }
      );
    }

    // 上传图片到 Supabase Storage
    const imageBuffer = Buffer.from(await outfitImage.arrayBuffer());
    const sanitizedFileName = outfitImage.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const imageFileName = `outfits/${user!.id}/${params.id}/${Date.now()}-${sanitizedFileName}`;

    console.log('[Outfit API] Uploading outfit image:', {
      fileName: imageFileName,
      fileSize: imageBuffer.length,
      contentType: outfitImage.type,
    });

    const { error: uploadError } = await supabaseAdminClient.storage
      .from("character-assets")
      .upload(imageFileName, imageBuffer, {
        contentType: outfitImage.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Outfit API] Failed to upload outfit image:", uploadError);
      return NextResponse.json(
        { error: `上传服饰图片失败: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = supabaseAdminClient.storage
      .from("character-assets")
      .getPublicUrl(imageFileName);

    // 创建服饰记录
    const { data: outfit, error: createError } = await supabaseAdminClient
      .from("character_outfits")
      .insert({
        character_id: params.id,
        user_id: user!.id,
        outfit_name: outfitName.trim(),
        outfit_image_url: publicUrl,
        outfit_type: outfitType,
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Failed to create outfit:", createError);
      // 如果创建记录失败，删除已上传的图片
      await supabaseAdminClient.storage
        .from("character-assets")
        .remove([imageFileName]);
      return NextResponse.json(
        { error: "创建服饰记录失败" },
        { status: 500 }
      );
    }

    console.log('[Outfit API] Outfit created successfully:', outfit.id);
    return NextResponse.json({ outfit });
  } catch (error: any) {
    console.error("Error creating outfit:", error);
    return NextResponse.json(
      { error: error?.message ?? "创建服饰失败" },
      { status: 500 }
    );
  }
}

