import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

// Aimovely API configuration
const AIMOVELY_API_URL = "https://dev.aimovely.com";

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
    // Get Aimovely credentials from environment
    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;

    if (!aimovelyEmail || !aimovelyVcode) {
      console.error("Aimovely credentials not configured");
      return NextResponse.json({
        valid: false,
        error: "Aimovely credentials not configured"
      }, { status: 500 });
    }

    // Get Aimovely token using verifyvcode endpoint
    const aimovelyResponse = await fetch(`${AIMOVELY_API_URL}/v1/user/verifyvcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: aimovelyEmail,
        vcode: aimovelyVcode,
      }),
    });

    if (!aimovelyResponse.ok) {
      const errorText = await aimovelyResponse.text();
      console.error("Aimovely token request failed:", errorText);
      return NextResponse.json({
        valid: false,
        error: "Failed to get Aimovely token"
      }, { status: 500 });
    }

    const aimovelyData = await aimovelyResponse.json();
    
    if (aimovelyData.code !== 0 || !aimovelyData.data?.access_token) {
      console.error("Aimovely token response invalid:", aimovelyData);
      return NextResponse.json({
        valid: false,
        error: aimovelyData.msg || "Failed to get Aimovely token"
      }, { status: 500 });
    }

    // Return user info with Aimovely token
    return NextResponse.json({
      valid: true,
      email: user.email,
      userId: user.id,
      username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      token: aimovelyData.data.access_token
    });

  } catch (error: any) {
    console.error("Error verifying auth:", error);
    return NextResponse.json({
      valid: false,
      error: error.message || "Internal server error"
    }, { status: 500 });
  }
}
