import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

interface AuthResult {
  user?: User;
  accessToken?: string;
  errorResponse?: NextResponse;
}

export async function validateRequestAuth(request: NextRequest): Promise<AuthResult> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      errorResponse: NextResponse.json({ error: "服务端 Supabase 凭证未配置" }, { status: 500 }),
    };
  }

  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      errorResponse: NextResponse.json({ error: "未授权访问" }, { status: 401 }),
    };
  }

  const accessToken = authHeader.replace("Bearer ", "").trim();

  if (!accessToken) {
    return {
      errorResponse: NextResponse.json({ error: "未授权访问" }, { status: 401 }),
    };
  }

  const { data, error } = await supabaseAdminClient.auth.getUser(accessToken);

  if (error || !data?.user) {
    return {
      errorResponse: NextResponse.json({ error: "无效或过期的登录状态" }, { status: 401 }),
    };
  }

  return {
    user: data.user,
    accessToken,
  };
}
