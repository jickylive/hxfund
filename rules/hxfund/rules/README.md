# 🤖 hxfund 规则自动化流程系统

## 概述

hxfund 规则自动化流程系统是一个事件驱动的自动化引擎，用于根据预定义的规则自动执行各种任务和操作。该系统能够监听系统事件、评估业务规则并执行相应的自动化操作。

## 架构

系统包含以下几个主要组件：

- **事件监听器**: 监听系统事件（代码提交、API调用、定时任务等）
- **规则评估器**: 评估规则条件是否满足
- **动作执行器**: 执行匹配规则的动作
- **规则存储**: 存储规则定义和配置

## 配置文件

### rules.json
定义系统的业务规则，包括触发条件和要执行的动作。

### config.json
系统级别的配置，如日志级别、超时设置等。

## 使用方式

### 1. 本地运行
```bash
cd rules
npm install
npm start
```

### 2. Docker部署
```bash
docker build -t hxfund-rule-engine .
docker run -p 3001:3001 hxfund-rule-engine
```

### 3. 通过CLI管理
```bash
# 列出所有规则
node cli.js list

# 测试规则配置
node cli.js test

# 验证规则配置
node cli.js validate
```

## API接口

- `POST /api/events` - 处理传入事件
- `GET /api/rules` - 获取所有规则
- `GET /api/rules/:id` - 获取特定规则
- `POST /api/rules/test` - 测试规则
- `GET /api/health` - 健康检查

## 规则示例

系统预定义了以下规则：

1. **主分支自动部署** - 当main分支有代码提交时自动部署
2. **PR安全扫描** - 每当创建新的PR时自动运行安全扫描
3. **每日内容更新** - 每天早上8点自动生成AI内容
4. **后端健康监控** - 监控后端API健康状态
5. **博客文章审批** - 新博客文章提交时需要审批

## 集成

规则系统与GitHub Actions集成，通过 `rules-automation.yml` 工作流实现持续自动化。

## 文件结构

```
rules/
├── README.md           # 本文件
├── DOCUMENTATION.md    # 详细文档
├── engine.js          # 规则引擎核心实现
├── server.js          # API服务端
├── cli.js             # 命令行工具
├── config.json        # 系统配置
├── rules.json         # 规则定义
├── package.json       # 依赖配置
├── Dockerfile         # Docker配置
├── install.sh         # 安装脚本
├── test/              # 测试文件
│   └── rules.test.js
└── .github/workflows/
    └── rules-automation.yml  # GitHub Actions工作流
```

## 维护和支持

系统具有以下特性：

- 可扩展的架构
- 错误处理和重试机制
- 执行结果追踪
- 性能监控
- 安全验证

## 部署验证

可以通过以下命令验证部署：
```bash
./install.sh
```

## 开发和测试

运行测试:
```bash
node test/rules.test.js
```

## 扩展性

系统设计为高度可扩展:

- 可添加新的条件类型
- 可添加新的动作类型
- 支持插件化扩展
- 配置驱动的行为

---

该规则自动化流程系统旨在简化日常运营任务，提高工作效率，减少人为错误。通过标准化的规则定义，可以轻松配置和管理各种自动化场景。