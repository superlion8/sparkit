/**
 * Vertex AI 工具函数
 * 统一管理所有 Gemini 模型的调用
 * 使用 Vertex AI REST API
 * 
 * 认证方式：
 * - VERTEX_AI_API_KEY: OAuth2 access token (Bearer token)
 *   可以通过服务账号获取：gcloud auth print-access-token
 *   或者使用服务账号 JSON 文件通过 Google Auth Library 获取
 */
// 获取 Vertex AI 配置
export function getVertexAIConfig() {
  const projectId = process.env.VERTEX_AI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.VERTEX_AI_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
  // 注意：这里应该是 OAuth2 access token，不是 API Key
  // 可以通过 gcloud auth print-access-token 获取
  const accessToken = process.env.VERTEX_AI_API_KEY || process.env.VERTEX_AI_ACCESS_TOKEN;
  
  if (!projectId) {
    throw new Error("VERTEX_AI_PROJECT_ID or GOOGLE_CLOUD_PROJECT_ID environment variable is required");
  }
  
  if (!accessToken) {
    throw new Error("VERTEX_AI_API_KEY or VERTEX_AI_ACCESS_TOKEN environment variable is required (should be OAuth2 access token)");
  }
  
  return { projectId, location, apiKey: accessToken };
}

// 调用 Vertex AI REST API (generateContent)
export async function callVertexAI(
  modelId: string,
  contents: any[],
  generationConfig: any
): Promise<any> {
  const { projectId, location, apiKey } = getVertexAIConfig();
  
  // Vertex AI generateContent REST API 端点
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:generateContent`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: contents,
      generationConfig: generationConfig,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Vertex AI API error:", errorText);
    throw new Error(`Vertex AI API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Vertex AI generateContent 返回格式: { candidates: [...] }
  if (!data.candidates) {
    throw new Error("Invalid response format from Vertex AI");
  }
  
  return {
    response: {
      candidates: data.candidates,
    },
  };
}

// 调用文本生成模型（如 gemini-3-pro-preview）
export async function generateText(
  modelId: string,
  prompt: string,
  imageBase64?: string,
  mimeType?: string,
  options?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
  }
): Promise<string> {
  const parts: any[] = [];
  
  // 如果有图片，先添加图片
  if (imageBase64 && mimeType) {
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    });
  }
  
  // 添加文本提示
  parts.push({ text: prompt });
  
  const contents = [{ role: "user", parts }];
  
  const generationConfig = {
    temperature: options?.temperature ?? 0.5,
    topP: options?.topP ?? 0.8,
    maxOutputTokens: options?.maxOutputTokens ?? 2048,
  };
  
  const response = await callVertexAI(modelId, contents, generationConfig);
  
  const responseText = response.response.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!responseText) {
    throw new Error("No text response from model");
  }
  
  return responseText;
}

// 调用图片生成模型（如 gemini-3-pro-image-preview）
export async function generateImage(
  modelId: string,
  prompt: string,
  options?: {
    imageBase64?: string;
    mimeType?: string;
    characterImageBase64?: string;
    characterImageType?: string;
    charAvatarBase64?: string;
    charAvatarMimeType?: string;
    aspectRatio?: string;
    imageSize?: "1K" | "2K";
  }
): Promise<string> {
  const parts: any[] = [];
  
  // 添加 char_avatar（如果有，应该最先添加）
  if (options?.charAvatarBase64 && options?.charAvatarMimeType) {
    parts.push({
      inlineData: {
        mimeType: options.charAvatarMimeType,
        data: options.charAvatarBase64,
      },
    });
  }
  
  // 添加角色图片（char_image，如果有）
  if (options?.characterImageBase64 && options?.characterImageType) {
    parts.push({
      inlineData: {
        mimeType: options.characterImageType,
        data: options.characterImageBase64,
      },
    });
  }
  
  // 添加背景图片（如果有）
  if (options?.imageBase64 && options?.mimeType) {
    parts.push({
      inlineData: {
        mimeType: options.mimeType,
        data: options.imageBase64,
      },
    });
  }
  
  // 添加文本提示
  parts.push({ text: prompt });
  
  const contents = [{ role: "user", parts }];
  
  // 构建生成配置
  const generationConfig: any = {
    responseModalities: ["IMAGE"],
  };
  
  // 图片配置
  const imageConfig: any = {};
  if (options?.imageSize) {
    imageConfig.imageSize = options.imageSize;
  }
  if (options?.aspectRatio && options.aspectRatio !== "default") {
    imageConfig.aspectRatio = options.aspectRatio as "1:1" | "16:9" | "9:16";
  }
  
  if (Object.keys(imageConfig).length > 0) {
    generationConfig.imageConfig = imageConfig;
  }
  
  const response = await callVertexAI(modelId, contents, generationConfig);
  
  // 提取生成的图片
  const imageData = response.response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  
  if (!imageData || !imageData.data) {
    throw new Error("No image generated from model");
  }
  
  return imageData.data;
}

