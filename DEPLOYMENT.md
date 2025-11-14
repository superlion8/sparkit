# 部署指南

本文档说明如何将 Sparkit 部署到 Vercel。

## 前置准备

1. GitHub 账号
2. Vercel 账号（可以使用 GitHub 登录）
3. Gemini API Key
4. BFL API Key

## 部署步骤

### 1. 推送代码到 GitHub

```bash
cd creator_ai_toolkit
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. 在 Vercel 中导入项目

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "New Project"
3. 从 GitHub 导入你的仓库
4. Vercel 会自动检测到这是一个 Next.js 项目

### 3. 配置环境变量

在 Vercel 项目设置中，添加以下环境变量：

**Environment Variables:**
- `GEMINI_API_KEY`: 你的 Gemini API 密钥
- `BFL_API_KEY`: 你的 BFL API 密钥

**设置步骤：**
1. 进入项目的 Settings
2. 选择 Environment Variables
3. 添加上述两个变量
4. 确保选择 Production、Preview 和 Development 环境

### 4. 部署

点击 "Deploy" 按钮，Vercel 会自动：
- 安装依赖
- 构建项目
- 部署到全球 CDN

### 5. 访问网站

部署完成后，Vercel 会提供一个 URL（例如：`your-project.vercel.app`）

## 后续集成 Supabase

当你准备好集成 Supabase 时：

### 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com)
2. 创建新项目
3. 获取 API URL 和 anon key

### 2. 安装 Supabase 客户端

```bash
npm install @supabase/supabase-js
```

### 3. 添加环境变量

在 Vercel 中添加：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. 创建 Supabase 客户端

创建 `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 5. 数据库表设计示例

```sql
-- 用户生成历史
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL, -- 'text-to-image', 'image-to-image', etc.
  prompt TEXT,
  model TEXT, -- 'gemini' or 'flux'
  result_urls TEXT[], -- 生成的图片URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户配额
CREATE TABLE user_quotas (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  remaining_credits INTEGER DEFAULT 100,
  total_generated INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 自定义域名

1. 在 Vercel 项目设置中选择 "Domains"
2. 添加你的域名
3. 按照提示配置 DNS 记录

## 监控和日志

- Vercel 提供实时日志和分析
- 可以在 Dashboard 中查看部署状态、错误日志和性能指标

## 注意事项

1. **API 密钥安全**: 永远不要在客户端代码中暴露 API 密钥
2. **成本控制**: 监控 API 使用量，设置合理的限制
3. **图片存储**: 生成的图片建议存储到云存储服务（如 Supabase Storage, AWS S3, Cloudinary）
4. **速率限制**: 考虑添加速率限制防止滥用

## 常见问题

**Q: 构建失败怎么办？**
A: 检查 Vercel 的构建日志，通常是依赖问题或环境变量未设置。

**Q: API 调用失败？**
A: 确认环境变量已正确设置，并且 API 密钥有效。

**Q: 图片加载慢？**
A: 考虑使用 CDN 或图片优化服务，Next.js Image 组件会自动优化图片。

## 技术支持

如有问题，请查看：
- [Vercel 文档](https://vercel.com/docs)
- [Next.js 文档](https://nextjs.org/docs)
- [Supabase 文档](https://supabase.com/docs)

