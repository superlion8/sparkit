import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// 检查 Storage bucket 是否存在
async function checkStorageBucket(bucketName: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdminClient.storage.listBuckets();
    if (error) {
      console.error(`[Character API] Failed to list buckets:`, error);
      return false;
    }
    return data?.some((bucket) => bucket.name === bucketName) ?? false;
  } catch (error) {
    console.error(`[Character API] Error checking bucket:`, error);
    return false;
  }
}

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

    // 检查 Storage bucket 是否存在
    const bucketExists = await checkStorageBucket("character-assets");
    if (!bucketExists) {
      console.error("[Character API] Storage bucket 'character-assets' does not exist");
      return NextResponse.json(
        { 
          error: "Storage bucket 未配置",
          details: "请在 Supabase Dashboard > Storage 中创建名为 'character-assets' 的 bucket"
        },
        { status: 500 }
      );
    }

    // 上传头像到 Supabase Storage
    const avatarBuffer = Buffer.from(await charAvatar.arrayBuffer());
    
    // 清理文件名，移除特殊字符
    const sanitizedFileName = charAvatar.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const avatarFileName = `characters/${user!.id}/${Date.now()}-avatar-${sanitizedFileName}`;
    
    console.log('[Character API] Uploading avatar:', {
      fileName: avatarFileName,
      fileSize: avatarBuffer.length,
      contentType: charAvatar.type,
      userId: user!.id,
    });
    
    const { data: avatarData, error: avatarError } = await supabaseAdminClient.storage
      .from("character-assets")
      .upload(avatarFileName, avatarBuffer, {
        contentType: charAvatar.type || "image/jpeg",
        upsert: false,
      });

    if (avatarError) {
      console.error("[Character API] Failed to upload avatar:", {
        error: avatarError,
        message: avatarError.message,
        statusCode: avatarError.statusCode,
        fileName: avatarFileName,
      });
      
      // 提供更详细的错误信息
      let errorMessage = "上传头像失败";
      if (avatarError.message?.includes("Bucket not found") || avatarError.message?.includes("does not exist")) {
        errorMessage = "Storage bucket 'character-assets' 不存在，请在 Supabase Dashboard 中创建该 bucket";
      } else if (avatarError.message?.includes("new row violates row-level security")) {
        errorMessage = "Storage 权限配置错误，请检查 Storage 策略设置";
      } else {
        errorMessage = `上传头像失败: ${avatarError.message || "未知错误"}`;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    console.log('[Character API] Avatar uploaded successfully:', avatarData?.path);
    
    const { data: { publicUrl: avatarUrl } } = supabaseAdminClient.storage
      .from("character-assets")
      .getPublicUrl(avatarFileName);
    
    console.log('[Character API] Avatar public URL:', avatarUrl);

    // 上传全身照（如果提供）
    let charImageUrl: string | null = null;
    if (charImage) {
      const imageBuffer = Buffer.from(await charImage.arrayBuffer());
      const sanitizedImageName = charImage.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const imageFileName = `characters/${user!.id}/${Date.now()}-image-${sanitizedImageName}`;
      
      console.log('[Character API] Uploading character image:', {
        fileName: imageFileName,
        fileSize: imageBuffer.length,
        contentType: charImage.type,
      });
      
      const { error: imageError } = await supabaseAdminClient.storage
        .from("character-assets")
        .upload(imageFileName, imageBuffer, {
          contentType: charImage.type || "image/jpeg",
          upsert: false,
        });

      if (imageError) {
        console.error("[Character API] Failed to upload character image:", imageError);
        // 全身照上传失败不影响角色创建，只记录错误
      } else {
        const { data: { publicUrl } } = supabaseAdminClient.storage
          .from("character-assets")
          .getPublicUrl(imageFileName);
        charImageUrl = publicUrl;
        console.log('[Character API] Character image uploaded successfully:', charImageUrl);
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

