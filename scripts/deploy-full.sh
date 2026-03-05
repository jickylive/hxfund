#!/bin/bash
# hxfund 项目统一部署脚本
# 同时部署前端和博客模块到阿里云虚拟主机
# 用法：./scripts/deploy-full.sh

set -e

echo "🚀 开始部署 hxfund 项目 (前端 + 博客)..."

# 从环境变量获取配置
FTP_HOST="${FTP_HOST:-${1}}"
FTP_USER="${FTP_USER:-${2}}"
FTP_PASS="${FTP_PASS:-${3}}"
FTP_PORT="${FTP_PORT:-21}"

# 检查必要参数
if [ -z "$FTP_HOST" ] || [ -z "$FTP_USER" ] || [ -z "$FTP_PASS" ]; then
    echo "❌ 必要的 FTP 参数缺失"
    echo "用法: ./scripts/deploy-full.sh <FTP_HOST> <FTP_USER> <FTP_PASS> [FTP_PORT]"
    echo "或者设置环境变量: FTP_HOST, FTP_USER, FTP_PASS"
    exit 1
fi

# 初始化子模块（如果尚未初始化）
echo "🔄 初始化 Git 子模块..."
if [ -f ".git" ] || [ -d ".git" ]; then
    git submodule update --init --recursive
else
    echo "⚠️ 当前目录不是 Git 仓库，跳过子模块初始化"
fi

# 部署前端
echo "🏗️ 开始构建前端..."
if [ -f "package.json" ] && [ -f "build.js" ]; then
    # 使用项目构建脚本
    node build.js
elif command -v npm &> /dev/null && [ -f "package.json" ]; then
    npm run build
else
    echo "⚠️ 未找到构建脚本，跳过前端构建"
fi

# 检查构建输出目录
FRONTEND_DIST="dist"
if [ ! -d "$FRONTEND_DIST" ]; then
    # 尝试其他可能的输出目录
    if [ -d "public" ]; then
        FRONTEND_DIST="public"
    elif [ -d "build" ]; then
        FRONTEND_DIST="build"
    else
        echo "❌ 未找到前端构建输出目录 (dist, public, build)"
        exit 1
    fi
fi

# 部署博客
echo "📚 开始构建博客模块..."
if [ -d "blog" ]; then
    cd blog
    
    # 检查并更新子模块
    if [ -f "../.git" ] || [ -d "../.git" ]; then
        git submodule update --remote --merge
    fi
    
    # 安装依赖（包括开发依赖，因为构建需要）
    echo "📦 安装博客依赖..."
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    # 生成静态文件
    echo "🔨 生成 Hexo 静态文件..."
    npx hexo clean
    npx hexo generate
    
    # 返回上级目录
    cd ..
else
    echo "❌ blog 目录不存在，无法构建博客"
    exit 1
fi

# 部署前端到根目录
echo "📤 部署前端到服务器根目录..."
if command -v lftp &> /dev/null; then
    lftp -c "
        set ftp:list-options -a;
        open ftp://$FTP_USER:$FTP_PASS@$FTP_HOST:$FTP_PORT;
        cd '/htdocs/';
        lcd '$FRONTEND_DIST/';
        mirror --reverse --delete --verbose;
        bye
    "
else
    echo "❌ 未安装 lftp，无法部署前端"
    exit 1
fi

# 部署博客到子目录
echo "📤 部署博客到服务器 /blog 子目录..."
if command -v lftp &> /dev/null; then
    lftp -c "
        set ftp:list-options -a;
        open ftp://$FTP_USER:$FTP_PASS@$FTP_HOST:$FTP_PORT;
        cd '/htdocs/blog/';
        lcd 'blog/public/';
        mirror --reverse --delete --verbose;
        bye
    "
else
    echo "❌ 未安装 lftp，无法部署博客"
    exit 1
fi

echo "✅ hxfund 项目部署完成！"
echo "🌐 主站地址：https://www.hxfund.cn"
echo "📚 博客地址：https://www.hxfund.cn/blog/"
echo ""
echo "🔍 验证部署："
echo "- 访问 https://www.hxfund.cn 检查主站是否正常"
echo "- 访问 https://www.hxfund.cn/blog/ 检查博客是否正常"
echo "- 检查所有页面元素和功能是否正常工作"