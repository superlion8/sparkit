# Hot Mode (Qwen API) 安全配置说明

## 概述
Hot Mode 功能使用 Qwen 模型进行图像编辑。为了保护 API 端点的安全，我们采用了以下安全策略。

## 安全措施

### 1. 环境变量存储
Qwen API URL 存储在环境变量中，不会暴露在前端代码或 GitHub 仓库中。

**配置步骤：**

1. 在本地开发环境中，创建 `.env.local` 文件（该文件已被 `.gitignore` 排除）：
   ```bash
   QWEN_API_URL=https://u166586-ac0b-dea6e436.westc.gpuhub.com:8443/sync_prompt
   ```

2. 在 Vercel 部署环境中：
   - 进入项目设置 → Environment Variables
   - 添加 `QWEN_API_URL` 变量
   - 设置值为实际的 Qwen API endpoint

### 2. 后端代理
所有对 Qwen API 的调用都通过后端 API 路由 (`/api/generate/qwen`) 进行，前端不直接访问 Qwen API。

**优势：**
- 隐藏实际 API endpoint
- 可以在后端添加额外的验证和限流
- 统一的错误处理和日志记录

### 3. 身份验证
使用现有的 Supabase 身份验证系统，只有登录用户才能使用 Hot Mode 功能。

### 4. Rate Limiting（推荐添加）
建议在后端添加 rate limiting 来防止滥用：

```typescript
// 示例：使用 Redis 或内存缓存来实现简单的 rate limiting
const RATE_LIMIT = 10; // 每用户每小时最多10次请求
```

### 5. 监控和日志
- 所有 Qwen API 调用都会记录到控制台
- 可以通过 Vercel 日志或其他日志服务监控使用情况
- 异常请求会被记录并可以追踪

## 额外安全建议

### IP 白名单
如果 Qwen API 支持，建议配置 IP 白名单，只允许 Vercel 的 IP 地址访问。

### API Key 认证
如果 Qwen API 支持 API Key 认证，可以添加额外的认证层：

```typescript
// 在 .env.local 中添加
QWEN_API_KEY=your_api_key

// 在 API 路由中使用
headers: {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${process.env.QWEN_API_KEY}`
}
```

### 请求加密
对敏感数据（如 workflow JSON）可以考虑加密后再存储和传输。

### CORS 配置
确保 Qwen API 的 CORS 配置只允许来自你的域名的请求。

## 故障排查

### 环境变量未设置
如果看到错误 "QWEN_API_URL environment variable is not set"：
1. 检查 `.env.local` 文件是否存在且配置正确
2. 重启开发服务器
3. 在 Vercel 中检查环境变量是否已配置

### API 调用失败
1. 检查 Qwen API 是否可访问
2. 检查网络连接
3. 查看服务器日志获取详细错误信息

## 监控指标

建议监控以下指标：
- Hot Mode 使用频率
- API 调用成功率
- 平均响应时间
- 异常请求数量
- 每用户使用量

## 更新记录
- 2025-01-XX: 初始版本，实现基本安全措施

