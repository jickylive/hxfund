#!/bin/bash
# hxfund 博客内容生成与构建脚本
# 用于在 hxfund 项目环境中生成和构建博客内容
# 用法：./scripts/build-blog-content.sh

set -e

echo "🔄 初始化 Git 子模块..."
if [ -f ".git" ] || [ -d ".git" ]; then
    git submodule update --init --recursive blog
else
    echo "⚠️ 当前目录不是 Git 仓库，跳过子模块初始化"
fi

echo "📚 开始构建 hxfund 博客内容..."

# 检查 blog 目录是否存在
if [ ! -d "blog" ]; then
    echo "❌ blog 目录不存在"
    echo "请确保当前目录下有 blog 子目录"
    exit 1
fi

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

# 清理之前生成的文件
echo "🧹 清理之前的构建文件..."
npx hexo clean

# 生成静态文件
echo "🔨 生成 Hexo 静态文件..."
npx hexo generate

# 检查生成的文件数量
FILE_COUNT=$(find public -type f | wc -l)
if [ "$FILE_COUNT" -gt 0 ]; then
    echo "✅ 成功生成 $FILE_COUNT 个文件"
    echo "📁 博客内容已生成到 blog/public/ 目录"
else
    echo "❌ 生成的文件数量为 0，可能存在构建错误"
    exit 1
fi

# 显示生成摘要
echo "📈 构建摘要："
POST_COUNT=$(find source/_posts -name "*.md" | wc -l)
PAGE_COUNT=$(find source -name "*.md" -not -path "source/_posts/*" | wc -l)
echo "   - 文章数量: $POST_COUNT"
echo "   - 页面数量: $PAGE_COUNT"

# 返回上级目录
cd ..

echo "✅ hxfund 博客内容构建完成！"
echo "📁 生成的文件位于: blog/public/"
echo ""
echo "💡 提示：可以使用 ./scripts/deploy-full.sh 或 ./scripts/deploy-blog.sh 来部署生成的内容"