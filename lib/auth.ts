import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseAdminClient } from "./supabaseAdmin";

interface AuthResult {
  user?: User;
  accessToken?: string;
  errorResponse?: NextResponse;
}

// 检查用户是否被禁用
async function isUserBanned(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdminClient
      .from("banned_users")
      .select("email")
      .eq("email", email.toLowerCase())
      .single();

    if (error) {
      // PGRST116 表示没有找到记录，这是正常的
      if (error.code === "PGRST116") {
        return false;
      }
      // 其他错误（如表不存在）也返回 false，不阻止用户访问
      console.warn("检查用户禁用状态失败:", error.message);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("检查用户禁用状态异常:", error);
    return false;
  }
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

  // 检查用户是否被禁用
  if (data.user.email) {
    const banned = await isUserBanned(data.user.email);
    if (banned) {
      return {
        errorResponse: NextResponse.json(
          { error: "您的账户已被禁用，请联系管理员", code: "user_banned" },
          { status: 403 }
        ),
      };
    }
  }

  return {
    user: data.user,
    accessToken,
  };
}
