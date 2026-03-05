# 📝 黄氏寻根平台博客模块部署集成指南

## 📋 概述

本文档详细介绍了如何将 Hexo 博客模块集成到 hxfund 项目中，并实现统一的部署流程。

### 博客模块信息
- **项目路径**: `/blog` (作为子模块集成)
- **技术栈**: Hexo 8.1.1 + Node.js
- **部署位置**: `https://www.hxfund.cn/blog/`
- **部署方式**: GitHub Actions + FTP 同步

### 集成目标
- 与主项目统一部署流程
- 保持独立的内容管理系统
- 支持自动化构建和部署
- 与主站共享域名结构

---

## 🚀 部署架构

### 文件结构
```
hxfund/
├── blog/                 # Hexo 博客源码
│   ├── source/          # 博客内容
│   ├── themes/          # 主题文件
│   ├── _config.yml      # 博客配置
│   └── package.json     # 依赖管理
├── .github/workflows/
│   └── deploy-main-blog.yml  # 统一部署工作流
├── deploy/              # 部署相关文档
└── docs/                # 项目文档
    └── BLOG_DEPLOYMENT_INTEGRATION.md  # 本文档
```

### 部署流程
1. **代码提交**: 推送到 `main` 分支
2. **构建阶段**: 
   - 主项目: 构建前端静态文件到 `dist/`
   - 博客: 使用 Hexo 生成静态文件到 `blog/public/`
3. **部署阶段**:
   - 主项目: 部署到 `/htdocs/`
   - 博客: 部署到 `/htdocs/blog/`

---

## 🔧 配置要求

### GitHub Secrets
在 GitHub 仓库设置中需要配置以下 Secrets:

| Secret | 说明 | 必需 |
|--------|------|------|
| `FTP_HOST` | FTP 服务器地址 | 是 |
| `FTP_USER` | FTP 用户名 | 是 |
| `FTP_PASS` | FTP 密码 | 是 |
| `FTP_PORT` | FTP 端口 (默认 21) | 否 |

### 博客配置文件
- `_config.yml`: 站点基本配置
- `_config.deploy.yml`: 部署配置 (使用环境变量)

### 环境变量
```bash
# 博客部署相关
FTP_HOST=${FTP_HOST}
FTP_USER=${FTP_USER}
FTP_PASSWORD=${FTP_PASSWORD}
FTP_PORT=${FTP_PORT:-21}
FTP_REMOTE=/htdocs/blog/
```

---

## 🔄 部署工作流详解

### deploy-main-blog.yml 工作流

此工作流负责同时部署主项目和博客模块：

#### Job 1: build-frontend
- 构建主项目的前端静态文件
- 输出到 `dist/` 目录
- 保存为 `hxfund-frontend` 构件

#### Job 2: build-blog
- 构建 Hexo 博客静态文件
- 进入 `blog/` 目录执行 `hexo generate`
- 输出到 `blog/public/` 目录
- 保存为 `hexo-blog` 构件

#### Job 3: deploy-frontend
- 从构件下载 `hxfund-frontend`
- 部署到 FTP `/htdocs/` 目录

#### Job 4: deploy-blog
- 从构件下载 `hexo-blog`
- 部署到 FTP `/htdocs/blog/` 目录

#### Job 5: verify-deployment
- 验证主站和博客的访问状态

### 手动触发选项
工作流支持手动触发，可以选择部署目标：
- `all`: 部署主项目和博客
- `frontend-only`: 仅部署主项目
- `blog-only`: 仅部署博客

---

## 📝 内容管理

### 添加新文章
```bash
# 进入 blog 目录
cd blog

# 创建新文章
npx hexo new post "文章标题"

# 编辑生成的文章
# source/_posts/文章标题.md
```

### 文章格式示例
```markdown
---
title: 文章标题
date: 2024-03-21 12:00:00
tags: [标签1, 标签2]
categories: [分类]
---

文章内容...
```

### 本地预览
```bash
cd blog
npm run server
# 访问 http://localhost:4000
```

---

## 🔧 部署脚本

### 自动化部署
- GitHub Actions 自动处理部署
- 支持并发控制，避免冲突
- 包含部署验证步骤

### 本地部署（可选）
```bash
# 构建博客
cd blog
npx hexo clean
npx hexo generate

# 手动上传到 /htdocs/blog/ 目录
```

---

## 🧪 验证清单

部署完成后，请确认：

- [ ] 博客首页正常访问: `https://www.hxfund.cn/blog/`
- [ ] 文章列表正常显示
- [ ] CSS/JS 资源加载正常
- [ ] 响应式设计在移动端正常
- [ ] 与主站导航链接正常
- [ ] 评论系统（如 Waline）正常工作

---

## 🔧 故障排除

### 部署失败
1. 检查 GitHub Actions 日志
2. 确认 FTP 凭证正确
3. 验证文件权限设置

### 博客无法访问
1. 检查 FTP 目录结构: `/htdocs/blog/`
2. 确认静态文件已正确上传
3. 检查服务器配置

### 构建错误
1. 检查 Hexo 配置文件语法
2. 确认依赖包版本兼容性
3. 查看构建日志中的具体错误信息

---

## 🔄 更新维护

### 更新博客主题
```bash
cd blog
# 更新主题
git submodule update --remote themes/主题名
```

### 更新 Hexo 版本
```bash
cd blog
npm update hexo
```

### 同步子模块
```bash
# 更新所有子模块
git submodule update --remote
```

---

## 📞 支持

如遇问题，请查看：

1. GitHub Actions 工作流日志
2. 联系项目维护人员
3. 提交 Issue 到项目仓库

---

**文档版本**: v1.0  
**最后更新**: 2026-03-05