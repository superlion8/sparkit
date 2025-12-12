# Scripts 目录说明

## migrate-base64-to-aimovely.ts

将 `generation_tasks` 表中所有 base64 格式的 `output_image_url` 上传到 Aimovely 并替换为 CDN URL。

### 功能说明

- 查询所有 `output_image_url` 以 `data:` 开头的记录（base64 格式）
- 将 base64 图片上传到 Aimovely
- 更新数据库中的 `output_image_url` 为 Aimovely CDN URL
- 显示进度和统计信息

### 使用方法

1. **安装依赖**（如果还没有安装 dotenv）：
   ```bash
   npm install dotenv
   ```

2. **确保 `.env.local` 文件包含以下环境变量**：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   AIMOVELY_EMAIL=your_email@example.com
   AIMOVELY_VCODE=your_vcode
   ```

3. **运行脚本**：
   
   使用 tsx（推荐）：
   ```bash
   npx tsx scripts/migrate-base64-to-aimovely.ts
   ```
   
   或者使用 ts-node：
   ```bash
   npx ts-node --esm scripts/migrate-base64-to-aimovely.ts
   ```

### 脚本执行流程

1. ✅ 检查环境变量配置
2. ✅ 连接 Supabase 数据库
3. ✅ 获取 Aimovely API Token
4. ✅ 查询所有 base64 格式的 `output_image_url`
5. ✅ 逐个上传图片到 Aimovely
6. ✅ 更新数据库记录
7. ✅ 显示最终统计信息

### 输出示例

```
=== Base64 to Aimovely Migration Script ===

1. Fetching Aimovely token...
✅ Aimovely token obtained

2. Querying tasks with base64 output_image_url...
Found 150 tasks with base64 output_image_url

[1/150] Processing task abc-123 (task_abc123)...
[1/150] ✅ Task abc-123 migrated: https://xxx.cloudfront.net/xxx.png...

...

=== Migration Complete ===
Total tasks: 150
✅ Success: 145
❌ Failed: 3
⚠️  Skipped: 2
```

### 注意事项

- ⚠️ 脚本会跳过超过 10MB 的 base64 数据（可能无效或损坏）
- ⚠️ 每处理 10 条记录会输出一次进度
- ⚠️ 添加 200ms 延迟避免 API 限流
- ⚠️ 确保 `.env.local` 文件配置正确
- ⚠️ 建议先在测试环境运行，确认无误后再在生产环境执行
- ⚠️ 脚本会直接更新数据库，请确保已备份数据

