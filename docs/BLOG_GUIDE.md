# 黄氏家族寻根平台 - Hexo 博客使用指南

## 📁 目录结构

```
hxfund/
├── blog/                    # Hexo 博客目录
│   ├── source/              # 博客源文件
│   │   ├── _posts/          # 文章目录
│   │   ├── _drafts/         # 草稿目录
│   │   ├── about/           # 关于页面
│   │   └── links/           # 友链页面
│   ├── themes/              # 博客主题
│   │   └── defaultone/      # 默认主题
│   ├── _config.yml          # 博客配置文件
│   ├── package.json         # 博客依赖配置
│   └── build-to-dist.js     # 构建脚本
├── dist/
│   └── blog/                # 构建输出目录
├── index.html               # 主站（包含博客导航链接）
└── package.json             # 主项目配置
```

---

## 🚀 快速开始

### 1. 安装依赖

首次使用前，需要安装博客依赖：

```bash
cd blog
npm install
```

### 2. 本地开发

启动本地开发服务器（端口 4000）：

```bash
cd blog
npm run server
```

访问 http://localhost:4000/blog/ 预览博客。

### 3. 构建博客

构建到主项目的 `dist/blog` 目录：

```bash
# 从主项目根目录
npm run build:blog

# 或从 blog 目录
cd blog
npm run build:dist
```

### 4. 清理并构建

清理缓存后重新构建：

```bash
npm run build:blog:clean
```

---

## 📝 内容管理

### 创建新文章

```bash
cd blog
npx hexo new post "文章标题"
```

编辑生成的文件 `source/_posts/文章标题.md`：

```markdown
---
title: 文章标题
date: 2024-03-21 12:00:00
tags: [黄氏，族谱]
categories: [家族文化]
cover: /images/cover.jpg
---

文章内容...
```

### 文章 Front Matter 配置

```yaml
---
title: 文章标题          # 必填
date: 2024-03-21        # 必填，格式：YYYY-MM-DD HH:mm:ss
updated: 2024-03-22     # 可选，最后更新时间
tags: [标签 1, 标签 2]    # 可选
categories: [分类]       # 可选
cover: /images/xxx.jpg  # 可选，封面图片
top: true               # 可选，置顶文章
draft: true             # 可选，草稿（不发布）
---
```

### 创建草稿

```bash
npx hexo new draft "草稿标题"
```

### 发布草稿

```bash
npx hexo publish "草稿标题"
```

---

## ⚙️ 配置说明

### 站点配置 (`blog/_config.yml`)

```yaml
# 站点信息
title: 黄氏寻宗
subtitle: 一个黄氏宗族历史记录网站
description: 黄氏宗族历史记录网站 - 寻根问祖，族谱查询
author: jicky huang
language: zh-CN
timezone: Asia/Shanghai

# URL 配置
url: https://www.hxfund.cn/blog
root: /blog/
permalink: :year/:month/:day/:title/

# 主题配置
theme: defaultone
```

### 主题配置 (`blog/themes/defaultone/_config.yml`)

调整主题样式、菜单、颜色等配置。

---

## 🔗 与主站集成

### 导航链接

主站 `index.html` 已添加博客导航链接：

```html
<a href="/blog/" class="nav-link" id="nav-blog">博客</a>
```

### 统一构建

使用统一构建脚本，自动包含博客：

```bash
npm run build:all
```

此命令会：
1. 清理构建目录
2. 构建前端资源
3. **构建 Hexo 博客**
4. 复制所有资源到 `dist/` 目录

---

## 📦 部署

### 部署到阿里云 FTP

```bash
# 1. 先构建项目
npm run build:all

# 2. 部署到阿里云 FTP
npm run deploy:aliyun:ftp
```

### 部署后博客访问路径

- 主站：https://www.hxfund.cn/
- 博客：https://www.hxfund.cn/blog/

---

## 🎨 主题特性

博客使用的 `defaultone` 主题包含以下特性：

- ✅ 响应式设计（支持手机、平板、桌面）
- ✅ 暗黑模式切换
- ✅ Live2D 角色动画
- ✅ 粒子背景效果
- ✅ Waline 评论系统
- ✅ SEO 优化
- ✅ 代码高亮
- ✅ 目录导航
- ✅ 搜索功能

---

## 🛠️ 常用命令

| 命令 | 说明 | 目录 |
|------|------|------|
| `npm run server` | 启动本地开发服务器 | blog/ |
| `npm run build` | 生成静态文件到 public/ | blog/ |
| `npm run build:dist` | 生成到 dist/blog/ | blog/ |
| `npm run build:blog` | 构建博客（主项目） | 根目录 |
| `npm run clean` | 清理缓存 | blog/ |
| `npx hexo new post "标题"` | 创建新文章 | blog/ |
| `npx hexo publish "标题"` | 发布草稿 | blog/ |

---

## 📊 文章示例

### 黄氏起源

```markdown
---
title: 黄氏起源与历史
date: 2024-03-21 10:00:00
tags: [黄氏，起源，历史]
categories: [家族历史]
---

## 黄氏起源

黄氏是中国最古老的姓氏之一，起源于...

## 历史发展

黄氏在历史长河中经历了...
```

### 字辈查询

```markdown
---
title: 全国各地黄氏字辈大全
date: 2024-03-20 15:30:00
tags: [字辈，族谱，查询]
categories: [族谱文化]
top: true
---

## 江夏黄氏字辈

文章内容...

## 石城黄氏字辈

文章内容...
```

---

## 🔧 故障排除

### 博客构建失败

1. 检查 Node.js 版本（>= 16.0.0）
2. 清理缓存：`npm run clean`
3. 重新安装依赖：`npm install`

### 主题加载失败

检查 `blog/_config.yml` 中的主题配置：

```yaml
theme: defaultone
```

### 本地预览 404

确保访问正确的路径：

- ✅ http://localhost:4000/blog/
- ❌ http://localhost:4000/

---

## 📚 参考资源

- [Hexo 官方文档](https://hexo.io/zh-cn/)
- [Hexo 主题文档](https://hexo.io/themes/)
- [Markdown 语法指南](https://markdown.com.cn/)

---

**最后更新:** 2026-03-08
