# Vercel 部署指南 🚀

## ⚠️ 部署前检查清单

### 1. 环境变量安全 ✅
- ✅ `.env.local` 已在 `.gitignore` 中
- ✅ API 密钥未提交到 Git
- ✅ 只有示例文件（`.env.example`）在仓库中

### 2. 项目配置 ✅
- ✅ `vercel.json` 已配置
- ✅ `next.config.js` 已配置
- ✅ 所有依赖已在 `package.json` 中

### 3. API 密钥信息
你需要在 Vercel 中配置以下环境变量：

```
GEMINI_API_KEY=AIzaSyDMS5Tf36gqLDzSuGt6OXVE8A5DbM5_AZY
BFL_API_KEY=1ffebcbc-a611-44ed-9800-4b9c4ba29c4a
```

## 📋 部署步骤

### 方式 1：从 GitHub 导入（推荐）⭐

#### Step 1: 访问 Vercel
1. 打开 https://vercel.com
2. 使用 GitHub 账号登录（或注册）

#### Step 2: 导入项目
1. 点击 **"Add New..."** → **"Project"**
2. 选择 **"Import Git Repository"**
3. 找到 `superlion8/creator_ai_toolkit`
4. 点击 **"Import"**

#### Step 3: 配置项目
Vercel 会自动检测到这是 Next.js 项目，默认配置通常是正确的：

- **Framework Preset**: Next.js
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

**不需要修改这些设置！** ✅

#### Step 4: 配置环境变量 🔑
这是**最重要**的一步！

1. 展开 **"Environment Variables"** 部分
2. 添加以下变量：

   **Variable Name**: `GEMINI_API_KEY`  
   **Value**: `AIzaSyDMS5Tf36gqLDzSuGt6OXVE8A5DbM5_AZY`  
   **Environments**: 勾选所有（Production, Preview, Development）

   **Variable Name**: `BFL_API_KEY`  
   **Value**: `1ffebcbc-a611-44ed-9800-4b9c4ba29c4a`  
   **Environments**: 勾选所有（Production, Preview, Development）

3. 点击 **"Add"** 添加每个变量

#### Step 5: 部署！
1. 点击 **"Deploy"** 按钮
2. 等待构建完成（通常 2-3 分钟）
3. 看到 "🎉 Congratulations!" 就成功了！

### 方式 2：使用 Vercel CLI

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录
vercel login

# 3. 在项目目录中部署
cd /Users/a/Desktop/creator_ai_toolkit
vercel

# 4. 按提示操作
# - Set up and deploy? Yes
# - Which scope? 选择你的账号
# - Link to existing project? No
# - What's your project's name? creator-ai-toolkit
# - In which directory is your code located? ./
# - Want to override the settings? No

# 5. 添加环境变量
vercel env add GEMINI_API_KEY
# 粘贴: AIzaSyDMS5Tf36gqLDzSuGt6OXVE8A5DbM5_AZY
# 选择环境: Production, Preview, Development (全选)

vercel env add BFL_API_KEY
# 粘贴: 1ffebcbc-a611-44ed-9800-4b9c4ba29c4a
# 选择环境: Production, Preview, Development (全选)

# 6. 重新部署以应用环境变量
vercel --prod
```

## 🎯 部署后验证

### 1. 检查部署状态
访问 Vercel 给你的 URL（通常是 `https://creator-ai-toolkit.vercel.app`）

### 2. 测试功能
1. **文生图**：输入提示词，点击生成
2. **图生图**：上传图片并生成
3. **检查控制台**：按 F12，看是否有错误

### 3. 检查环境变量
在 Vercel Dashboard：
- 进入你的项目
- Settings → Environment Variables
- 确认两个 API 密钥都已配置

## ⚠️ 重要注意事项

### 1. API 密钥安全
- ✅ **从不**在前端代码中暴露 API 密钥
- ✅ 所有 API 调用都通过 `/app/api/` 路由（服务端）
- ✅ 环境变量只在服务器端可访问

### 2. API 成本控制
你当前使用的 API 密钥：
- **Gemini API**: 有免费额度，但建议监控使用量
- **BFL API**: 按使用计费，建议设置预算警报

**建议操作**：
1. 在 [Google AI Studio](https://aistudio.google.com/apikey) 监控 Gemini 使用量
2. 在 [BFL Dashboard](https://docs.bfl.ai/) 查看用量和账单
3. 考虑在代码中添加速率限制

### 3. 域名配置（可选）
如果你有自定义域名：

1. 在 Vercel 项目中：Settings → Domains
2. 添加你的域名（如 `creator.yourdomain.com`）
3. 按提示配置 DNS 记录

### 4. 性能优化建议
- ✅ Vercel 自动启用全球 CDN
- ✅ 自动图片优化已配置
- ✅ 自动代码分割已启用
- ⏳ 考虑添加 Redis 缓存（减少 API 调用）

## 🔄 后续更新

每次推送到 GitHub 的 `main` 分支，Vercel 会自动重新部署：

```bash
# 本地修改代码后
git add .
git commit -m "你的更新说明"
git push

# Vercel 会自动检测并重新部署！
```

## 🐛 常见问题

### Q: 构建失败怎么办？
A: 检查 Vercel 的构建日志：
1. 进入项目 Dashboard
2. 点击失败的部署
3. 查看 "Build Logs"
4. 通常是缺少环境变量或依赖问题

### Q: API 调用失败？
A: 检查：
1. 环境变量是否正确配置
2. API 密钥是否有效
3. 在 Vercel Dashboard 的 Functions 标签中查看运行日志

### Q: 图片上传失败？
A: Vercel 有以下限制：
- **请求体大小**: 4.5MB（Hobby 计划）
- **函数执行时间**: 10 秒（Hobby 计划）
- **建议**: 在前端压缩图片再上传

### Q: 如何查看实时日志？
A: 
```bash
# 使用 Vercel CLI
vercel logs
```

或在 Vercel Dashboard → 你的项目 → Functions 查看

### Q: 域名访问慢怎么办？
A: 
- Vercel 使用全球 CDN，首次访问可能较慢
- 检查是否是 API 调用速度慢
- 考虑升级到 Vercel Pro（更快的边缘网络）

## 📊 监控和分析

### Vercel Analytics（推荐启用）
1. 进入项目 Dashboard
2. Analytics 标签
3. 启用 Vercel Analytics
4. 免费版提供基础数据

### 性能监控
- **Speed Insights**: 查看 Core Web Vitals
- **Lighthouse 评分**: 每次部署自动运行
- **错误追踪**: 查看 Functions 日志

## 🎁 额外功能

### 预览部署
每个 Pull Request 都会自动创建预览部署：
- 测试新功能而不影响生产环境
- 获得唯一的预览 URL
- 合并后自动部署到生产

### 环境分支
- `main` 分支 → 生产环境
- `dev` 分支 → 预览环境（可配置）
- 功能分支 → 临时预览

## 🔐 安全建议

### 1. 环境变量轮换
定期更换 API 密钥：
1. 生成新的 API 密钥
2. 在 Vercel 更新环境变量
3. 触发重新部署
4. 废弃旧密钥

### 2. 速率限制
考虑添加中间件限制请求频率：
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 添加速率限制逻辑
}
```

### 3. CORS 配置
在 `next.config.js` 中配置允许的域名

## 📚 相关资源

- [Vercel 文档](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [Vercel CLI 文档](https://vercel.com/docs/cli)
- [环境变量最佳实践](https://vercel.com/docs/concepts/projects/environment-variables)

---

## 🎯 快速部署命令总结

```bash
# 如果使用 Vercel CLI
npm install -g vercel
cd /Users/a/Desktop/creator_ai_toolkit
vercel login
vercel

# 添加环境变量
vercel env add GEMINI_API_KEY
vercel env add BFL_API_KEY

# 生产部署
vercel --prod
```

**或者直接在网页端操作**（更简单！）：
1. https://vercel.com → New Project
2. Import `superlion8/creator_ai_toolkit`
3. 添加环境变量
4. Deploy！

---

**准备好了吗？** 开始部署你的 AI 创作工具到全世界！ 🌍✨

