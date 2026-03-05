# 🏮 黄氏家族寻根平台 - 博客模块集成部署手册

## 📖 目录
1. [项目概述](#项目概述)
2. [技术架构](#技术架构)
3. [部署流程](#部署流程)
4. [操作指南](#操作指南)
5. [故障排除](#故障排除)
6. [维护指南](#维护指南)

---

## 项目概述

### 项目背景
黄氏家族寻根平台（hxfund.cn）是一个面向全球3200万黄氏宗亲的数字化族谱管理平台。为了更好地记录和传承黄氏宗族文化，我们在主项目基础上集成了基于 Hexo 的博客模块。

### 博客模块特点
- **技术栈**: Hexo 8.1.1 + Node.js
- **部署位置**: `https://www.hxfund.cn/blog/`
- **内容类型**: 宗族文化、历史故事、寻根经验分享
- **集成方式**: 作为 Git 子模块集成到主项目

---

## 技术架构

### 整体架构
```
hxfund/
├── index.html          # 主站入口
├── public/             # 主站静态资源
├── blog/               # Hexo 博客模块 (子模块)
│   ├── source/        # 博客内容
│   ├── themes/        # 博客主题
│   ├── public/        # 生成的静态文件
│   └── _config.yml    # 博客配置
├── server/             # 后端 API 服务
├── .github/workflows/  # GitHub Actions 工作流
│   └── deploy-main-blog.yml  # 统一部署工作流
├── scripts/            # 部署脚本
│   ├── deploy-blog.sh      # 博客部署脚本
│   ├── deploy-full.sh      # 全量部署脚本
│   └── validate-blog-deploy.sh  # 验证脚本
├── deploy/             # 部署配置
│   └── blog-enabled-nginx.conf  # Nginx 配置
└── docs/               # 项目文档
    └── BLOG_DEPLOYMENT_INTEGRATION.md  # 集成文档
```

### 部署架构
- **前端**: 静态文件部署到阿里云虚拟主机
- **博客**: Hexo 生成的静态文件部署到 `/blog/` 子目录
- **后端**: Node.js API 服务部署到阿里云 ECS
- **CI/CD**: GitHub Actions 自动化部署
- **域名**: 主站和博客共享 `hxfund.cn` 域名

---

## 部署流程

### 自动化部署 (推荐)

#### 1. GitHub Actions 工作流
- **文件**: `.github/workflows/deploy-main-blog.yml`
- **触发条件**: 
  - 推送到 `main` 分支
  - 手动触发（支持选择部署目标）

#### 2. 部署步骤详解
1. **代码检出**: 包含子模块的完整代码库
2. **前端构建**: 构建主站静态文件
3. **博客构建**: 使用 Hexo 生成博客静态文件
4. **前端部署**: 部署到 `/htdocs/` 目录
5. **博客部署**: 部署到 `/htdocs/blog/` 目录
6. **验证测试**: 检查站点访问状态

#### 3. 环境变量配置
在 GitHub 仓库的 Secrets 中配置：
```
FTP_HOST=your-ftp-host.com
FTP_USER=your-username
FTP_PASS=your-password
FTP_PORT=21 (可选，默认21)
```

### 手动部署

#### 1. 本地构建和部署
```bash
# 部署整个项目（前端 + 博客）
./scripts/deploy-full.sh <FTP_HOST> <FTP_USER> <FTP_PASS> [FTP_PORT]

# 仅部署博客
./scripts/deploy-blog.sh <FTP_HOST> <FTP_USER> <FTP_PASS> [FTP_PORT]
```

#### 2. 验证部署
```bash
# 验证博客部署状态
./scripts/validate-blog-deploy.sh
```

---

## 操作指南

### 内容管理

#### 添加新文章
```bash
# 进入博客目录
cd blog

# 创建新文章
npx hexo new post "文章标题"

# 编辑文章
# 文件位置: source/_posts/文章标题.md
```

#### 文章格式示例
```markdown
---
title: 黄氏家族的历史渊源
date: 2024-03-21 12:00:00
tags: [历史, 文化, 黄氏]
categories: [家族文化]
---

# 黄氏家族的历史渊源

黄姓是中国古老的姓氏之一，有着悠久的历史...
```

#### 本地预览
```bash
cd blog
npm run server
# 访问 http://localhost:4000/blog/ 预览
```

### 主题定制

#### 主题配置
- **文件**: `blog/_config.yml`
- **主题**: defaultone (基于 hexo-theme-redefine 修改)

#### 自定义样式
- **位置**: `blog/source/css/`
- **优先级**: 高于主题默认样式

### 部署管理

#### 部署前检查清单
- [ ] 博客内容已提交到 `main` 分支
- [ ] GitHub Secrets 配置正确
- [ ] FTP 服务器空间充足
- [ ] 域名解析正常

#### 部署后验证清单
- [ ] 主站正常访问: `https://www.hxfund.cn`
- [ ] 博客正常访问: `https://www.hxfund.cn/blog/`
- [ ] 博客文章列表正常显示
- [ ] CSS/JS 资源加载正常
- [ ] 响应式设计在移动端正常

---

## 故障排除

### 常见问题

#### 1. 博客无法访问
**症状**: 访问 `https://www.hxfund.cn/blog/` 返回 404
**解决方案**:
1. 检查 FTP 部署是否成功
2. 确认 `blog/public/` 目录下的文件已上传到服务器 `/htdocs/blog/`
3. 检查 Nginx 配置是否正确

#### 2. 静态资源加载失败
**症状**: CSS/JS 文件返回 404
**解决方案**:
1. 检查文件路径是否正确
2. 确认文件权限设置
3. 验证 FTP 传输是否完整

#### 3. GitHub Actions 部署失败
**症状**: 工作流执行失败
**解决方案**:
1. 检查 GitHub Secrets 配置
2. 查看工作流日志获取详细错误信息
3. 确认 FTP 凭证有效

#### 4. Hexo 构建错误
**症状**: `hexo generate` 命令失败
**解决方案**:
1. 检查 `_config.yml` 配置文件语法
2. 确认依赖包版本兼容性
3. 验证文章内容格式正确

### 调试命令

#### 检查部署状态
```bash
# 检查主站
curl -I https://www.hxfund.cn

# 检查博客
curl -I https://www.hxfund.cn/blog/

# 检查特定资源
curl -I https://www.hxfund.cn/blog/css/style.css
```

#### 验证本地构建
```bash
# 进入博客目录
cd blog

# 清理并重新生成
npx hexo clean
npx hexo generate --debug

# 本地预览
npx hexo server
```

---

## 维护指南

### 日常维护

#### 内容更新
1. 在 `blog/source/_posts/` 目录下创建或编辑文章
2. 提交更改到 `main` 分支
3. 等待 GitHub Actions 自动部署

#### 主题更新
```bash
cd blog
git submodule update --remote themes/主题名
npm update hexo
```

#### 依赖管理
```bash
cd blog
npm outdated  # 检查过期包
npm update    # 更新依赖
```

### 定期任务

#### 月度检查
- [ ] 检查站点访问速度
- [ ] 验证所有链接有效性
- [ ] 检查评论系统功能
- [ ] 备份重要数据

#### 季度优化
- [ ] 更新 Hexo 和主题版本
- [ ] 优化图片和其他媒体资源
- [ ] 检查 SEO 设置
- [ ] 审查安全配置

### 备份策略

#### 代码备份
- 主要代码库: GitHub
- 子模块: 单独的 Git 仓库
- 定期同步: 自动化工作流

#### 内容备份
- 源文件: Git 版本控制
- 生成文件: 不需要备份（可重新生成）
- 配置文件: 包含在代码库中

---

## 技术支持

### 联系方式
- **项目邮箱**: contact@hxfund.cn
- **GitHub Issues**: https://github.com/jickylive/hxfund/issues
- **技术支持**: 黄氏寻根平台技术委员会

### 文档参考
- [Hexo 官方文档](https://hexo.io/zh-cn/docs/)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)

---

## 版本信息

- **主项目版本**: v3.2.0
- **博客模块版本**: Hexo 8.1.1
- **文档版本**: v1.0
- **最后更新**: 2026-03-05

---

<div align="center">

**传承家风，继往开来 · 数字化守护千年血脉**

🔗 [官网](https://www.hxfund.cn) | 📝 [白皮书](whitepaper.html) | 💬 [反馈](https://github.com/jickylive/hxfund/issues)

</div>