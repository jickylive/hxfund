# 🤖 hxfund 规则自动化流程系统

## 📘 概述

hxfund 规则自动化流程系统是一个事件驱动的自动化引擎，用于根据预定义的规则自动执行各种任务和操作。该系统能够监听系统事件、评估业务规则并执行相应的自动化操作。

## 🏗️ 系统架构

### 组件构成

1. **事件监听器**
   - 监听系统事件（Git提交、PR创建、定时任务等）
   - 验证事件有效性
   - 将事件转发给规则评估器

2. **规则评估器**
   - 读取规则配置文件
   - 评估事件是否匹配规则条件
   - 按优先级排序匹配的规则

3. **动作执行器**
   - 执行匹配规则定义的动作
   - 管理动作执行的顺序和依赖
   - 处理执行结果和错误

4. **规则存储**
   - 存储规则配置
   - 提供规则管理API

### 数据流向

```
事件触发 → 事件解析 → 规则匹配 → 条件评估 → 动作执行 → 结果反馈
```

## 📝 规则定义语法

### 规则结构

```json
{
  "id": "规则唯一标识",
  "name": "规则名称",
  "description": "规则描述",
  "conditions": [条件数组],
  "actions": [动作数组],
  "enabled": true/false,
  "priority": 优先级数值
}
```

### 条件类型

| 类型 | 描述 | 参数 |
|------|------|------|
| git-commit | Git提交事件 | branch: 分支名, filePattern: 文件模式 |
| pull-request | PR事件 | action: 动作类型 |
| schedule | 定时任务 | cron: Cron表达式 |
| file-change | 文件变更 | path: 路径, operation: 操作类型 |

### 动作类型

| 类型 | 描述 | 参数 |
|------|------|------|
| trigger-workflow | 触发工作流 | workflow: 工作流名, inputs: 输入参数 |
| run-security-scan | 运行安全扫描 | 无 |
| run-script | 执行脚本 | script: 脚本路径 |
| health-check | 健康检查 | endpoint: 端点URL |
| create-review-task | 创建审查任务 | assignees: 分配人员, labels: 标签 |

## ⚙️ 配置和部署

### 环境配置

1. 创建规则配置文件 `rules.json`
2. 配置触发器和动作参数
3. 设置必要的环境变量

### 部署方式

1. **本地运行**:
   ```bash
   cd rules
   npm install
   npm start
   ```

2. **Docker部署**:
   ```bash
   docker build -t hxfund-rule-engine .
   docker run -p 3001:3001 hxfund-rule-engine
   ```

3. **GitHub Actions集成**:
   使用 `rules-automation.yml` 工作流

## 🚀 核心功能

### 1. 事件处理
- 实时接收和处理系统事件
- 支持批量事件处理
- 提供事件处理日志

### 2. 规则管理
- 动态加载和卸载规则
- 规则验证和测试功能
- 优先级管理

### 3. 动作执行
- 并行执行多个动作
- 错误处理和重试机制
- 执行结果追踪

### 4. 监控和报告
- 执行日志记录
- 性能指标监控
- 健康检查端点

## 📊 使用示例

### 示例1: 自动部署规则

当main分支有代码提交时自动部署:

```json
{
  "id": "auto-deploy-main",
  "name": "主分支自动部署",
  "conditions": [{
    "type": "git-commit",
    "branch": "main"
  }],
  "actions": [{
    "type": "trigger-workflow",
    "workflow": "deploy-integration.yml"
  }]
}
```

### 示例2: PR安全扫描

创建PR时自动运行安全扫描:

```json
{
  "id": "security-scan-pr",
  "name": "PR安全扫描",
  "conditions": [{
    "type": "pull-request",
    "action": "opened"
  }],
  "actions": [{
    "type": "run-security-scan"
  }]
}
```

## 🔧 管理和维护

### 规则管理CLI

```bash
# 列出所有规则
node cli.js list

# 测试规则配置
node cli.js test

# 验证规则配置
node cli.js validate
```

### API接口

- `POST /api/events` - 处理传入事件
- `GET /api/rules` - 获取所有规则
- `GET /api/rules/:id` - 获取特定规则
- `POST /api/rules/test` - 测试规则
- `GET /api/health` - 健康检查

## 🛡️ 安全考虑

- 所有动作执行都经过验证
- 限制可执行脚本的位置
- 提供错误处理和降级机制
- 审计日志记录所有操作

## 🔮 扩展性

系统设计为高度可扩展:

- 可添加新的条件类型
- 可添加新的动作类型
- 支持插件化扩展
- 配置驱动的行为

## 📞 支持和故障排除

- 查看日志文件
- 使用 `npm run rules:test` 验证配置
- 检查API健康状态
- 参考文档和示例

---

该规则自动化流程系统旨在简化日常运营任务，提高工作效率，减少人为错误。通过标准化的规则定义，可以轻松配置和管理各种自动化场景。