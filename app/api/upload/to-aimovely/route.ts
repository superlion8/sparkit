import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

/**
 * Upload image to Aimovely and return the URL
 * This is used for images that need to be used as input for other services
 */
export async function POST(request: NextRequest) {
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "需要提供文件" },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "文件必须是图片" },
        { status: 400 }
      );
    }

    // Check file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "文件太大，最大支持 10MB" },
        { status: 413 }
      );
    }

    // Get Aimovely token
    const aimovelyEmail = process.env.AIMOVELY_EMAIL;
    const aimovelyVcode = process.env.AIMOVELY_VCODE;

    if (!aimovelyEmail || !aimovelyVcode) {
      return NextResponse.json(
        { error: "Aimovely 凭证未配置" },
        { status: 500 }
      );
    }

    const aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
    if (!aimovelyToken) {
      return NextResponse.json(
        { error: "获取 Aimovely token 失败" },
        { status: 500 }
      );
    }

    // Upload to Aimovely
    const uploadFormData = new FormData();
    uploadFormData.append("file", file, file.name);
    uploadFormData.append("biz", "image_transition");

    const response = await fetch(`${AIMOVELY_API_URL}/v1/resource/upload`, {
      method: "POST",
      headers: {
        "Authorization": aimovelyToken,
      },
      body: uploadFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Aimovely 上传失败:", errorText);
      return NextResponse.json(
        { error: `上传失败: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (data.code !== 0) {
      console.error("Aimovely 上传 API 错误:", data);
      return NextResponse.json(
        { error: `上传失败: ${data.msg}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: data.data.url,
      resource_id: data.data.resource_id,
    });

  } catch (error: any) {
    console.error("上传图片错误:", error);
    return NextResponse.json(
      { error: error.message || "服务器内部错误" },
      { status: 500 }
    );
  }
}

async function fetchAimovelyToken(email: string, vcode: string): Promise<string | null> {
  try {
    const response = await fetch(`${AIMOVELY_API_URL}/v1/user/verifyvcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        vcode,
      }),
    });

    if (!response.ok) {
      console.error("Aimovely token 请求失败:", response.status);
      return null;
    }

    const data = await response.json();
    if (data.code !== 0 || !data.data?.access_token) {
      console.error("Aimovely token 响应无效:", data);
      return null;
    }

    return data.data.access_token as string;
  } catch (error) {
    console.error("获取 Aimovely token 错误:", error);
    return null;
  }
}

