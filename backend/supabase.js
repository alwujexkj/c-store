/**
 * 便利店管理系统 - 使用 Supabase
 * 部署方式：Vercel Serverless Functions
 */

// Supabase 配置
const supabaseUrl = 'https://bpnflitpdjfmcyejrstf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwbmZsaXRwZGpmbWN5ZWpyc3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNzgwMzYsImV4cCI6MjA4OTg1NDAzNn0.BHPfWxaHdyS9n9MOx9w4b1hJRFCV-TJYucNGqfUrTnI';

// 模拟 supabase 客户端（实际在 Vercel 上用 @supabase/supabase-js）
const createClient = () => {
    return {
        from: (table) => ({
            select: (columns = '*') => ({
                eq: (col, val) => Promise.resolve({ data: [], error: null }),
                order: (col, opts) => Promise.resolve({ data: [], error: null }),
                then: (resolve) => resolve({ data: [], error: null })
            }),
            insert: (data) => ({ select: () => Promise.resolve({ data: [data], error: null }) }),
            update: (data) => ({ eq: () => Promise.resolve({ data: [data], error: null }) }),
            delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) })
        })
    };
};

module.exports = { supabaseUrl, supabaseKey };
