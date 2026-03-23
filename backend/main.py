"""
便利店管理系统 - 后端 API
"""
import os
import sqlite3
import base64
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import json

app = FastAPI(title="便利店管理系统 API")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 数据库路径
DB_PATH = "/data/c-store.db"

def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化数据库"""
    conn = get_db()
    c = conn.cursor()
    
    # 商品表
    c.execute('''CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        spec TEXT,
        price REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 10,
        image TEXT,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # 进货单表
    c.execute('''CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier TEXT,
        total_amount REAL,
        total_quantity INTEGER,
        status TEXT DEFAULT 'pending',
        raw_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # 入库明细表
    c.execute('''CREATE TABLE IF NOT EXISTS purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        product_name TEXT,
        quantity INTEGER,
        unit_price REAL,
        FOREIGN KEY (order_id) REFERENCES purchase_orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )''')
    
    # 销售记录表
    c.execute('''CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        quantity INTEGER,
        total_price REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
    )''')
    
    conn.commit()
    conn.close()

# 启动时初始化数据库
init_db()

# ============ 数据模型 ============

class Product(BaseModel):
    id: Optional[int] = None
    barcode: str
    name: str
    spec: Optional[str] = None
    price: float
    stock: int = 0
    min_stock: int = 10
    image: Optional[str] = None
    category: Optional[str] = None

class PurchaseItem(BaseModel):
    product_name: str
    quantity: int
    unit_price: float

class PurchaseOrder(BaseModel):
    supplier: Optional[str] = None
    items: List[PurchaseItem]

# ============ API 路由 ============

@app.get("/")
def root():
    return {"message": "便利店管理系统 API", "version": "1.0.0"}

# 商品管理
@app.get("/api/products")
def get_products(barcode: Optional[str] = None):
    conn = get_db()
    c = conn.cursor()
    
    if barcode:
        c.execute("SELECT * FROM products WHERE barcode = ?", (barcode,))
    else:
        c.execute("SELECT * FROM products ORDER BY created_at DESC")
    
    rows = c.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@app.post("/api/products")
def add_product(product: Product):
    conn = get_db()
    c = conn.cursor()
    
    try:
        c.execute('''INSERT INTO products (barcode, name, spec, price, stock, min_stock, image, category)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                  (product.barcode, product.name, product.spec, product.price,
                   product.stock, product.min_stock, product.image, product.category))
        conn.commit()
        product_id = c.lastrowid
        conn.close()
        return {"id": product_id, "message": "商品添加成功"}
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="商品条码已存在")

@app.put("/api/products/{product_id}")
def update_product(product_id: int, product: Product):
    conn = get_db()
    c = conn.cursor()
    
    c.execute('''UPDATE products SET barcode=?, name=?, spec=?, price=?, 
                 stock=?, min_stock=?, image=?, category=? WHERE id=?''',
              (product.barcode, product.name, product.spec, product.price,
               product.stock, product.min_stock, product.image, product.category, product_id))
    conn.commit()
    conn.close()
    
    return {"message": "商品更新成功"}

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM products WHERE id=?", (product_id,))
    conn.commit()
    conn.close()
    return {"message": "商品删除成功"}

# 扫码查询
@app.get("/api/products/barcode/{barcode}")
def get_product_by_barcode(barcode: str):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM products WHERE barcode = ?", (barcode,))
    row = c.fetchone()
    conn.close()
    
    if row:
        return dict(row)
    else:
        raise HTTPException(status_code=404, detail="商品未找到")

# 库存预警
@app.get("/api/products/low-stock")
def get_low_stock_products():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM products WHERE stock <= min_stock ORDER BY stock ASC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

# 入库/更新库存
@app.post("/api/products/{product_id}/stock")
def update_stock(product_id: int, quantity: int, action: str):
    """action: add(入库) 或 subtract(销售)"""
    conn = get_db()
    c = conn.cursor()
    
    if action == "add":
        c.execute("UPDATE products SET stock = stock + ? WHERE id=?", (quantity, product_id))
    elif action == "subtract":
        c.execute("UPDATE products SET stock = stock - ? WHERE id=?", (quantity, product_id))
    
    conn.commit()
    
    # 获取更新后的库存
    c.execute("SELECT stock FROM products WHERE id=?", (product_id,))
    new_stock = c.fetchone()[0]
    conn.close()
    
    return {"product_id": product_id, "new_stock": new_stock}

# 进货单识别（这里先留个接口，实际AI识别逻辑后续添加）
@app.post("/api/recognize-order")
async def recognize_order(file: UploadFile = File(...)):
    """AI 识别进货单"""
    # 读取图片
    contents = await file.read()
    image_base64 = base64.b64encode(contents).decode('utf-8')
    
    # 这里后续接入 OpenClaw / 大模型 API 进行识别
    # 现在先返回示例数据
    return {
        "message": "进货单识别功能待配置",
        "supplier": "测试供应商",
        "items": [],
        "raw_image": image_base64[:100] + "..."
    }

# 进货单入库
@app.post("/api/purchase-orders")
def create_purchase_order(order: PurchaseOrder):
    conn = get_db()
    c = conn.cursor()
    
    # 计算总计
    total_amount = sum(item.unit_price * item.quantity for item in order.items)
    total_quantity = sum(item.quantity for item in order.items)
    
    # 创建进货单
    c.execute('''INSERT INTO purchase_orders (supplier, total_amount, total_quantity, status)
                 VALUES (?, ?, ?, 'completed')''',
               (order.supplier, total_amount, total_quantity))
    order_id = c.lastrowid
    
    # 添加入库明细并更新库存
    for item in order.items:
        # 查找商品
        c.execute("SELECT id FROM products WHERE name LIKE ?", (f"%{item.product_name}%",))
        product = c.fetchone()
        
        if product:
            product_id = product[0]
            c.execute("UPDATE products SET stock = stock + ? WHERE id=?", (item.quantity, product_id))
        else:
            product_id = None
        
        c.execute('''INSERT INTO purchase_items (order_id, product_id, product_name, quantity, unit_price)
                     VALUES (?, ?, ?, ?, ?)''',
                  (order_id, product_id, item.product_name, item.quantity, item.unit_price))
    
    conn.commit()
    conn.close()
    
    return {"order_id": order_id, "message": "入库成功", "total_amount": total_amount}

# 销售
@app.post("/api/sales")
def create_sale(product_id: int, quantity: int):
    conn = get_db()
    c = conn.cursor()
    
    # 获取商品信息和当前库存
    c.execute("SELECT name, price, stock FROM products WHERE id=?", (product_id,))
    product = c.fetchone()
    
    if not product:
        conn.close()
        raise HTTPException(status_code=404, detail="商品不存在")
    
    name, price, stock = product
    
    if stock < quantity:
        conn.close()
        raise HTTPException(status_code=400, detail=f"库存不足，当前库存: {stock}")
    
    total_price = price * quantity
    
    # 记录销售
    c.execute("INSERT INTO sales (product_id, quantity, total_price) VALUES (?, ?, ?)",
              (product_id, quantity, total_price))
    
    # 更新库存
    c.execute("UPDATE products SET stock = stock - ? WHERE id=?", (quantity, product_id))
    
    conn.commit()
    conn.close()
    
    return {
        "message": "销售成功",
        "product_name": name,
        "quantity": quantity,
        "total_price": total_price
    }

# 报表统计
@app.get("/api/reports/sales")
def get_sales_report(start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_db()
    c = conn.cursor()
    
    query = '''
        SELECT 
            DATE(created_at) as date,
            SUM(total_price) as total,
            SUM(quantity) as quantity,
            COUNT(*) as orders
        FROM sales
    '''
    
    params = []
    if start_date:
        query += " WHERE created_at >= ?"
        params.append(start_date)
    if end_date:
        query += " AND created_at <= ?"
        params.append(end_date)
    
    query += " GROUP BY DATE(created_at) ORDER BY date DESC"
    
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@app.get("/api/reports/inventory")
def get_inventory_report():
    conn = get_db()
    c = conn.cursor()
    
    c.execute('''
        SELECT 
            category,
            COUNT(*) as product_count,
            SUM(stock) as total_stock,
            SUM(stock * price) as total_value
        FROM products
        GROUP BY category
    ''')
    
    rows = c.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@app.get("/api/reports/purchases")
def get_purchase_report():
    conn = get_db()
    c = conn.cursor()
    
    c.execute('''
        SELECT 
            supplier,
            COUNT(*) as order_count,
            SUM(total_amount) as total_amount,
            SUM(total_quantity) as total_quantity
        FROM purchase_orders
        GROUP BY supplier
        ORDER BY total_amount DESC
    ''')
    
    rows = c.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
