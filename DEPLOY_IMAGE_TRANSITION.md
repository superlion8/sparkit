# 改图转场功能部署说明

## 快速部署步骤

### 1. 配置 Vercel 环境变量

登录 [Vercel Dashboard](https://vercel.com/dashboard)，进入项目设置，在 **Environment Variables** 中添加：

```bash
# Kling API 凭证（新增）
KLING_ACCESS_KEY=AGdY3GHRd8Bpb9pQGKJQfQTyLrNnyKeb
KLING_SECRET_KEY=8dmeQCHfQNe4khCCBmmkCaYebTrGtBRG
```

**重要提示：**
- 确保 `GEMINI_API_KEY` 已配置（改图功能需要）
- 这两个 Kling 凭证需要同时配置才能使用视频生成功能
- 配置完成后需要重新部署项目

### 2. 部署到 Vercel

#### 方式一：自动部署（推荐）
1. 将 dev 分支合并到 main 分支
2. Vercel 会自动检测并部署

```bash
git checkout main
git merge dev
git push origin main
```

#### 方式二：手动部署
在 Vercel Dashboard 中点击 "Deploy" 按钮，选择 dev 分支进行部署

### 3. 验证部署

部署完成后，访问您的应用：
1. 在左侧导航栏应该能看到"改图转场"菜单项
2. 点击进入功能页面
3. 尝试上传一张图片并进行改图测试

## 新增文件清单

### 核心功能文件
- ✅ `lib/klingAuth.ts` - Kling JWT 鉴权工具
- ✅ `app/api/generate/transition-prompt/route.ts` - 转场描述生成 API
- ✅ `app/api/kling/generate/route.ts` - 视频生成 API
- ✅ `app/api/kling/query/route.ts` - 视频状态查询 API
- ✅ `app/image-transition/page.tsx` - 改图转场页面

### 配置文件
- ✅ `.env.local.example` - 更新环境变量示例
- ✅ `components/Sidebar.tsx` - 添加导航入口

### 文档文件
- ✅ `IMAGE_TRANSITION_GUIDE.md` - 功能使用指南
- ✅ `DEPLOY_IMAGE_TRANSITION.md` - 本部署说明

## 功能测试清单

部署后请测试以下功能：

### ✅ 步骤 1：改图功能
- [ ] 上传图片成功
- [ ] 输入改图描述
- [ ] 点击生成改图
- [ ] 显示改图结果

### ✅ 步骤 2：转场描述生成
- [ ] 点击"AI 生成转场描述"
- [ ] Gemini 成功生成描述
- [ ] 可以编辑描述内容

### ✅ 步骤 3：视频生成
- [ ] 点击"生成转场视频"
- [ ] 显示生成进度
- [ ] 2-5 分钟后视频生成成功
- [ ] 可以预览视频
- [ ] 可以下载视频

## 常见问题

### Q1: 环境变量配置后不生效？
**A:** 配置环境变量后需要在 Vercel Dashboard 中点击 "Redeploy" 重新部署项目。

### Q2: 改图功能正常，但视频生成失败？
**A:** 
1. 检查 `KLING_ACCESS_KEY` 和 `KLING_SECRET_KEY` 是否正确配置
2. 查看 Vercel 部署日志中的错误信息
3. 确认 Kling API 凭证有效且有足够配额

### Q3: 视频生成一直显示"生成中"？
**A:** 
1. Kling 视频生成通常需要 2-5 分钟
2. 如果超过 5 分钟，可能是 API 负载较高，可以稍后重试
3. 检查浏览器控制台是否有错误信息

### Q4: 如何查看 API 调用日志？
**A:** 在 Vercel Dashboard 中：
1. 进入项目
2. 点击 "Functions" 标签
3. 查看各个 API 路由的调用日志和错误信息

## 性能优化建议

1. **图片压缩**：已在 `ImageUpload` 组件中实现自动压缩（>2MB 的图片）
2. **轮询优化**：视频状态查询间隔为 5 秒，最多轮询 60 次（5 分钟）
3. **错误处理**：所有 API 都有完善的错误处理和用户友好的错误提示

## 安全说明

1. **API 密钥保护**：所有 API 密钥都存储在服务器端环境变量中，不会暴露给客户端
2. **用户鉴权**：所有 API 都需要用户登录认证
3. **JWT 鉴权**：Kling API 使用标准 JWT 鉴权，token 有效期 30 分钟

## 监控建议

建议设置以下监控：
1. **API 调用频率**：监控各 API 的调用次数
2. **错误率**：监控 API 错误率
3. **响应时间**：监控 API 响应时间
4. **配额使用**：监控 Gemini 和 Kling API 的配额使用情况

## 成本估算

假设每天 100 个用户使用该功能：
- **Gemini API**：改图 + 转场描述生成，约 200 次调用/天
- **Kling API**：视频生成，约 100 次调用/天

请根据实际 API 定价计算成本。

## 技术支持

如有问题，请查看：
- 功能使用指南：`IMAGE_TRANSITION_GUIDE.md`
- Gemini API 文档：https://ai.google.dev/gemini-api/docs
- Kling API 文档：https://app.klingai.com/global/dev/document-api

## 版本信息

- **功能版本**：v1.0.0
- **发布日期**：2024-10-24
- **分支**：dev
- **提交**：fc523b3

