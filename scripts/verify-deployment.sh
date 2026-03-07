#!/bin/bash

# 黄氏家族寻根平台 - 部署验证脚本

echo "==========================================="
echo "黄氏家族寻根平台 - 部署验证脚本"
echo "==========================================="

# 检查后端服务
echo "✓ 检查后端服务 (端口 3000)..."
if curl -sf http://localhost:3000/api/health > /dev/null; then
    echo "  ✓ 后端服务运行正常"
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
    echo "  ✓ 健康状态: $HEALTH_RESPONSE"
else
    echo "  ✗ 后端服务未运行"
fi

# 检查前端服务
echo "✓ 检查前端服务 (端口 3001)..."
if curl -sf http://localhost:3001 > /dev/null; then
    echo "  ✓ 前端服务运行正常"
else
    echo "  ✗ 前端服务未运行"
fi

# 检查API代理
echo "✓ 检查API代理功能..."
if curl -sf http://localhost:3001/api/health > /dev/null; then
    echo "  ✓ API代理正常工作"
    API_HEALTH=$(curl -s http://localhost:3001/api/health)
    echo "  ✓ API健康状态: $API_HEALTH"
else
    echo "  ✗ API代理存在问题"
fi

# 检查模型列表API
echo "✓ 检查模型列表API..."
if curl -sf http://localhost:3001/api/models > /dev/null; then
    MODEL_COUNT=$(curl -s http://localhost:3001/api/models | grep -o '"id"' | wc -l)
    echo "  ✓ 模型列表API正常 - 发现 $MODEL_COUNT 个模型"
else
    echo "  ✗ 模型列表API存在问题"
fi

# 检查认证API
echo "✓ 检查认证API..."
if curl -sf -X POST http://localhost:3001/api/auth/client-token > /dev/null; then
    echo "  ✓ 认证API正常工作"
else
    echo "  ✗ 认证API存在问题"
fi

# 检查Qwen AI组件
echo "✓ 检查Qwen AI组件..."
if curl -sf http://localhost:3001/components/qwen-ai.js > /dev/null; then
    echo "  ✓ Qwen AI组件可用"
else
    echo "  ✗ Qwen AI组件不可用"
fi

# 检查构建产物
echo "✓ 检查构建产物..."
if [ -d "/root/hxfund/dist" ]; then
    BUILD_COUNT=$(find /root/hxfund/dist -type f | wc -l)
    echo "  ✓ 构建产物正常 - $BUILD_COUNT 个文件"
else
    echo "  ✗ 构建产物目录不存在"
fi

# 检查PM2服务
echo "✓ 检查PM2服务状态..."
if command -v pm2 &> /dev/null; then
    SERVICE_COUNT=$(pm2 list | grep -c "online")
    TOTAL_COUNT=$(pm2 list | grep -E "(online|stopped|errored|launching)" | wc -l)
    echo "  ✓ PM2管理 $SERVICE_COUNT/$TOTAL_COUNT 个服务在线"
    pm2 list
else
    echo "  ⚠️  PM2未安装"
fi

echo ""
echo "==========================================="
echo "部署验证完成!"
echo "如需查看详细日志，请运行: pm2 logs"
echo "如需重启服务，请运行: pm2 restart all"
echo "==========================================="