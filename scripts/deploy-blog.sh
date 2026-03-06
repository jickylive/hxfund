#!/bin/bash
# hxfund 博客模块部署脚本
# 用于部署 Hexo 博客到虚拟主机的 /blog 子目录
# 用法：./scripts/deploy-blog.sh

set -e

echo "🚀 开始部署 hxfund 博客模块..."

# 从环境变量或默认值获取配置
FTP_HOST="${FTP_HOST:-${1}}"
FTP_USER="${FTP_USER:-${2}}"
FTP_PASS="${FTP_PASS:-${3}}"
FTP_PORT="${FTP_PORT:-21}"
FTP_REMOTE="${FTP_REMOTE:-/htdocs/blog/}"

# 检查必要参数
if [ -z "$FTP_HOST" ] || [ -z "$FTP_USER" ] || [ -z "$FTP_PASS" ]; then
    echo "❌ 必要的 FTP 参数缺失"
    echo "用法: ./scripts/deploy-blog.sh <FTP_HOST> <FTP_USER> <FTP_PASS> [FTP_PORT]"
    echo "或者设置环境变量: FTP_HOST, FTP_USER, FTP_PASS"
    exit 1
fi

# 初始化子模块（如果尚未初始化）
echo "🔄 初始化 Git 子模块..."
if [ -f ".git" ] || [ -d ".git" ]; then
    git submodule update --init --recursive blog
else
    echo "⚠️ 当前目录不是 Git 仓库，跳过子模块初始化"
fi

# 检查 blog 目录是否存在
if [ ! -d "blog" ]; then
    echo "❌ blog 目录不存在"
    echo "请确保当前目录下有 blog 子目录"
    exit 1
fi

echo "🔧 进入 blog 目录"
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

# 使用 lftp 部署到服务器
echo "📤 开始部署到服务器..."
if command -v lftp &> /dev/null; then
    # 使用 lftp (更稳定)
    lftp -c "
        set ftp:list-options -a;
        open ftp://$FTP_USER:$FTP_PASS@$FTP_HOST:$FTP_PORT;
        mkdir -p '$FTP_REMOTE';
        cd '$FTP_REMOTE';
        lcd 'blog/public/';
        mirror --reverse --delete --verbose;
        bye
    "
else
    # 如果没有 lftp，则使用 ftpsync
    echo "⚠️ lftp 未安装，使用内置部署方法..."
    
    # 检查是否安装了 hexo-deployer-ftpsync
    if npm list hexo-deployer-ftpsync &> /dev/null; then
        # 临时修改 _config.deploy.yml 以使用环境变量
        if [ -f "blog/_config.deploy.yml" ]; then
            # 备份原始配置
            cp blog/_config.deploy.yml blog/_config.deploy.yml.bak
            
            # 替换配置中的占位符
            sed -i "s|\${FTP_HOST}|$FTP_HOST|g" blog/_config.deploy.yml
            sed -i "s|\${FTP_USER}|$FTP_USER|g" blog/_config.deploy.yml
            sed -i "s|\${FTP_PASS}|$FTP_PASS|g" blog/_config.deploy.yml
            sed -i "s|\${FTP_PORT}|$FTP_PORT|g" blog/_config.deploy.yml
            sed -i "s|\${FTP_REMOTE}|$FTP_REMOTE|g" blog/_config.deploy.yml
            
            # 执行部署
            cd blog
            npx hexo deploy
            cd ..
            
            # 恢复原始配置
            mv blog/_config.deploy.yml.bak blog/_config.deploy.yml
        else
            echo "❌ 部署配置文件不存在: blog/_config.deploy.yml"
            exit 1
        fi
    else
        echo "❌ 未找到合适的部署工具 (lftp 或 hexo-deployer-ftpsync)"
        echo "请安装其中一个工具后再试"
        exit 1
    fi
fi

echo "✅ 博客模块部署完成！"
echo "🌐 博客地址：https://www.hxfund.cn/blog/"
echo ""
echo "🔍 验证部署："
echo "- 访问 https://www.hxfund.cn/blog/ 检查页面是否正常加载"
echo "- 检查 CSS/JS 资源是否正确加载"
echo "- 验证文章列表和内容是否正常显示"