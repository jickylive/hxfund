# 黄氏家族寻根平台 - 部署选项

## 部署方式

本项目支持多种部署方式，您可以根据需求选择合适的部署方案。

### 1. Docker Compose 部署 (推荐)

使用Docker Compose部署完整的微服务架构，包括API服务、Redis缓存和Nginx反向代理。

#### 配置文件
- **主配置**: `docker-compose.yml`
- **Nginx配置**: `deploy/api-nginx.conf`
- **环境变量**: `.env.example`

#### 部署命令
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 自动部署脚本
```bash
sudo /root/hxfund/scripts/deploy-docker.sh
```

### 2. Nginx 反向代理配置

Nginx配置文件位于 `deploy/api-nginx.conf`，支持以下功能：

- SSL证书配置
- API请求反向代理到localhost:3000
- CORS头部处理
- 安全头配置
- HTTP到HTTPS重定向

### 3. 服务架构

```
Internet
  ↓
api.hxfund.cn (HTTPS/443) ←→ Nginx反向代理
  ↓
Node.js API服务 (localhost:3000) ←→ Redis缓存
```

### 4. 证书配置

- **证书文件**: `/root/hxfund/server/config/cert.pem`
- **私钥文件**: `/root/hxfund/server/config/private.pem`
- **支持域名**: hxfund.cn, *.hxfund.cn, api.hxfund.cn
- **有效期**: 2026年3月3日至2026年6月1日

### 5. 环境变量

关键环境变量包括：
- `NODE_ENV`: 运行环境 (production/development)
- `ALLOWED_ORIGINS`: 允许的CORS来源
- `REDIS_URL`: Redis连接地址
- `RATE_LIMIT_*`: API速率限制配置

## 验证部署

### API端点测试
```bash
# 健康检查
curl -k https://api.hxfund.cn/api/health

# 模型列表
curl -k https://api.hxfund.cn/api/models

# 认证令牌
curl -k -X POST https://api.hxfund.cn/api/auth/client-token \
  -H "Content-Type: application/json" \
  -H "Origin: https://api.hxfund.cn"
```

### 服务状态检查
```bash
# 检查Docker服务
docker-compose ps

# 检查端口监听
netstat -tlnp | grep -E ':(80|443|3000)'

# 检查SSL证书
openssl x509 -in /root/hxfund/server/config/cert.pem -noout -subject -dates
```

## 维护任务

### 证书续期
当前证书有效期至2026年6月1日，需要在此日期前续期：
```bash
# 使用acme.sh续期
~/.acme.sh/acme.sh --renew -d hxfund.cn --force
```

### 日志管理
- **API日志**: `./logs/` 目录
- **Nginx日志**: Docker容器内部
- **系统日志**: `/var/log/` 目录

## 故障排除

### 常见问题
1. **端口冲突**: 检查80/443/3000端口是否被占用
2. **证书错误**: 验证证书和私钥是否匹配
3. **网络连接**: 检查服务间的网络连接
4. **权限问题**: 确保证书文件权限正确

### 诊断命令
```bash
# 检查容器状态
docker-compose ps

# 查看服务日志
docker-compose logs api
docker-compose logs redis
docker-compose logs api-proxy

# 测试网络连接
docker-compose exec api ping redis
```

## 安全配置

- **SSL/TLS**: TLSv1.2, TLSv1.3
- **加密套件**: ECDHE-RSA-AES256-GCM-SHA512等
- **安全头**: HSTS, X-Frame-Options, X-Content-Type-Options等
- **CORS**: 严格的来源验证

---
**文档版本**: v1.0  
**创建日期**: 2026年3月5日  
**适用版本**: 黄氏家族寻根平台 v3.3.0+