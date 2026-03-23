#!/bin/bash

# 便利店管理系统 - 一键部署脚本

set -e

echo "🏪 便利店管理系统部署中..."

# 1. 安装 Docker（如果没有）
if ! command -v docker &> /dev/null; then
    echo "📦 安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
fi

# 2. 安装 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "📦 安装 Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 3. 创建数据目录
mkdir -p /data

# 4. 启动服务
echo "🚀 启动服务..."
docker-compose up -d --build

# 5. 检查状态
echo "✅ 检查服务状态..."
sleep 3
docker-compose ps

echo ""
echo "🎉 部署完成！"
echo "   访问前端: http://<你的IP>"
echo "   API地址:  http://<你的IP>:8000"
echo ""
