# API 使用指南

本文档详细说明了项目中使用的 AI API。

## Gemini API (Nano Banana)

### 概述
Gemini 是 Google 提供的多模态 AI 模型，支持文生图和图生图。

### 端点
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent
```

### 认证
使用 API Key 认证，通过 URL 参数传递：
```
?key=YOUR_API_KEY
```

### 请求格式

**文生图：**
```json
{
  "contents": [{
    "parts": [
      { "text": "your prompt here" }
    ]
  }]
}
```

**图生图：**
```json
{
  "contents": [{
    "parts": [
      { "text": "your prompt here" },
      {
        "inlineData": {
          "mimeType": "image/jpeg",
          "data": "base64_encoded_image"
        }
      }
    ]
  }]
}
```

### 响应格式
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "inlineData": {
          "mimeType": "image/png",
          "data": "base64_encoded_result"
        }
      }]
    }
  }]
}
```

### 特点
- ✅ 支持多图输入（最多4张）
- ✅ 响应速度快（通常2-5秒）
- ✅ 结果直接返回，无需轮询
- ❌ 图像质量相对较低

### 使用示例
参见 `/app/api/generate/gemini/route.ts`

---

## BFL API (Kontext Pro)

### 概述
BFL 提供的 Flux Kontext Pro 模型，高质量图像生成。

### 端点
```
POST https://api.bfl.ai/v1/flux-kontext-pro
GET  https://api.bfl.ai/v1/get_result?id={request_id}
```

### 认证
使用 API Key 认证，通过请求头传递：
```
x-key: YOUR_API_KEY
```

### 请求格式

**启动生成：**
```json
{
  "prompt": "your prompt here",
  "input_image": "base64_encoded_image" // 可选
}
```

**轮询结果：**
```
GET /v1/get_result?id={request_id}
```

### 响应格式

**启动响应：**
```json
{
  "id": "request_id",
  "polling_url": "url_to_poll"
}
```

**轮询响应：**
```json
{
  "status": "Ready" | "Pending" | "Error",
  "result": {
    "sample": "https://url-to-image.png"
  }
}
```

### 特点
- ✅ 图像质量高
- ✅ 细节丰富
- ❌ 仅支持单图输入
- ❌ 需要轮询结果（10-30秒）
- ❌ 响应时间较长

### 使用示例
参见 `/app/api/generate/flux/route.ts`

---

## 成本对比

### Gemini API
- 免费额度：每分钟 15 次请求
- 付费：根据使用量计费
- 官方定价：[Google AI Pricing](https://ai.google.dev/pricing)

### BFL API
- 免费试用：有限次数
- 付费：按图片计费
- 官方定价：[BFL Pricing](https://docs.bfl.ai/pricing)

---

## 最佳实践

### 1. 提示词优化

**好的提示词：**
```
A professional photograph of a cat wearing a business suit, 
sitting at a desk with a laptop, natural lighting, 
high detail, 8k resolution
```

**差的提示词：**
```
cat in suit
```

### 2. 错误处理

```typescript
try {
  const response = await fetch(endpoint, options);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  const data = await response.json();
  // Process data
} catch (error) {
  console.error('Generation failed:', error);
  // Handle error
}
```

### 3. 速率限制

```typescript
// 添加延迟避免超过速率限制
await new Promise(resolve => setTimeout(resolve, 1000));
```

### 4. 图片优化

```typescript
// 压缩图片减少传输时间
const compressedImage = await compressImage(file, 1920, 0.8);
```

---

## 常见问题

### Q: Gemini API 返回错误 "Quota exceeded"
A: 超过了免费额度限制。等待一分钟后重试，或升级到付费计划。

### Q: Flux API 一直处于 Pending 状态
A: 继续轮询，通常需要 10-30 秒。如果超过 2 分钟，可能生成失败。

### Q: 图片质量不满意怎么办
A: 
1. 优化提示词，添加更多细节
2. 尝试不同的模型
3. 增加分辨率相关的描述（如 "8k", "high detail"）

### Q: 如何保存生成的图片
A: 
- 当前以 base64 返回，可直接下载
- 建议集成云存储（Supabase Storage, AWS S3, Cloudinary）
- 参考 `lib/utils.ts` 中的下载函数

---

## 未来扩展

### 建议的 API 集成

1. **视频生成：**
   - Runway ML Gen-2
   - Pika Labs
   - Stability AI Video

2. **图片编辑：**
   - Remove.bg (背景移除)
   - Clipdrop (图片增强)
   - Stability AI Inpainting

3. **存储服务：**
   - Supabase Storage
   - AWS S3
   - Cloudinary

4. **用户认证：**
   - Supabase Auth
   - NextAuth.js
   - Clerk

---

## 相关链接

- [Gemini API 文档](https://ai.google.dev/gemini-api/docs)
- [BFL API 文档](https://docs.bfl.ai/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

