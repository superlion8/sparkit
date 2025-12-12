/**
 * 图片上传工具函数
 * 支持上传到 Aimovely，失败时回退到 Supabase Storage
 */

import { createClient } from "@supabase/supabase-js";

const AIMOVELY_API_URL = "https://dev.aimovely.com";
const SUPABASE_BUCKET_NAME = "generated-images";

export interface UploadResult {
  url: string;
  resource_id?: string;
  source: "aimovely" | "supabase";
}

/**
 * 获取 Aimovely Token
 */
export async function fetchAimovelyToken(email: string, vcode: string): Promise<string | null> {
  try {
    const response = await fetch(`${AIMOVELY_API_URL}/v1/user/verifyvcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, vcode }),
    });

    if (!response.ok) {
      console.error("[Upload] Aimovely token request failed:", response.status);
      return null;
    }

    const data = await response.json();
    if (data.code !== 0 || !data.data?.access_token) {
      console.error("[Upload] Aimovely token response invalid:", data);
      return null;
    }

    return data.data.access_token as string;
  } catch (error) {
    console.error("[Upload] Error fetching Aimovely token:", error);
    return null;
  }
}

/**
 * 获取 Aimovely 凭证和 Token（如果配置了的话）
 */
export async function getAimovelyCredentials(): Promise<{
  email: string;
  vcode: string;
  token: string;
} | null> {
  const email = process.env.AIMOVELY_EMAIL;
  const vcode = process.env.AIMOVELY_VCODE;

  if (!email || !vcode) {
    console.warn("[Upload] Aimovely credentials not configured");
    return null;
  }

  const token = await fetchAimovelyToken(email, vcode);
  if (!token) {
    return null;
  }

  return { email, vcode, token };
}

/**
 * 上传到 Aimovely
 */
async function uploadToAimovely(
  dataUrl: string,
  token: string,
  prefix: string
): Promise<{ url: string; resource_id: string } | null> {
  if (!dataUrl.startsWith("data:")) {
    console.warn("[Upload] Unsupported image format, expected data URL");
    return null;
  }

  try {
    const [metadata, base64Data] = dataUrl.split(",");
    const mimeMatch = metadata.match(/data:(.*?);base64/);
    if (!mimeMatch) {
      console.warn("[Upload] Failed to parse data URL metadata");
      return null;
    }

    const mimeType = mimeMatch[1] || "image/png";
    const buffer = Buffer.from(base64Data, "base64");
    const ext = mimeType.split("/")[1] ?? "png";
    const fileName = `${prefix}-${Date.now()}.${ext}`;

    const file = new File([buffer], fileName, { type: mimeType });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("biz", "external_tool");
    formData.append("template_id", "1");

    const response = await fetch(`${AIMOVELY_API_URL}/v1/resource/upload`, {
      method: "POST",
      headers: { Authorization: token },
      body: formData,
    });

    if (!response.ok) {
      console.error("[Upload] Aimovely upload failed:", response.status);
      return null;
    }

    const result = await response.json();
    if (result.code !== 0 || !result.data?.url) {
      console.error("[Upload] Aimovely upload API error:", result);
      return null;
    }

    return {
      url: result.data.url,
      resource_id: result.data.resource_id,
    };
  } catch (error) {
    console.error("[Upload] Aimovely upload error:", error);
    return null;
  }
}

/**
 * 上传到 Supabase Storage
 */
async function uploadToSupabaseStorage(
  dataUrl: string,
  prefix: string
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[Upload] Supabase credentials not configured");
    return null;
  }

  if (!dataUrl.startsWith("data:")) {
    console.warn("[Upload] Unsupported image format for Supabase, expected data URL");
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // 确保 bucket 存在
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === SUPABASE_BUCKET_NAME);

    if (!bucketExists) {
      console.log(`[Upload] Creating bucket "${SUPABASE_BUCKET_NAME}"...`);
      const { error } = await supabase.storage.createBucket(SUPABASE_BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });

      if (error) {
        console.error("[Upload] Failed to create bucket:", error.message);
        return null;
      }
    }

    // 解析 data URL
    const [metadata, base64Data] = dataUrl.split(",");
    const mimeMatch = metadata.match(/data:(.*?);base64/);
    if (!mimeMatch) {
      console.warn("[Upload] Failed to parse data URL metadata");
      return null;
    }

    const mimeType = mimeMatch[1] || "image/png";
    const buffer = Buffer.from(base64Data, "base64");
    const ext = mimeType.split("/")[1] ?? "png";
    const fileName = `${prefix}/${Date.now()}.${ext}`;

    // 上传
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error("[Upload] Supabase Storage upload error:", error.message);
      return null;
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(SUPABASE_BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData?.publicUrl || null;
  } catch (error: any) {
    console.error("[Upload] Supabase Storage error:", error.message);
    return null;
  }
}

/**
 * 上传图片（带 Supabase 回退）
 * 优先上传到 Aimovely，失败时回退到 Supabase Storage
 */
export async function uploadImageWithFallback(
  dataUrl: string,
  aimovelyToken: string | null,
  prefix: string
): Promise<UploadResult | null> {
  // 1. 优先尝试 Aimovely
  if (aimovelyToken) {
    const aimovelyResult = await uploadToAimovely(dataUrl, aimovelyToken, prefix);
    if (aimovelyResult) {
      console.log(`[Upload] ✅ Uploaded to Aimovely: ${prefix}`);
      return {
        url: aimovelyResult.url,
        resource_id: aimovelyResult.resource_id,
        source: "aimovely",
      };
    }
    console.warn(`[Upload] Aimovely upload failed for ${prefix}, trying Supabase Storage...`);
  }

  // 2. 回退到 Supabase Storage
  const supabaseUrl = await uploadToSupabaseStorage(dataUrl, prefix);
  if (supabaseUrl) {
    console.log(`[Upload] ✅ Uploaded to Supabase Storage: ${prefix}`);
    return {
      url: supabaseUrl,
      source: "supabase",
    };
  }

  console.error(`[Upload] ❌ All upload methods failed for ${prefix}`);
  return null;
}

/**
 * 批量上传图片（带 Supabase 回退）
 */
export async function uploadImagesWithFallback(
  dataUrls: string[],
  aimovelyToken: string | null,
  prefix: string
): Promise<(UploadResult | null)[]> {
  const results = await Promise.all(
    dataUrls.map((dataUrl, index) =>
      uploadImageWithFallback(dataUrl, aimovelyToken, `${prefix}-${index}`)
    )
  );
  
  // 统计
  const successCount = results.filter(r => r !== null).length;
  const aimovelyCount = results.filter(r => r?.source === "aimovely").length;
  const supabaseCount = results.filter(r => r?.source === "supabase").length;
  
  console.log(`[Upload] Batch upload complete: ${successCount}/${dataUrls.length} succeeded`);
  console.log(`[Upload]   - Aimovely: ${aimovelyCount}`);
  console.log(`[Upload]   - Supabase: ${supabaseCount}`);
  
  return results;
}

