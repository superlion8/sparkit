-- 创建全局收藏表（用于收藏到历史记录）
CREATE TABLE IF NOT EXISTS public.global_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 索引
  UNIQUE(task_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_global_favorites_user_id ON public.global_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_global_favorites_task_id ON public.global_favorites(task_id);
CREATE INDEX IF NOT EXISTS idx_global_favorites_created_at ON public.global_favorites(created_at DESC);

-- RLS 策略
ALTER TABLE public.global_favorites ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的收藏
CREATE POLICY "Users can view their own global favorites"
  ON public.global_favorites
  FOR SELECT
  USING (true);

-- 用户可以添加收藏
CREATE POLICY "Users can add global favorites"
  ON public.global_favorites
  FOR INSERT
  WITH CHECK (true);

-- 用户可以删除自己的收藏
CREATE POLICY "Users can delete their own global favorites"
  ON public.global_favorites
  FOR DELETE
  USING (true);

COMMENT ON TABLE public.global_favorites IS '全局收藏表 - 用于收藏到历史记录';
COMMENT ON COLUMN public.global_favorites.task_id IS '生成任务 ID';
COMMENT ON COLUMN public.global_favorites.user_id IS '用户 ID（邮箱）';

