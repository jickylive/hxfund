# 🔄 hxfund + anime-blog 项目整合方案

**创建时间:** 2026-03-01
**更新时间:** 2026-03-01
**目标:** 将 hxfund 前端和 Hexo 博客统一整合到 `www.hxfund.cn` 及子目录，并集成 Waline 评论系统

---

## 📊 整合后架构

```
┌─────────────────────────────────────────────────────────────┐
│                    用户访问                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
            ┌─────────────────┐
            │  阿里云虚拟主机  │
            │  qxu1606470020  │
            │  /htdocs/       │
            └────────┬────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ↓            ↓            ↓
┌───────────────┐ ┌───────────┐ ┌───────────┐
│ www.hxfund.cn │ │hxfund.cn/ │ │blog/      │
│ (主站前端)    │ │  重定向   │ │ (Hexo 博客)│
│ /htdocs/      │ │ www→主站  │ │ /htdocs/  │
│ index.html    │ │           │ │ public/   │
└───────────────┘ └───────────┘ └───────────┘
                         │
                         ↓ API 调用
            ┌─────────────────┐
            │  阿里云 ECS      │
            │  120.25.77.136  │
            │  /root/hxfund/  │
            │  后端 API 服务    │
            │  - Qwen AI       │
            │  - Waline 评论   │
            └─────────────────┘
```

---

## 📁 目录结构

### 虚拟主机目录 (`/htdocs/`)

```
/htdocs/
├── index.html          # hxfund 前端入口
├── css/                # hxfund 样式
├── js/                 # hxfund 脚本
├── pwa/                # hxfund PWA 文件
├── images/             # hxfund 图片
└── blog/               # Hexo 博客（子目录）
    ├── index.html      # 博客入口
    ├── css/
    ├── js/
    ├── images/
    ├── archives/
    ├── tags/
    ├── categories/
    ├── atom.xml
    └── search.xml
```

### ECS 目录 (`/root/hxfund/`)

```
/root/hxfund/
├── server/             # 后端服务
│   ├── index.js        # 主服务器
│   ├── waline.js       # Waline 评论 API（新增）
│   ├── auth.js         # 认证模块
│   └── cli-wrapper.js  # AI CLI 封装
├── public/             # 前端源码
├── package.json
└── pm2.config.js
```

### 博客源码 (`/root/anime-blog/`)

```
/root/anime-blog/
├── source/             # 博客源码
├── themes/             # 主题
│   └── defaultone/
│       └── _config.yml # Waline 配置
├── config/             # 配置
├── public/             # 构建输出 → 部署到 /htdocs/blog/
└── scripts/            # 部署脚本
```

---

## 🌐 域名解析配置

| 域名 | 类型 | 记录值 | 说明 |
|------|------|--------|------|
| `hxfund.cn` | A | 虚拟主机 IP | 主域名 → 虚拟主机 |
| `www.hxfund.cn` | CNAME | `hxfund.cn` | www → 主域名 |
| `api.hxfund.cn` | A | 120.25.77.136 | API 服务 → ECS |
| `blog.hxfund.cn` | CNAME | `www.hxfund.cn` | 博客子域（可选） |

---

## 🚀 部署流程

### 方式一：统一 GitHub Actions 部署

创建新的工作流文件，同时部署两个项目：

```yaml
# .github/workflows/deploy-integration.yml
name: Deploy Integration (hxfund + blog)

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      deploy_target:
        description: '部署目标'
        required: true
        default: 'all'
        type: choice
        options:
          - all
          - frontend-only
          - blog-only
```

### 方式二：独立部署（推荐初期使用）

#### 部署 hxfund 前端

```bash
cd /root/hxfund
npm run build
# FTP 上传 dist/ 到 /htdocs/
```

#### 部署 Hexo 博客

```bash
cd /root/anime-blog
npx hexo clean && npx hexo generate
# FTP 上传 public/ 到 /htdocs/blog/
```

---

## ⚙️ 配置修改

### 1. Hexo 博客配置 (`_config.yml`)

```yaml
# URL
url: https://www.hxfund.cn/blog
root: /blog/
```

### 2. hxfund 前端 API 配置 (`index.html`)

```html
<script>
    window.API_CONFIG = {
        baseURL: 'https://api.hxfund.cn',
        timeout: 30000
    };
</script>
```

### 3. Nginx 配置（虚拟主机 `.htaccess`）

```apache
# /htdocs/.htaccess
RewriteEngine On

# 重定向 /blog 请求到 blog 子目录
RewriteCond %{REQUEST_URI} !^/blog/
RewriteRule ^blog(/.*)?$ /blog$1 [L]

# 静态资源缓存
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/html "access plus 1 hour"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/* "access plus 1 year"
</IfModule>

# Gzip 压缩
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript
</IfModule>
```

---

## 📋 部署检查清单

### 部署前准备

- [ ] 确认虚拟主机 FTP 凭证
- [ ] 确认 ECS SSH 密钥配置
- [ ] 备份当前线上版本
- [ ] 检查域名 DNS 解析

### hxfund 前端部署

- [ ] 运行 `npm run build`
- [ ] 上传 `dist/` 内容到 `/htdocs/`
- [ ] 验证 `https://www.hxfund.cn/` 访问正常
- [ ] 验证 API 调用正常

### Hexo 博客部署

- [ ] 运行 `npx hexo generate`
- [ ] 上传 `public/` 内容到 `/htdocs/blog/`
- [ ] 验证 `https://www.hxfund.cn/blog/` 访问正常
- [ ] 验证文章列表和图片加载

### 后端 API 部署

- [ ] SSH 连接 ECS
- [ ] 更新后端代码
- [ ] `pm2 restart hxfund-api`
- [ ] 验证 `https://api.hxfund.cn/api/health`

### Waline 评论部署

- [ ] 上传 `server/waline.js` 到 ECS
- [ ] 验证 `https://api.hxfund.cn/api/waline/health` 返回 200
- [ ] 验证博客评论框显示正常
- [ ] 测试发表评论功能
- [ ] 测试点赞和回复功能

---

## 🔧 故障排查

### 博客 404 错误

1. 检查文件是否上传到 `/htdocs/blog/`
2. 检查 `.htaccess` 配置
3. 清除浏览器缓存

### API 跨域问题

1. 检查后端 CORS 配置
2. 确认 `ALLOWED_ORIGINS` 包含 `https://www.hxfund.cn`

### Waline 评论不显示

1. 检查浏览器控制台是否有错误
2. 验证 `https://api.hxfund.cn/api/waline/health` 访问正常
3. 检查 `_config.yml` 的 `serverUrl` 配置
4. 清除浏览器缓存

### 静态资源加载失败

1. 检查资源路径是否正确
2. 确认文件权限（644）
3. 清除 CDN 缓存

---

## 📊 资源大小参考

| 组件 | 大小 | 备注 |
|------|------|------|
| hxfund 前端 | ~80 KB | 压缩后 |
| Hexo 博客 | ~2-5 MB | 含主题 |
| 后端服务 | ~50 MB | node_modules |

---

## ✅ 验证步骤

### 1. 验证主站前端

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

## 🔗 相关文档

- `deploy/阿里云部署指南.md` - hxfund 部署
- `docs/BLOG_DEPLOYMENT_GUIDE.md` - 博客部署
- `deploy/DNS 配置指南.md` - DNS 配置
- `deploy/DNS 状态检查报告.md` - DNS 检查报告
- `./WALINE_INTEGRATION.md` - Waline 评论整合
- `.github/workflows/deploy-integration.yml` - 统一工作流

---

**整合方案完成！** 🎉
