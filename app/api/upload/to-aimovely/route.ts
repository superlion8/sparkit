import { NextRequest, NextResponse } from "next/server";
import { validateRequestAuth } from "@/lib/auth";

const AIMOVELY_API_URL = "https://dev.aimovely.com";

/**
 * Upload image to Aimovely and return the URL
 * This is used for images that need to be used as input for other services
 */
export async function POST(request: NextRequest) {
  console.log("=== Upload to Aimovely API Called ===");
  
  const { errorResponse } = await validateRequestAuth(request);
  if (errorResponse) {
    console.error("认证失败");
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    console.log("收到文件:", file ? `name=${file.name}, size=${file.size}, type=${file.type}` : "null");

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

    console.log("Aimovely 凭证检查:", {
      hasEmail: !!aimovelyEmail,
      hasVcode: !!aimovelyVcode
    });

    if (!aimovelyEmail || !aimovelyVcode) {
      console.error("Aimovely 凭证未配置");
      return NextResponse.json(
        { error: "Aimovely 凭证未配置" },
        { status: 500 }
      );
    }

    console.log("获取 Aimovely token...");
    const aimovelyToken = await fetchAimovelyToken(aimovelyEmail, aimovelyVcode);
    if (!aimovelyToken) {
      console.error("获取 Aimovely token 失败");
      return NextResponse.json(
        { error: "获取 Aimovely token 失败" },
        { status: 500 }
      );
    }
    console.log("Aimovely token 获取成功");

    // Upload to Aimovely
    const uploadFormData = new FormData();
    uploadFormData.append("file", file, file.name);
    uploadFormData.append("biz", "image_transition");

    console.log("上传到 Aimovely:", `${AIMOVELY_API_URL}/v1/resource/upload`);
    const response = await fetch(`${AIMOVELY_API_URL}/v1/resource/upload`, {
      method: "POST",
      headers: {
        "Authorization": aimovelyToken,
      },
      body: uploadFormData,
    });

    console.log("Aimovely 响应状态:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Aimovely 上传失败:", errorText);
      return NextResponse.json(
        { error: `上传失败: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Aimovely 响应数据:", JSON.stringify(data, null, 2));
    
    if (data.code !== 0) {
      console.error("Aimovely 上传 API 错误:", data);
      return NextResponse.json(
        { error: `上传失败: ${data.msg}` },
        { status: 500 }
      );
    }

    console.log("上传成功:", data.data.url);
    return NextResponse.json({
      url: data.data.url,
      resource_id: data.data.resource_id,
    });

  } catch (error: any) {
    console.error("上传图片错误:", error);
    console.error("错误堆栈:", error.stack);
    return NextResponse.json(
      { error: error.message || "服务器内部错误" },
      { status: 500 }
    );
  }
}

async function fetchAimovelyToken(email: string, vcode: string): Promise<string | null> {
  try {
    console.log("请求 Aimovely token:", `${AIMOVELY_API_URL}/v1/user/verifyvcode`);
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

    console.log("Token 请求响应状态:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Aimovely token 请求失败:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("Token 响应数据:", JSON.stringify(data, null, 2));
    
    if (data.code !== 0 || !data.data?.access_token) {
      console.error("Aimovely token 响应无效:", data);
      return null;
    }

    console.log("Token 获取成功");
    return data.data.access_token as string;
  } catch (error) {
    console.error("获取 Aimovely token 错误:", error);
    return null;
  }
}

