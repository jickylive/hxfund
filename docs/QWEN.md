# 黄氏家族寻根平台 - 项目上下文文档

## 📖 项目概述

**黄氏家族寻根平台**（hxfund.cn）是一个面向全球 3200 万黄氏宗亲的数字化族谱管理平台，提供可视化族谱、智能字辈推算、区块链存证、AI 助手等功能。

### 核心功能
- 🌳 **3D 动态族谱树** - 递归渲染世系图，点击节点查看族人档案
- 🧮 **智能字辈计算器** - 输入代数，自动匹配对应字辈汉字
- 🤖 **Qwen AI 客户端** - 与阿里云通义千问 AI 对话
- ⛓️ **区块链存证** - 哈希上链机制，确保数据防篡改
- ✉️ **宗亲留言墙** - LocalStorage 持久化，300 字限制
- 📊 **项目愿景 PPT** - 幻灯片展示平台愿景与路线图

### 技术架构
- **前端**: HTML5 + CSS3 + Vanilla JavaScript ES6（零框架依赖）
- **后端**: Node.js + Express + Redis
- **AI**: 阿里云百炼 Coding Plan（Qwen3.5）
- **部署**: GitHub Actions + Docker + 阿里云（ECS + 虚拟主机）
- **PWA**: Service Worker + Manifest.json

---

## 📁 项目结构

```
qwen3.5/
├── 📂 .github/workflows/     # GitHub Actions 部署工作流
│   ├── deploy-all.yml        # 完整部署（前端 + 后端）
│   ├── deploy-backend.yml    # 后端部署（SSH to ECS）
│   ├── deploy-docker.yml     # Docker 镜像构建与部署
│   └── deploy-frontend.yml   # 前端部署（FTP to 阿里云）
│
├── 📂 deploy/                 # 部署脚本和文档
│   ├── setup-ssh.ps1         # SSH 密钥配置脚本（PowerShell）
│   ├── local-deploy.bat      # 本地一键部署脚本
│   ├── ecs-deploy.sh         # ECS 一键部署脚本
│   ├── nginx.conf            # Nginx 反向代理配置
│   └── *.md                  # 部署文档
│
├── 📂 docs/                   # 项目文档
│   ├── 目录结构说明.md
│   ├── OPTIMIZATION_REPORT_V2.md  # 优化报告
│   ├── DEPLOYMENT.md          # 部署指南
│   └── QWEN_CODE_CLI_GUIDE.md # CLI 使用指南
│
├── 📂 public/                 # 前端静态资源
│   ├── css/style.css          # 主样式表（新中式古风）
│   ├── js/
│   │   ├── data.js            # 数据模块（家族树、字辈数据）
│   │   ├── main.js            # 主逻辑（页面加载、导航）
│   │   ├── modules.js         # 功能模块（UI 渲染）
│   │   ├── script.js          # AI 客户端（Qwen 对话）
│   │   └── error-monitor.js   # 错误监控模块
│   ├── pwa/
│   │   ├── manifest.json      # PWA 清单
│   │   └── service-worker.js  # Service Worker
│   └── tests/                 # 测试页面
│
├── 📂 scripts/                # 脚本工具
│   ├── build.js               # 构建脚本（CSS/JS 压缩）
│   ├── qwen-code.js           # Qwen AI CLI 工具
│   └── qwen-code.bat          # Windows 快捷启动
│
├── 📂 server/                 # 后端服务
│   ├── index.js               # Express 服务器主文件
│   ├── auth.js                # 认证模块（JWT + API Key）
│   ├── cli-wrapper.js         # AI CLI 封装
│   ├── session-store.js       # Redis 会话存储
│   └── config/
│       ├── .env               # 环境变量
│       └── auth.json          # 认证配置（敏感）
│
├── 📂 tests/                  # 测试脚本
│   ├── test-api.js            # API 接口测试
│   ├── test-auth.js           # 认证系统测试
│   └── test-chat.js           # AI 对话测试
│
├── index.html                 # 主页面（SPA 入口）
├── Dockerfile                 # Docker 镜像构建
├── docker-compose.yml         # Docker Compose 配置
├── package.json               # 项目配置
└── README.md                  # 项目说明
```

---

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动后端服务器（开发模式）
npm run dev

# 启动静态文件服务
npm run serve

# 运行测试
npm test
```

### 构建生产版本

```bash
# 构建（CSS/JS 压缩）
npm run build

# 输出目录：dist/
```

### 使用 Qwen AI CLI

```bash
# 初始化配置（首次使用）
node scripts/qwen-code.js --init

# 单次提问
node scripts/qwen-code.js "黄姓的起源是什么？"

# 交互模式
node scripts/qwen-code.js -i
```

---

## 🛠️ 常用命令

| 命令 | 说明 |
|------|------|
| `npm start` | 启动后端服务器 |
| `npm run dev` | 开发模式（自动重启） |
| `npm run serve` | 静态文件服务（8080 端口） |
| `npm run build` | 构建生产版本 |
| `npm run qwen "问题"` | AI 单次提问 |
| `npm run qwen:i` | AI 交互模式 |
| `npm test` | 运行所有测试 |

---

## 📦 部署

### 方式一：GitHub Actions（推荐）

```bash
# 本地一键部署（Windows）
deploy\local-deploy.bat

# 或手动推送
git push origin main
```

GitHub Actions 会自动：
1. 构建前端并上传到阿里云虚拟主机
2. 构建 Docker 镜像并推送到阿里云 ECS

### 方式二：Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f api

# 停止服务
docker-compose down
```

### 方式三：手动部署

详见 [deploy/快速部署指南.md](deploy/快速部署指南.md)

---

## 🔐 配置说明

### GitHub Secrets（必需）

**前端部署**:
- `FTP_SERVER` - 阿里云虚拟主机 FTP 地址
- `FTP_USERNAME` - FTP 用户名
- `FTP_PASSWORD` - FTP 密码
- `API_BASE_URL` - 后端 API 地址

**后端部署（Docker）**:
- `ACR_USERNAME` - 阿里云镜像服务用户名
- `ACR_PASSWORD` - 阿里云镜像服务密码
- `ACR_NAMESPACE` - 命名空间
- `ECS_HOST` - ECS 公网 IP
- `ECS_USER` - SSH 用户名
- `ECS_SSH_KEY` - SSH 私钥
- `API_DOMAIN` - API 域名

### 环境变量

```bash
# server/config/.env
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://hxfund.cn,https://www.hxfund.cn
REDIS_URL=redis://localhost:6379
```

---

## 🎨 设计规范

### 主色调
```css
--primary:    #8B4513   /* 棕色（主色） */
--gold:       #C8933A   /* 金色（强调色） */
--bg:         #f5f3e8   /* 宣纸米白（背景） */
--bg-dark:    #2d1a0e   /* 深木色（页脚） */
```

### 字体
- **Noto Serif SC**（思源宋体）- 古籍风格

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行单个测试
node tests/test-api.js
node tests/test-auth.js
node tests/test-chat.js
```

---

## 📊 性能指标

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 首屏渲染 | ~1.8s | ~1.5s | 17% ↓ |
| JS 压缩率 | - | 52% | - |
| CSS 压缩率 | - | 25.9% | - |
| Lighthouse 性能 | 85 | 92 | 7 ↑ |

---

## ⚠️ 注意事项

1. **敏感配置**: `server/config/auth.json` 和 `.env` 已加入 `.gitignore`，不要提交
2. **SSH 密钥**: 首次部署需运行 `deploy/setup-ssh.ps1` 配置
3. **Docker 部署**: 确保 ECS 已安装 Docker 并开放 22/80/443 端口
4. **流量限制**: 阿里云虚拟主机每月 1G 流量，注意监控

---

## 📚 相关文档

- [README.md](README.md) - 项目主文档
- [deploy/快速部署指南.md](deploy/快速部署指南.md) - 5 分钟部署指南
- [deploy/Docker 部署指南.md](deploy/Docker 部署指南.md) - Docker 详细部署文档
- [docs/OPTIMIZATION_REPORT_V2.md](docs/OPTIMIZATION_REPORT_V2.md) - 优化报告
- [docs/QWEN_CODE_CLI_GUIDE.md](docs/QWEN_CODE_CLI_GUIDE.md) - CLI 使用指南

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m "feat: 添加新功能"`
4. 推送到分支：`git push origin feature/your-feature`
5. 创建 Pull Request

---

**版本**: v3.3.0  
**更新日期**: 2026 年 2 月 25 日  
**许可证**: MIT（代码）+ CC BY-NC-SA 4.0（内容）
