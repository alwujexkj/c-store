const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bpnflitpdjfmcyejrstf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwbmZsaXRwZGpmbWN5ZWpyc3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNzgwMzYsImV4cCI6MjA4OTg1NDAzNn0.BHPfWxaHdyS9n9MOx9w4b1hJRFCV-TJYucNGqfUrTnI';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { query } = req;
    const type = query.type || 'sales';

    try {
        // 销售报表
        if (type === 'sales') {
            const { data: sales, error } = await supabase
                .from('sales')
                .select('created_at, total_price, quantity')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 按日期汇总
            const byDate = {};
            sales.forEach(sale => {
                const date = sale.created_at.split('T')[0];
                if (!byDate[date]) {
                    byDate[date] = { date, total: 0, quantity: 0, orders: 0 };
                }
                byDate[date].total += sale.total_price;
                byDate[date].quantity += sale.quantity;
                byDate[date].orders += 1;
            });

            return res.status(200).json(Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)));
        }

        // 库存报表
        if (type === 'inventory') {
            const { data: products, error } = await supabase
                .from('products')
                .select('category, stock, price');

            if (error) throw error;

            // 按分类汇总
            const byCategory = {};
            products.forEach(p => {
                const cat = p.category || '未分类';
                if (!byCategory[cat]) {
                    byCategory[cat] = { category: cat, product_count: 0, total_stock: 0, total_value: 0 };
                }
                byCategory[cat].product_count += 1;
                byCategory[cat].total_stock += p.stock;
                byCategory[cat].total_value += p.stock * p.price;
            });

            return res.status(200).json(Object.values(byCategory));
        }

        // 进货报表
        if (type === 'purchases') {
            const { data: orders, error } = await supabase
                .from('purchase_orders')
                .select('supplier, total_amount, total_quantity')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 按供应商汇总
            const bySupplier = {};
            orders.forEach(o => {
                const supplier = o.supplier || '未知';
                if (!bySupplier[supplier]) {
                    bySupplier[supplier] = { supplier, order_count: 0, total_amount: 0, total_quantity: 0 };
                }
                bySupplier[supplier].order_count += 1;
                bySupplier[supplier].total_amount += o.total_amount;
                bySupplier[supplier].total_quantity += o.total_quantity;
            });

            const result = Object.values(bySupplier).sort((a, b) => b.total_amount - a.total_amount);
            return res.status(200).json(result);
        }

        return res.status(404).json({ error: 'Unknown report type' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
