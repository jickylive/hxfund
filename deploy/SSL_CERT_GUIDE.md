# SSL 证书部署指南

## 概述

本项目使用 Cloudflare Origin 证书来加密 API 后端 (api.hxfund.cn) 与 Cloudflare CDN 之间的通信。

## 证书文件

- `server/config/ssl_certificate.crt` - SSL 公钥证书
- `server/config/ssl_private.key` - SSL 私钥（**机密文件**，请勿提交到 Git）

## 自动部署（推荐）

GitHub Actions 会在每次部署时自动上传和安装证书：

1. 推送代码到 `main` 分支
2. GitHub Actions 工作流自动执行
3. 证书上传到 ECS 服务器
4. 证书安装到 `/etc/nginx/ssl/` 目录

## 手动部署

如果需要手动部署证书，使用以下脚本：

```bash
# 设置环境变量（可选）
export ECS_HOST="your-ecs-ip"
export ECS_USER="root"
export SSH_KEY="~/.ssh/id_rsa"

# 运行部署脚本
cd /root/hxfund
./deploy/deploy-ssl-cert.sh
```

## Nginx 配置

将 `deploy/nginx-ssl.conf` 的内容复制到服务器：

```bash
# 在 ECS 服务器上执行
sudo vim /etc/nginx/conf.d/hxfund-api.conf
# 粘贴 nginx-ssl.conf 内容
sudo nginx -t
sudo systemctl reload nginx
```

## 验证证书

```bash
# 检查证书文件
sudo ls -la /etc/nginx/ssl/

# 查看证书信息
sudo openssl x509 -in /etc/nginx/ssl/hxfund.cn.crt -text -noout

# 测试 HTTPS 连接
curl -v https://api.hxfund.cn
```

## 证书更新

Cloudflare Origin 证书有效期为 15 年。到期前需要更新：

1. 登录 Cloudflare 控制台
2. 生成新的 Origin 证书
3. 更新 `server/config/ssl_certificate.crt` 和 `ssl_private.key`
4. 重新运行部署脚本

## 安全措施

- 私钥文件 `.gitignore`，不应提交到版本控制
- 生产环境使用 SSH 密钥认证
- 证书文件权限设置为 600（仅所有者可写）

## 故障排除

### 证书权限问题
```bash
sudo chmod 644 /etc/nginx/ssl/hxfund.cn.crt
sudo chmod 600 /etc/nginx/ssl/hxfund.cn.key
sudo chown root:root /etc/nginx/ssl/*
```

### Nginx 无法启动
```bash
# 检查配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### 证书验证失败
```bash
# 确保证书格式正确
openssl x509 -in /etc/nginx/ssl/hxfund.cn.crt -noout -text

# 检查私钥匹配
openssl x509 -noout -modulus -in /etc/nginx/ssl/hxfund.cn.crt | openssl md5
openssl rsa -noout -modulus -in /etc/nginx/ssl/hxfund.cn.key | openssl md5
# 两个 MD5 值应该相同
```
