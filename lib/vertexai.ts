/**
 * Vertex AI 工具函数
 * 统一管理所有 Gemini 模型的调用
 * 使用 @google-cloud/vertexai SDK
 *
 * 认证方式（Application Default Credentials）：
 * - 本地开发: gcloud auth application-default login
 * - GCP 环境: 自动使用服务账号
 * - 服务账号文件: GOOGLE_APPLICATION_CREDENTIALS 环境变量
 */
import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai";

// Vertex AI 客户端缓存
let vertexAIClient: VertexAI | null = null;

// 获取 Vertex AI 配置
export function getVertexAIConfig() {
  const projectId = process.env.VERTEX_AI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = process.env.VERTEX_AI_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

  if (!projectId) {
    throw new Error("VERTEX_AI_PROJECT_ID or GOOGLE_CLOUD_PROJECT_ID environment variable is required");
  }

  return { projectId, location };
}

// 获取 Vertex AI 客户端（单例）
export function getVertexAIClient(): VertexAI {
  if (!vertexAIClient) {
    const { projectId, location } = getVertexAIConfig();
    vertexAIClient = new VertexAI({
      project: projectId,
      location: location,
    });
  }
  return vertexAIClient;
}

// 安全设置配置
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// 调用 Vertex AI SDK (generateContent)
export async function callVertexAI(
  modelId: string,
  contents: any[],
  generationConfig: any
): Promise<any> {
  const client = getVertexAIClient();

  const model = client.getGenerativeModel({
    model: modelId,
    safetySettings: safetySettings,
  });

  const response = await model.generateContent({
    contents: contents,
    generationConfig: generationConfig,
  });

  // SDK 直接返回结构化响应
  if (!response.response.candidates) {
    throw new Error("Invalid response format from Vertex AI");
  }

  return response;
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
  const client = getVertexAIClient();

  const model = client.getGenerativeModel({
    model: modelId,
    safetySettings: safetySettings,
  });

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

  const generationConfig = {
    temperature: options?.temperature ?? 0.5,
    topP: options?.topP ?? 0.8,
    maxOutputTokens: options?.maxOutputTokens ?? 2048,
  };

  const response = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: generationConfig,
  });

  // 检查安全过滤
  const candidate = response.response.candidates?.[0];
  if (candidate?.finishReason === "SAFETY") {
    throw new Error("内容被安全过滤阻止");
  }

  const responseText = candidate?.content?.parts?.[0]?.text;

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
  const client = getVertexAIClient();

  const model = client.getGenerativeModel({
    model: modelId,
    safetySettings: safetySettings,
  });

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

  const response = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: generationConfig,
  });

  // 检查安全过滤
  const candidate = response.response.candidates?.[0];
  if (candidate?.finishReason === "SAFETY") {
    throw new Error("内容被安全过滤阻止，请尝试调整提示词或图片");
  }

  // 提取生成的图片 - 遍历所有 parts 找到图片
  let imageData: any = null;
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if ((part as any).inlineData?.data) {
        imageData = (part as any).inlineData;
        break;
      }
    }
  }

  if (!imageData || !imageData.data) {
    throw new Error("No image generated from model");
  }

  return imageData.data;
}

