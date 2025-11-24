import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

// Aimovely API configuration
const AIMOVELY_API_URL = "https://dev.aimovely.com";
const AIMOVELY_APP_KEY = process.env.AIMOVELY_APP_KEY || "YRKfGOdDU5eYcTVS";
const AIMOVELY_SECRET_KEY = process.env.AIMOVELY_SECRET_KEY || "XoY0LtzUQMFc8bFkePBZT6W0gSxWADAv";

export async function GET(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  
  if (errorResponse || !user) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  return NextResponse.json({
    valid: true,
    email: user.email,
    userId: user.id,
    username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  });
}

export async function POST(request: NextRequest) {
  const { errorResponse, user } = await validateRequestAuth(request);
  
  if (errorResponse || !user) {
    return NextResponse.json({ 
      valid: false,
      error: "Unauthorized" 
    }, { status: 401 });
  }

  try {
    // Get Aimovely token for the user
    const aimovelyResponse = await fetch(`${AIMOVELY_API_URL}/v1/user/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_key: AIMOVELY_APP_KEY,
        secret_key: AIMOVELY_SECRET_KEY,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        user_email: user.email,
      }),
    });

    if (!aimovelyResponse.ok) {
      const errorText = await aimovelyResponse.text();
      console.error("Aimovely login error:", errorText);
      return NextResponse.json({
        valid: false,
        error: "Failed to authenticate with Aimovely"
      }, { status: 500 });
    }

    const aimovelyData = await aimovelyResponse.json();
    
    if (aimovelyData.code !== 0) {
      console.error("Aimovely login failed:", aimovelyData);
      return NextResponse.json({
        valid: false,
        error: aimovelyData.msg || "Aimovely authentication failed"
      }, { status: 500 });
    }

    // Return user info with Aimovely token
    return NextResponse.json({
      valid: true,
      email: user.email,
      userId: user.id,
      username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      token: aimovelyData.data?.token || ""
    });

  } catch (error: any) {
    console.error("Error verifying auth:", error);
    return NextResponse.json({
      valid: false,
      error: error.message || "Internal server error"
    }, { status: 500 });
  }
}
