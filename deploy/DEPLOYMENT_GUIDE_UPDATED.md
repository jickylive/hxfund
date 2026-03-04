# 📋 hxfund 主站 + Hexo 博客 部署指南

**目标域名:**
- 主站：https://www.hxfund.cn
- 博客：https://www.hxfund.cn/blog/

**部署方式:** 阿里云虚拟主机 FTP

---

## 🏗️ 部署架构

```
┌─────────────────────────────────────┐
│       用户访问                       │
│   https://www.hxfund.cn            │
└─────────────┬───────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ↓                   ↓
┌─────────┐       ┌─────────────┐
│ /       │       │ /blog/      │
│ 主站前端 │       │ Hexo 博客   │
└────┬────┘       └────┬────────┘
     │                 │
     └────────┬────────┘
              │
    ┌─────────▼─────────┐
    │ 阿里云虚拟主机     │
    │ /htdocs/          │
    └───────────────────┘
```

---

## 📁 虚拟主机目录结构

```
/htdocs/
├── index.html          # 主站首页
├── css/                # 主站样式
├── js/                 # 主站脚本
├── public/             # hxfund 公共资源
│   └── blog/           # Hexo 博客子目录
│       ├── index.html  # 博客首页
│       ├── css/
│       ├── js/
│       └── ...
└── .htaccess           # Apache 配置
```

---

## 🚀 部署方式

### 方式一：GitHub Actions（推荐）

#### hxfund 主站前端部署

仓库：https://github.com/jickylive/hxfund

**工作流:** `deploy-frontend-aliyun.yml`

**部署路径:** `/htdocs/`

**Secrets 配置:**
| Secret | 说明 |
|--------|------|
| `FTP_HOST` | qxu1606470020.my3w.com |
| `FTP_USER` | qxu1606470020 |
| `FTP_PASS` | FTP 密码 |
| `FTP_PORT` | 21 |

#### Hexo 博客部署

仓库：https://github.com/jickylive/anime-blog

**工作流:** `deploy-aliyun-ftp.yml`

**部署路径:** `/htdocs/public/blog/`

**Secrets 配置:** (同上)

---

### 方式二：本地手动部署

#### 部署 hxfund 主站前端

```bash
cd /root/hxfund

# 1. 构建
npm run build

# 2. FTP 上传 dist/ 到 /htdocs/
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

# 2. FTP 上传 public/ 到 /htdocs/public/blog/
lftp -u $FTP_USER,$FTP_PASS $FTP_HOST <<EOF
mirror --reverse public/ /htdocs/public/blog/
bye
EOF
```

---

## ⚙️ 配置说明

### Hexo 博客配置 (_config.yml)

```yaml
# URL 配置
url: https://www.hxfund.cn/blog
root: /blog/
```

### hxfund 前端 API 配置

编辑 `public/index.html`:

```html
<script>
    window.API_CONFIG = {
        baseURL: 'https://api.hxfund.cn',
        timeout: 30000
    };
</script>
```

### 虚拟主机 .htaccess

位置：`/htdocs/.htaccess`

主要功能:
- 根域名重定向到 www
- /blog 重定向到 /blog/
- Gzip 压缩
- 静态资源缓存

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

### 4. FTP 验证文件结构

```bash
lftp qxu1606470020.my3w.com
> ls /htdocs/
> ls /htdocs/public/blog/
```

---

## 🔧 故障排查

### 博客 404

1. 检查文件是否在 `/htdocs/public/blog/`
2. 检查 `_config.yml` 的 `root: /blog/`
3. 检查 `.htaccess` 配置

### 主站 404

1. 检查 `/htdocs/index.html` 是否存在
2. 清除浏览器缓存
3. 检查 FTP 上传是否完整

### 静态资源加载失败

1. 检查资源路径是否正确
2. 确认文件权限（644）
3. 清除浏览器缓存

---

## 📊 GitHub Actions 日志

### hxfund 前端
访问：https://github.com/jickylive/hxfund/actions

### Hexo 博客
访问：https://github.com/jickylive/anime-blog/actions

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [deploy-integration.yml](../.github/workflows/deploy-integration.yml) | 统一部署工作流 |
| [deploy-frontend-aliyun.yml](../.github/workflows/deploy-frontend-aliyun.yml) | 前端部署配置 |
| [INTEGRATION_PLAN.md](./docs/INTEGRATION_PLAN.md) | 完整整合方案 |

---

**最后更新:** 2026-03-02
