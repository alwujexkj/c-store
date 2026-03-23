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

    const { method, body } = req;

    try {
        // POST /api/purchase-orders - 创建进货单并入库
        if (method === 'POST') {
            const { supplier, items } = body;

            // 计算总计
            const total_amount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
            const total_quantity = items.reduce((sum, item) => sum + item.quantity, 0);

            // 创建进货单
            const { data: order, error: orderError } = await supabase
                .from('purchase_orders')
                .insert([{ 
                    supplier, 
                    total_amount, 
                    total_quantity, 
                    status: 'completed' 
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 添加入库明细并更新库存
            for (const item of items) {
                // 查找商品（模糊匹配）
                const { data: products } = await supabase
                    .from('products')
                    .select('id, stock')
                    .ilike('name', `%${item.product_name}%`)
                    .limit(1);

                let product_id = null;
                if (products && products.length > 0) {
                    product_id = products[0].id;
                    // 更新库存
                    await supabase
                        .from('products')
                        .update({ stock: products[0].stock + item.quantity })
                        .eq('id', product_id);
                }

                // 添加入库明细
                await supabase
                    .from('purchase_items')
                    .insert([{
                        order_id: order.id,
                        product_id,
                        product_name: item.product_name,
                        quantity: item.quantity,
                        unit_price: item.unit_price
                    }]);
            }

            return res.status(201).json({
                order_id: order.id,
                message: '入库成功',
                total_amount
            });
        }

        // GET /api/purchase-orders - 获取进货记录
        if (method === 'GET') {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return res.status(200).json(data);
        }

        return res.status(404).json({ error: 'Not found' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
