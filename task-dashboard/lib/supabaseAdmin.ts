import { createClient } from "@supabase/supabase-js";

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn("Supabase 服务端环境变量未配置：SUPABASE_SERVICE_ROLE_KEY 或 NEXT_PUBLIC_SUPABASE_URL 缺失");
}

export const supabaseAdminClient = createClient(
  supabaseUrl || "",
  supabaseServiceRoleKey || "",
  {
    auth: {
      persistSession: false,
    },
  }
);
