# Sparkit - 项目总览

## 🎨 项目简介

Sparkit 是一个强大的 AI 驱动的图像和视频生成编辑工具集，基于 Next.js 14 和 React 18 构建，集成了 Google Gemini 和 BFL Flux API。

## ✨ 核心功能

### 已实现功能

1. **文生图 (Text-to-Image)** ✅
   - 支持 Gemini 和 Flux 两种模型
   - 可调整生成数量（1-4张）
   - 支持多种宽高比选择
   - 实时生成预览和下载

2. **图生图 (Image-to-Image)** ✅
   - 支持多图输入（最多4张，Gemini模型）
   - 智能图像编辑和变换
   - 保持原图风格同时进行修改

3. **AI 换装** ✅
   - 模特图 + 商品图 = 穿搭效果图
   - 支持多件商品组合搭配
   - 自动保持光线和背景一致

4. **AI 换背景** ✅
   - 上传人物图片
   - 自定义背景描述
   - 预设背景快速选择
   - 可选姿势调整

5. **视频生成** 🚧
   - 6种动画模板
   - 图片转视频
   - （需要集成视频生成 API）

6. **视频主体替换** ✅
   - 集成 RunningHub ComfyUI API
   - 视频中的主体替换
   - 智能动作匹配
   - 支持多种视频格式
   - 自动轮询任务状态

## 🏗️ 技术架构

### 前端
- **框架**: Next.js 14 (App Router)
- **UI 库**: React 18
- **样式**: Tailwind CSS
- **语言**: TypeScript
- **图标**: Lucide React

### 后端
- **API Routes**: Next.js API Routes
- **AI 模型**:
  - Google Gemini 2.0 Flash (图像生成)
  - BFL Flux Kontext Pro (高质量图像生成)

### 部署
- **平台**: Vercel (推荐)
- **数据库**: Supabase (可选，未来集成)
- **存储**: 建议集成 Supabase Storage 或 S3

## 📁 项目结构

```
creator_ai_toolkit/
├── app/                          # Next.js 应用目录
│   ├── api/                      # API 路由
│   │   └── generate/
│   │       ├── gemini/          # Gemini API 端点
│   │       └── flux/            # Flux API 端点
│   ├── text-to-image/           # 文生图页面
│   ├── image-to-image/          # 图生图页面
│   ├── outfit-change/           # AI 换装页面
│   ├── background-replace/      # AI 换背景页面
│   ├── video-generation/        # 视频生成页面
│   ├── video-subject-replace/   # 视频主体替换页面
│   ├── layout.tsx               # 根布局
│   ├── page.tsx                 # 首页（重定向）
│   ├── error.tsx                # 错误页面
│   ├── loading.tsx              # 加载页面
│   ├── not-found.tsx            # 404 页面
│   └── globals.css              # 全局样式
├── components/                   # React 组件
│   ├── Sidebar.tsx              # 侧边栏导航
│   ├── ImageGrid.tsx            # 图片网格展示
│   ├── ImageUpload.tsx          # 图片上传组件
│   ├── LoadingSpinner.tsx       # 加载动画
│   └── ErrorBoundary.tsx        # 错误边界
├── lib/                         # 工具函数库
│   └── utils.ts                 # 通用工具函数
├── types/                       # TypeScript 类型定义
│   └── index.ts                 # 全局类型
├── public/                      # 静态资源
│   └── favicon.ico
├── .env.local                   # 环境变量（含 API 密钥）
├── .env.example                 # 环境变量示例
├── package.json                 # 项目依赖
├── tsconfig.json                # TypeScript 配置
├── tailwind.config.ts           # Tailwind 配置
├── next.config.js               # Next.js 配置
├── vercel.json                  # Vercel 部署配置
├── README.md                    # 项目说明
├── QUICKSTART.md                # 快速开始指南
├── DEPLOYMENT.md                # 部署指南
├── API_GUIDE.md                 # API 使用指南
└── PROJECT_OVERVIEW.md          # 项目总览（本文件）
```

## 🎯 设计特点

### UI/UX
- 🎨 参考 nanobanana.ai 的现代化设计
- 🌈 紫色主题色（Primary: #a855f7）
- 📱 完全响应式设计，支持移动端
- 🎭 抽屉式移动端菜单
- ✨ 悬停显示下载按钮
- 🔄 清晰的控制面板与结果展示分离

### 代码质量
- ✅ TypeScript 类型安全
- ✅ 模块化组件设计
- ✅ 错误边界和错误处理
- ✅ 加载状态管理
- ✅ 响应式布局

## 🔑 API 配置

### Gemini API
- **密钥**: 已配置在 `.env.local`
- **模型**: gemini-2.0-flash-exp
- **特点**: 
  - 支持多图输入
  - 响应快（2-5秒）
  - 免费额度充足

### BFL API
- **密钥**: 已配置在 `.env.local`
- **模型**: flux-kontext-pro
- **特点**:
  - 图像质量高
  - 需要轮询（10-30秒）
  - 仅支持单图输入

### RunningHub API
- **密钥**: 已配置在 `.env.local`
- **服务**: ComfyUI 工作流
- **特点**:
  - 视频主体替换
  - 处理时间：3-10分钟
  - 支持多种视频格式
  - Workflow ID: 1977672819733684226

## 🚀 快速开始

```bash
# 1. 进入项目目录
cd /Users/a/Desktop/creator_ai_toolkit

# 2. 安装依赖（已完成）
npm install

# 3. 运行开发服务器
npm run dev

# 4. 打开浏览器
# 访问 http://localhost:3000
```

## 📦 部署到 Vercel

```bash
# 1. 提交代码到 Git
git init
git add .
git commit -m "Initial commit"

# 2. 推送到 GitHub
git remote add origin <your-repo-url>
git push -u origin main

# 3. 在 Vercel 导入项目
# 4. 配置环境变量
# 5. 部署！
```

详细步骤见 `DEPLOYMENT.md`

## 🔮 未来扩展计划

### 短期计划
1. ✅ 基础图像生成功能
2. ✅ 图像编辑功能
3. ⏳ 用户历史记录
4. ⏳ 收藏功能
5. ⏳ 批量处理

### 中期计划
1. 🔲 集成 Supabase
   - 用户认证
   - 数据存储
   - 文件存储
2. 🔲 用户配额系统
3. 🔲 支付集成（Stripe）
4. 🔲 社区分享功能

### 长期计划
1. 🔲 视频生成（Runway ML / Pika Labs）
2. 🔲 视频编辑（Wonder Studio）
3. 🔲 高级图像编辑工具
4. 🔲 AI 训练自定义模型
5. 🔲 移动应用

## 📊 性能优化

- ✅ Next.js 自动代码分割
- ✅ 图片懒加载
- ✅ API 路由优化
- ⏳ 图片压缩
- ⏳ CDN 集成
- ⏳ Redis 缓存

## 🛡️ 安全性

- ✅ API 密钥存储在环境变量
- ✅ 服务端 API 调用
- ✅ 输入验证
- ⏳ 速率限制
- ⏳ 用户认证
- ⏳ CORS 配置

## 📝 开发规范

### Git 提交规范
```
feat: 新功能
fix: 修复问题
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

### 代码风格
- 使用 TypeScript
- ESLint + Prettier
- 组件使用 PascalCase
- 函数使用 camelCase
- 常量使用 UPPER_CASE

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 📞 联系方式

- 项目位置: `/Users/a/Desktop/creator_ai_toolkit`
- 开发服务器: http://localhost:3000

## 🙏 致谢

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Google Gemini](https://ai.google.dev/)
- [BFL AI](https://bfl.ai/)
- [Lucide Icons](https://lucide.dev/)

---

**版本**: 0.1.0  
**更新日期**: 2025-10-13  
**状态**: 开发中 🚧

祝你使用愉快！✨

