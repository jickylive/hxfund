#!/bin/bash

# 黄氏家族寻根平台 - FTP 部署脚本
# 用于将构建后的文件部署到阿里云FTP虚拟主机

set -e  # 遇到错误时退出

echo "🚀 开始部署到阿里云FTP虚拟主机..."

# 从 .env 文件加载环境变量
ENV_FILE="./.env"
if [ -f "$ENV_FILE" ]; then
    echo "📖 从 $ENV_FILE 加载环境变量..."
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo "⚠️  未找到 $ENV_FILE 文件，将使用系统环境变量"
fi

# 检查必要参数
if [ -z "$FTP_HOST" ] || [ -z "$FTP_USER" ] || [ -z "$FTP_PASS" ]; then
    echo "❌ FTP 配置缺失！请设置以下环境变量："
    echo "   方法1: 在 .env 文件中设置"
    echo "   方法2: 使用 export 命令设置系统环境变量"
    echo "      export FTP_HOST='your-ftp-host'"
    echo "      export FTP_USER='your-ftp-user'"
    echo "      export FTP_PASS='your-ftp-password'"
    echo "      export FTP_PORT='21' (可选，默认21)"
    echo "      export FTP_REMOTE='/' (可选，默认/)"
    exit 1
fi

# 设置默认值
FTP_PORT=${FTP_PORT:-21}
FTP_REMOTE=${FTP_REMOTE:-/}

# 源目录
SOURCE_DIR="./dist"

# 检查构建目录是否存在
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ 源目录不存在: $SOURCE_DIR"
    echo "   请先运行构建命令: node scripts/build.js"
    exit 1
fi

echo "📡 FTP服务器: $FTP_HOST:$FTP_PORT"
echo "👤 用户名: $FTP_USER"
echo "📁 源目录: $SOURCE_DIR"
echo "📤 目标目录: $FTP_REMOTE"

# 创建临时lftp配置文件
LFTP_PROFILE=$(mktemp)
cat > "$LFTP_PROFILE" << EOF
set ftp:list-options -a;
set sftp:auto-confirm yes;
set ssl:verify-certificate no;
open ftp://$FTP_USER:$FTP_PASS@$FTP_HOST:$FTP_PORT
cd $FTP_REMOTE
mirror -R --delete --verbose $SOURCE_DIR ./
bye
EOF

# 检查是否安装了lftp
if ! command -v lftp &> /dev/null; then
    echo "❌ lftp 未安装！请先安装:"
    echo "   Ubuntu/Debian: sudo apt-get install lftp"
    echo "   CentOS/RHEL: sudo yum install lftp"
    echo "   macOS: brew install lftp"
    rm "$LFTP_PROFILE"
    exit 1
fi

echo "📤 开始上传文件..."
lftp -f "$LFTP_PROFILE"

# 清理临时文件
rm "$LFTP_PROFILE"

echo "✅ 部署完成！"
echo ""
echo "🎉 部署成功！"
echo "🌐 您的网站现在可以通过以下地址访问:"
echo "   http://$FTP_HOST"
echo "   或者根据您的域名配置访问"