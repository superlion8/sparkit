-- Character Outfits Table: 存储角色的服饰资产
-- 请在 Supabase SQL Editor 中执行以下 SQL

-- 1. 创建 character_outfits 表
CREATE TABLE IF NOT EXISTS character_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outfit_name TEXT NOT NULL, -- 服饰名称
  outfit_image_url TEXT NOT NULL, -- 服饰图片 URL
  outfit_type TEXT DEFAULT 'general', -- 服饰类型: top, bottom, dress, accessory, general
  description TEXT, -- 服饰描述（可选）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_character_outfits_character_id ON character_outfits(character_id);
CREATE INDEX IF NOT EXISTS idx_character_outfits_user_id ON character_outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_character_outfits_created_at ON character_outfits(created_at DESC);

-- 3. 启用 Row Level Security (RLS)
ALTER TABLE character_outfits ENABLE ROW LEVEL SECURITY;

-- 4. RLS 策略：用户只能查看和操作自己的服饰
CREATE POLICY "Users can view their own outfits"
  ON character_outfits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outfits"
  ON character_outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outfits"
  ON character_outfits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outfits"
  ON character_outfits FOR DELETE
  USING (auth.uid() = user_id);

-- 5. 自动更新 updated_at 字段的触发器
CREATE OR REPLACE FUNCTION update_character_outfits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_character_outfits_updated_at
  BEFORE UPDATE ON character_outfits
  FOR EACH ROW
  EXECUTE FUNCTION update_character_outfits_updated_at();

