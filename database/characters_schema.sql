-- Character Module Database Schema
-- 请在 Supabase SQL Editor 中执行以下 SQL 来创建所需的表

-- 1. Characters 表：存储角色信息
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  char_name TEXT NOT NULL,
  char_avatar TEXT NOT NULL, -- 头像 URL
  char_image TEXT, -- 全身照 URL (可选)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_created_at ON characters(created_at DESC);

-- 启用 Row Level Security (RLS)
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看和操作自己的角色
CREATE POLICY "Users can view their own characters"
  ON characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own characters"
  ON characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters"
  ON characters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own characters"
  ON characters FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Character Favorites 表：存储角色的收藏
CREATE TABLE IF NOT EXISTS character_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL, -- 关联 tasks 表的 task_id
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, task_id, user_id) -- 防止重复收藏
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_character_favorites_character_id ON character_favorites(character_id);
CREATE INDEX IF NOT EXISTS idx_character_favorites_task_id ON character_favorites(task_id);
CREATE INDEX IF NOT EXISTS idx_character_favorites_user_id ON character_favorites(user_id);

-- 启用 Row Level Security (RLS)
ALTER TABLE character_favorites ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看和操作自己的收藏
CREATE POLICY "Users can view their own favorites"
  ON character_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON character_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON character_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- 3. 更新 tasks 表：添加 character_id 字段（如果还没有）
-- 注意：如果 tasks 表已经存在，需要手动添加这个字段
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE SET NULL;
-- CREATE INDEX IF NOT EXISTS idx_tasks_character_id ON tasks(character_id);

-- 4. 创建 Storage Bucket：character-assets
-- 注意：需要在 Supabase Dashboard 的 Storage 部分手动创建 bucket
-- Bucket 名称：character-assets
-- Public: true (如果需要公开访问)
-- File size limit: 根据需求设置（建议 10MB）
-- Allowed MIME types: image/*, video/*

-- Storage 策略：用户只能上传和管理自己的文件
-- 在 Supabase Dashboard > Storage > Policies 中创建以下策略：

-- Policy: Users can upload their own character assets
-- INSERT policy:
-- (bucket_id = 'character-assets'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])

-- Policy: Users can view their own character assets
-- SELECT policy:
-- (bucket_id = 'character-assets'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])

-- Policy: Users can delete their own character assets
-- DELETE policy:
-- (bucket_id = 'character-assets'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])

