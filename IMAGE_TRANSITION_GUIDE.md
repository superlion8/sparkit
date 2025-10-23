# 改图转场功能使用指南

## 功能概述

改图转场功能允许用户通过 AI 技术实现：
1. **智能改图**：使用 Nano Banana (Gemini) 模型对上传的图片进行编辑
2. **智能转场描述**：使用 Gemini 2.5 Flash 模型分析首尾帧，生成专业的转场镜头描述
3. **视频生成**：使用 Kling v2.1 模型的首尾帧能力生成流畅的转场视频

## 环境配置

### 1. Gemini API Key
已在 Vercel 环境变量中配置：
```
GEMINI_API_KEY=your_key
```

### 2. Kling API 凭证
需要在 Vercel 环境变量中添加：
```
KLING_ACCESS_KEY=AGdY3GHRd8Bpb9pQGKJQfQTyLrNnyKeb
KLING_SECRET_KEY=8dmeQCHfQNe4khCCBmmkCaYebTrGtBRG
```

**配置步骤：**
1. 登录 Vercel Dashboard
2. 进入项目设置 (Settings)
3. 点击 Environment Variables
4. 添加以上两个环境变量
5. 重新部署项目

## 使用流程

### 步骤 1：AI 改图
1. 上传原始图片
2. 输入改图描述（例如："把天空改成日落，添加云彩"）
3. 点击"生成改图"按钮
4. 等待 AI 生成改图结果

### 步骤 2：生成转场描述
1. 完成改图后，点击"AI 生成转场描述"按钮
2. Gemini 会分析首帧（原图）和尾帧（改图结果）
3. AI 自动生成专业的 5 秒转场镜头描述
4. 可以手动编辑描述以优化效果

### 步骤 3：生成转场视频
1. 确认转场描述无误
2. 点击"生成转场视频"按钮
3. 等待 2-5 分钟，视频生成中会自动轮询状态
4. 生成完成后可以预览和下载视频

## 技术实现

### API 架构

#### 1. Kling JWT 鉴权 (`lib/klingAuth.ts`)
- 实现 JWT (RFC 7519) 标准
- 包含 Header、Payload、Signature 三部分
- Token 有效期 30 分钟

#### 2. 转场描述生成 API (`/api/generate/transition-prompt`)
- 接收首帧图和尾帧图
- 调用 Gemini 2.5 Flash 模型
- 返回专业的转场镜头描述

#### 3. 视频生成 API (`/api/kling/generate`)
- 使用 Kling v2.1 模型
- 支持首尾帧输入 (image + image_tail)
- 返回任务 ID 用于轮询

#### 4. 视频状态查询 API (`/api/kling/query`)
- 通过任务 ID 查询生成状态
- 返回视频 URL（生成成功时）

### 页面组件 (`/app/image-transition/page.tsx`)
- 三步式工作流界面
- 实时状态显示
- 自动轮询视频生成状态
- 支持在线预览和下载

## 注意事项

1. **图片上传**：建议使用清晰、高质量的图片，文件大小不超过 5MB
2. **改图提示词**：描述要具体清晰，便于 AI 理解
3. **转场描述**：可以根据需要手动调整 AI 生成的描述
4. **视频生成时间**：通常需要 2-5 分钟，请耐心等待
5. **API 配额**：注意监控 API 使用量，避免超出配额

## 故障排查

### 问题：改图失败
- 检查 Gemini API Key 是否正确配置
- 确认图片格式是否支持（支持 JPG, PNG, WebP）
- 查看浏览器控制台的错误信息

### 问题：转场描述生成失败
- 确认改图步骤已成功完成
- 检查网络连接
- 重新尝试生成

### 问题：视频生成失败或超时
- 检查 Kling API 凭证是否正确
- 确认图片 URL 可访问
- 查看任务状态（可能仍在处理中）
- 如果超时，可以稍后使用任务 ID 手动查询

## API 参考文档

- **Gemini API**: https://ai.google.dev/gemini-api/docs/text-generation
- **Kling API**: https://app.klingai.com/global/dev/document-api/apiReference/model/imageToVideo
- **Kling 鉴权**: https://app.klingai.com/global/dev/document-api/apiReference/commonInfo

## 更新日志

### v1.0.0 (2024-10-24)
- ✨ 初始版本发布
- 🎨 实现 Nano Banana 改图功能
- 🎬 集成 Gemini 转场描述生成
- 🎥 集成 Kling 视频生成
- 📱 响应式界面设计

