# 黄氏家族寻根平台 - 精简版部署说明

## 脚本说明

精简后的package.json保留了最核心和常用的脚本：

### 核心脚本

- `npm start` - 启动生产环境服务
- `npm run dev` - 启动开发环境服务（带热重载）
- `npm run build` - 构建前端资源

### Docker 部署脚本

- `npm run docker:build` - 构建Docker镜像
- `npm run docker:up` - 启动Docker Compose服务
- `npm run docker:down` - 停止Docker Compose服务
- `npm run docker:deploy` - 构建并部署Docker服务
- `npm run deploy:docker` - 使用部署脚本部署

### 开发工具脚本

- `npm run qwen` - 启动Qwen AI客户端
- `npm run qwen:init` - 初始化Qwen配置
- `npm test` - 运行测试套件
- `npm run lint` - 代码质量检查
- `npm run clean` - 清理并重新安装依赖

## 依赖说明

### 生产依赖（dependencies）
- 核心框架：express, body-parser, cors
- 安全中间件：helmet, express-rate-limit, express-validator, csurf
- 性能优化：compression
- 监控：@sentry/node, web-vitals
- 数据库：redis
- 工具：dotenv, uuid

### 开发依赖（devDependencies）
- 开发工具：nodemon
- 代码质量：eslint
- 构建工具：terser

## 部署流程

### 1. 本地开发
```bash
npm install
npm run dev
```

### 2. 构建部署
```bash
npm run build
npm start
```

### 3. Docker部署
```bash
npm run docker:build
npm run docker:up
```

或一键部署：
```bash
npm run docker:deploy
```

### 4. 完整部署
```bash
npm run deploy:docker
```

## 版本信息

- **当前版本**: 3.3.0
- **Node.js要求**: >=18.0.0
- **NPM要求**: >=8.0.0

---
**精简日期**: 2026年3月5日
**维护人员**: 黄氏家族寻根平台开发团队