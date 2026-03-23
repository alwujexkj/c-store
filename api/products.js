const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bpnflitpdjfmcyejrstf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwbmZsaXRwZGpmbWN5ZWpyc3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNzgwMzYsImV4cCI6MjA4OTg1NDAzNn0.BHPfWxaHdyS9n9MOx9w4b1hJRFCV-TJYucNGqfUrTnI';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { method, query, body } = req;

    try {
        // GET /api/products - 获取商品列表
        if (method === 'GET' && !query.barcode) {
            let request = supabase.from('products').select('*').order('created_at', { ascending: false });
            
            if (query.category) {
                request = supabase.from('products').select('*').eq('category', query.category);
            }
            
            const { data, error } = await request;
            
            if (error) throw error;
            return res.status(200).json(data);
        }

        // GET /api/products?barcode=xxx - 条码查询
        if (method === 'GET' && query.barcode) {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('barcode', query.barcode)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return res.status(404).json({ error: '商品未找到' });
                }
                throw error;
            }
            return res.status(200).json(data);
        }

        // POST /api/products - 添加商品
        if (method === 'POST') {
            const { barcode, name, spec, price, stock = 0, min_stock = 10, image, category } = body;

            const { data, error } = await supabase
                .from('products')
                .insert([{ barcode, name, spec, price, stock, min_stock, image, category }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(400).json({ error: '商品条码已存在' });
                }
                throw error;
            }
            return res.status(201).json(data);
        }

        // PUT /api/products?id=xxx - 更新商品
        if (method === 'PUT' && query.id) {
            const { name, spec, price, stock, min_stock, image, category, barcode } = body;

            const { data, error } = await supabase
                .from('products')
                .update({ name, spec, price, stock, min_stock, image, category, barcode })
                .eq('id', query.id)
                .select()
                .single();

            if (error) throw error;
            return res.status(200).json(data);
        }

        // DELETE /api/products?id=xxx - 删除商品
        if (method === 'DELETE' && query.id) {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', query.id);

            if (error) throw error;
            return res.status(200).json({ message: '删除成功' });
        }

        // PATCH /api/products/stock?id=xxx - 更新库存
        if (method === 'PATCH' && query.stock && query.id) {
            const { action, quantity } = body;
            
            // 先获取当前库存
            const { data: product, error: fetchError } = await supabase
                .from('products')
                .select('stock')
                .eq('id', query.id)
                .single();

            if (fetchError) throw fetchError;

            const newStock = action === 'add' 
                ? product.stock + quantity 
                : product.stock - quantity;

            const { data, error } = await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', query.id)
                .select()
                .single();

            if (error) throw error;
            return res.status(200).json({ product_id: query.id, new_stock: newStock });
        }

        // GET /api/products/low-stock - 库存预警
        if (method === 'GET' && query.lowStock === 'true') {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .lte('stock', supabase.raw('min_stock'))
                .order('stock', { ascending: true });

            if (error) throw error;
            return res.status(200).json(data);
        }

        return res.status(404).json({ error: 'Not found' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
