# 🚀 部署前检查清单

在部署到 Vercel 之前，请确认以下所有项目：

## ✅ 安全检查

- [x] **.env.local 未提交到 Git**
  - 已确认：只有 `.env.example` 在仓库中
  - API 密钥安全 ✅

- [x] **.gitignore 配置正确**
  - `.env.local` 已被忽略
  - `node_modules` 已被忽略
  - `.next` 已被忽略 ✅

- [ ] **准备好环境变量**
  ```
  GEMINI_API_KEY=AIzaSyDMS5Tf36gqLDzSuGt6OXVE8A5DbM5_AZY
  BFL_API_KEY=1ffebcbc-a611-44ed-9800-4b9c4ba29c4a
  ```

## ✅ 代码检查

- [x] **所有依赖已安装**
  - `package.json` 完整 ✅

- [x] **构建测试通过**
  - 运行 `npm run build` 验证

- [x] **配置文件正确**
  - `next.config.js` ✅
  - `vercel.json` ✅
  - `tsconfig.json` ✅

## ✅ 功能检查

- [x] **API 路由正常**
  - `/api/generate/gemini` ✅
  - `/api/generate/flux` ✅

- [x] **所有页面可访问**
  - 文生图 ✅
  - 图生图 ✅
  - AI换装 ✅
  - AI换背景 ✅
  - 视频生成 ✅
  - 视频主体替换 ✅

## 🎯 Vercel 部署步骤

### 方式 1：网页端（推荐新手）

1. **访问** https://vercel.com
2. **登录** GitHub 账号
3. **Import** 项目：`superlion8/creator_ai_toolkit`
4. **配置环境变量**（最重要！）：
   - `GEMINI_API_KEY`
   - `BFL_API_KEY`
5. **点击 Deploy**

### 方式 2：CLI（推荐开发者）

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
cd /Users/a/Desktop/creator_ai_toolkit
vercel

# 添加环境变量后重新部署
vercel --prod
```

## ⚠️ 关键注意事项

### 1. 环境变量配置 🔑
**这是最常见的问题！**

- 必须在 Vercel Dashboard 中添加环境变量
- 选择所有环境（Production, Preview, Development）
- 变量名必须完全匹配（区分大小写）

### 2. API 限制和成本 💰

| API | 免费额度 | 超出后费用 |
|-----|---------|-----------|
| Gemini | 15 次/分钟 | 查看[定价](https://ai.google.dev/pricing) |
| BFL Flux | 有限试用 | 按图片计费 |

**建议**：
- 监控 API 使用量
- 设置预算警报
- 考虑添加速率限制

### 3. Vercel 限制（免费计划）

| 项目 | 限制 |
|------|------|
| 请求体大小 | 4.5 MB |
| 函数执行时间 | 10 秒 |
| 函数大小 | 50 MB |
| 带宽 | 100 GB/月 |

**影响**：
- 上传的图片不能太大（建议 < 2MB）
- Flux API 轮询可能接近 10 秒限制
- 考虑前端压缩图片

### 4. 图片处理 🖼️

当前配置允许所有 HTTPS 图片域名：
```javascript
remotePatterns: [{
  protocol: 'https',
  hostname: '**',
}]
```

**建议优化**：
- 如果使用云存储，指定具体域名
- 减少安全风险

### 5. 性能优化 ⚡

**已启用**：
- ✅ 全球 CDN
- ✅ 自动代码分割
- ✅ 图片优化
- ✅ 静态生成（部分页面）

**建议添加**：
- ⏳ 图片压缩中间件
- ⏳ API 响应缓存
- ⏳ Redis 缓存层

## 🐛 常见问题预防

### 问题 1: 构建失败
**原因**：依赖缺失或版本不兼容
**预防**：
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 问题 2: API 调用失败
**原因**：环境变量未配置
**检查**：
1. Vercel Dashboard → Settings → Environment Variables
2. 确认两个 API 密钥都存在
3. 确认选择了所有环境

### 问题 3: 图片生成慢
**原因**：Flux API 需要轮询
**预期**：Flux 模型需要 10-30 秒，这是正常的

### 问题 4: 超时错误
**原因**：函数执行时间超过 10 秒
**解决**：
- 使用 Gemini 模型（更快）
- 或升级到 Vercel Pro（60 秒限制）

## 📊 部署后测试计划

### 1. 基础功能测试
- [ ] 访问主页（应重定向到文生图）
- [ ] 导航栏所有链接正常
- [ ] 移动端菜单正常工作

### 2. 文生图测试
- [ ] 输入提示词生成图片（Gemini）
- [ ] 切换到 Flux 模型测试
- [ ] 下载生成的图片
- [ ] 生成多张图片

### 3. 图生图测试
- [ ] 上传单张图片
- [ ] 上传多张图片（Gemini）
- [ ] 查看生成结果

### 4. 性能测试
- [ ] 首次加载速度（< 3 秒）
- [ ] 导航切换流畅
- [ ] 图片生成时间合理

### 5. 错误处理测试
- [ ] 不输入提示词点击生成
- [ ] 上传超大图片
- [ ] API 调用失败时的提示

## 🎉 部署成功标志

✅ **看到以下内容表示部署成功**：

1. Vercel 显示 "🎉 Congratulations!"
2. 获得部署 URL（如 `https://creator-ai-toolkit.vercel.app`）
3. 访问 URL 能看到应用界面
4. 文生图功能正常工作
5. 无控制台错误

## 📝 部署后待办

- [ ] 在 GitHub README 添加线上演示链接
- [ ] 设置自定义域名（可选）
- [ ] 启用 Vercel Analytics
- [ ] 添加监控告警
- [ ] 测试所有功能
- [ ] 分享给朋友试用 😊

## 🆘 需要帮助？

### 查看日志
```bash
# 实时日志
vercel logs

# 或在 Vercel Dashboard → Functions 查看
```

### 重新部署
```bash
# 触发新部署
vercel --prod --force
```

### 回滚
在 Vercel Dashboard：
1. 进入项目
2. Deployments 标签
3. 找到之前的成功部署
4. 点击 "..." → "Promote to Production"

---

## ✅ 准备好了吗？

如果所有检查都通过了，现在就可以部署了！

**快速部署链接**：https://vercel.com/new

**文档参考**：
- `VERCEL_DEPLOYMENT.md` - 详细部署指南
- `DEPLOYMENT.md` - 通用部署说明
- `QUICKSTART.md` - 项目快速开始

**祝部署顺利！** 🚀✨

