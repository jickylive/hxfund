#!/bin/bash
# SSL 证书部署脚本
# 用法：./deploy-ssl-cert.sh

set -e

# 配置变量
ECS_HOST="${ECS_HOST:-api.hxfund.cn}"
ECS_USER="${ECS_USER:-root}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_rsa}"

echo "========================================"
echo "SSL 证书部署脚本"
echo "========================================"
echo "目标主机：$ECS_HOST"
echo "目标用户：$ECS_USER"
echo "SSH 密钥：$SSH_KEY"
echo "========================================"

# 检查证书文件是否存在
if [ ! -f "server/config/ssl_certificate.crt" ]; then
    echo "错误：未找到证书文件 server/config/ssl_certificate.crt"
    exit 1
fi

if [ ! -f "server/config/ssl_private.key" ]; then
    echo "错误：未找到私钥文件 server/config/ssl_private.key"
    exit 1
fi

echo "✓ 证书文件检查通过"

# 上传证书文件
echo "正在上传证书文件..."
scp -i "$SSH_KEY" server/config/ssl_certificate.crt ${ECS_USER}@${ECS_HOST}:~/ssl_certificate.crt
scp -i "$SSH_KEY" server/config/ssl_private.key ${ECS_USER}@${ECS_HOST}:~/ssl_private.key
echo "✓ 证书文件上传成功"

# 在服务器上安装证书
echo "正在安装证书到 nginx 配置目录..."
ssh -i "$SSH_KEY" ${ECS_USER}@${ECS_HOST} << 'ENDSSH'
# 创建 nginx 证书目录
sudo mkdir -p /etc/nginx/ssl

# 复制证书文件
sudo cp ~/ssl_certificate.crt /etc/nginx/ssl/hxfund.cn.crt
sudo cp ~/ssl_private.key /etc/nginx/ssl/hxfund.cn.key

# 设置正确的权限
sudo chmod 644 /etc/nginx/ssl/hxfund.cn.crt
sudo chmod 600 /etc/nginx/ssl/hxfund.cn.key

# 验证证书
echo "验证证书..."
sudo openssl x509 -in /etc/nginx/ssl/hxfund.cn.crt -text -noout | head -20

echo "✓ SSL 证书安装成功"
echo ""
echo "证书位置:"
echo "  证书文件：/etc/nginx/ssl/hxfund.cn.crt"
echo "  私钥文件：/etc/nginx/ssl/hxfund.cn.key"
ENDSSH

# 更新 nginx 配置
echo ""
echo "========================================"
echo "提示：请确保 nginx 配置包含以下 SSL 设置："
echo "========================================"
echo "server {"
echo "    listen 443 ssl;"
echo "    server_name *.hxfund.cn hxfund.cn;"
echo ""
echo "    ssl_certificate /etc/nginx/ssl/hxfund.cn.crt;"
echo "    ssl_certificate_key /etc/nginx/ssl/hxfund.cn.key;"
echo ""
echo "    ssl_protocols TLSv1.2 TLSv1.3;"
echo "    ssl_ciphers HIGH:!aNULL:!MD5;"
echo "}"
echo "========================================"
echo ""
echo "部署完成！"
