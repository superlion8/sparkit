-- 创建 character_references 表
-- 用于存储 Mimic 功能使用的参考图

CREATE TABLE IF NOT EXISTS public.character_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL,
  reference_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 外键约束
  CONSTRAINT fk_character 
    FOREIGN KEY (character_id) 
    REFERENCES public.characters(id) 
    ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_character_references_character_id ON public.character_references(character_id);
CREATE INDEX idx_character_references_created_at ON public.character_references(created_at DESC);

-- 创建唯一索引防止重复（同一角色的相同参考图只保存一次）
CREATE UNIQUE INDEX idx_character_references_unique 
  ON public.character_references(character_id, reference_image_url);

-- 启用 Row Level Security (RLS)
ALTER TABLE public.character_references ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略：用户只能访问自己角色的参考图
CREATE POLICY "Users can view their own character references"
  ON public.character_references
  FOR SELECT
  USING (
    character_id IN (
      SELECT id FROM public.characters WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own character references"
  ON public.character_references
  FOR INSERT
  WITH CHECK (
    character_id IN (
      SELECT id FROM public.characters WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own character references"
  ON public.character_references
  FOR DELETE
  USING (
    character_id IN (
      SELECT id FROM public.characters WHERE user_id = auth.uid()
    )
  );

-- 添加注释
COMMENT ON TABLE public.character_references IS '角色参考图表，存储 Mimic 功能使用的原始参考图';
COMMENT ON COLUMN public.character_references.id IS '唯一标识符';
COMMENT ON COLUMN public.character_references.character_id IS '关联的角色ID';
COMMENT ON COLUMN public.character_references.reference_image_url IS '参考图URL';
COMMENT ON COLUMN public.character_references.created_at IS '创建时间';

