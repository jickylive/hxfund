#!/bin/bash

# hxfund 规则引擎安装脚本

set -e  # 遇到错误时退出

echo "📦 开始安装 hxfund 规则引擎..."

# 检查 Node.js 是否已安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js (版本 >= 18)"
    exit 1
fi

# 检查当前 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2)
MIN_VERSION="18.0.0"

if [ "$(printf '%s\n' "$MIN_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$MIN_VERSION" ]; then
    echo "✅ Node.js 版本: $NODE_VERSION"
else
    echo "❌ Node.js 版本过低 ($NODE_VERSION)，需要至少 $MIN_VERSION"
    exit 1
fi

echo "📍 进入当前目录 (rules)"
cd .

echo "💾 安装依赖..."
npm install

echo "🔍 验证规则配置..."
node cli.js validate

echo "📋 显示规则列表..."
node cli.js list

echo "🧪 运行规则测试..."
node cli.js test

echo "✅ hxfund 规则引擎安装完成！"

echo ""
echo "🚀 运行方式:"
echo "   cd rules"
echo "   npm start                    # 启动服务"
echo "   node cli.js list            # 列出规则"
echo "   node cli.js test            # 测试规则"
echo ""
echo "🌐 API 服务将在 http://localhost:3001 启动"
echo "📖 API 文档: http://localhost:3001/api/docs"