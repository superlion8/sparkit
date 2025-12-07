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

export async function GET(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  if (!isAdminEmail(user?.email ?? null)) {
    return NextResponse.json(
      { error: "无权访问", code: "forbidden" },
      { status: 403 }
    );
  }

  try {
    // 使用分页获取所有任务数据
    const PAGE_SIZE = 1000;
    const MAX_PAGES = 50;
    let allTasks: Array<{ email: string; username: string | null; created_at: string }> = [];
    let page = 0;
    let hasMore = true;

    while (hasMore && page < MAX_PAGES) {
      const { data: tasks, error: tasksError } = await supabaseAdminClient
        .from("generation_tasks")
        .select("email, username, created_at")
        .not("email", "is", null)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order("created_at", { ascending: false });

      if (tasksError) {
        throw tasksError;
      }

      if (tasks && tasks.length > 0) {
        allTasks = allTasks.concat(tasks);
        page++;
        hasMore = tasks.length === PAGE_SIZE;
      } else {
        hasMore = false;
      }
    }

    console.log(`获取到 ${allTasks.length} 条任务记录`);

    // 按 email 分组统计
    const userStats: Record<string, {
      email: string;
      username: string;
      taskCount: number;
      lastActiveAt: string;
    }> = {};

    for (const task of allTasks) {
      if (!task.email) continue;
      
      if (!userStats[task.email]) {
        userStats[task.email] = {
          email: task.email,
          username: task.username || task.email.split('@')[0],
          taskCount: 0,
          lastActiveAt: task.created_at,
        };
      }
      
      userStats[task.email].taskCount += 1;
      
      // 更新最后活跃时间
      if (task.created_at > userStats[task.email].lastActiveAt) {
        userStats[task.email].lastActiveAt = task.created_at;
      }
      
      // 更新 username（取最新的非空值）
      if (task.username) {
        userStats[task.email].username = task.username;
      }
    }

    // 获取被禁用的用户列表
    const { data: bannedUsers, error: bannedError } = await supabaseAdminClient
      .from("banned_users")
      .select("email");

    if (bannedError) {
      console.warn("获取 banned_users 失败（表可能不存在）:", bannedError.message);
    }

    const bannedEmails = new Set(
      bannedUsers?.map(u => u.email.toLowerCase()) || []
    );

    // 转换为数组并添加禁用状态
    const users = Object.values(userStats)
      .map(user => ({
        ...user,
        isBanned: bannedEmails.has(user.email.toLowerCase()),
      }))
      .sort((a, b) => b.taskCount - a.taskCount);

    return NextResponse.json({
      users,
      totalUsers: users.length,
      bannedCount: users.filter(u => u.isBanned).length,
    });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return NextResponse.json(
      { error: "获取用户列表失败" },
      { status: 500 }
    );
  }
}
