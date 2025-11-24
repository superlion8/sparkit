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
-- 先删除旧的唯一约束
ALTER TABLE public.character_favorites DROP CONSTRAINT IF EXISTS character_favorites_task_id_user_id_key;
ALTER TABLE public.global_favorites DROP CONSTRAINT IF EXISTS global_favorites_task_id_user_id_key;

-- 添加新的唯一约束（包含 image_url）
CREATE UNIQUE INDEX IF NOT EXISTS idx_character_favorites_unique 
ON public.character_favorites(character_id, task_id, user_id, COALESCE(image_url, ''));

CREATE UNIQUE INDEX IF NOT EXISTS idx_global_favorites_unique 
ON public.global_favorites(task_id, user_id, COALESCE(image_url, ''));

