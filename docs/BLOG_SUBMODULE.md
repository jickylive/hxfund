# Blog 子模块说明

本项目使用 Git 子模块将 [anime-blog](https://github.com/jickylive/anime-blog) 作为 Hexo 博客集成到 hxfund 项目中。

---

## 📁 目录结构

```
hxfund/
├── blog/                    # Git 子模块 (anime-blog)
│   ├── source/_posts/      # 博客文章
│   ├── themes/             # 主题文件
│   ├── public/             # 生成的静态文件 (已忽略)
│   └── ...
├── public/                  # hxfund 前端源码
├── dist/                    # 构建输出 (已忽略)
└── ...
```

---

## 🚀 克隆项目

### 方式一：克隆时初始化子模块

```bash
git clone --recursive https://github.com/jickylive/hxfund.git
```

### 方式二：克隆后初始化子模块

```bash
git clone https://github.com/jickylive/hxfund.git
cd hxfund
git submodule update --init --recursive
```

---

## 📝 博客内容管理

### 创建新文章

```bash
cd blog
npx hexo new post "文章标题"
```

编辑 `blog/source/_posts/文章标题.md`

### 本地预览

```bash
cd blog
npm install
npm run server
# 访问 http://localhost:4000
```

### 生成静态文件

```bash
cd blog
npx hexo clean
npx hexo generate
```

---

## 🔄 子模块操作

### 更新子模块到最新

```bash
# 进入子模块
cd blog

# 拉取最新代码
git pull origin main

# 返回父仓库
cd ..

# 提交子模块更新
git add blog
git commit -m "更新 blog 子模块"
```

### 切换子模块分支

```bash
cd blog
git checkout <branch-name>
cd ..
git add blog
git commit -m "切换 blog 到 <branch-name> 分支"
```

### 查看子模块状态

```bash
# 查看子模块提交记录
git submodule status

# 查看子模块远程分支
git submodule foreach git branch -a
```

---

## 🚀 部署

### GitHub Actions 自动部署

推送代码到 `main` 分支会自动触发部署：

```bash
git add .
git commit -m "更新内容"
git push origin main
```

**部署目标：**
- hxfund 主站前端 → `/htdocs/`
- blog 博客 → `/htdocs/public/blog/`

### 手动部署

```bash
# 部署主站前端
npm run build
# FTP 上传 dist/ 到 /htdocs/

# 部署博客
cd blog
npx hexo generate
# FTP 上传 public/ 到 /htdocs/public/blog/
```

---

## ⚙️ 配置说明

### Hexo 博客配置

编辑 `blog/_config.yml`：

```yaml
# URL 配置
url: https://www.hxfund.cn/blog
root: /blog/
```

### GitHub Secrets

在仓库设置中配置：

| Secret | 说明 |
|--------|------|
| `FTP_HOST` | qxu1606470020.my3w.com |
| `FTP_USER` | qxu1606470020 |
| `FTP_PASS` | FTP 密码 |
| `FTP_PORT` | 21 |

---

## 🔧 常见问题

### Q: 子模块为空或无法访问？

```bash
# 初始化并更新子模块
git submodule update --init --recursive
```

### Q: 如何移除子模块？

```bash
# 1. 删除子模块
git submodule deinit -f blog
rm -rf .git/modules/blog
git rm blog
git commit -m "移除 blog 子模块"
```

### Q: 子模块有冲突如何解决？

```bash
cd blog
git status
# 手动解决冲突
git add .
git commit -m "解决冲突"
```

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [deploy-main-blog.yml](../.github/workflows/deploy-main-blog.yml) | 统一部署工作流 |
| [DEPLOYMENT_GUIDE_UPDATED.md](../deploy/DEPLOYMENT_GUIDE_UPDATED.md) | 部署指南 |

---

**最后更新:** 2026-03-02
