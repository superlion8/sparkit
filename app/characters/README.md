# Character 模块使用说明

## 概述

Character 模块是一个以"角色"为基础的功能模块，允许用户创建和管理角色，并为每个角色生成和管理内容（图片和视频）。

## 功能特性

1. **角色管理**
   - 创建角色（名称、头像、全身照）
   - 查看角色列表
   - 删除角色

2. **资源管理**
   - 查看为角色生成的所有图片和视频（Assets）
   - 收藏喜欢的内容（Favorites）
   - 取消收藏

## 数据库设置

### 1. 执行 SQL Schema

在 Supabase SQL Editor 中执行 `database/characters_schema.sql` 文件中的 SQL 语句：

```sql
-- 创建 characters 表
-- 创建 character_favorites 表
-- 添加 RLS 策略
```

### 2. 添加 character_id 字段到 generation_tasks 表

```sql
ALTER TABLE generation_tasks 
ADD COLUMN IF NOT EXISTS character_id UUID 
REFERENCES characters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_generation_tasks_character_id 
ON generation_tasks(character_id);
```

### 3. 创建 Storage Bucket

在 Supabase Dashboard > Storage 中：

1. 创建新的 bucket，名称为 `character-assets`
2. 设置为 Public（如果需要公开访问）
3. 设置文件大小限制（建议 10MB）
4. 允许的 MIME 类型：`image/*`, `video/*`

### 4. 配置 Storage 策略

在 Supabase Dashboard > Storage > Policies 中创建以下策略：

**INSERT Policy:**
```sql
(bucket_id = 'character-assets'::text) AND 
((auth.uid())::text = (storage.foldername(name))[1])
```

**SELECT Policy:**
```sql
(bucket_id = 'character-assets'::text) AND 
((auth.uid())::text = (storage.foldername(name))[1])
```

**DELETE Policy:**
```sql
(bucket_id = 'character-assets'::text) AND 
((auth.uid())::text = (storage.foldername(name))[1])
```

## API 路由

### Characters

- `GET /api/characters` - 获取用户的所有角色
- `POST /api/characters` - 创建新角色
- `GET /api/characters/[id]` - 获取角色详情
- `DELETE /api/characters/[id]` - 删除角色

### Assets

- `GET /api/characters/[id]/assets` - 获取角色的所有资源

### Favorites

- `GET /api/characters/[id]/favorites` - 获取角色的所有收藏
- `POST /api/characters/[id]/favorites` - 添加收藏
- `DELETE /api/characters/[id]/favorites?task_id=xxx` - 取消收藏

## 前端页面

- `/characters` - 角色列表页面
- `/characters/[id]` - 角色详情页面（包含 Assets 和 Favorites 两个标签页）

## 使用流程

1. **创建角色**
   - 进入 `/characters` 页面
   - 点击"创建角色"按钮
   - 填写角色名称（必填）
   - 上传角色头像（必填）
   - 上传全身照（可选）
   - 点击"创建角色"

2. **查看角色资源**
   - 点击角色卡片进入详情页
   - 在"资源"标签页查看所有生成的内容
   - 点击心形图标收藏喜欢的内容

3. **查看收藏**
   - 在角色详情页切换到"收藏"标签页
   - 查看所有收藏的内容
   - 点击心形图标取消收藏

## 后续集成

当与其他功能（如 Mimic）集成时，需要在生成任务时传入 `character_id`：

```typescript
await logTaskEvent(accessToken, {
  taskId,
  taskType: "mimic",
  characterId: characterId, // 添加这个字段
  prompt,
  inputImageUrl,
  outputImageUrl,
});
```

然后在 `lib/tasks.ts` 中更新 `TaskLogPayload` 接口和 `logGenerationTask` 函数来支持 `character_id`。

## 注意事项

1. 用户必须登录才能创建和管理角色
2. 每个用户只能查看和管理自己的角色
3. 删除角色会同时删除相关的收藏记录
4. 角色头像和全身照存储在 Supabase Storage 中
5. Assets 通过 `character_id` 字段关联到 `generation_tasks` 表

