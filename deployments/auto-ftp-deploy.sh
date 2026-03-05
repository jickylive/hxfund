#!/bin/bash

# 黄氏家族寻根平台 - 自动FTP发布脚本
# 使用从.env文件中读取的配置信息发布构建的前端文件

set -e  # 遇到错误时停止执行

# 从.env文件读取FTP配置
ENV_FILE="/root/hxfund/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "错误: 未找到环境配置文件 $ENV_FILE"
    exit 1
fi

echo "读取FTP配置信息..."

# 读取FTP配置
FTP_HOST=$(grep '^FTP_HOST=' "$ENV_FILE" | cut -d'=' -f2 | tr -d "'\"")
FTP_USER=$(grep '^FTP_USER=' "$ENV_FILE" | cut -d'=' -f2 | tr -d "'\"")
FTP_PASS=$(grep '^FTP_PASS=' "$ENV_FILE" | cut -d'=' -f2 | tr -d "'\"")
FTP_PORT=$(grep '^FTP_PORT=' "$ENV_FILE" | cut -d'=' -f2 | tr -d "'\"")
FTP_REMOTE=$(grep '^FTP_REMOTE=' "$ENV_FILE" | cut -d'=' -f2 | tr -d "'\"")

# 检查是否所有必需的配置都已读取
if [ -z "$FTP_HOST" ] || [ -z "$FTP_USER" ] || [ -z "$FTP_PASS" ]; then
    echo "错误: 无法从 $ENV_FILE 读取完整的FTP配置"
    exit 1
fi

# 设置默认值
FTP_PORT=${FTP_PORT:-21}
FTP_REMOTE=${FTP_REMOTE:-/htdocs/}

echo "FTP配置信息:"
echo "  主机: $FTP_HOST"
echo "  用户: $FTP_USER"
echo "  端口: $FTP_PORT"
echo "  远程目录: $FTP_REMOTE"
echo ""

# 检查构建文件是否存在
BUILD_DIR="/root/hxfund/dist"
if [ ! -d "$BUILD_DIR" ]; then
    echo "错误: 未找到构建目录 $BUILD_DIR"
    echo "请先运行 'npm run build' 生成构建文件"
    exit 1
fi

echo "检查FTP客户端..."

# 检查是否有可用的FTP客户端
if command -v lftp &> /dev/null; then
    FTP_CLIENT="lftp"
    echo "使用 lftp 客户端"
else
    echo "错误: 未找到可用的FTP客户端"
    echo "请安装 lftp 或使用系统自带的 ftp 客户端"
    echo "Ubuntu/Debian: sudo apt-get install lftp"
    echo "CentOS/RHEL: sudo yum install lftp"
    exit 1
fi

echo ""
echo "自动确认发布到FTP服务器..."

# 检查构建文件数量
FILE_COUNT=$(find "$BUILD_DIR" -type f | wc -l)
DIR_COUNT=$(find "$BUILD_DIR" -type d | wc -l)
TOTAL_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)

echo "准备发布: $FILE_COUNT 个文件, $DIR_COUNT 个目录, 总大小: $TOTAL_SIZE"

if [ "$FTP_CLIENT" = "lftp" ]; then
    # 使用lftp进行发布
    echo "使用 lftp 发布文件..."
    
    # 创建lftp脚本
    TEMP_LFTP_SCRIPT=$(mktemp)
    cat > "$TEMP_LFTP_SCRIPT" << EOF
set ftp:list-options -a;
open ftp://$FTP_USER:$FTP_PASS@$FTP_HOST:$FTP_PORT
lcd $BUILD_DIR
cd $FTP_REMOTE
mirror --reverse --delete --verbose --exclude='.DS_Store' --exclude='Thumbs.db' . .
bye
EOF

    # 执行lftp脚本
    lftp -f "$TEMP_LFTP_SCRIPT"
    
    # 清理临时脚本
    rm "$TEMP_LFTP_SCRIPT"
fi

echo ""
echo "FTP发布完成！"

# 验证发布结果
echo "验证发布结果..."
if [ "$FTP_CLIENT" = "lftp" ]; then
    # 尝试列出远程目录内容
    echo "远程目录内容:"
    lftp -c "open ftp://$FTP_USER:$FTP_PASS@$FTP_HOST:$FTP_PORT; cd $FTP_REMOTE; cls -la" 2>/dev/null || echo "无法列出远程目录内容"
fi

echo ""
echo "==========================================="
echo "发布完成!"
echo "网站URL: http://$FTP_HOST"
echo "发布时间: $(date)"
echo "==========================================="

echo ""
echo "下一步建议:"
echo "1. 访问网站验证功能是否正常"
echo "2. 检查CSS和JS文件是否正确加载"
echo "3. 验证PWA功能是否正常工作"