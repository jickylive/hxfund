#!/bin/bash

# 黄氏家族寻根平台 - Nginx配置脚本
# 用于配置SSL证书和API反向代理

set -e  # 遌输错误时停止执行

echo "==========================================="
echo "黄氏家族寻根平台 - Nginx配置"
echo "==========================================="

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请以root权限运行此脚本"
    echo "使用: sudo $0"
    exit 1
fi

echo "步骤 1: 检查并安装Nginx..."

# 检查系统类型并安装Nginx
if command -v yum &> /dev/null; then
    # CentOS/RHEL
    if ! command -v nginx &> /dev/null; then
        echo "安装Nginx (CentOS/RHEL)..."
        yum install -y nginx
    fi
elif command -v apt-get &> /dev/null; then
    # Ubuntu/Debian
    if ! command -v nginx &> /dev/null; then
        echo "安装Nginx (Ubuntu/Debian)..."
        apt-get update
        apt-get install -y nginx
    else
        echo "Nginx已安装"
    fi
else
    echo "错误: 未识别的包管理器"
    exit 1
fi

echo "步骤 2: 创建Nginx配置目录..."

# 创建配置目录
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# 检查nginx.conf中是否有sites-enabled的include指令
if ! grep -q "sites-enabled" /etc/nginx/nginx.conf; then
    echo "更新nginx.conf以包含sites-enabled..."
    # 备份原配置
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
    
    # 在http块中添加include指令
    sed -i '/include \/etc\/nginx\/conf\.d\/\*\.conf;/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
fi

echo "步骤 3: 复制SSL证书..."

# 确保证书目录存在
mkdir -p /etc/nginx/ssl/hxfund.cn

# 复制证书文件
cp /root/hxfund/server/config/cert.pem /etc/nginx/ssl/hxfund.cn/
cp /root/hxfund/server/config/private.pem /etc/nginx/ssl/hxfund.cn/

# 设置正确的权限
chmod 644 /etc/nginx/ssl/hxfund.cn/cert.pem
chmod 600 /etc/nginx/ssl/hxfund.cn/private.pem

echo "步骤 4: 配置Nginx虚拟主机..."

# 复制配置文件
cp /root/hxfund/nginx-conf/api-proxy.conf /etc/nginx/sites-available/api.hxfund.cn.conf

# 创建启用站点的链接
ln -sf /etc/nginx/sites-available/api.hxfund.cn.conf /etc/nginx/sites-enabled/

echo "步骤 5: 测试Nginx配置..."

# 测试配置
if nginx -t; then
    echo "配置测试通过"
else
    echo "错误: Nginx配置测试失败"
    echo "请检查配置文件"
    exit 1
fi

echo "步骤 6: 重启Nginx服务..."

# 重启Nginx
systemctl daemon-reload
systemctl restart nginx

# 检查Nginx状态
if systemctl is-active --quiet nginx; then
    echo "Nginx服务已成功重启"
else
    echo "警告: Nginx服务启动失败"
    systemctl status nginx
    exit 1
fi

echo "步骤 7: 配置防火墙规则..."

# 配置防火墙（如果使用firewalld）
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-service=http
    firewall-cmd --reload
elif command -v ufw &> /dev/null; then
    ufw allow 'Nginx Full'
fi

echo "==========================================="
echo "Nginx配置完成!"
echo ""
echo "配置摘要:"
echo "- API服务: https://api.hxfund.cn (代理到 localhost:3000)"
echo "- 主网站: https://hxfund.cn (前端静态文件)"
echo "- SSL证书: 已配置通配符证书 (*.hxfund.cn)"
echo "- 反向代理: 已配置API请求代理"
echo ""
echo "验证命令:"
echo "1. 检查Nginx状态: systemctl status nginx"
echo "2. 测试API端点: curl -k https://api.hxfund.cn/api/health"
echo "3. 检查证书: openssl x509 -in /etc/nginx/ssl/hxfund.cn/cert.pem -text -noout | head -20"
echo ""
echo "如需修改配置，请编辑: /etc/nginx/sites-available/api.hxfund.cn.conf"
echo "修改后运行: nginx -t && systemctl reload nginx"
echo "==========================================="