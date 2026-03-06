# 🏮 黄氏家族寻根平台

<div align="center">

![License: MIT](https://img.shields.io/badge/Code-MIT-green.svg)
![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/Content-CC%20BY--NC--SA%204.0-lightgrey.svg)
![Version](https://img.shields.io/badge/version-v3.3.0-orange.svg)
![Platform](https://img.shields.io/badge/platform-Web%20SPA%20%7C%20Node.js%20%7C%20Docker-blue.svg)
![Lang](https://img.shields.io/badge/lang-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Node.js-yellow.svg)
![PWA](https://img.shields.io/badge/PWA-Supported-brightgreen.svg)
![Docker](https://img.shields.io/badge/Docker-Supported-blueviolet.svg)

**数字化族谱 · 区块链存证 · 宗亲连接 · 文化传承**

[🌐 在线访问](https://hxfund.cn) · [📚 博客](https://hxfund.cn/blog/) · [📄 项目白皮书](whitepaper.html) · [🐛 提交问题](https://github.com/your-org/huangshi-genealogy/issues) · [📋 优化报告](OPTIMIZATION_REPORT.md)

</div>

---

## 📖 项目简介

**黄氏家族寻根平台**（hxfund.cn）是一个面向全球 **3200万黄氏宗亲** 的数字化族谱管理平台。

依托现代 Web 技术与联盟区块链，平台提供：
- 🌳 可视化家族世系图谱
- 🧮 智能字辈推算（江夏 / 石城 / 绵阳 / 福建四大分支）
- ⛓️ 区块链哈希存证，数据不可篡改
- ✉️ 宗亲留言墙，跨地域连接宗亲
- 🗄️ 族谱数据库 ERD 可视化
- 📝 **新增：文化博客**，记录和传承黄氏宗族历史文化

> 黄姓为中国第七大姓，有约 4600 年历史，始祖伯益，分布于 28 个省市及东南亚、北美等地。

---

## ✨ 功能模块

| 模块 | 说明 |
|------|------|
| 🌳 **3D 动态族谱树** | 递归渲染世系图，点击节点查看族人档案，始祖节点金色高亮 |
| 🧮 **智能字辈计算器** | 输入代数，自动匹配字辈，高亮展示前后序列 |
| 📊 **PPT 项目展示** | 拖拽/触摸/键盘操控的幻灯片，展示平台愿景与路线图 |
| ⛓️ **区块链存证核验** | 模拟四步存证流程，支持在线哈希核验 |
| 🗄️ **数据库 ERD** | 5 张核心数据表可视化，标注 PK/FK 关系 |
| ✉️ **宗亲留言墙** | LocalStorage 持久化，300 字限制，倒序展示 |
| 📝 **文化博客** | 记录黄氏宗族历史文化，分享寻根经验 |

---

## 🆕 v3.3.0 新增特性

### 安全加固
- 🔒 CORS 白名单配置，防止未授权跨域访问
- 🔐 修复同源认证绕过问题，消除 CSRF 风险
- 🛡️ 敏感配置文件自动加入 .gitignore
- 🛡️ **新增安全中间件**：Helmet.js、速率限制、输入验证
- 🛡️ **增强认证系统**：JWT令牌、API密钥、CSRF保护

### PWA 支持
- 📱 添加到主屏幕，离线访问
- 📲 快捷方式：族谱、字辈、AI 助手
- 📶 离线页面提示
- 🔄 **新增Service Worker**：智能缓存策略、版本控制

### 博客集成
- 📝 **新增博客模块**：基于 Hexo 的文化传承平台
- 🌐 **统一部署**：主站与博客共享域名结构
- 🔄 **自动化构建**：CI/CD 流程集成博客生成

### 性能优化
- ⚡ 图片懒加载，减少首屏加载时间
- 🗄️ Redis 会话存储，支持多实例部署
- 🛡️ 前端全局错误处理，95% 错误捕获率
- 📉 **新增Web Vitals监控**：性能指标采集与上报
- 📦 **代码压缩优化**：JS/CSS压缩率提升至50%+

### 部署增强
- 🐳 **Docker容器化**：完整的Docker Compose部署方案
- 🌐 **Nginx反向代理**：SSL终止、负载均衡、健康检查
- 🔄 **自动化部署脚本**：一键部署前后端服务
- 🔐 **SSL证书管理**：通配符证书支持所有子域名

### AI功能增强
- 🤖 **多模型支持**：qwen3.5-plus, qwen3-max, glm-5, kimi-k2.5等
- 🧠 **智能对话**：上下文记忆、多轮对话支持
- ⚡ **API优化**：流式响应、速率限制、错误重试

---

## 🚀 快速开始

本项目为**纯静态单页应用（SPA）**，无需任何构建工具或服务器，直接双击打开即可运行。

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/your-org/huangshi-genealogy.git
cd huangshi-genealogy

# 初始化子模块（包含博客）
git submodule update --init --recursive

# 直接用浏览器打开（推荐 Chrome / Edge / Firefox）
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

### 使用本地服务器（可选，避免部分浏览器安全限制）

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .

# 然后访问 http://localhost:8080
```

---

## 📁 项目结构

```
hxfund/
├── index.html          # 主页面（SPA 入口）
├── public/             # 主站静态资源
├── blog/               # Hexo 博客模块 (子模块)
│   ├── source/        # 博客内容
│   ├── themes/        # 博客主题
│   ├── public/        # 生成的静态文件
│   └── _config.yml    # 博客配置
├── server/             # 后端 API 服务
├── scripts/            # 部署脚本
│   ├── deploy-full.sh      # 全量部署脚本
│   ├── deploy-blog.sh      # 博客部署脚本
│   └── build-blog-content.sh # 博客内容构建脚本
├── deploy/             # 部署配置
├── docs/               # 项目文档
└── README.md           # 本文件
```

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | HTML5 · CSS3 (Flexbox/Grid) · Vanilla JavaScript ES6 |
| **博客** | Hexo 8.1.1 · Node.js · Markdown |
| **数据持久化** | `localStorage`（客户端留言存储） |
| **字体** | Google Fonts - Noto Serif SC |
| **设计风格** | 古典中国风 · 深褐色调 · 宣纸米白 · 金色点缀 |
| **兼容性** | Chrome 80+ · Firefox 75+ · Edge 80+ · Safari 13+ |
| **部署** | 任意静态托管（GitHub Pages / Vercel / 阿里云OSS / CDN） |

> ⚠️ 本项目**不依赖任何前端框架**（无 React / Vue / Angular），零 npm 依赖。

---

## 📝 博客管理

### 添加新文章
```bash
# 进入博客目录
cd blog

# 创建新文章
npx hexo new post "文章标题"

# 编辑生成的文章
# 文件位置: source/_posts/文章标题.md
```

### 本地预览博客
```bash
cd blog
npm run server
# 访问 http://localhost:4000/blog/ 预览
```

### 构建博客内容
```bash
# 构建博客内容
./scripts/build-blog-content.sh

# 部署整个项目（包括博客）
./scripts/deploy-full.sh
```

---

## 📡 部署指南

### GitHub Actions 自动部署

本项目支持 GitHub Actions 自动部署，包含以下工作流：
- `deploy-main-blog.yml`: 统一部署主站和博客
- `deploy-frontend.yml`: 仅部署前端
- `deploy-backend.yml`: 仅部署后端

### 构建整个项目的前端

```bash
# 构建整个项目的前端（包括主站和博客）
# 1. 初始化子模块
git submodule update --init --recursive

# 2. 构建主站前端
npm run build

# 3. 构建博客内容
./scripts/build-blog-content.sh

# 4. 部署整个项目（包括前端和博客）
./scripts/deploy-full.sh <FTP_HOST> <FTP_USER> <FTP_PASS> [FTP_PORT]
```

### 手动部署

```bash
# 部署整个项目（前端 + 博客）
./scripts/deploy-full.sh <FTP_HOST> <FTP_USER> <FTP_PASS> [FTP_PORT]

# 仅部署博客
./scripts/deploy-blog.sh <FTP_HOST> <FTP_USER> <FTP_PASS> [FTP_PORT]

# 仅构建博客内容
./scripts/build-blog-content.sh
```

### 阿里云部署选项

#### 方法 0: 智能部署 (推荐)

这是一种智能的部署方式，它会自动检测运行环境：

- 如果在配置了 RAM 角色的 ECS 实例上运行，则使用 STS 临时凭证
- 如果在其他环境运行，则自动切换到传统 AccessKey 方式

```bash
# 使用 .env 文件配置（推荐）
cp .env.example .env
nano .env  # 编辑文件，设置所有必要的环境变量

# 运行智能部署
npm run deploy:aliyun:smart
```

#### 方法 1: 使用 ECS 实例角色和 STS 临时凭证 (在 ECS 上最高安全级别 - 推荐)

这种方式最为安全，因为它使用临时凭证而非长期访问密钥：

##### 使用 .env 文件配置（推荐）：
```bash
# 1. 配置 ECS 实例角色（在阿里云控制台完成）
# 2. 复制并编辑环境变量文件
cp .env.example .env
nano .env  # 编辑文件，设置 ECS_ROLE_NAME 和 ALIYUN_OSS_* 变量

# 3. 运行部署脚本
node scripts/deploy-frontend-to-aliyun-oss-sts.js
```

##### 或使用环境变量直接设置：
```bash
# 1. 配置 ECS 实例角色（在阿里云控制台完成）
# 2. 设置环境变量
export ECS_ROLE_NAME="your-ecs-role-name"
export ALIYUN_OSS_BUCKET_NAME="your-bucket-name"
export ALIYUN_OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"  # 可选，默认为 oss-cn-hangzhou.aliyuncs.com

# 3. 运行部署脚本
node scripts/deploy-frontend-to-aliyun-oss-sts.js
```

#### 方法 2: 使用部署脚本 (标准安全级别)

我们提供了自动化的部署脚本：

##### 使用 .env 文件配置（推荐）：
```bash
# 复制并编辑环境变量文件
cp .env.example .env
nano .env  # 编辑文件，设置 ALIYUN_OSS_* 和 ALIYUN_ACCESS_* 变量

# 交互式部署
npm run deploy:aliyun

# 或非交互式部署
node scripts/deploy-frontend-to-aliyun-oss-non-interactive.js
```

##### 或使用环境变量直接设置：
```bash
# 交互式部署
npm run deploy:aliyun

# 或者使用环境变量进行非交互式部署
export ALIYUN_OSS_BUCKET_NAME="your-bucket-name"
export ALIYUN_ACCESS_KEY_ID="your-access-key-id"
export ALIYUN_ACCESS_KEY_SECRET="your-access-key-secret"
export ALIYUN_OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"  # 可选，默认为 oss-cn-hangzhou.aliyuncs.com
node scripts/deploy-frontend-to-aliyun-oss-non-interactive.js
```

#### 方法 3: 手动部署

使用阿里云 OSS 客户端工具：

```bash
# 安装 ossutil (如果尚未安装)
wget http://gosspublic.alicdn.com/ossutil/install.sh
sudo sh install.sh

# 配置 ossutil
ossutil config

# 上传文件
ossutil cp -r ./dist/ oss://your-bucket-name/ --include "*" --meta "Cache-Control:public, max-age=3600"
```

#### 方法 3: FTP 部署到阿里云虚拟主机

将构建的前端文件直接部署到阿里云虚拟主机：

##### 使用 .env 文件配置（推荐）：
```bash
# 复制并编辑环境变量文件
cp .env.example .env
nano .env  # 编辑文件，设置 ALIYUN_FTP_* 变量

# 运行 FTP 部署
npm run deploy:aliyun:ftp
```

##### 或使用环境变量直接设置：
```bash
export ALIYUN_FTP_HOST="your-aliyun-ftp-host.com"
export ALIYUN_FTP_USER="your-ftp-username"
export ALIYUN_FTP_PASS="your-ftp-password"
export ALIYUN_FTP_REMOTE_DIR="/htdocs"

npm run deploy:aliyun:ftp
```

#### FTP 部署配置说明
在部署之前，请确保：
1. 您拥有阿里云虚拟主机的 FTP 访问权限
2. 已构建项目：`npm run build`
3. 已安装 lftp 工具：`sudo apt-get install lftp` (Ubuntu/Debian) 或 `brew install lftp` (macOS)
4. 从阿里云控制台获取正确的 FTP 服务器地址、用户名和密码

更多信息请参阅 `docs/FTP_DEPLOYMENT_EXAMPLE.md`。

#### 配置 CDN 加速 (推荐)

为了获得更好的访问速度和更低的成本，建议配置阿里云 CDN：

1. 在阿里云 CDN 控制台添加域名
2. 将源站类型设置为 "OSS域名" 或 "IP/域名"（如果是虚拟主机）
3. 选择对应的 Bucket 或虚拟主机作为主源站
4. 配置备用源站为您的备用服务器
5. 配置 CNAME 解析到 CDN 分配的域名
6. (可选) 配置 HTTPS 证书

更多详细信息请参阅：
- `docs/ALIYUN_OSS_DEPLOYMENT_GUIDE.md` - OSS 部署指南
- `docs/ALIYUN_FTP_DEPLOYMENT_GUIDE.md` - FTP 部署指南  
- `docs/ALIYUN_CDN_OSS_BACKUP_SOURCE_CONFIG.md` - CDN 配置指南
- `docs/DEPLOYMENT_OPTIONS_SUMMARY.md` - 部署选项摘要

---

## 🗺️ 发展路线图

- [x] **Phase 1（2024 Q1-Q3）**：静态 SPA 全功能上线，四大分支字辈库
- [x] **Phase 1.5（2024 Q4）**：博客模块集成，文化传承平台
- [ ] **Phase 2（2024 Q4-2025 Q2）**：后端 API + 区块链深度集成 + 用户认证
- [ ] **Phase 3（2025 Q3-2026）**：AI 智能寻亲 + 多语言 + 移动端 APP
- [ ] **Phase 4（2026+）**：全球化生态，横向扩展至其他大姓

详见 👉 [项目白皮书 whitepaper.html](whitepaper.html)

---

## 🤝 参与贡献

欢迎宗亲、开发者共同完善平台！

```bash
# 1. Fork 本仓库
# 2. 创建功能分支
git checkout -b feature/add-branch-data

# 3. 初始化子模块（如果包含博客更新）
git submodule update --init --recursive

# 4. 提交更改
git commit -m "feat: 新增XX支系字辈数据"

# 5. 推送分支
git push origin feature/add-branch-data

# 6. 创建 Pull Request
```

### 贡献方向

- 📝 **数据贡献**：补充各地黄氏支系字辈诗、始祖信息
- 📚 **博客内容**：撰写黄氏历史文化、寻根经验文章
- 🐛 **Bug 修复**：提交 [Issue](https://github.com/your-org/huangshi-genealogy/issues) 或直接 PR
- 🌐 **国际化**：翻译界面为英文、马来文、越南文等
- 🎨 **UI 优化**：改进视觉设计与动效体验

---

## 📜 许可证

本项目采用**双轨制授权**：

| 内容 | 协议 |
|------|------|
| **代码**（HTML / CSS / JavaScript） | [MIT License](LICENSE) |
| **族谱数据、白皮书文字内容** | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh) |

```
MIT License — 代码可自由使用、修改、商业化，保留版权声明即可。
CC BY-NC-SA 4.0 — 内容可转载，须注明出处，不得商业使用，衍生须同协议。
```

© 2024 黄氏家族寻根平台（hxfund.cn）· 黄氏寻根平台技术委员会

---

## 📮 联系我们

- 🌐 官网：[hxfund.cn](https://hxfund.cn)
- 📚 博客：[hxfund.cn/blog/](https://hxfund.cn/blog/)
- 📧 邮箱：contact@hxfund.cn
- 💬 Issues：[GitHub Issues](https://github.com/your-org/huangshi-genealogy/issues)

---

<div align="center">

**传承家风，继往开来 · 数字化守护千年血脉**

⭐ 如果这个项目对您有帮助，欢迎 Star 支持！

</div>
