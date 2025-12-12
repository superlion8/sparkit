import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config({ path: ".env.local" });

const AIMOVELY_API_URL = "https://dev.aimovely.com";
const BUCKET_NAME = "generated-images";
const BATCH_SIZE = 50;

interface UploadResult {
  url: string;
  source: "aimovely" | "supabase";
}

async function fetchAimovelyToken(email: string, vcode: string): Promise<string | null> {
  try {
    const response = await fetch(`${AIMOVELY_API_URL}/v1/user/verifyvcode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, vcode }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== 0 || !data.data?.access_token) return null;

    return data.data.access_token as string;
  } catch (error) {
    return null;
  }
}

async function uploadToAimovely(
  dataUrl: string,
  token: string,
  taskId: string
): Promise<string | null> {
  try {
    const [metadata, base64Data] = dataUrl.split(",");
    const mimeMatch = metadata.match(/data:(.*?);base64/);
    if (!mimeMatch) return null;

    const mimeType = mimeMatch[1] || "image/png";
    const buffer = Buffer.from(base64Data, "base64");
    const ext = mimeType.split("/")[1] ?? "png";
    const fileName = `migrated-${taskId}-${Date.now()}.${ext}`;

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

    if (!response.ok) return null;

    const result = await response.json();
    if (result.code !== 0 || !result.data?.url) return null;

    return result.data.url;
  } catch (error) {
    return null;
  }
}

async function uploadToSupabaseStorage(
  supabase: any,
  dataUrl: string,
  taskId: string
): Promise<string | null> {
  try {
    const [metadata, base64Data] = dataUrl.split(",");
    const mimeMatch = metadata.match(/data:(.*?);base64/);
    if (!mimeMatch) return null;

    const mimeType = mimeMatch[1] || "image/png";
    const buffer = Buffer.from(base64Data, "base64");
    const ext = mimeType.split("/")[1] ?? "png";
    const fileName = `migrated/${taskId}-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error(`  Supabase Storage upload error:`, error.message);
      return null;
    }

    // 获取公开 URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return urlData?.publicUrl || null;
  } catch (error: any) {
    console.error(`  Supabase Storage error:`, error.message);
    return null;
  }
}

async function ensureBucketExists(supabase: any): Promise<boolean> {
  try {
    // 检查 bucket 是否存在
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === BUCKET_NAME);

    if (!bucketExists) {
      console.log(`Creating bucket "${BUCKET_NAME}"...`);
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });

      if (error) {
        console.error(`Failed to create bucket:`, error.message);
        return false;
      }
      console.log(`✅ Bucket "${BUCKET_NAME}" created`);
    } else {
      console.log(`✅ Bucket "${BUCKET_NAME}" exists`);
    }
    return true;
  } catch (error: any) {
    console.error(`Bucket check error:`, error.message);
    return false;
  }
}

async function main() {
  console.log("=== Base64 to URL Migration Script ===\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const aimovelyEmail = process.env.AIMOVELY_EMAIL;
  const aimovelyVcode = process.env.AIMOVELY_VCODE;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("❌ Supabase credentials not configured");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  // 获取 Aimovely Token
  console.log("1. Fetching Aimovely token...");
  let aimovelyToken: string | null = null;
  if (aimovelyEmail && aimovelyVcode) {
    aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
  }
  if (aimovelyToken) {
    console.log("✅ Aimovely token obtained");
  } else {
    console.log("⚠️ Aimovely token not available, will use Supabase Storage only");
  }

  // 确保 Supabase Storage bucket 存在
  console.log("\n2. Checking Supabase Storage bucket...");
  const bucketReady = await ensureBucketExists(supabase);
  if (!bucketReady && !aimovelyToken) {
    console.error("❌ No upload destination available");
    process.exit(1);
  }

  // 分批查询任务，使用 textregexne 或简单的范围查询避免超时
  console.log("\n3. Querying tasks in batches...");
  
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;
  let notBase64Count = 0;
  let aimovelyCount = 0;
  let supabaseCount = 0;
  let totalScanned = 0;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    // 分批查询，只查询 2025-12-09 之后的记录
    const { data: tasks, error } = await supabase
      .from("generation_tasks")
      .select("id, task_id, output_image_url")
      .not("output_image_url", "is", null)
      .gte("created_at", "2025-12-09T00:00:00Z")
      .order("created_at", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error("Query error:", error.message);
      // 继续下一批
      offset += BATCH_SIZE;
      continue;
    }

    if (!tasks || tasks.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`\nBatch ${Math.floor(offset / BATCH_SIZE) + 1}: Processing ${tasks.length} tasks (offset: ${offset})...`);

    for (const task of tasks) {
      totalScanned++;
      const outputImageUrl = task.output_image_url;

      // 检查是否为 base64 格式
      if (!outputImageUrl || !outputImageUrl.startsWith("data:")) {
        notBase64Count++;
        continue;
      }

      // 检查大小限制 (>10MB 跳过)
      if (outputImageUrl.length > 10 * 1024 * 1024) {
        console.log(`  ⚠️ Task ${task.task_id}: base64 too large, skipping`);
        skipCount++;
        continue;
      }

      console.log(`  Processing ${task.task_id}...`);

      let uploadedUrl: string | null = null;
      let uploadSource: "aimovely" | "supabase" = "aimovely";

      // 优先尝试 Aimovely
      if (aimovelyToken) {
        uploadedUrl = await uploadToAimovely(outputImageUrl, aimovelyToken, task.id);
        if (uploadedUrl) {
          aimovelyCount++;
        }
      }

      // 如果 Aimovely 失败，使用 Supabase Storage
      if (!uploadedUrl && bucketReady) {
        console.log(`    Aimovely failed, trying Supabase Storage...`);
        uploadedUrl = await uploadToSupabaseStorage(supabase, outputImageUrl, task.id);
        if (uploadedUrl) {
          uploadSource = "supabase";
          supabaseCount++;
        }
      }

      if (!uploadedUrl) {
        console.log(`  ❌ Task ${task.task_id}: All uploads failed`);
        errorCount++;
        continue;
      }

      // 更新数据库
      const { error: updateError } = await supabase
        .from("generation_tasks")
        .update({ output_image_url: uploadedUrl })
        .eq("id", task.id);

      if (updateError) {
        console.log(`  ❌ Task ${task.task_id}: DB update failed`);
        errorCount++;
        continue;
      }

      successCount++;
      console.log(`  ✅ Task ${task.task_id}: Migrated via ${uploadSource}`);

      // 延迟避免限流
      await new Promise((r) => setTimeout(r, 200));
    }

    offset += BATCH_SIZE;

    // 如果这批数量少于 BATCH_SIZE，说明没有更多了
    if (tasks.length < BATCH_SIZE) {
      hasMore = false;
    }

    // 每批输出进度
    console.log(`📊 Progress: ${successCount} migrated (Aimovely: ${aimovelyCount}, Supabase: ${supabaseCount}), ${errorCount} failed`);
  }

  console.log("\n=== Migration Complete ===");
  console.log(`Total scanned: ${totalScanned}`);
  console.log(`Already URL (not base64): ${notBase64Count}`);
  console.log(`✅ Migrated: ${successCount}`);
  console.log(`   - Via Aimovely: ${aimovelyCount}`);
  console.log(`   - Via Supabase: ${supabaseCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`⚠️ Skipped (too large): ${skipCount}`);
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
