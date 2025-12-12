/**
 * Vertex AI Gemini API 工具函数
 * 统一管理所有 Gemini 模型的调用
 * 使用 @google/genai SDK (API Key + Vertex AI 端点)
 *
 * 环境变量配置：
 * - VERTEX_AI_API_KEY: Google Cloud API Key (绑定到服务账号)
 * - GOOGLE_GENAI_USE_VERTEXAI=true: 启用 Vertex AI 端点 (自动设置)
 */
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// 确保设置 Vertex AI 模式环境变量
if (!process.env.GOOGLE_GENAI_USE_VERTEXAI) {
  process.env.GOOGLE_GENAI_USE_VERTEXAI = "true";
}

// GenAI 客户端缓存
let genAIClient: GoogleGenAI | null = null;

// 获取 API Key
function getApiKey(): string {
  const apiKey = process.env.VERTEX_AI_API_KEY;
  if (!apiKey) {
    throw new Error("VERTEX_AI_API_KEY environment variable is required");
  }
  return apiKey;
}

// 获取 GenAI 客户端（单例）- 使用 Vertex AI 端点
export function getVertexAIClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = getApiKey();
    genAIClient = new GoogleGenAI({
      apiKey,
      // Vertex AI 模式通过环境变量 GOOGLE_GENAI_USE_VERTEXAI=true 自动启用
    });
  }
  return genAIClient;
}

// 为了向后兼容，保留这个函数
export function getVertexAIConfig() {
  return { apiKey: getApiKey() };
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

// 调用 Vertex AI Gemini API (generateContent)
export async function callVertexAI(
  modelId: string,
  contents: any[],
  generationConfig: any
): Promise<any> {
  const client = getVertexAIClient();

  // 构建最终配置，确保 aspectRatio 和 imageSize 被正确传递
  const finalConfig: any = {
    ...generationConfig,
    safetySettings: safetySettings,
  };
  
  // 调试日志：检查 imageConfig 是否在配置中
  if (generationConfig.imageConfig) {
    console.log("[callVertexAI] Generation config 包含图片参数:", {
      imageConfig: generationConfig.imageConfig,
    });
  }
  
  const response = await client.models.generateContent({
    model: modelId,
    contents: contents,
    config: finalConfig,
  });

  // 构造兼容的响应格式
  return {
    response: {
      candidates: response.candidates,
      promptFeedback: response.promptFeedback,
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
  const client = getVertexAIClient();

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

  const response = await client.models.generateContent({
    model: modelId,
    contents: [{ role: "user", parts }],
    config: {
      temperature: options?.temperature ?? 0.5,
      topP: options?.topP ?? 0.8,
      maxOutputTokens: options?.maxOutputTokens ?? 2048,
      safetySettings: safetySettings,
    },
  });

  // 检查安全过滤
  const candidate = response.candidates?.[0];
  if (candidate?.finishReason === "SAFETY") {
    throw new Error("内容被安全过滤阻止");
  }

  // 提取文本
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
    outfitImageBase64?: string;
    outfitImageMimeType?: string;
    aspectRatio?: string;
    imageSize?: "1K" | "2K" | "4K";
  }
): Promise<string> {
  const client = getVertexAIClient();

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

  // 添加服饰图片（char_cloth，如果有）
  if (options?.outfitImageBase64 && options?.outfitImageMimeType) {
    parts.push({
      inlineData: {
        mimeType: options.outfitImageMimeType,
        data: options.outfitImageBase64,
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
  const config: any = {
    responseModalities: ["IMAGE"],
    safetySettings: safetySettings,
  };

  // 图片配置 - 需要在 imageConfig 对象中
  const hasImageSize = !!options?.imageSize;
  const hasAspectRatio = options?.aspectRatio && options.aspectRatio !== "default";
  
  if (hasImageSize || hasAspectRatio) {
    config.imageConfig = {};
    if (hasImageSize) {
      config.imageConfig.imageSize = options.imageSize;
      console.log("[generateImage] 设置 imageSize:", options.imageSize);
    }
    if (hasAspectRatio) {
      config.imageConfig.aspectRatio = options.aspectRatio;
      console.log("[generateImage] 设置 aspectRatio:", options.aspectRatio);
    }
  }

  // 调试日志：检查最终配置
  console.log("[generateImage] 最终配置:", {
    hasImageConfig: !!config.imageConfig,
    imageConfig: config.imageConfig,
  });

  const response = await client.models.generateContent({
    model: modelId,
    contents: [{ role: "user", parts }],
    config: config,
  });

  // 检查安全过滤
  const candidate = response.candidates?.[0];
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
