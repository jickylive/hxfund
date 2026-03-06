# Docker 配置文档

## 项目概述
黄氏家族寻根平台 - Qwen AI API 服务

## Docker 服务架构

### 服务组件
1. **Nginx 反向代理 (huangshi-api-proxy)**
   - 容器名称: `huangshi-api-proxy`
   - 镜像: `nginx:alpine`
   - 对外端口: 80, 443
   - 功能: HTTPS终止、API请求代理、静态文件服务

2. **API 服务 (huangshi-api)**
   - 容器名称: `huangshi-api`
   - 镜像: 基于 `Dockerfile` 构建
   - 内部端口: 3000 (不对外暴露)
   - 功能: 提供AI API服务、认证、会话管理

3. **Redis 缓存 (huangshi-redis)**
   - 容器名称: `huangshi-redis`
   - 镜像: `redis:latest`
   - 内部端口: 6379 (不对外暴露)
   - 功能: 会话存储、缓存服务

### 网络配置
- **内部网络**: `internal`
  - 用途: 服务间内部通信
  - 隔离: 与主机网络隔离，仅服务间可见

### 存储卷
- **Redis 数据**: `redis-data` (持久化存储)
- **日志目录**: `./logs` → `/app/logs` (容器内)
- **配置目录**: `./server/config` → `/app/server/config` (只读)
- **SSL证书**: 
  - `./server/config/cert.pem` → `/etc/nginx/ssl/ssl_certificate.crt` (只读)
  - `./server/config/private.pem` → `/etc/nginx/ssl/ssl_private.key` (只读)
- **Nginx配置**: `./deploy/api-nginx.conf` → `/etc/nginx/conf.d/default.conf` (只读)

## 安全配置

### 端口暴露原则
- **仅对外暴露**: 80 (HTTP), 443 (HTTPS)
- **内部服务**: 3000 (API), 6379 (Redis) 不对外暴露
- **访问方式**: 所有API请求通过Nginx代理访问

### CORS 配置
环境变量 `ALLOWED_ORIGINS` (在 `.env` 文件中定义) 包含:
- `https://hxfund.cn`
- `https://www.hxfund.cn`
- `https://api.hxfund.cn`
- `https://qxu1606470020.my3w.com`
- `http://localhost:3000` (开发环境)
- `http://127.0.0.1:3000` (开发环境)

## 环境变量

### 主要环境变量 (通过 `.env` 文件加载)
- `NODE_ENV`: 运行环境 (production)
- `PORT`: 服务端口 (3000)
- `ALLOWED_ORIGINS`: CORS白名单域名
- `REDIS_URL`: Redis连接地址
- 其他在 `.env` 文件中定义的变量

## 服务依赖关系
```
Internet
    ↓ (80/443)
Nginx Proxy
    ↓ (内部网络)
API Service ↔ Redis
```

## 健康检查

### Nginx 代理
- 检查命令: `wget --quiet --tries=1 --spider http://127.0.0.1:80/nginx_status`
- 检查间隔: 30秒
- 超时: 10秒
- 重试次数: 3次

### API 服务
- 检查命令: `node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"`
- 检查间隔: 30秒
- 超时: 3秒
- 重试次数: 3次

### Redis
- 检查命令: `redis-cli ping`
- 检查间隔: 10秒
- 超时: 3秒
- 重试次数: 3次

## 部署说明

### 启动服务
```bash
cd /path/to/project
docker-compose up -d
```

### 查看服务状态
```bash
docker ps
```

### 查看服务日志
```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs <service-name>
```

### 停止服务
```bash
docker-compose down
```

### 重建服务
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 故障排除

### 常见问题
1. **API访问失败**
   - 检查Nginx配置是否正确代理请求
   - 确认CORS配置包含正确的域名

2. **服务启动失败**
   - 检查环境变量配置
   - 确认证书文件存在且路径正确

3. **健康检查失败**
   - 检查相应服务是否正常运行
   - 验证健康检查端点是否可用

### 调试命令
```bash
# 检查容器网络连接
docker exec <container-name> ping <other-container-name>

# 测试内部服务连通性
docker exec huangshi-api-proxy curl http://huangshi-api:3000/api/health

# 检查Nginx配置
docker exec huangshi-api-proxy nginx -t
```

## 维护任务

### 日志轮转
日志文件存储在 `./logs` 目录中，需要定期清理以避免磁盘空间不足。

### SSL证书更新
SSL证书文件位于 `./server/config/` 目录中，需要在到期前及时更新。

### 数据备份
Redis数据通过持久化卷存储，建议定期备份重要数据。