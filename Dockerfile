FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY backend/requirements.txt .
RUN pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制后端代码
COPY backend/ .

# 创建数据目录
RUN mkdir -p /data

EXPOSE 8000

CMD ["python", "main.py"]
