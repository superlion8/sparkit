import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  
  if (errorResponse) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({
    valid: true,
    email: user.email,
    userId: user.id,
    username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  });
}
