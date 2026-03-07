#!/bin/bash

# 黄氏家族寻根平台 - 部署脚本

set -e  # 遇到错误时停止执行

echo "==========================================="
echo "黄氏家族寻根平台 - 部署脚本"
echo "==========================================="

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请以root权限运行此脚本"
    echo "使用: sudo $0"
    exit 1
fi

# 检查必要工具
for cmd in node npm git docker docker-compose; do
    if ! command -v $cmd &> /dev/null; then
        echo "错误: $cmd 未安装"
        exit 1
    fi
done

echo "✓ 环境检查通过"

# 定义目录
PROJECT_DIR="/root/hxfund"
DIST_DIR="/root/hxfund/dist"
BACKUP_DIR="/root/hxfund/backups"

# 创建必要目录
mkdir -p $DIST_DIR $BACKUP_DIR

# 创建备份
echo "步骤 1: 创建当前版本备份..."
BACKUP_NAME="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf $BACKUP_NAME -C /root hxfund --exclude=node_modules --exclude=dist

echo "✓ 备份已创建: $(basename $BACKUP_NAME)"

# 安装依赖
echo "步骤 2: 安装依赖..."
cd $PROJECT_DIR
npm ci --only=production

# 构建项目
echo "步骤 3: 构建项目..."
npm run build:all

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
    echo "PM2 未安装，正在安装..."
    npm install -g pm2
    pm2 startup
fi

# 停止现有服务
echo "步骤 4: 停止现有服务..."
pm2 stop all || true

# 启动服务
echo "步骤 5: 启动服务..."
cd $PROJECT_DIR
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save

# 验证服务
echo "步骤 6: 验证服务..."
sleep 10

# 检查服务状态
if pm2 list | grep -q "online"; then
    echo "✓ 服务启动成功"
    pm2 status
else
    echo "✗ 服务启动失败"
    pm2 logs
    exit 1
fi

# 输出部署信息
echo ""
echo "==========================================="
echo "部署完成!"
echo ""
echo "服务状态:"
echo "- API 服务: http://localhost:3000"
echo "- 前端服务: http://localhost:3001"
echo ""
echo "管理命令:"
echo "- 查看日志: pm2 logs"
echo "- 重启服务: pm2 restart all"
echo "- 停止服务: pm2 stop all"
echo "- 服务状态: pm2 status"
echo ""
echo "备份位置: $BACKUP_DIR"
echo "==========================================="

# 验证API服务
echo "验证API服务..."
if curl -sf http://localhost:3000/api/health > /dev/null; then
    echo "✓ API 服务运行正常"
else
    echo "⚠️  API 服务可能存在问题"
fi

# 验证前端服务
echo "验证前端服务..."
if curl -sf http://localhost:3001 > /dev/null; then
    echo "✓ 前端服务运行正常"
else
    echo "⚠️  前端服务可能存在问题"
fi