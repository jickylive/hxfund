# 黄氏家族寻根平台 - Nginx SSL配置部署指南

## 概述

本文档详细说明了如何配置Nginx作为API反向代理，并使用SSL证书为api.hxfund.cn提供安全连接。

## 部署前准备

### 1. 证书信息
- **证书类型**: 通配符SSL证书 (ZeroSSL)
- **域名**: *.hxfund.cn, hxfund.cn
- **证书文件**: `/root/hxfund/server/config/cert.pem`
- **私钥文件**: `/root/hxfund/server/config/private.pem`
- **有效期**: 2026年3月3日至2026年6月1日
- **验证**: ✅ 证书和私钥匹配

### 2. 服务架构
```
Internet
  ↓
api.hxfund.cn (HTTPS/443)
  ↓
Nginx (反向代理)
  ↓
Node.js Backend (localhost:3000)
```

## 配置文件说明

### 1. Nginx配置文件
- **位置**: `/root/hxfund/nginx-conf/api-proxy.conf`
- **功能**: 
  - 配置api.hxfund.cn的SSL终止
  - 设置反向代理到localhost:3000
  - 处理CORS头部传递

### 2. 配置脚本
- **位置**: `/root/hxfund/scripts/setup-nginx.sh`
- **功能**:
  - 自动安装Nginx
  - 配置SSL证书
  - 设置反向代理
  - 重启服务

## 部署步骤

### 1. 手动部署

如果要手动部署，请按以下步骤操作：

#### A. 安装Nginx
```bash
# CentOS/RHEL
sudo yum install nginx

# Ubuntu/Debian
sudo apt-get install nginx
```

#### B. 创建配置目录
```bash
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled
```

#### C. 复制SSL证书
```bash
sudo mkdir -p /etc/nginx/ssl/hxfund.cn
sudo cp /root/hxfund/server/config/cert.pem /etc/nginx/ssl/hxfund.cn/
sudo cp /root/hxfund/server/config/private.pem /etc/nginx/ssl/hxfund.cn/
sudo chmod 644 /etc/nginx/ssl/hxfund.cn/cert.pem
sudo chmod 600 /etc/nginx/ssl/hxfund.cn/private.pem
```

#### D. 配置虚拟主机
```bash
sudo cp /root/hxfund/nginx-conf/api-proxy.conf /etc/nginx/sites-available/api.hxfund.cn.conf
sudo ln -sf /etc/nginx/sites-available/api.hxfund.cn.conf /etc/nginx/sites-enabled/
```

#### E. 更新主配置
编辑 `/etc/nginx/nginx.conf`，在http块中添加：
```nginx
include /etc/nginx/sites-enabled/*;
```

#### F. 测试并重启
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 2. 自动部署

使用提供的脚本自动部署：

```bash
sudo /root/hxfund/scripts/setup-nginx.sh
```

## 配置验证

### 1. 服务状态检查
```bash
# 检查Nginx状态
sudo systemctl status nginx

# 检查端口监听
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :80
```

### 2. SSL证书验证
```bash
# 检查证书信息
openssl x509 -in /etc/nginx/ssl/hxfund.cn/cert.pem -text -noout | grep -A 5 "Subject Alternative Name"

# 检查证书有效期
openssl x509 -in /etc/nginx/ssl/hxfund.cn/cert.pem -noout -dates

# 验证证书和私钥匹配
openssl x509 -noout -modulus -in /etc/nginx/ssl/hxfund.cn/cert.pem | openssl md5
openssl rsa -noout -modulus -in /etc/nginx/ssl/hxfund.cn/private.pem | openssl md5
```

### 3. API端点测试
```bash
# 测试健康检查端点
curl -k https://api.hxfund.cn/api/health

# 测试模型列表端点
curl -k https://api.hxfund.cn/api/models

# 测试认证令牌端点
curl -k -X POST https://api.hxfund.cn/api/auth/client-token \
  -H "Content-Type: application/json" \
  -H "Origin: https://api.hxfund.cn"
```

## 安全配置

### 1. SSL安全设置
- **协议**: TLSv1.2, TLSv1.3
- **加密套件**: ECDHE-RSA-AES256-GCM-SHA512等
- **HSTS**: 启用，max-age=31536000
- **安全头**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection

### 2. 反向代理设置
- **超时**: 60秒连接/发送/读取超时
- **缓冲**: 适当调整缓冲区大小
- **头部传递**: 正确传递Origin和Referer头部以支持CORS验证

## 故障排除

### 1. 常见问题

#### Nginx配置测试失败
```bash
# 检查配置语法
sudo nginx -t

# 检查配置文件
sudo nginx -T
```

#### SSL证书错误
```bash
# 检查证书和私钥匹配
sudo openssl x509 -noout -modulus -in /etc/nginx/ssl/hxfund.cn/cert.pem | openssl md5
sudo openssl rsa -noout -modulus -in /etc/nginx/ssl/hxfund.cn/private.pem | openssl md5
```

#### 代理连接失败
```bash
# 确认后端服务运行
curl http://localhost:3000/api/health

# 检查防火墙设置
sudo firewall-cmd --list-all
```

### 2. 日志检查
```bash
# Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# Nginx访问日志
sudo tail -f /var/log/nginx/access.log

# 后端服务日志
# (在另一个终端运行后端服务并观察输出)
```

## 维护任务

### 1. 证书更新
当前证书有效期至2026年6月1日，需要在此日期前更新：
```bash
# 使用acme.sh更新证书
~/.acme.sh/acme.sh --renew -d hxfund.cn --force

# 或更新通配符证书
~/.acme.sh/acme.sh --renew -d *.hxfund.cn --force
```

### 2. 配置更新
如需修改配置：
```bash
# 编辑配置文件
sudo nano /etc/nginx/sites-available/api.hxfund.cn.conf

# 测试配置
sudo nginx -t

# 重新加载配置
sudo systemctl reload nginx
```

## 监控和性能

### 1. 性能优化
- **SSL会话缓存**: 已配置共享缓存
- **HTTP/2**: 已启用
- **Gzip压缩**: Nginx默认配置

### 2. 监控命令
```bash
# 检查活跃连接
sudo ss -tlnp | grep nginx

# 检查Nginx进程
ps aux | grep nginx

# 检查系统资源使用
top -p $(pgrep -d',' nginx)
```

## 回滚方案

如需回滚到之前的状态：
```bash
# 停用站点配置
sudo rm /etc/nginx/sites-enabled/api.hxfund.cn.conf

# 恢复备份的nginx.conf（如果创建了）
sudo cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf

# 重启Nginx
sudo systemctl restart nginx
```

---
**文档版本**: v1.0  
**创建日期**: 2026年3月5日  
**适用版本**: 黄氏家族寻根平台 v3.3.0+