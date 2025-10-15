import { NextRequest, NextResponse } from "next/server";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

export async function POST(request: NextRequest) {
  try {
    const email = process.env.AIMOVELY_EMAIL;
    const vcode = process.env.AIMOVELY_VCODE;

    if (!email || !vcode) {
      return NextResponse.json(
        { error: "AIMOVELY credentials not configured" },
        { status: 500 }
      );
    }

    console.log("Verifying user credentials...");

    const response = await fetch(`${AIMOVELY_API_URL}/v1/user/verifyvcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email,
        vcode: vcode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AIMOVELY auth error:", errorText);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Authentication response:", data);

    if (data.code !== 0) {
      return NextResponse.json(
        { error: data.msg || "Authentication failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token: data.data.access_token,  // 修正：使用 access_token 而不是 token
      account_id: data.data.account_id,
      refresh_token: data.data.refresh_token,
      is_first_login: data.data.is_first_login,
    });

  } catch (error: any) {
    console.error("Error in authentication:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
