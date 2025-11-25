-- 为 generation_tasks 表添加背景图URL字段

-- 添加 background_image_url 字段
ALTER TABLE public.generation_tasks
ADD COLUMN IF NOT EXISTS background_image_url TEXT;

-- 添加注释
COMMENT ON COLUMN public.generation_tasks.background_image_url IS '背景图URL（用于mimic等功能的重新生成）';
