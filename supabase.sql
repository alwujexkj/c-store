-- 便利店管理系统 - Supabase 数据库表结构

-- 商品表
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    barcode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    spec TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 10,
    image TEXT,
    category TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 进货单表
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    supplier TEXT,
    total_amount REAL,
    total_quantity INTEGER,
    status TEXT DEFAULT 'pending',
    raw_data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 入库明细表
CREATE TABLE IF NOT EXISTS purchase_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    quantity INTEGER,
    unit_price REAL
);

-- 销售记录表
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER,
    total_price REAL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 启用 RLS（行级安全）
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- 公开读取策略（前端需要读取数据）
CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON purchase_orders FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON purchase_items FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON sales FOR SELECT USING (true);

-- 公开写入策略（前端需要写入数据）
CREATE POLICY "Enable insert for all users" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON products FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON products FOR DELETE USING (true);

CREATE POLICY "Enable insert for all users" ON purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON purchase_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON sales FOR INSERT WITH CHECK (true);

-- 插入示例商品数据
INSERT INTO products (barcode, name, spec, price, stock, min_stock, category) VALUES
('6901028001753', '中华（软）', '84s', 58.0, 10, 5, '烟草'),
('6901028001708', '利群（新版）', '84s', 26.0, 15, 10, '烟草'),
('6920202888888', '农夫山泉', '550ml', 2.0, 50, 20, '饮料'),
('6954767422031', '可口可乐', '330ml', 3.0, 30, 15, '饮料'),
('6948765423456', '康师傅方便面', '红烧牛肉面', 4.5, 25, 10, '食品'),
('6936955555555', '德芙巧克力', '42g', 8.5, 12, 5, '食品')
ON CONFLICT (barcode) DO NOTHING;
