import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const url = request.nextUrl;
  const taskType = url.searchParams.get("taskType");
  const taskId = url.searchParams.get("taskId");
  const email = url.searchParams.get("email");

  let query = supabaseAdminClient
    .from("generation_tasks")
    .select("*")
    .order("task_time", { ascending: false });

  if (taskType) {
    query = query.eq("task_type", taskType);
  }

  if (taskId) {
    query = query.ilike("task_id", `%${taskId}%`);
  }

  if (email) {
    query = query.ilike("email", `%${email}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tasks = (data ?? []).map((task) => ({
    ...task,
    task_time: task.task_time ? new Date(task.task_time).toISOString() : null,
    created_at: task.created_at ? new Date(task.created_at).toISOString() : null,
  }));

  const summaryByUserMap = new Map<string, {
    username: string | null;
    email: string | null;
    total: number;
    byType: Record<string, number>;
  }>();

  const tasksByType: Record<string, number> = {};

  for (const task of tasks) {
    const key = task.email || task.username || "未填写";
    if (!summaryByUserMap.has(key)) {
      summaryByUserMap.set(key, {
        username: task.username ?? null,
        email: task.email ?? null,
        total: 0,
        byType: {},
      });
    }

    const summary = summaryByUserMap.get(key)!;
    summary.total += 1;
    summary.byType[task.task_type] = (summary.byType[task.task_type] ?? 0) + 1;

    tasksByType[task.task_type] = (tasksByType[task.task_type] ?? 0) + 1;
  }

  const summaryByUser = Array.from(summaryByUserMap.entries()).map(([key, value]) => ({
    key,
    ...value,
  }));

  return NextResponse.json({
    tasks,
    total: tasks.length,
    tasksByType,
    summaryByUser,
  });
}
