import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// GET: 获取用户的所有 characters
export async function GET(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const { data, error } = await supabaseAdminClient
      .from("characters")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch characters:", error);
      return NextResponse.json(
        { error: "获取角色列表失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ characters: data || [] });
  } catch (error: any) {
    console.error("Error fetching characters:", error);
    return NextResponse.json(
      { error: error?.message ?? "获取角色列表失败" },
      { status: 500 }
    );
  }
}

// POST: 创建新的 character
export async function POST(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const charName = formData.get("char_name") as string;
    const charAvatar = formData.get("char_avatar") as File | null;
    const charImage = formData.get("char_image") as File | null;

    if (!charName || !charName.trim()) {
      return NextResponse.json(
        { error: "角色名称是必填项" },
        { status: 400 }
      );
    }

    if (!charAvatar) {
      return NextResponse.json(
        { error: "角色头像是必填项" },
        { status: 400 }
      );
    }

    // 上传头像到 Supabase Storage
    const avatarBuffer = Buffer.from(await charAvatar.arrayBuffer());
    const avatarFileName = `characters/${user!.id}/${Date.now()}-avatar-${charAvatar.name}`;
    
    const { data: avatarData, error: avatarError } = await supabaseAdminClient.storage
      .from("character-assets")
      .upload(avatarFileName, avatarBuffer, {
        contentType: charAvatar.type || "image/jpeg",
        upsert: false,
      });

    if (avatarError) {
      console.error("Failed to upload avatar:", avatarError);
      return NextResponse.json(
        { error: "上传头像失败" },
        { status: 500 }
      );
    }

    const { data: { publicUrl: avatarUrl } } = supabaseAdminClient.storage
      .from("character-assets")
      .getPublicUrl(avatarFileName);

    // 上传全身照（如果提供）
    let charImageUrl: string | null = null;
    if (charImage) {
      const imageBuffer = Buffer.from(await charImage.arrayBuffer());
      const imageFileName = `characters/${user!.id}/${Date.now()}-image-${charImage.name}`;
      
      const { error: imageError } = await supabaseAdminClient.storage
        .from("character-assets")
        .upload(imageFileName, imageBuffer, {
          contentType: charImage.type || "image/jpeg",
          upsert: false,
        });

      if (!imageError) {
        const { data: { publicUrl } } = supabaseAdminClient.storage
          .from("character-assets")
          .getPublicUrl(imageFileName);
        charImageUrl = publicUrl;
      }
    }

    // 创建 character 记录
    const { data: characterData, error: createError } = await supabaseAdminClient
      .from("characters")
      .insert({
        user_id: user!.id,
        char_name: charName.trim(),
        char_avatar: avatarUrl,
        char_image: charImageUrl,
      })
      .select()
      .single();

    if (createError) {
      console.error("Failed to create character:", createError);
      return NextResponse.json(
        { error: "创建角色失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ character: characterData });
  } catch (error: any) {
    console.error("Error creating character:", error);
    return NextResponse.json(
      { error: error?.message ?? "创建角色失败" },
      { status: 500 }
    );
  }
}

