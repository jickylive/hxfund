#!/bin/bash

# 黄氏家族寻根平台 - Docker Compose 部署脚本

set -e  # 遌输错误时停止执行

echo "==========================================="
echo "黄氏家族寻根平台 - Docker Compose 部署脚本"
echo "==========================================="

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请以root权限运行此脚本"
    echo "使用: sudo $0"
    exit 1
fi

# 检查Docker是否已安装
if ! command -v docker &> /dev/null; then
    echo "错误: Docker未安装"
    echo "请先安装Docker"
    exit 1
fi

# 检查Docker Compose是否已安装
if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose未安装"
    echo "请先安装Docker Compose"
    exit 1
fi

echo "步骤 1: 验证配置文件..."

# 检查必要的文件是否存在
if [ ! -f "/root/hxfund/docker-compose.yml" ]; then
    echo "错误: docker-compose.yml 文件不存在"
    exit 1
fi

if [ ! -f "/root/hxfund/server/config/cert.pem" ]; then
    echo "错误: SSL证书文件不存在: /root/hxfund/server/config/cert.pem"
    exit 1
fi

if [ ! -f "/root/hxfund/server/config/private.pem" ]; then
    echo "错误: SSL私钥文件不存在: /root/hxfund/server/config/private.pem"
    exit 1
fi

if [ ! -f "/root/hxfund/deploy/api-nginx.conf" ]; then
    echo "错误: Nginx配置文件不存在: /root/hxfund/deploy/api-nginx.conf"
    exit 1
fi

echo "步骤 2: 验证证书有效性..."

# 验证证书和私钥是否匹配
openssl x509 -noout -modulus -in /root/hxfund/server/config/cert.pem > /tmp/cert_modulus.txt
openssl rsa -noout -modulus -in /root/hxfund/server/config/private.pem > /tmp/key_modulus.txt

if cmp -s /tmp/cert_modulus.txt /tmp/key_modulus.txt; then
    echo "✅ 证书和私钥匹配"
else
    echo "❌ 证书和私钥不匹配"
    rm /tmp/cert_modulus.txt /tmp/key_modulus.txt
    exit 1
fi

rm /tmp/cert_modulus.txt /tmp/key_modulus.txt

# 检查证书是否过期
EXPIRY_DATE=$(openssl x509 -in /root/hxfund/server/config/cert.pem -noout -enddate | cut -d= -f2)
EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_TIMESTAMP=$(date +%s)

if [ $EXPIRY_TIMESTAMP -lt $CURRENT_TIMESTAMP ]; then
    echo "❌ 证书已过期: $EXPIRY_DATE"
    exit 1
else
    echo "✅ 证书有效，到期时间: $EXPIRY_DATE"
fi

echo "步骤 3: 验证Docker Compose配置..."

# 验证docker-compose.yml语法
if docker-compose -f /root/hxfund/docker-compose.yml config; then
    echo "✅ Docker Compose配置验证通过"
else
    echo "❌ Docker Compose配置验证失败"
    exit 1
fi

echo "步骤 4: 检查端口占用..."

# 检查端口是否被占用
if netstat -tlnp | grep -q ':80 '; then
    echo "警告: 端口80已被占用"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "部署已取消"
        exit 0
    fi
fi

if netstat -tlnp | grep -q ':443 '; then
    echo "警告: 端口443已被占用"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "部署已取消"
        exit 0
    fi
fi

if netstat -tlnp | grep -q ':3000 '; then
    echo "警告: 端口3000已被占用"
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "部署已取消"
        exit 0
    fi
fi

echo "步骤 5: 启动服务..."

# 切入项目目录
cd /root/hxfund

# 拉取最新镜像
echo "拉取最新镜像..."
docker-compose pull

# 启动服务
echo "启动服务..."
docker-compose up -d

echo "步骤 6: 等待服务启动..."

# 等待服务启动
sleep 10

# 检查服务状态
echo "检查服务状态..."
docker-compose ps

echo "步骤 7: 验证服务运行状态..."

# 等待一段时间让服务完全启动
sleep 30

# 检查服务日志以确认正常运行
echo "检查API服务日志..."
API_LOGS=$(docker-compose logs api | tail -20)
if echo "$API_LOGS" | grep -q "running\|started\|listening\|ready"; then
    echo "✅ API服务正常启动"
else
    echo "⚠️  API服务可能存在启动问题，请检查日志:"
    echo "$API_LOGS"
fi

echo "检查Redis服务状态..."
REDIS_STATUS=$(docker-compose exec redis ping 2>/dev/null || echo "failed")
if [ "$REDIS_STATUS" = "PONG" ]; then
    echo "✅ Redis服务正常运行"
else
    echo "⚠️  Redis服务可能存在连接问题"
fi

echo "检查Nginx服务状态..."
NGINX_STATUS=$(docker-compose exec api-proxy nginx -t 2>&1 || echo "failed")
if echo "$NGINX_STATUS" | grep -q "successful"; then
    echo "✅ Nginx配置正确"
else
    echo "⚠️  Nginx配置可能存在问题"
fi

echo "==========================================="
echo "部署完成!"
echo ""
echo "服务状态:"
echo "- API服务: http://localhost:3000 (内部)"
echo "- API代理: https://api.hxfund.cn (外部)"
echo "- Redis缓存: localhost:6379 (内部)"
echo ""
echo "管理命令:"
echo "1. 查看服务状态: docker-compose -f /root/hxfund/docker-compose.yml ps"
echo "2. 查看服务日志: docker-compose -f /root/hxfund/docker-compose.yml logs -f"
echo "3. 停止服务: docker-compose -f /root/hxfund/docker-compose.yml down"
echo "4. 重启服务: docker-compose -f /root/hxfund/docker-compose.yml restart"
echo ""
echo "验证命令:"
echo "curl -k https://api.hxfund.cn/api/health"
echo "==========================================="

# 提示用户验证部署
echo ""
echo "请验证部署:"
echo "1. 访问 https://api.hxfund.cn/api/health"
echo "2. 检查服务日志: docker-compose -f /root/hxfund/docker-compose.yml logs"