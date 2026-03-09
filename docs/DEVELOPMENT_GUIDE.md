# 黄氏家族寻根平台 - 开发指南

## 📖 目录

- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [开发环境搭建](#开发环境搭建)
- [开发规范](#开发规范)
- [API 文档](#api-文档)
- [测试指南](#测试指南)
- [部署指南](#部署指南)
- [常见问题](#常见问题)

---

## 项目概述

黄氏家族寻根平台是一个面向全球黄氏宗亲的数字化族谱管理平台，提供家族世系图谱、智能字辈推算、区块链存证、宗亲留言墙等功能。

**项目特点**:
- 🚀 现代化技术栈（Node.js + Express）
- 🤖 AI 对话集成（阿里云百炼）
- 🔐 完善的安全认证体系
- 📊 实时性能监控
- ⚡ Redis 缓存加速
- 🧪 完整的测试覆盖

---

## 技术栈

### 后端
- **运行环境**: Node.js >= 18.0.0
- **Web 框架**: Express.js 4.18.2
- **数据库**: MySQL 2 (阿里云 RDS)
- **缓存**: Redis 7
- **认证**: JWT + API Key
- **日志**: Winston
- **测试**: Jest
- **文档**: Swagger

### 前端
- **构建工具**: Vite 5.4.21
- **核心库**: 原生 JavaScript
- **样式**: Sass + PostCSS
- **开发工具**: ESLint + Prettier

### DevOps
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **监控**: Sentry
- **CI/CD**: GitHub Actions

---

## 项目结构

```
hxfund/
├── server/                  # 后端服务
│   ├── config/             # 配置文件
│   │   ├── logger.js       # 日志配置
│   │   ├── security.js     # 安全配置
│   │   ├── monitoring.js   # 监控配置
│   │   ├── swagger.js      # API文档配置
│   │   └── database.js     # 数据库配置
│   ├── controllers/        # 控制器
│   │   ├── aiController.js       # AI控制器
│   │   ├── authController.js     # 认证控制器
│   │   ├── sessionController.js  # 会话控制器
│   │   └── monitoringController.js # 监控控制器
│   ├── services/           # 服务层
│   │   ├── aiService.js    # AI服务
│   │   ├── authService.js  # 认证服务
│   │   ├── sessionService.js # 会话服务
│   │   └── cacheService.js # 缓存服务
│   ├── middleware/         # 中间件
│   │   ├── errorHandler.js  # 错误处理
│   │   ├── cache.js         # 缓存中间件
│   │   ├── http-logger.js   # HTTP日志
│   │   └── security.js      # 安全中间件
│   ├── routes/             # 路由
│   ├── index.js            # 主服务文件
│   ├── auth.js             # 认证模块
│   ├── cli-wrapper.js      # CLI封装
│   ├── session-store.js    # 会话存储
│   └── waline.js           # 评论系统
├── frontend/               # 前端应用
│   ├── src/               # 源代码
│   │   ├── js/           # JavaScript
│   │   ├── css/          # 样式文件
│   │   └── components/   # 组件
│   └── dist/             # 构建产物
├── tests/                 # 测试文件
│   ├── services/         # 单元测试
│   └── integration/      # 集成测试
├── docs/                  # 文档
├── scripts/               # 脚本工具
├── deploy/                # 部署配置
├── logs/                  # 日志文件
└── package.json           # 项目配置
```

---

## 开发环境搭建

### 1. 克隆项目

```bash
git clone https://github.com/huangshi-genealogy/hxfund.cn.git
cd hxfund
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 通用配置
NODE_ENV=development
PORT=3000

# CORS 配置
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Redis 配置
REDIS_URL=redis://localhost:6379

# Qwen AI API 配置
QWEN_API_KEY=your-qwen-api-key
QWEN_MODEL=qwen3.5-plus
QWEN_BASE_URL=https://coding.dashscope.aliyuncs.com/v1
QWEN_TEMPERATURE=0.7

# 数据库配置（可选）
RDS_HOST=your-database-host
RDS_PORT=3306
RDS_DATABASE=hxfund_db
RDS_USERNAME=your-username
RDS_PASSWORD=your-password

# 日志级别
LOG_LEVEL=debug
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 5. 访问 API 文档

启动服务后，访问 Swagger API 文档：

```
http://localhost:3000/api-docs
```

---

## 开发规范

### 代码风格

项目使用 ESLint 进行代码检查：

```bash
npm run lint
```

### 提交规范

使用语义化提交信息：

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

### 命名规范

- **文件名**: kebab-case (例：`ai-service.js`)
- **变量名**: camelCase (例：`userService`)
- **类名**: PascalCase (例：`UserService`)
- **常量名**: UPPER_SNAKE_CASE (例：`MAX_RETRY_COUNT`)

### 注释规范

使用 JSDoc 注释：

```javascript
/**
 * 用户服务类
 * 处理所有用户相关的业务逻辑
 */
class UserService {
  /**
   * 获取用户信息
   * @param {number} userId - 用户ID
   * @returns {Promise<Object>} 用户信息
   */
  async getUser(userId) {
    // 实现
  }
}
```

---

## API 文档

### 认证方式

#### 1. API Key 认证

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"prompt": "你好"}'
```

#### 2. JWT Token 认证

```bash
# 获取 Token
curl -X POST http://localhost:3000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "your-api-key"}'

# 使用 Token
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"prompt": "你好"}'
```

### 主要 API 端点

#### AI 对话

```bash
# 单次对话
POST /api/chat
Body: { "prompt": "你好", "model": "qwen3.5-plus", "temperature": 0.7 }

# 多轮对话
POST /api/conversation
Body: { "message": "你好", "sessionId": "session-id", "model": "qwen3.5-plus" }

# 获取模型列表
GET /api/models
```

#### 会话管理

```bash
# 获取会话
GET /api/session/:sessionId

# 删除会话
DELETE /api/session/:sessionId

# 获取所有会话
GET /api/sessions
```

#### 认证

```bash
# 获取 Token
POST /api/auth/token

# 获取认证状态
GET /api/auth/status

# 刷新 Token
POST /api/auth/refresh
```

#### 监控

```bash
# 获取性能报告
GET /api/monitoring/performance

# 健康检查
GET /api/monitoring/health

# 获取系统资源
GET /api/monitoring/system
```

详细 API 文档请访问：`http://localhost:3000/api-docs`

---

## 测试指南

### 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 生成测试覆盖率报告
npm run test:coverage
```

### 编写测试

#### 单元测试示例

```javascript
const aiService = require('../../server/services/aiService');

describe('AIService', () => {
  test('应该验证有效的模型ID', () => {
    expect(aiService.isValidModel('qwen3.5-plus')).toBe(true);
  });
});
```

#### 集成测试示例

```javascript
const request = require('supertest');
const app = require('../../server/index');

describe('API 集成测试', () => {
  test('GET /api/health 应该返回健康状态', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('User-Agent', 'Mozilla/5.0');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
```

---

## 部署指南

### Docker 部署

```bash
# 构建镜像
docker build -t hxfund-api .

# 运行容器
docker-compose up -d
```

### 手动部署

```bash
# 安装依赖
npm install --production

# 启动服务
npm start
```

### 环境变量配置

生产环境需要配置以下环境变量：

```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://hxfund.cn,https://www.hxfund.cn
REDIS_URL=redis://your-redis-host:6379
QWEN_API_KEY=your-production-api-key
```

---

## 常见问题

### 1. 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

### 2. Redis 连接失败

检查 Redis 是否正在运行：

```bash
redis-cli ping
```

### 3. 数据库连接失败

检查数据库配置是否正确，确保数据库服务正在运行。

### 4. 日志文件过大

日志会自动轮转，但也可以手动清理：

```bash
rm -rf logs/*.log
```

---

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 联系方式

- 项目主页: https://hxfund.cn
- 问题反馈: https://github.com/huangshi-genealogy/hxfund.cn/issues
- 邮箱: contact@hxfund.cn

---

**祝您开发愉快！** 🎉
