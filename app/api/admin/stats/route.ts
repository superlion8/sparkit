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
      { error: "当前账户无权访问统计数据，请联系管理员。", code: "forbidden" },
      { status: 403 }
    );
  }

  try {
    // 获取总任务数
    const { count: totalTasks } = await supabaseAdminClient
      .from("generation_tasks")
      .select("*", { count: "exact", head: true });

    // 获取今日任务数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayTasks } = await supabaseAdminClient
      .from("generation_tasks")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    // 获取本周任务数
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    const { count: weekTasks } = await supabaseAdminClient
      .from("generation_tasks")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString());

    // 获取活跃用户数（有生成记录的用户）
    const { data: activeUsers } = await supabaseAdminClient
      .from("generation_tasks")
      .select("email", { count: "exact" })
      .not("email", "is", null);

    const uniqueUsers = new Set(activeUsers?.map(u => u.email).filter(Boolean));

    // 获取用户排名（历史累计任务数，但只显示最近7天有活动的用户）
    // 第一步：获取最近7天有活动的用户列表
    const { data: recentActiveUsers } = await supabaseAdminClient
      .from("generation_tasks")
      .select("email")
      .gte("created_at", weekAgo.toISOString())
      .not("email", "is", null);

    const recentActiveEmails = new Set(
      recentActiveUsers?.map(u => u.email).filter(Boolean) || []
    );

    let userRanking: Array<{ email: string; username: string; count: number }> = [];

    // 第二步：获取这些用户的历史累计任务数
    if (recentActiveEmails.size > 0) {
      // 分批查询，避免 SQL IN 子句过长
      const emailArray = Array.from(recentActiveEmails);
      const batchSize = 100;
      const allUserTasks: Array<{ email: string; username: string | null }> = [];

      for (let i = 0; i < emailArray.length; i += batchSize) {
        const batch = emailArray.slice(i, i + batchSize);
        const { data: batchTasks } = await supabaseAdminClient
          .from("generation_tasks")
          .select("email, username")
          .not("email", "is", null)
          .in("email", batch);
        
        if (batchTasks) {
          allUserTasks.push(...batchTasks);
        }
      }

      const userTaskCounts = allUserTasks.reduce((acc, task) => {
        const email = task.email;
        if (email && recentActiveEmails.has(email)) {
          const username = task.username || email;
          if (!acc[email]) {
            acc[email] = { email, username, count: 0 };
          }
          acc[email].count += 1;
        }
        return acc;
      }, {} as Record<string, { email: string; username: string; count: number }>);

      userRanking = Object.values(userTaskCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // 取前10名
    }

    // 获取任务类型分布（使用 count 查询确保准确性）
    const { data: taskTypeStats, error: taskTypeError } = await supabaseAdminClient
      .from("generation_tasks")
      .select("task_type");

    if (taskTypeError) {
      console.error("Error fetching task type stats:", taskTypeError);
    }

    const taskTypeDistribution = taskTypeStats?.reduce((acc, task) => {
      if (task.task_type) {
        acc[task.task_type] = (acc[task.task_type] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    // 获取最近7天的每日统计
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const { count: dayCount } = await supabaseAdminClient
        .from("generation_tasks")
        .select("*", { count: "exact", head: true })
        .gte("created_at", date.toISOString())
        .lt("created_at", nextDate.toISOString());

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        count: dayCount || 0
      });
    }

    return NextResponse.json({
      totalTasks: totalTasks || 0,
      todayTasks: todayTasks || 0,
      weekTasks: weekTasks || 0,
      activeUsers: uniqueUsers.size,
      taskTypeDistribution,
      dailyStats,
      userRanking,
    });
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    return NextResponse.json(
      { error: "获取统计数据失败" },
      { status: 500 }
    );
  }
}