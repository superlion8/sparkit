"use client";

import { createClient } from "@supabase/supabase-js";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // 在客户端直接抛错会破坏渲染，这里记录日志方便调试
  // eslint-disable-next-line no-console
  console.warn("Supabase 环境变量未配置：NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY 缺失");
}

export const supabaseClient: SupabaseClient = createClient(
  supabaseUrl || "",
  supabaseAnonKey || "",
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

export type { Session };
