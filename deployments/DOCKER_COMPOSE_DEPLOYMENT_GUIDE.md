# 黄氏家族寻根平台 - Docker Compose 部署指南

## 概述

本文档详细说明了如何使用Docker Compose部署黄氏家族寻根平台的完整服务栈。

## 服务架构

```
Internet
  ↓
api.hxfund.cn (HTTPS/443) ←→ Nginx反向代理
  ↓
Node.js API服务 (localhost:3000) ←→ Redis缓存
```

## Docker Compose 配置详解

### 1. API 服务 (api)

```yaml
api:
  build:
    context: .
    dockerfile: Dockerfile
  container_name: huangshi-api
  restart: unless-stopped
  ports:
    - "3000:3000"
  environment:
    - NODE_ENV=production
    - PORT=3000
    - ALLOWED_ORIGINS=https://hxfund.cn,https://www.hxfund.cn,https://huangshi.hxfund.cn
    - REDIS_URL=redis://redis:6379
  volumes:
    - ./logs:/app/logs
    - ./server/config:/app/server/config:ro
  networks:
    - huangshi-network
  depends_on:
    - redis
  healthcheck:
    test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
    interval: 30s
    timeout: 3s
    retries: 3
    start_period: 10s
```

**说明**:
- 构建基于项目根目录的Dockerfile
- 设置生产环境变量
- 挂载日志和配置目录
- 依赖Redis服务
- 配置健康检查

### 2. Redis 缓存 (redis)

```yaml
redis:
  image: redis:latest
  container_name: huangshi-redis
  restart: unless-stopped
  command: redis-server --appendonly yes
  volumes:
    - redis-data:/data
  networks:
    - huangshi-network
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 3s
    retries: 3
```

**说明**:
- 使用官方Redis镜像
- 启用AOF持久化
- 使用命名卷存储数据

### 3. Nginx 反向代理 (api-proxy)

```yaml
api-proxy:
  image: nginx:alpine
  container_name: huangshi-api-proxy
  restart: unless-stopped
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./deploy/api-nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - ./server/config/cert.pem:/etc/nginx/ssl/ssl_certificate.crt:ro
    - ./server/config/private.pem:/etc/nginx/ssl/ssl_private.key:ro
  networks:
    - huangshi-network
  depends_on:
    - api
  healthcheck:
    test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80/nginx_status"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

**说明**:
- 使用轻量级nginx:alpine镜像
- 配置SSL证书和私钥
- 使用自定义Nginx配置文件
- 配置健康检查

## 部署前准备

### 1. 确保证书文件存在

```bash
# 检查证书文件
ls -la ./server/config/cert.pem
ls -la ./server/config/private.pem
```

### 2. 检查配置文件

```bash
# 检查Nginx配置
cat ./deploy/api-nginx.conf
```

### 3. 确保Docker和Docker Compose已安装

```bash
# 检查Docker版本
docker --version

# 检查Docker Compose版本
docker-compose --version
```

## 部署步骤

### 1. 启动服务

```bash
# 在项目根目录执行
cd /root/hxfund

# 启动所有服务（后台运行）
docker-compose up -d

# 或者启动特定服务
docker-compose up -d redis api api-proxy
```

### 2. 检查服务状态

```bash
# 查看所有服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f api
docker-compose logs -f redis
docker-compose logs -f api-proxy
```

### 3. 验证部署

```bash
# 检查API健康状态
curl http://localhost:3000/api/health

# 检查Nginx配置是否生效
curl -k https://api.hxfund.cn/api/health
```

## 管理命令

### 1. 服务控制

```bash
# 停止所有服务
docker-compose down

# 重启特定服务
docker-compose restart api

# 停止并删除容器（保留卷）
docker-compose down
```

### 2. 日志管理

```bash
# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f api

# 查看最近的100行日志
docker-compose logs --tail=100 api
```

### 3. 构建和更新

```bash
# 重新构建API服务
docker-compose build api

# 重新构建并启动
docker-compose up -d --build

# 拉取最新镜像并重新部署
docker-compose pull
docker-compose up -d
```

## 故障排除

### 1. 常见问题

#### 服务启动失败
```bash
# 检查具体错误
docker-compose logs api
docker-compose logs redis
docker-compose logs api-proxy

# 检查容器状态
docker ps -a
```

#### 端口冲突
```bash
# 检查端口占用
netstat -tlnp | grep :3000
netstat -tlnp | grep :80
netstat -tlnp | grep :443
```

#### 证书问题
```bash
# 检查证书有效性
openssl x509 -in ./server/config/cert.pem -text -noout | grep -A 5 "Validity"
openssl x509 -in ./server/config/cert.pem -noout -modulus | openssl md5
openssl rsa -in ./server/config/private.pem -noout -modulus | openssl md5
```

### 2. 诊断命令

```bash
# 检查网络连接
docker-compose exec api ping redis

# 检查Redis连接
docker-compose exec api redis-cli -h redis ping

# 检查配置文件语法
docker-compose config
```

## 安全配置

### 1. SSL证书配置
- 证书文件: `./server/config/cert.pem`
- 私钥文件: `./server/config/private.pem`
- 支持域名: hxfund.cn, *.hxfund.cn, api.hxfund.cn

### 2. 环境变量安全
- 配置文件以只读方式挂载
- 敏感信息不暴露在环境变量中

### 3. 网络隔离
- 使用自定义bridge网络
- 服务间通信通过内部网络

## 监控和维护

### 1. 性能监控

```bash
# 查看容器资源使用
docker stats

# 查看特定容器
docker stats huangshi-api huangshi-redis huangshi-api-proxy
```

### 2. 日志轮转

日志文件位于 `./logs/` 目录，建议配置日志轮转：

```bash
# 示例logrotate配置
cat << EOF > /etc/logrotate.d/huangshi-api
/root/hxfund/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
```

### 3. 备份策略

```bash
# 备份Redis数据
docker-compose exec redis redis-cli BGSAVE

# 备份配置文件
tar -czf config-backup-$(date +%Y%m%d).tar.gz ./server/config/
```

## 扩展配置

### 1. 环境变量配置

可以在docker-compose.yml中添加更多环境变量：

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - REDIS_URL=redis://redis:6379
  - LOG_LEVEL=info
  - RATE_LIMIT_WINDOW_MS=60000
  - RATE_LIMIT_MAX_REQUESTS=30
```

### 2. 资源限制

当前配置已设置资源限制：

```yaml
deploy:
  resources:
    limits:
      memory: 256M  # API服务
      memory: 128M  # Redis
      memory: 32M   # Nginx
```

### 3. 扩展服务

可根据需要添加其他服务：

```yaml
# 数据库服务（如需要）
database:
  image: mysql:8.0
  environment:
    MYSQL_ROOT_PASSWORD: rootpassword
    MYSQL_DATABASE: huangshi
  volumes:
    - db-data:/var/lib/mysql
  networks:
    - huangshi-network

# 监控服务（如Prometheus）
monitoring:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  networks:
    - huangshi-network
```

## 部署验证清单

- [ ] Docker和Docker Compose已安装
- [ ] SSL证书文件存在且有效
- [ ] Nginx配置文件存在
- [ ] 配置文件语法正确
- [ ] 所有服务已启动
- [ ] 服务间网络连接正常
- [ ] API端点可访问
- [ ] SSL证书正常工作
- [ ] 健康检查通过

## 回滚方案

如需回滚到之前的版本：

```bash
# 停止当前服务
docker-compose down

# 如果有备份，恢复备份
# tar -xzf backup-file.tar.gz

# 重新部署
docker-compose up -d
```

---
**文档版本**: v1.0  
**创建日期**: 2026年3月5日  
**适用版本**: 黄氏家族寻根平台 v3.3.0+