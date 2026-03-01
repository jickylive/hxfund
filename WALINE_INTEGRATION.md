# 💬 Waline 评论系统整合方案

**创建时间:** 2026-03-01  
**目标:** 将 Hexo 博客的 Waline 评论 API 与 hxfund 主站 API 整合

---

## 📊 整合架构

```
┌─────────────────────────────────────────────────────────────┐
│                    用户访问                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ↓
            ┌─────────────────┐
            │  www.hxfund.cn  │
            │  (主站 + 博客)   │
            └────────┬────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ↓            ↓            ↓
┌───────────────┐ ┌───────────┐ ┌───────────┐
│ 主站前端      │ │ Hexo 博客  │ │ API 调用   │
│ /htdocs/      │ │ /blog/    │ │           │
└───────────────┘ └───────────┘ └─────┬─────┘
                                      │
                                      ↓ API 调用
                            ┌─────────────────┐
                            │ api.hxfund.cn   │
                            │ ECS: 120.25.77  │
                            │ /api/waline/    │
                            └─────────────────┘
```

---

## 📁 文件结构

### hxfund 后端新增文件

```
/root/hxfund/
└── server/
    ├── index.js          # 主服务器（已更新，添加 Waline 路由）
    └── waline.js         # Waline API 服务（新增）
```

### anime-blog 配置

```
/root/anime-blog/
└── themes/
    └── defaultone/
        └── _config.yml   # Waline 配置：serverUrl: https://api.hxfund.cn
```

---

## 🔧 Waline API 端点

### 评论 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/waline/article` | 获取文章统计（评论数、浏览量） |
| `POST` | `/api/waline/article` | 更新文章统计 |
| `GET` | `/api/waline/comment` | 获取评论列表 |
| `POST` | `/api/waline/comment` | 添加评论 |
| `DELETE` | `/api/waline/comment/:id` | 删除评论 |
| `PUT` | `/api/waline/comment/:id` | 更新评论 |
| `POST` | `/api/waline/comment/:id/like` | 点赞评论 |

### 用户 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/waline/user` | 获取用户列表 |

### 系统 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/waline/system` | 获取系统信息 |
| `GET` | `/api/waline/health` | 健康检查 |

---

## ⚙️ 配置说明

### 1. Hexo 博客配置

编辑 `/root/anime-blog/themes/defaultone/_config.yml`:

```yaml
comment:
  system: waline
  config:
    waline:
      serverUrl: https://api.hxfund.cn  # ✅ 已配置
      lang: zh-CN
      emoji:
        - https://cdn.jsdelivr.net/gh/walinejs/emojis/weibo
        - https://cdn.jsdelivr.net/gh/walinejs/emojis/bilibhi
      requiredMeta: ['nick', 'mail']
      pageSize: 10
      wordLimit: 1000
```

### 2. hxfund 后端配置

编辑 `/root/hxfund/server/config/.env`:

```bash
# Waline 配置（可选）
WALINE_VERSION=1.0.0
WALINE_MAX_PAGE_SIZE=50
WALINE_COMMENT_MAX_LENGTH=1000
```

### 3. CORS 配置

hxfund 后端已配置 CORS，允许博客子域访问：

```javascript
// /root/hxfund/server/index.js
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

// 支持子域名匹配
const isSubdomainMatch = /^https?:\/\/([\w-]+\.)*hxfund\.cn(:\d+)?$/.test(origin);
```

确保 `ALLOWED_ORIGINS` 包含主站域名：

```bash
ALLOWED_ORIGINS=https://www.hxfund.cn,https://hxfund.cn,http://localhost:3000
```

---

## 🚀 部署步骤

### 步骤 1: 上传 Waline 模块到 ECS

```bash
# 在本地项目目录
cd /root/hxfund

# 上传 waline.js 到 ECS
scp server/waline.js root@120.25.77.136:/root/hxfund/server/

# 或者使用 rsync
rsync -avz server/ root@120.25.77.136:/root/hxfund/server/
```

### 步骤 2: 更新后端依赖

```bash
# SSH 登录 ECS
ssh root@120.25.77.136

# 进入项目目录
cd /root/hxfund

# 安装依赖（如果需要）
npm install uuid
```

### 步骤 3: 重启后端服务

```bash
# 重启 PM2 服务
pm2 restart hxfund-api

# 或者重启所有服务
pm2 restart all
```

### 步骤 4: 验证 Waline API

```bash
# 测试健康检查
curl -I https://api.hxfund.cn/api/waline/health

# 预期输出：HTTP/1.1 200 OK

# 测试系统信息
curl https://api.hxfund.cn/api/waline/system

# 预期输出：
# {"errno":0,"errmsg":"ok","data":{"version":"1.0.0","commentCount":0,...}}
```

### 步骤 5: 验证博客评论

1. 访问博客文章页面
2. 滚动到页面底部
3. 检查评论框是否显示
4. 尝试发表评论

---

## ✅ 验证清单

### API 验证

- [ ] `GET /api/waline/health` 返回 200
- [ ] `GET /api/waline/system` 返回系统信息
- [ ] `GET /api/waline/article?path=/test` 返回统计数据
- [ ] `POST /api/waline/comment` 可以添加评论
- [ ] `GET /api/waline/comment?path=/test` 返回评论列表

### 博客验证

- [ ] 博客页面加载正常
- [ ] 评论框显示正常
- [ ] 可以发表评论
- [ ] 评论立即显示
- [ ] 点赞功能正常
- [ ] 回复功能正常

### 主站验证

- [ ] 主站访问正常
- [ ] API 调用正常
- [ ] CORS 配置正确

---

## 🔧 故障排查

### 问题 1: 评论框不显示

**检查:**
1. 浏览器控制台是否有错误
2. Waline JS 是否加载
3. serverURL 配置是否正确

**解决:**
```javascript
// 检查浏览器控制台
console.log('Waline serverURL:', theme.comment.config.waline.serverUrl);
```

### 问题 2: API 404 错误

**检查:**
```bash
# 检查 API 路径
curl -I https://api.hxfund.cn/api/waline/health

# 检查服务状态
pm2 status hxfund-api
pm2 logs hxfund-api
```

**解决:**
```bash
# 重启服务
pm2 restart hxfund-api
```

### 问题 3: CORS 错误

**检查:**
```bash
# 测试 CORS 头
curl -I -X OPTIONS https://api.hxfund.cn/api/waline/comment \
  -H "Origin: https://www.hxfund.cn" \
  -H "Access-Control-Request-Method: POST"
```

**解决:**
编辑 `/root/hxfund/server/config/.env`:
```bash
ALLOWED_ORIGINS=https://www.hxfund.cn,https://hxfund.cn
```

### 问题 4: 评论无法保存

**检查:**
1. 数据库连接（如使用 MongoDB）
2. 磁盘空间
3. 文件权限

**解决:**
```bash
# 检查磁盘空间
df -h

# 检查日志
pm2 logs hxfund-api --lines 50
```

---

## 📊 数据存储

### 当前实现（内存存储）

Waline API 当前使用内存存储（`Map` 对象），适用于：
- 开发测试
- 小型站点
- 演示环境

**限制:**
- 重启后数据丢失
- 不支持多实例部署
- 数据量受限

### 生产环境（推荐 MongoDB）

```bash
# 安装 MongoDB
npm install mongodb

# 配置连接
MONGODB_URL=mongodb://localhost:27017/waline
```

**MongoDB 集合:**
- `comments` - 评论数据
- `counters` - 统计数据
- `users` - 用户数据

---

## 🔒 安全配置

### 1. 评论审核

启用评论审核（防止垃圾评论）:

```javascript
// server/waline.js
status: 'waiting', // 改为 'waiting' 需要审核
```

### 2. IP 限制

限制评论频率:

```javascript
// 添加速率限制中间件
const rateLimit = require('express-rate-limit');

const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 10 // 最多 10 条评论
});

router.post('/comment', commentLimiter, async (req, res) => {
  // ...
});
```

### 3. 内容过滤

过滤敏感词:

```javascript
const sensitiveWords = ['广告', '垃圾信息', '...'];

function filterContent(content) {
  sensitiveWords.forEach(word => {
    content = content.replace(new RegExp(word, 'g'), '***');
  });
  return content;
}
```

---

## 📈 性能优化

### 1. 评论缓存

使用 Redis 缓存热门评论:

```bash
# 安装 Redis
npm install redis

# 配置缓存
REDIS_URL=redis://localhost:6379
```

### 2. 分页优化

合理设置分页大小:

```yaml
# _config.yml
pageSize: 10  # 每页 10 条评论
```

### 3. 静态资源 CDN

使用 CDN 加载 Waline 前端资源:

```yaml
# _config.yml
waline:
  js: https://cdn.jsdelivr.net/npm/@waline/client/dist/WalineComment.js
  css: https://cdn.jsdelivr.net/npm/@waline/client/dist/WalineComment.css
```

---

## 🔗 相关文档

- [Waline 官方文档](https://waline.js.org/)
- [INTEGRATION_PLAN.md](../INTEGRATION_PLAN.md)
- [DNS 状态检查报告.md](./DNS 状态检查报告.md)
- [deploy/README.md](./README.md)

---

## 📝 更新日志

### 2026-03-01
- ✅ 创建 Waline API 服务 (`server/waline.js`)
- ✅ 集成到 hxfund 后端 (`server/index.js`)
- ✅ 添加 Waline API 端点 (`/api/waline/*`)
- ✅ 更新 API 文档
- ✅ 创建整合文档

---

**整合完成！** 🎉
