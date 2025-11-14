# 快速开始

欢迎使用 Sparkit！这是一个强大的 AI 图像和视频生成工具。

## 安装依赖

```bash
cd creator_ai_toolkit
npm install
```

## 配置环境变量

1. 复制环境变量示例文件：
```bash
cp .env.example .env.local
```

2. 编辑 `.env.local` 文件，填入你的 API 密钥（已经预填好了）：
```
GEMINI_API_KEY=AIzaSyDMS5Tf36gqLDzSuGt6OXVE8A5DbM5_AZY
BFL_API_KEY=1ffebcbc-a611-44ed-9800-4b9c4ba29c4a
```

## 运行开发服务器

```bash
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 功能介绍

### 1. 文生图 (Text-to-Image)
- 输入文本描述
- 选择 AI 模型（Nano Banana 或 Kontext Pro）
- 设置生成数量和宽高比
- 点击生成，获得精美图像

### 2. 图生图 (Image-to-Image)
- 上传 1-4 张图片
- 输入编辑描述
- 选择模型和参数
- AI 会根据你的描述编辑图片

### 3. AI 换装
- 上传模特图片（1张）
- 上传商品图片（最多3张）
- 可选添加额外描述
- AI 生成穿搭效果图

### 4. AI 换背景
- 上传人物图片
- 描述想要的背景
- 可选调整姿势
- 支持预设背景快速选择

### 5. 视频生成 (开发中)
- 选择动画模板
- 上传图片
- 生成动态视频
- 注：需要集成专业视频生成 API

### 6. 视频主体替换 (开发中)
- 上传视频文件
- 上传替换主体图片
- AI 替换视频中的主体
- 注：需要集成高级 AI 视频编辑服务

## 技术栈

- **框架**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS
- **语言**: TypeScript
- **图标**: Lucide React
- **API**: 
  - Gemini API (Nano Banana 模型)
  - BFL API (Kontext Pro 模型)

## 项目结构

```
creator_ai_toolkit/
├── app/                      # Next.js App Router 页面
│   ├── api/                  # API 路由
│   │   └── generate/         # 图像生成 API
│   ├── text-to-image/        # 文生图页面
│   ├── image-to-image/       # 图生图页面
│   ├── outfit-change/        # AI 换装页面
│   ├── background-replace/   # AI 换背景页面
│   ├── video-generation/     # 视频生成页面
│   └── video-subject-replace/# 视频主体替换页面
├── components/               # React 组件
│   ├── Sidebar.tsx           # 侧边栏导航
│   ├── ImageGrid.tsx         # 图片网格展示
│   ├── ImageUpload.tsx       # 图片上传组件
│   └── LoadingSpinner.tsx    # 加载动画
├── lib/                      # 工具函数
│   └── utils.ts              # 通用工具
├── types/                    # TypeScript 类型定义
│   └── index.ts
├── public/                   # 静态资源
└── styles/                   # 样式文件
```

## API 路由

### `/api/generate/gemini`
使用 Gemini (Nano Banana) 模型生成图像
- 支持文生图
- 支持图生图（多图）

### `/api/generate/flux`
使用 BFL (Kontext Pro) 模型生成图像
- 支持文生图
- 支持图生图（单图）

## 开发提示

1. **热重载**: 修改代码后会自动刷新浏览器
2. **类型检查**: 使用 TypeScript 获得更好的开发体验
3. **样式**: 使用 Tailwind CSS 类名快速构建 UI
4. **API 密钥**: 存储在环境变量中，不会暴露给客户端

## 下一步

1. **部署到 Vercel**: 查看 `DEPLOYMENT.md` 了解详情
2. **集成 Supabase**: 添加用户认证和数据存储
3. **添加更多功能**: 
   - 用户历史记录
   - 收藏功能
   - 批量处理
   - 图片编辑工具

## 常见问题

**Q: 生成速度慢？**
A: 这取决于 API 响应速度。Flux 模型需要轮询结果，可能需要 10-30 秒。

**Q: 如何更换 API 密钥？**
A: 修改 `.env.local` 文件，重启开发服务器。

**Q: 支持哪些图片格式？**
A: 支持 JPEG, PNG, WebP, GIF 等常见格式。

**Q: 生成的图片保存在哪？**
A: 目前以 base64 格式返回，可以直接下载。建议集成云存储服务。

## 需要帮助？

- 查看 [Next.js 文档](https://nextjs.org/docs)
- 查看 [Gemini API 文档](https://ai.google.dev/gemini-api/docs)
- 查看 [BFL API 文档](https://docs.bfl.ai/)

祝你使用愉快！🎨✨

