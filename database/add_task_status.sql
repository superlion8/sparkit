-- 为 generation_tasks 表添加状态字段

-- 添加 status 字段
ALTER TABLE public.generation_tasks
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- 添加 started_at 字段（任务开始时间）
ALTER TABLE public.generation_tasks
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 添加 completed_at 字段（任务完成时间）
ALTER TABLE public.generation_tasks
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 添加 error_message 字段（失败原因）
ALTER TABLE public.generation_tasks
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_generation_tasks_status 
  ON public.generation_tasks(status);

CREATE INDEX IF NOT EXISTS idx_generation_tasks_user_status 
  ON public.generation_tasks(email, status);

-- 添加注释
COMMENT ON COLUMN public.generation_tasks.status IS '任务状态: pending(等待中), processing(生成中), completed(已完成), failed(失败)';
COMMENT ON COLUMN public.generation_tasks.started_at IS '任务开始时间';
COMMENT ON COLUMN public.generation_tasks.completed_at IS '任务完成时间';
COMMENT ON COLUMN public.generation_tasks.error_message IS '失败时的错误信息';

