import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabaseAdmin";

// GET: 获取用户所有进行中的任务（pending + processing + failed）
export async function GET(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    // 获取用户所有进行中的任务（不限角色）
    const { data: pendingTasks, error } = await supabaseAdminClient
      .from("generation_tasks")
      .select("*")
      .eq("email", user!.email)
      .in("status", ["pending", "processing", "failed"])
      .order("started_at", { ascending: false });

    if (error) {
      console.error("[Get All Pending Tasks] Error:", error);
      return NextResponse.json(
        { error: "获取进行中任务失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      pendingTasks: pendingTasks || [],
      count: (pendingTasks || []).length
    });
  } catch (error: any) {
    console.error("[Get All Pending Tasks] Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "获取进行中任务失败" },
      { status: 500 }
    );
  }
}

