const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bpnflitpdjfmcyejrstf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwbmZsaXRwZGpmbWN5ZWpyc3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNzgwMzYsImV4cCI6MjA4OTg1NDAzNn0.BHPfWxaHdyS9n9MOx9w4b1hJRFCV-TJYucNGqfUrTnI';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { method, query, body } = req;

    try {
        // POST /api/sales - 创建销售记录
        if (method === 'POST') {
            const { product_id, quantity } = body;

            // 获取商品信息
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('name, price, stock')
                .eq('id', product_id)
                .single();

            if (productError) throw productError;
            if (!product) return res.status(404).json({ error: '商品不存在' });

            if (product.stock < quantity) {
                return res.status(400).json({ error: `库存不足，当前库存: ${product.stock}` });
            }

            const total_price = product.price * quantity;

            // 记录销售
            const { data: sale, error: saleError } = await supabase
                .from('sales')
                .insert([{ product_id, quantity, total_price }])
                .select()
                .single();

            if (saleError) throw saleError;

            // 更新库存
            const { error: updateError } = await supabase
                .from('products')
                .update({ stock: product.stock - quantity })
                .eq('id', product_id);

            if (updateError) throw updateError;

            return res.status(201).json({
                message: '销售成功',
                product_name: product.name,
                quantity,
                total_price
            });
        }

        // GET /api/sales - 销售报表
        if (method === 'GET') {
            let request = supabase
                .from('sales')
                .select('*, products(name)')
                .order('created_at', { ascending: false });

            if (query.startDate) {
                request = request.gte('created_at', query.startDate);
            }
            if (query.endDate) {
                request = request.lte('created_at', query.endDate);
            }

            const { data, error } = await request;

            if (error) throw error;

            // 按日期汇总
            const byDate = {};
            data.forEach(sale => {
                const date = sale.created_at.split('T')[0];
                if (!byDate[date]) {
                    byDate[date] = { date, total: 0, quantity: 0, orders: 0 };
                }
                byDate[date].total += sale.total_price;
                byDate[date].quantity += sale.quantity;
                byDate[date].orders += 1;
            });

            const result = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
            return res.status(200).json(result);
        }

        return res.status(404).json({ error: 'Not found' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
