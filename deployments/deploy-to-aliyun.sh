#!/bin/bash

# 黄氏家族寻根平台 - 阿里云虚拟主机部署脚本
# 用于将构建的前端文件部署到阿里云虚拟主机

set -e  # 遇到错误时停止执行

# 配置变量
DEPLOY_DIR="/root/hxfund"
DIST_DIR="$DEPLOY_DIR/dist"
BACKUP_DIR="$DEPLOY_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_$TIMESTAMP"

# 阿里云虚拟主机配置 (请根据实际情况修改)
# 这些变量需要在部署前设置
# ALIYUN_HOST="your-aliyun-host.com"
# ALIYUN_USER="your-username"
# ALIYUN_WEBROOT="/var/www/html"  # 阿里云虚拟主机网站根目录

echo "==========================================="
echo "黄氏家族寻根平台 - 阿里云虚拟主机部署脚本"
echo "==========================================="

# 检查是否在项目根目录
if [ ! -d "$DIST_DIR" ]; then
    echo "错误: 未找到构建目录 $DIST_DIR"
    echo "请先运行 'npm run build' 生成构建文件"
    exit 1
fi

echo "构建文件检查通过"
echo "构建时间: $(cat $DIST_DIR/manifest.json | grep -o '"buildTime": "[^"]*' | cut -d'"' -f4)"

# 询问用户是否继续部署
read -p "是否继续部署到阿里云虚拟主机? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "部署已取消"
    exit 0
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "步骤 1: 创建当前站点备份..."
# 这里假设本地有一个webroot目录用于模拟部署，实际部署时需要SSH连接到阿里云主机
if [ -d "/var/www/html/hxfund" ]; then
    echo "创建当前站点备份..."
    sudo tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C /var/www/html hxfund 2>/dev/null || echo "警告: 无法创建远程备份，可能需要SSH访问"
else
    echo "目标目录不存在，跳过备份"
fi

echo "步骤 2: 验证构建文件完整性..."
REQUIRED_FILES=(
    "$DIST_DIR/index.html"
    "$DIST_DIR/css/style.min.css"
    "$DIST_DIR/js/main.min.js"
    "$DIST_DIR/js/data.min.js"
    "$DIST_DIR/js/modules.min.js"
    "$DIST_DIR/js/script.min.js"
    "$DIST_DIR/manifest.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "错误: 缺少必要文件 $file"
        exit 1
    fi
done

echo "所有必要文件检查通过"

echo "步骤 3: 准备部署文件..."

# 创建临时部署目录
TEMP_DEPLOY_DIR="/tmp/hxfund_deploy_$TIMESTAMP"
mkdir -p "$TEMP_DEPLOY_DIR"

# 复制构建文件到临时目录
cp -r "$DIST_DIR"/* "$TEMP_DEPLOY_DIR/"

echo "文件已复制到临时目录: $TEMP_DEPLOY_DIR"

echo "步骤 4: 部署到阿里云虚拟主机..."

# 这里提供几种部署方式的示例：

echo "部署方式选择:"
echo "1) SCP (通过SSH传输)"
echo "2) RSYNC (通过SSH同步)"
echo "3) 本地复制 (仅用于测试)"
echo "4) FTP (需要lftp工具)"

read -p "请选择部署方式 (1-4): " -n 1 -r
echo

case $REPLY in
    1)
        echo "使用SCP方式部署..."
        read -p "请输入阿里云主机IP或域名: " ALIYUN_HOST
        read -p "请输入用户名: " ALIYUN_USER
        read -s -p "请输入密码或私钥路径: " ALIYUN_PASS
        echo
        read -p "请输入网站根目录 (默认: /var/www/html): " WEBROOT_INPUT
        WEBROOT=${WEBROOT_INPUT:-"/var/www/html"}
        
        # 创建远程目录
        ssh "$ALIYUN_USER@$ALIYUN_HOST" "mkdir -p $WEBROOT/hxfund"
        
        # 传输文件
        scp -r "$TEMP_DEPLOY_DIR"/* "$ALIYUN_USER@$ALIYUN_HOST:$WEBROOT/hxfund/"
        ;;
    2)
        echo "使用RSYNC方式部署..."
        read -p "请输入阿里云主机IP或域名: " ALIYUN_HOST
        read -p "请输入用户名: " ALIYUN_USER
        read -p "请输入网站根目录 (默认: /var/www/html): " WEBROOT_INPUT
        WEBROOT=${WEBROOT_INPUT:-"/var/www/html"}
        
        # 使用rsync同步文件
        rsync -avz --delete "$TEMP_DEPLOY_DIR/" "$ALIYUN_USER@$ALIYUN_HOST:$WEBROOT/hxfund/"
        ;;
    3)
        echo "使用本地复制方式 (仅用于测试)..."
        read -p "请输入本地网站根目录 (默认: /tmp/test-webroot): " WEBROOT_INPUT
        WEBROOT=${WEBROOT_INPUT:-"/tmp/test-webroot"}
        
        # 创建目标目录
        mkdir -p "$WEBROOT/hxfund"
        
        # 复制文件
        cp -r "$TEMP_DEPLOY_DIR"/* "$WEBROOT/hxfund/"
        echo "文件已复制到: $WEBROOT/hxfund/"
        ;;
    4)
        echo "使用FTP方式部署..."
        if ! command -v lftp &> /dev/null; then
            echo "错误: 未找到lftp命令，请先安装"
            echo "Ubuntu/Debian: sudo apt-get install lftp"
            echo "CentOS/RHEL: sudo yum install lftp"
            exit 1
        fi
        
        read -p "请输入FTP服务器地址: " FTP_HOST
        read -p "请输入FTP用户名: " FTP_USER
        read -s -p "请输入FTP密码: " FTP_PASS
        echo
        read -p "请输入远程目录 (默认: /htdocs): " FTP_DIR
        FTP_DIR=${FTP_DIR:-"/htdocs"}
        
        # 使用lftp上传文件
        lftp -c "
            open ftp://$FTP_USER:$FTP_PASS@$FTP_HOST
            mkdir -p hxfund
            cd hxfund
            mirror -R --delete-first $TEMP_DEPLOY_DIR . 
        "
        ;;
    *)
        echo "无效选择，退出部署"
        rm -rf "$TEMP_DEPLOY_DIR"
        exit 1
        ;;
esac

echo "步骤 5: 验证部署..."
echo "部署完成！请验证以下内容："
echo "- 检查网站是否正常访问"
echo "- 验证CSS和JS文件是否正确加载"
echo "- 测试所有功能是否正常工作"

echo "部署信息:"
echo "- 部署时间: $(date)"
echo "- 部署文件: $(find $TEMP_DEPLOY_DIR -type f | wc -l) 个文件"
echo "- 部署大小: $(du -sh $TEMP_DEPLOY_DIR | cut -f1)"

# 清理临时文件
echo "清理临时文件..."
rm -rf "$TEMP_DEPLOY_DIR"

echo "==========================================="
echo "部署完成！"
echo "如有问题，请检查备份: $BACKUP_DIR"
echo "==========================================="

# 提供回滚说明
echo
echo "如需回滚到之前的版本，请使用备份文件:"
echo "tar -xzf $BACKUP_DIR/$BACKUP_NAME.tar.gz -C /var/www/html"