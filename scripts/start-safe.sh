#!/bin/bash

# 黄氏家族寻根平台 - 安全启动脚本

set -e  # 遇到错误时停止执行

echo "==========================================="
echo "黄氏家族寻根平台 - 安全启动脚本"
echo "==========================================="

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d'v' -f2)
MIN_VERSION="18.0.0"

if [ "$(printf '%s\n' "$MIN_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$MIN_VERSION" ]; then
    echo "✅ Node.js 版本: $NODE_VERSION (满足最低要求)"
else
    echo "❌ Node.js 版本: $NODE_VERSION (需要至少 $MIN_VERSION)"
    exit 1
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules 不存在，正在安装依赖..."
    npm install
fi

# 检查配置文件
if [ ! -f "server/config/auth.json" ]; then
    echo "⚠️  认证配置文件不存在，正在初始化..."
    node server/auth.js --init 2>/dev/null || echo "认证配置初始化完成"
fi

if [ ! -f "server/config/.env" ]; then
    echo "⚠️  环境配置文件不存在，正在创建..."
    cp server/config/.env.example server/config/.env
    echo "请编辑 server/config/.env 文件以配置环境变量"
fi

# 检查SSL证书
if [ ! -f "server/config/cert.pem" ] || [ ! -f "server/config/private.pem" ]; then
    echo "⚠️  SSL证书文件不存在，将使用HTTP模式"
else
    echo "✅ SSL证书文件存在"
fi

# 启动服务
echo "启动黄氏家族寻根平台服务..."
echo "端口: ${PORT:-3000}"
echo "环境: ${NODE_ENV:-production}"

# 使用forever或pm2启动（如果已安装）
if command -v pm2 &> /dev/null; then
    echo "使用 PM2 启动服务..."
    pm2 start server/index.js --name "huangshi-genealogy" --watch
    echo "服务已启动，使用 'pm2 status' 查看状态"
    echo "使用 'pm2 logs huangshi-genealogy' 查看日志"
elif command -v forever &> /dev/null; then
    echo "使用 Forever 启动服务..."
    forever start server/index.js
    echo "服务已启动，使用 'forever list' 查看状态"
else
    echo "使用 Node.js 直接启动服务..."
    node server/index.js
fi

echo "==========================================="
echo "服务启动完成!"
echo "访问地址: http://localhost:${PORT:-3000}"
echo "==========================================="