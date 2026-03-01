# 🚀 hxfund + anime-blog 整合部署快速指南

**更新时间:** 2026-03-01
**目标:** 将 hxfund 前端和 Hexo 博客统一部署到 `www.hxfund.cn` 及 `/blog/` 子目录

---

## 📋 目录

1. [项目结构](#项目结构)
2. [部署架构](#部署架构)
3. [快速部署](#快速部署)
4. [配置说明](#配置说明)
5. [故障排查](#故障排查)

---

## 📁 项目结构

```
/root/
├── hxfund/                 # hxfund 前端项目
│   ├── public/             # 前端源码
│   ├── dist/               # 构建输出
│   ├── server/             # 后端 API
│   ├── deploy/             # 部署配置
│   └── .github/workflows/  # GitHub Actions
│
└── anime-blog/             # Hexo 博客项目
    ├── source/             # 博客源码
    ├── public/             # 构建输出
    ├── scripts/            # 部署脚本
    └── .github/workflows/  # GitHub Actions
```

---

## 🏗️ 部署架构

```
┌─────────────────────────────────────────┐
│         用户访问                         │
│    https://www.hxfund.cn                │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ↓                   ↓
┌─────────┐       ┌─────────┐
│ /       │       │ /blog/  │
│ 主站前端 │       │ Hexo 博客│
└────┬────┘       └────┬────┘
     │                 │
     └────────┬────────┘
              │
    ┌─────────▼─────────┐
    │  阿里云虚拟主机    │
    │  /htdocs/         │
    └───────────────────┘

    API 调用 → api.hxfund.cn → ECS
```

---

## 🚀 快速部署

### 方式一：GitHub Actions（推荐）

#### 1. 配置 Secrets

在 hxfund 仓库设置 GitHub Secrets：

访问：https://github.com/jickylive/hxfund/settings/secrets/actions

| Secret | 值 | 说明 |
|--------|-----|------|
| `FTP_HOST` | qxu1606470020.my3w.com | 虚拟主机 FTP |
| `FTP_USER` | qxu1606470020 | FTP 用户名 |
| `FTP_PASS` | [密码] | FTP 密码 |
| `FTP_PORT` | 21 | FTP 端口 |

#### 2. 推送代码

```bash
# hxfund 前端
cd /root/hxfund
git add .
git commit -m "更新前端"
git push origin main

# 触发自动部署
```

#### 3. 部署博客

```bash
# anime-blog 博客
cd /root/anime-blog
git add .
git commit -m "更新博客"
git push origin main
```

---

### 方式二：本地手动部署

#### 部署 hxfund 前端

```bash
cd /root/hxfund

# 1. 构建
npm run build

# 2. FTP 上传 dist/ 到 /htdocs/
# 使用 FTP 客户端或命令行
lftp -u $FTP_USER,$FTP_PASS $FTP_HOST <<EOF
mirror --reverse dist/ /htdocs/
bye
EOF
```

#### 部署 Hexo 博客

```bash
cd /root/anime-blog

# 1. 生成静态文件
npx hexo clean
npx hexo generate

# 2. 运行部署脚本
chmod +x scripts/deploy-to-hxfund.sh
./scripts/deploy-to-hxfund.sh
```

---

## ⚙️ 配置说明

### Hexo 博客配置

编辑 `/root/anime-blog/_config.yml`:

```yaml
# URL 配置
url: https://www.hxfund.cn/blog
root: /blog/
```

### hxfund 前端 API 配置

编辑 `/root/hxfund/public/index.html`:

```html
<script>
    window.API_CONFIG = {
        baseURL: 'https://api.hxfund.cn',
        timeout: 30000
    };
</script>
```

### 虚拟主机 .htaccess

上传 `deploy/htdocs-htaccess.conf` 到 `/htdocs/.htaccess`

### 博客子目录 .htaccess

上传 `scripts/blog-htaccess.conf` 到 `/htdocs/blog/.htaccess`

---

## 🌐 DNS 配置

### 阿里云 DNS 设置

| 主机记录 | 类型 | 记录值 | 说明 |
|----------|------|--------|------|
| `@` | A | 虚拟主机 IP | 主域名 |
| `www` | CNAME | `hxfund.cn` | www 重定向 |
| `api` | A | 120.25.77.136 | API 服务 |

详见：[DNS 配置指南.md](./DNS 配置指南.md)

---

## ✅ 验证步骤

### 1. 验证主站

```bash
curl -I https://www.hxfund.cn/
# 预期：HTTP/1.1 200 OK
```

### 2. 验证博客

```bash
curl -I https://www.hxfund.cn/blog/
# 预期：HTTP/1.1 200 OK
```

### 3. 验证 API

```bash
curl -I https://api.hxfund.cn/api/health
# 预期：HTTP/1.1 200 OK
```

### 4. 验证文件结构

```bash
# FTP 连接后检查
ls /htdocs/
ls /htdocs/blog/
```

---

## 🔧 故障排查

### 博客 404

1. 检查文件是否在 `/htdocs/blog/`
2. 检查 `_config.yml` 的 `root: /blog/`
3. 清除浏览器缓存

### API 跨域

1. 检查后端 CORS 配置
2. 确认 `ALLOWED_ORIGINS` 包含 `https://www.hxfund.cn`

### 静态资源加载失败

1. 检查资源路径
2. 确认文件权限（644）
3. 清除 CDN 缓存

---

## 📊 常用命令

### hxfund 前端

```bash
cd /root/hxfund

# 构建
npm run build

# 本地预览
npm run serve

# 查看日志
tail -f logs/*.log
```

### Hexo 博客

```bash
cd /root/anime-blog

# 生成
npx hexo generate

# 本地预览
npm run server

# 部署
./scripts/deploy-to-hxfund.sh
```

### 后端 API

```bash
cd /root/hxfund

# 查看状态
pm2 status

# 查看日志
pm2 logs hxfund-api

# 重启服务
pm2 restart hxfund-api
```

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [INTEGRATION_PLAN.md](../INTEGRATION_PLAN.md) | 完整整合方案 |
| [DNS 配置指南.md](./DNS 配置指南.md) | DNS 设置 |
| [阿里云部署指南.md](./阿里云部署指南.md) | 详细部署步骤 |
| [deploy-integration.yml](../.github/workflows/deploy-integration.yml) | GitHub Actions |

---

## 🆘 获取帮助

1. 查看项目文档
2. 检查 GitHub Actions 日志
3. 查看服务器日志

---

**部署愉快！** 🎉
