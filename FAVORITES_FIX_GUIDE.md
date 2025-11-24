# 收藏功能问题修复指南

## 问题总结

用户报告了以下三个问题：
1. ✅ 在历史记录页面点击收藏到角色，显示"添加收藏失败" (500 错误)
2. ✅ 点击历史记录收藏，实际没有收藏成功，在收藏夹不显示
3. ✅ 历史记录的单图又没有收藏按钮了

---

## 根本原因

### 问题 1 & 2: 500 错误和收藏失败

**原因:**
- 数据库迁移脚本还没有执行
- `character_favorites` 和 `global_favorites` 表缺少 `image_url` 字段
- 当 API 尝试插入 `image_url` 时，数据库报错

**验证方法:**
```sql
-- 在 Supabase SQL Editor 中执行以下查询
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'character_favorites' 
  AND column_name = 'image_url';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'global_favorites' 
  AND column_name = 'image_url';
```

如果返回空结果，说明字段不存在。

### 问题 3: 单图没有收藏按钮

**原因:**
- 代码中已经有收藏按钮
- 可能是 CSS 样式问题或者 z-index 被遮挡
- 或者用户测试的不是单图任务（是 PhotoBooth 等多图任务）

**验证方法:**
- 测试真正的单图任务（text-to-image、image-to-image）
- 检查浏览器控制台是否有 JS 错误
- 检查 DevTools 元素树，确认按钮是否存在

---

## 修复步骤

### ⚠️ 第一步：执行数据库迁移（必须！）

**在 Supabase Dashboard → SQL Editor 中执行以下 SQL:**

```sql
-- 为收藏表添加 image_url 字段，用于存储具体收藏的图片 URL

-- 1. 更新 character_favorites 表
ALTER TABLE public.character_favorites 
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.character_favorites.image_url IS '收藏的具体图片 URL（用于多图任务）';

-- 2. 更新 global_favorites 表
ALTER TABLE public.global_favorites 
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN public.global_favorites.image_url IS '收藏的具体图片 URL（用于多图任务）';

-- 3. 更新唯一约束（允许同一个 task 的不同图片被分别收藏）

-- 对于 character_favorites 表
-- 先尝试删除可能存在的各种约束名称
DO $$ 
BEGIN
  -- 删除原始的 UNIQUE 约束
  ALTER TABLE public.character_favorites 
    DROP CONSTRAINT IF EXISTS character_favorites_character_id_task_id_user_id_key;
  
  ALTER TABLE public.character_favorites 
    DROP CONSTRAINT IF EXISTS character_favorites_task_id_user_id_key;
    
  -- 删除可能存在的索引
  DROP INDEX IF EXISTS idx_character_favorites_unique;
  DROP INDEX IF EXISTS character_favorites_character_id_task_id_user_id_key;
END $$;

-- 对于 global_favorites 表
DO $$ 
BEGIN
  -- 删除原始的 UNIQUE 约束
  ALTER TABLE public.global_favorites 
    DROP CONSTRAINT IF EXISTS global_favorites_task_id_user_id_key;
    
  -- 删除可能存在的索引
  DROP INDEX IF EXISTS idx_global_favorites_unique;
  DROP INDEX IF EXISTS global_favorites_task_id_user_id_key;
END $$;

-- 添加新的唯一约束（包含 image_url）
-- 使用 COALESCE 让 NULL 被当作空字符串处理
CREATE UNIQUE INDEX idx_character_favorites_unique 
ON public.character_favorites(character_id, task_id, user_id, COALESCE(image_url, ''));

CREATE UNIQUE INDEX idx_global_favorites_unique 
ON public.global_favorites(task_id, user_id, COALESCE(image_url, ''));

-- 验证
DO $$
BEGIN
  RAISE NOTICE '✅ 迁移完成！';
  RAISE NOTICE '- character_favorites.image_url 字段已添加';
  RAISE NOTICE '- global_favorites.image_url 字段已添加';
  RAISE NOTICE '- 唯一约束已更新，支持同一任务的多张图片分别收藏';
END $$;
```

**执行后应该看到:**
```
✅ 迁移完成！
- character_favorites.image_url 字段已添加
- global_favorites.image_url 字段已添加
- 唯一约束已更新，支持同一任务的多张图片分别收藏
```

---

### 第二步：验证数据库表结构

**执行以下查询确认字段已添加:**

```sql
-- 查看 character_favorites 表结构
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'character_favorites'
ORDER BY ordinal_position;

-- 查看 global_favorites 表结构
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'global_favorites'
ORDER BY ordinal_position;

-- 查看唯一索引
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('character_favorites', 'global_favorites')
  AND indexname LIKE '%unique%';
```

**应该看到 `image_url` 字段:**
- data_type: `text`
- is_nullable: `YES`

---

### 第三步：等待 Vercel 部署完成

代码已经推送到 GitHub，Vercel 会自动部署。

**Commit:** `849d890`  
**部署地址:** https://vercel.com/superlion8/sparkit

---

### 第四步：清空浏览器缓存

由于前端代码有更新，建议：
1. 硬刷新页面 (Cmd/Ctrl + Shift + R)
2. 或清空浏览器缓存

---

## 测试步骤

### 测试 1: 收藏到角色

1. 访问 `https://sparkiai.com/history`
2. 找到一个 PhotoBooth 任务（有 3 张图）
3. **Hover 到第 2 张图**，点击红色收藏按钮
4. 在弹窗中选择「角色收藏」，选择一个角色
5. 点击「确认收藏」
6. **应该显示成功提示**，不再是 500 错误

### 测试 2: 收藏到历史记录

1. 在历史记录页面，hover 到任意一张图
2. 点击红色收藏按钮
3. 选择「历史记录收藏」
4. 点击「确认收藏」
5. **切换到「我的收藏」tab**
6. **应该能看到刚才收藏的图片**

### 测试 3: 单图收藏按钮

1. 找到一个**单图任务**（text-to-image、image-to-image）
2. Hover 到图片上
3. **右上角应该出现红色收藏按钮**
4. 点击收藏按钮
5. 应该正常弹出收藏选择框

### 测试 4: 多图分别收藏

1. 找到一个 PhotoBooth 任务（有 3 张图）
2. 分别 hover 到第 1、2、3 张图，依次点击收藏
3. 每次都应该能成功收藏
4. 切换到「我的收藏」tab
5. **应该看到 3 张不同的图片**（而不是重复的任务）

---

## 常见问题排查

### Q1: 执行迁移脚本时报错 "relation does not exist"

**原因:** 表还没有创建

**解决:** 先执行基础 schema 脚本：
```sql
-- 执行 database/characters_schema.sql
-- 执行 database/create_global_favorites_table.sql
```

### Q2: 执行迁移脚本后仍然 500 错误

**检查步骤:**
1. 确认 `image_url` 字段已存在（见"第二步"）
2. 查看 Supabase Logs → Database
3. 查看浏览器 Network 面板，查看 500 响应的详细错误信息
4. 检查 RLS 策略是否正确

### Q3: 单图看不到收藏按钮

**检查步骤:**
1. 确认是真正的单图任务（不是 PhotoBooth）
2. F12 打开 DevTools → Elements
3. 搜索 `.bg-white/90.hover:bg-white.text-red-500`
4. 检查按钮是否存在但被隐藏（opacity: 0）
5. 强制触发 hover 状态：点击元素 → :hov → :hover

### Q4: 收藏夹显示的还是整个任务而不是单张图片

**原因:** 旧数据没有 `image_url` 字段

**解决:** 
- 重新收藏一次，新的收藏会包含 `image_url`
- 或者手动清理旧收藏：
```sql
-- 清空旧收藏（谨慎操作！）
DELETE FROM character_favorites WHERE image_url IS NULL;
DELETE FROM global_favorites WHERE image_url IS NULL;
```

---

## 技术细节

### 数据库字段类型差异

| 表名 | user_id 类型 | 存储内容 |
|------|------------|---------|
| `character_favorites` | `UUID` | `auth.users(id)` |
| `global_favorites` | `TEXT` | 用户邮箱 (email) |

### API 使用对比

```typescript
// character_favorites - 使用 user.id
await supabaseAdminClient
  .from("character_favorites")
  .insert({
    user_id: user!.id,  // UUID
    // ...
  });

// global_favorites - 使用 user.email
await supabaseAdminClient
  .from("global_favorites")
  .insert({
    user_id: user!.email,  // TEXT
    // ...
  });
```

### 唯一约束逻辑

**旧约束:**
```sql
UNIQUE(character_id, task_id, user_id)
UNIQUE(task_id, user_id)
```
- 一个用户对同一个任务只能收藏一次

**新约束:**
```sql
UNIQUE(character_id, task_id, user_id, COALESCE(image_url, ''))
UNIQUE(task_id, user_id, COALESCE(image_url, ''))
```
- 一个用户对同一个任务的不同图片可以分别收藏
- 同一张图片只能收藏一次

---

## 完成确认

执行完迁移脚本并通过所有测试后，勾选以下项：

- [ ] 数据库迁移脚本已执行
- [ ] `character_favorites.image_url` 字段已添加
- [ ] `global_favorites.image_url` 字段已添加
- [ ] 唯一约束已更新
- [ ] Vercel 部署已完成
- [ ] 浏览器缓存已清空
- [ ] 收藏到角色功能正常
- [ ] 收藏到历史记录功能正常
- [ ] 单图收藏按钮正常显示
- [ ] 多图可以分别收藏
- [ ] 收藏夹正确显示具体图片

---

**修复完成时间:** 预计 5 分钟（数据库迁移 + Vercel 部署）

**下一步:** 如果问题仍然存在，请提供：
1. Supabase SQL Editor 执行结果截图
2. 浏览器 Network 面板 500 错误的 Response
3. 浏览器 Console 的完整错误信息

