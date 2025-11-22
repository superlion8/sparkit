# Character 模块快速设置指南

## 问题：上传头像失败

如果遇到"上传头像失败"的错误，请按照以下步骤检查配置：

### 1. 创建 Storage Bucket

在 Supabase Dashboard 中：

1. 进入 **Storage** 页面
2. 点击 **New bucket**
3. 填写以下信息：
   - **Name**: `character-assets`
   - **Public bucket**: ✅ **必须勾选**（这样才能通过 public URL 访问图片）
   - **File size limit**: 10 MB（或根据需求设置）
   - **Allowed MIME types**: `image/*, video/*`（或留空允许所有类型）
4. 点击 **Create bucket**

**重要提示**：如果 bucket 不是 public，图片将无法通过 public URL 访问，导致头像不显示。

### 2. 配置 Storage 策略

在 Supabase Dashboard > Storage > Policies 中，为 `character-assets` bucket 创建以下策略：

#### INSERT Policy（允许用户上传自己的文件）

```sql
(bucket_id = 'character-assets'::text) AND 
((auth.uid())::text = (storage.foldername(name))[1])
```

#### SELECT Policy（允许用户查看自己的文件）

```sql
(bucket_id = 'character-assets'::text) AND 
((auth.uid())::text = (storage.foldername(name))[1])
```

#### DELETE Policy（允许用户删除自己的文件）

```sql
(bucket_id = 'character-assets'::text) AND 
((auth.uid())::text = (storage.foldername(name))[1])
```

### 3. 验证配置

创建角色时，如果仍然失败，请检查：

1. **Bucket 名称**：确保 bucket 名称是 `character-assets`（完全匹配）
2. **Bucket 状态**：确保 bucket 已创建且状态为 Active
3. **策略配置**：确保所有三个策略都已创建并启用
4. **浏览器控制台**：查看详细的错误信息

### 4. 常见错误

#### 错误：`Bucket not found` 或 `does not exist`
- **原因**：Storage bucket 未创建
- **解决**：按照步骤 1 创建 bucket

#### 错误：`new row violates row-level security`
- **原因**：Storage 策略未配置或配置错误
- **解决**：按照步骤 2 配置策略

#### 错误：`File size exceeds limit`
- **原因**：文件大小超过限制
- **解决**：在 bucket 设置中增加文件大小限制，或压缩图片

### 5. 测试

创建角色时，系统会自动检查 bucket 是否存在。如果不存在，会显示清晰的错误提示。

### 6. 调试

如果问题仍然存在，请检查：

1. **服务器日志**：查看 Vercel 或部署平台的日志
2. **浏览器控制台**：查看前端错误信息
3. **Network 标签**：查看 API 请求和响应

## 文件路径结构

上传的文件会按照以下结构存储：

```
character-assets/
  └── characters/
      └── {user_id}/
          ├── {timestamp}-avatar-{filename}
          └── {timestamp}-image-{filename}
```

例如：
```
character-assets/characters/123e4567-e89b-12d3-a456-426614174000/1704067200000-avatar-avatar.jpg
```

## 注意事项

1. 文件名中的特殊字符会被替换为下划线 `_`
2. 每个用户只能访问自己文件夹下的文件
3. 删除角色时会自动删除相关的存储文件
4. 建议定期清理未使用的文件以节省存储空间

