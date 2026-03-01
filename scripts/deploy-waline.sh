#!/bin/bash
# Waline 评论系统部署脚本
# 用法：./scripts/deploy-waline.sh

set -e

echo "🚀 开始部署 Waline 评论系统..."

# 配置变量
ECS_HOST="120.25.77.136"
ECS_USER="root"
ECS_PORT="22"
APP_DIR="/root/hxfund"

# 检查 SSH 密钥
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "❌ SSH 密钥不存在，请先配置 SSH"
    exit 1
fi

# 1. 上传 Waline 模块
echo "📤 上传 Waline 模块到 ECS..."
scp -P $ECS_PORT server/waline.js $ECS_USER@$ECS_HOST:$APP_DIR/server/

# 2. SSH 连接并重启服务
echo "🔄 重启后端服务..."
ssh -p $ECS_PORT $ECS_USER@$ECS_HOST << 'ENDSSH'
  cd /root/hxfund
  
  # 检查依赖
  if ! npm list uuid &> /dev/null; then
    echo "📦 安装 uuid 依赖..."
    npm install uuid
  fi
  
  # 重启服务
  echo "🔄 重启 PM2 服务..."
  pm2 restart hxfund-api
  
  # 等待服务启动
  sleep 3
  
  # 检查服务状态
  pm2 status hxfund-api
ENDSSH

# 3. 验证 API
echo "🧪 验证 Waline API..."
sleep 2

# 测试健康检查
WALINE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api.hxfund.cn/api/waline/health)

if [ "$WALINE_HEALTH" = "200" ]; then
    echo "✅ Waline API 健康检查通过"
else
    echo "⚠️  Waline API 健康检查失败 (HTTP $WALINE_HEALTH)"
fi

# 测试系统信息
echo "📊 系统信息:"
curl -s https://api.hxfund.cn/api/waline/system | head -c 200
echo ""

echo ""
echo "✅ Waline 部署完成！"
echo "🌐 博客地址：https://www.hxfund.cn/blog/"
echo "💬 API 地址：https://api.hxfund.cn/api/waline/"
echo ""
echo "请检查博客评论功能是否正常显示。"
