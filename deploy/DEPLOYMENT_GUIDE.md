# 🚀 hxfund 项目部署指南

## 📋 部署概览

hxfund 项目采用前后端分离架构，需要分别部署：

- **前端**: 静态文件部署到阿里云虚拟主机 (FTP)
- **后端**: Node.js API 服务部署到阿里云 ECS

## 🗂️ 部署工作流

### 1. `deploy-frontend-aliyun.yml`
- **目的**: 部署前端静态文件到阿里云虚拟主机
- **触发条件**:
  - 自动: `main` 分支更新涉及前端文件时
  - 手动: 可随时手动触发
- **部署位置**:
  - 主站: `/htdocs/`
  - 博客: `/htdocs/blog/`

### 2. `deploy-backend-ecs.yml`
- **目的**: 部署后端 Node.js 服务到阿里云 ECS
- **触发条件**:
  - 自动: `main` 分支更新涉及后端文件时
  - 手动: 可随时手动触发
- **部署方式**:
  - PM2 (默认): 直接部署到 Node.js 环境
  - Docker: 使用 Docker 容器化部署

### 3. `deploy-full-stack.yml`
- **目的**: 同时部署前端和后端
- **触发条件**:
  - 自动: `main` 分支更新时
  - 手动: 可选择性部署前端/后端

## 🔐 配置秘钥 (Secrets)

在 GitHub 仓库设置中需要配置以下 Secrets:

### FTP 相关
- `FTP_HOST`: FTP 服务器地址
- `FTP_USER`: FTP 用户名
- `FTP_PASS`: FTP 密码
- `FTP_PORT`: FTP 端口 (可选，默认 21)

### ECS 相关
- `ECS_HOST`: ECS 服务器公网 IP
- `ECS_USER`: ECS SSH 用户名 (通常是 root)
- `ECS_SSH_KEY`: ECS SSH 私钥
- `APP_NAME`: 应用名称 (可选，默认 hxfund-api)

### 环境变量
- `API_BASE_URL`: API 基础 URL
- `API_DOMAIN`: API 域名 (如 api.hxfund.cn)
- `FRONTEND_DOMAIN`: 前端域名 (如 www.hxfund.cn)
- `PORT`: 后端服务端口 (可选，默认 3000)
- `ALLOWED_ORIGINS`: 允许的跨域来源
- `REDIS_URL`: Redis 连接地址 (可选)

## 🏗️ 部署流程

### 1. 前端部署流程
```
代码提交 → GitHub Actions → 构建静态文件 → FTP 上传到阿里云虚拟主机
```

### 2. 后端部署流程
```
代码提交 → GitHub Actions → 打包代码 → SCP 上传到 ECS → PM2/Docker 部署 → 服务启动
```

## 🛠️ 手动部署

### 触发部署工作流
1. 进入 GitHub 仓库的 Actions 标签页
2. 选择相应的工作流 (如 "Frontend Deploy - Aliyun FTP")
3. 点击 "Run workflow"
4. 根据需要填写参数 (环境、部署范围等)

### 参数说明
- `target_environment`: 目标环境 (production/staging)
- `deploy_method`: 部署方式 (pm2/docker) - 仅后端
- `deploy_frontend`: 是否部署前端 (布尔值)
- `deploy_backend`: 是否部署后端 (布尔值)

## 🧪 部署验证

### 1. 前端验证
- 访问主站: `https://www.hxfund.cn`
- 访问博客: `https://www.hxfund.cn/blog/`
- 检查页面加载是否正常

### 2. 后端验证
- API 健康检查: `https://api.hxfund.cn/api/health`
- API 文档: `https://api.hxfund.cn/api/docs`
- 各个 API 端点是否正常工作

## 🔧 环境配置

### 阿里云虚拟主机 (FTP)
1. 确保 FTP 服务开启
2. 设置正确的目录权限
3. 确保 `htdocs` 目录可写

### 阿里云 ECS
1. 安装 Node.js 环境
2. 安装 PM2: `npm install -g pm2`
3. 设置开机自启: `pm2 startup`
4. 安装 Docker (如使用 Docker 部署)
5. 配置防火墙开放相应端口

## 🚨 故障排除

### 1. FTP 上传失败
- 检查 FTP 凭证是否正确
- 检查网络连接
- 检查服务器磁盘空间

### 2. SSH 连接失败
- 检查 SSH 私钥是否正确
- 检查 ECS 安全组设置
- 确认 ECS 实例运行状态

### 3. 服务启动失败
- 查看 GitHub Actions 日志
- SSH 到 ECS 查看 PM2 日志: `pm2 logs`
- 检查环境变量配置

## 📊 部署状态监控

部署完成后，可通过以下方式监控服务状态：

1. **GitHub Actions**: 查看工作流执行状态
2. **PM2**: `pm2 status` (ECS 上)
3. **API 健康检查**: 定期访问 `/api/health`
4. **站点访问**: 手动访问网站验证

## 🔄 回滚策略

如需回滚部署：

1. **前端**: FTP 部署无自动回滚，需手动还原文件
2. **后端 (PM2)**: 使用 `pm2 rollback` 命令
3. **后端 (Docker)**: 重新运行之前的镜像版本

## 📅 部署时间

- **前端部署**: 约 2-3 分钟
- **后端部署**: 约 3-5 分钟
- **全栈部署**: 约 5-8 分钟

部署通常在代码推送后自动开始，也可手动触发。

---

**注意**: 请确保所有 Secrets 配置正确，避免部署失败。如遇问题，请检查 GitHub Actions 日志。