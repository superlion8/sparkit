import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

const adminEmails =
  process.env.ADMIN_ALLOWED_EMAILS?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean) ?? [];

const isAdminEmail = (email?: string | null) => {
  if (!email) {
    return false;
  }
  if (adminEmails.length === 0) {
    return false;
  }
  return adminEmails.includes(email.toLowerCase());
};

export async function GET(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  if (!isAdminEmail(user?.email ?? null)) {
    return NextResponse.json(
      { error: "当前账户无权访问任务数据，请联系管理员。", code: "forbidden" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "100", 10);
  const offsetParam = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 100, 1), 500);
  const offset = Math.max(Number.isFinite(offsetParam) ? offsetParam : 0, 0);
  const taskType = searchParams.get("taskType");
  const taskId = searchParams.get("taskId");
  const email = searchParams.get("email");
  const username = searchParams.get("username");

  let query = supabaseAdminClient
    .from("generation_tasks")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (taskType) {
    query = query.eq("task_type", taskType);
  }
  if (taskId) {
    query = query.ilike("task_id", `%${taskId}%`);
  }
  if (email) {
    // 支持多个邮箱查询，逗号分隔
    const emails = email.split(',').map(e => e.trim()).filter(e => e);
    if (emails.length === 1) {
      query = query.ilike("email", `%${emails[0]}%`);
    } else if (emails.length > 1) {
      query = query.or(emails.map(e => `email.ilike.%${e}%`).join(','));
    }
  }
  if (username) {
    // 支持多个用户名查询，逗号分隔
    const usernames = username.split(',').map(u => u.trim()).filter(u => u);
    if (usernames.length === 1) {
      query = query.ilike("username", `%${usernames[0]}%`);
    } else if (usernames.length > 1) {
      query = query.or(usernames.map(u => `username.ilike.%${u}%`).join(','));
    }
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to fetch generation tasks:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to fetch generation tasks" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    tasks: data ?? [],
    pagination: {
      limit,
      offset,
      total: count ?? data?.length ?? 0,
    },
  });
}