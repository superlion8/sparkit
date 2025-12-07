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

// 统计单个 output_image_url 字段中的图片数量
const countImagesInUrl = (url: string | null): number => {
  if (!url) return 0;
  
  // 尝试解析为 JSON
  try {
    const parsed = JSON.parse(url);
    
    // 情况1: JSON 数组 (如 pose-control)
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).length;
    }
    
    // 情况2: JSON 对象，检查常见字段
    if (typeof parsed === 'object' && parsed !== null) {
      // snapshot 格式: { snapshots: [...] }
      if (Array.isArray(parsed.snapshots)) {
        return parsed.snapshots.filter(Boolean).length;
      }
      // 其他可能的格式
      if (Array.isArray(parsed.images)) {
        return parsed.images.filter(Boolean).length;
      }
      if (Array.isArray(parsed.urls)) {
        return parsed.urls.filter(Boolean).length;
      }
    }
    
    // 其他 JSON 格式，算 1 张
    return 1;
  } catch {
    // 不是 JSON，是普通 URL 字符串
    // 检查是否是逗号分隔的多个 URL
    if (url.includes(',') && url.includes('http')) {
      return url.split(',').filter(u => u.trim().startsWith('http')).length;
    }
    // 单个 URL
    return url.startsWith('http') || url.startsWith('data:') ? 1 : 0;
  }
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
    // 使用分页获取所有任务数据，限制总量避免超时
    const PAGE_SIZE = 1000;
    const MAX_PAGES = 50; // 最多获取 50000 条记录
    let allTasks: Array<{ email: string; username: string | null; created_at: string; output_image_url: string | null }> = [];
    let page = 0;
    let hasMore = true;

    console.log("开始获取任务数据...");

    while (hasMore && page < MAX_PAGES) {
      const { data: tasks, error: tasksError } = await supabaseAdminClient
        .from("generation_tasks")
        .select("email, username, created_at, output_image_url")
        .not("email", "is", null)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order("created_at", { ascending: false });

      if (tasksError) {
        console.error(`第 ${page + 1} 页查询失败:`, tasksError);
        throw tasksError;
      }

      if (tasks && tasks.length > 0) {
        allTasks = allTasks.concat(tasks);
        page++;
        hasMore = tasks.length === PAGE_SIZE;
        console.log(`已获取 ${allTasks.length} 条记录...`);
      } else {
        hasMore = false;
      }
    }

    console.log(`获取完成：共 ${allTasks.length} 条任务记录（${page} 页）`);

    // 按 email 分组统计
    const userStats: Record<string, {
      email: string;
      username: string;
      taskCount: number;
      imageCount: number;
      lastActiveAt: string;
    }> = {};

    for (const task of allTasks) {
      if (!task.email) continue;
      
      if (!userStats[task.email]) {
        userStats[task.email] = {
          email: task.email,
          username: task.username || task.email.split('@')[0],
          taskCount: 0,
          imageCount: 0,
          lastActiveAt: task.created_at,
        };
      }
      
      userStats[task.email].taskCount += 1;
      
      // 统计图片数量（考虑多种存储格式）
      userStats[task.email].imageCount += countImagesInUrl(task.output_image_url);
      
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
      // 如果表不存在，忽略错误
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

    console.log(`统计完成：共 ${users.length} 个用户`);

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
