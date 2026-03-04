# API 部署修复说明

## 修复日期
2026-03-03

## 问题诊断

### 原始问题
- `api.hxfund.cn` 返回 HTTP 521 错误（Cloudflare - Web 服务器已关闭）
- API 容器在 Docker 内部运行正常，但外部无法访问
- Cloudflare 回源失败

### 根本原因
1. `docker-compose.yml` 中 API 服务只使用了 `expose` 而没有 `ports` 映射
2. 没有 nginx 反向代理将外部请求转发到 API 容器
3. ECS 服务器上没有运行 nginx 或其他反向代理服务

## 修复方案

### 1. 修改 docker-compose.yml

**API 服务端口映射：**
```yaml
api:
  ports:
    - "3000:3000"
```

**新增 API Proxy 容器：**
```yaml
api-proxy:
  image: nginx:alpine
  ports:
    - "80:80"
  volumes:
    - ./deploy/api-nginx.conf:/etc/nginx/conf.d/default.conf:ro
  depends_on:
    - api
```

### 2. 创建 api-nginx.conf

位置：`/root/hxfund/deploy/api-nginx.conf`

配置说明：
- 监听 80 端口
- server_name: api.hxfund.cn
- `/api/*` 路径反向代理到 `http://huangshi-api:3000`
- 健康检查端点：`/api/health`
- API 文档端点：`/api/docs`

### 3. 更新前端容器端口

前端容器从 `expose: 80` 改为 `ports: 8080:80`，避免端口冲突。

## 当前部署状态

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare                           │
│                  (CDN + SSL)                            │
│         104.21.33.68 / 172.67.159.135                   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS (443)
                     ↓
┌─────────────────────────────────────────────────────────┐
│              本地 Docker 环境                            │
│  ┌─────────────────────────────────────────────────┐    │
│  │  huangshi-api-proxy (nginx:alpine)              │    │
│  │  Port: 80:80                                    │    │
│  │  Config: deploy/api-nginx.conf                  │    │
│  └───────────────────┬─────────────────────────────┘    │
│                      │ proxy_pass                        │
│                      ↓                                   │
│  ┌─────────────────────────────────────────────────┐    │
│  │  huangshi-api (hxfund_api:latest)               │    │
│  │  Port: 3000:3000                                │    │
│  │  Health: ✓ healthy                              │    │
│  └───────────────────┬─────────────────────────────┘    │
│                      │                                   │
│  ┌───────────────────▼─────────────────────────────┐    │
│  │  huangshi-redis (redis:latest)                  │    │
│  │  Port: 6377 (internal)                          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 容器状态

| 容器名 | 镜像 | 端口 | 状态 |
|--------|------|------|------|
| huangshi-api-proxy | nginx:alpine | 80:80 | ✓ 运行中 |
| huangshi-api | hxfund_api:latest | 3000:3000 | ✓ healthy |
| huangshi-frontend | nginx:alpine | 8080:80 | ✓ 运行中 |
| huangshi-redis | redis:latest | 6379 (internal) | ✓ healthy |

## 访问验证

### 本地访问
```bash
# API 健康检查（通过 nginx 代理）
curl http://localhost:80/api/health
# → {"status":"ok", ...} HTTP 200

# API 直接访问
curl http://localhost:3000/api/health
# → {"status":"ok", ...} HTTP 200

# 前端访问
curl http://localhost:8080/
# → HTML 内容 HTTP 200

# API 文档
curl http://localhost:80/api/docs
# → HTML 文档 HTTP 200
```

### 外网访问（通过 Cloudflare）
```bash
curl https://api.hxfund.cn/api/health
# → {"status":"ok", ...} HTTP 200 ✓
```

## 后续操作建议

### 1. 保持当前配置
本地 Docker 部署已正常工作，Cloudflare 回源成功。

### 2. ECS 服务器（可选）
如果后续需要将服务迁移到阿里云 ECS：
1. 在 ECS 上安装 Docker 和 Docker Compose
2. 上传项目代码和配置
3. 运行 `docker-compose up -d`
4. 配置防火墙开放 80 和 443 端口

### 3. SSL 证书
当前 SSL 证书由 Cloudflare 提供（边缘证书），无需额外配置。

如需源服务器 SSL 证书（用于加密 Cloudflare 到源站），可运行：
```bash
./deploy/deploy-ssl-cert.sh
```

## 文件变更清单

1. `/root/hxfund/docker-compose.yml` - 添加端口映射和 api-proxy 服务
2. `/root/hxfund/deploy/api-nginx.conf` - 新建 API 反向代理配置

## 常用命令

```bash
# 查看容器状态
docker ps

# 查看 API 日志
docker logs huangshi-api

# 查看 nginx 代理日志
docker logs huangshi-api-proxy

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build
```

## 相关文档

- [deploy/README.md](./README.md) - 部署快速指南
- [deploy/DNS 配置指南.md](./DNS 配置指南.md) - DNS 配置说明
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 完整部署指南
