# 便利店管理系统

基于 Vue3 + Supabase 的便利店管理系统。

## 功能特性

- ✅ 商品进销存管理
- ✅ 扫码枪扫描商品自动识别
- ✅ 库存预警提醒
- ✅ 销售/进货/库存报表统计
- ✅ AI 识别进货单（待配置）
- ✅ 精美现代前端界面

## 技术架构

| 层级 | 技术 |
|------|------|
| 前端 | Vue3 + Element Plus |
| 后端 | Vercel Serverless Functions |
| 数据库 | Supabase (PostgreSQL) |
| AI识别 | 待接入 |

## 快速部署

### 1. 初始化 Supabase 数据库

在 Supabase 后台 SQL Editor 中执行 `supabase.sql`

### 2. 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
cd c-store
vercel

# 或者链接已有项目
vercel link
vercel deploy --prod
```

### 3. 访问系统

部署完成后会得到一个 `.vercel.app` 域名

## 项目结构

```
c-store/
├── api/                    # Vercel API Routes
│   ├── products.js         # 商品 CRUD
│   ├── sales.js            # 销售
│   ├── purchase-orders.js  # 进货入库
│   └── reports.js          # 报表统计
├── frontend/
│   └── index.html          # 前端页面
├── supabase.sql            # 数据库表结构
├── package.json
└── vercel.json
```

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务器
vercel dev

# 访问 http://localhost:3000
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/products | 商品列表 |
| GET | /api/products?barcode=xxx | 条码查询 |
| GET | /api/products?lowStock=true | 库存预警 |
| POST | /api/products | 添加商品 |
| PUT | /api/products?id=xxx | 更新商品 |
| DELETE | /api/products?id=xxx | 删除商品 |
| POST | /api/sales | 销售 |
| POST | /api/purchase-orders | 进货入库 |
| GET | /api/reports?type=sales | 销售报表 |
| GET | /api/reports?type=inventory | 库存报表 |
| GET | /api/reports?type=purchases | 进货报表 |

## TODO

- [ ] AI 识别进货单功能
- [ ] 商品图片管理
- [ ] 数据备份/导出
