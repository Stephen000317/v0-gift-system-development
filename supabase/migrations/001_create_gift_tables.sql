-- 创建礼物接收记录表
CREATE TABLE IF NOT EXISTS gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_person TEXT NOT NULL,
  gift_name TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_value DECIMAL(10, 2) NOT NULL,
  received_date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reply_item TEXT,
  reply_date TIMESTAMP WITH TIME ZONE,
  reply_cost DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建库存表
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  source TEXT DEFAULT 'manual',
  gift_id UUID REFERENCES gifts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gifts_updated_at
  BEFORE UPDATE ON gifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_gifts_status ON gifts(status);
CREATE INDEX IF NOT EXISTS idx_gifts_received_date ON gifts(received_date);
CREATE INDEX IF NOT EXISTS idx_gifts_from_person ON gifts(from_person);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_source ON inventory(source);

-- 启用行级安全 (RLS) - 暂时允许所有操作，后续可以添加认证
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 创建允许所有操作的策略（开发阶段）
CREATE POLICY "允许所有读取操作" ON gifts FOR SELECT USING (true);
CREATE POLICY "允许所有插入操作" ON gifts FOR INSERT WITH CHECK (true);
CREATE POLICY "允许所有更新操作" ON gifts FOR UPDATE USING (true);
CREATE POLICY "允许所有删除操作" ON gifts FOR DELETE USING (true);

CREATE POLICY "允许所有读取操作" ON inventory FOR SELECT USING (true);
CREATE POLICY "允许所有插入操作" ON inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "允许所有更新操作" ON inventory FOR UPDATE USING (true);
CREATE POLICY "允许所有删除操作" ON inventory FOR DELETE USING (true);
