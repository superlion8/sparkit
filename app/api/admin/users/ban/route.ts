import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

const adminEmails =
  process.env.ADMIN_ALLOWED_EMAILS?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean) ?? [];

const isAdminEmail = (email?: string | null) => {
  if (!email) return false;
  if (adminEmails.length === 0) return false;
  return adminEmails.includes(email.toLowerCase());
};

// 禁用用户
export async function POST(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  if (!isAdminEmail(user?.email ?? null)) {
    return NextResponse.json(
      { error: "无权操作", code: "forbidden" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, reason } = body;

    if (!email) {
      return NextResponse.json(
        { error: "缺少 email 参数" },
        { status: 400 }
      );
    }

    // 不能禁用管理员
    if (isAdminEmail(email)) {
      return NextResponse.json(
        { error: "不能禁用管理员账户" },
        { status: 400 }
      );
    }

    // 插入到 banned_users 表
    const { error } = await supabaseAdminClient
      .from("banned_users")
      .upsert({
        email: email.toLowerCase(),
        reason: reason || "管理员禁用",
        banned_by: user?.email,
        banned_at: new Date().toISOString(),
      }, {
        onConflict: 'email'
      });

    if (error) {
      throw error;
    }

    console.log(`用户 ${email} 已被 ${user?.email} 禁用`);

    return NextResponse.json({
      success: true,
      message: `用户 ${email} 已被禁用`,
    });
  } catch (error: any) {
    console.error("禁用用户失败:", error);
    return NextResponse.json(
      { error: error.message || "禁用用户失败" },
      { status: 500 }
    );
  }
}

// 解除禁用
export async function DELETE(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  if (!isAdminEmail(user?.email ?? null)) {
    return NextResponse.json(
      { error: "无权操作", code: "forbidden" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "缺少 email 参数" },
        { status: 400 }
      );
    }

    // 从 banned_users 表删除
    const { error } = await supabaseAdminClient
      .from("banned_users")
      .delete()
      .eq("email", email.toLowerCase());

    if (error) {
      throw error;
    }

    console.log(`用户 ${email} 已被 ${user?.email} 解除禁用`);

    return NextResponse.json({
      success: true,
      message: `用户 ${email} 已解除禁用`,
    });
  } catch (error: any) {
    console.error("解除禁用失败:", error);
    return NextResponse.json(
      { error: error.message || "解除禁用失败" },
      { status: 500 }
    );
  }
}




