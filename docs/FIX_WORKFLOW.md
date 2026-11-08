# 本地开发与修复流程

> 记录自 2026-11-08 的一次完整修复操作（本地调试 → 定位 2 个 bug → 全功能测试 → 分支 → PR #18）。
> 目标：下次遇到同类问题时，直接照此流程走，少走弯路。

## 目录

- [1. 本地开发环境启动](#1-本地开发环境启动)
- [2. 典型问题诊断案例](#2-典型问题诊断案例)
- [3. 全功能测试清单](#3-全功能测试清单)
- [4. 修复提交与 PR 流程](#4-修复提交与-pr-流程)
- [5. 已知坑位速查表](#5-已知坑位速查表)

---

## 1. 本地开发环境启动

```bash
npm install        # 依赖有缺失时先补齐（曾出现 winston/jest 等 6 个包缺失）
npm run dev        # nodemon 热重载，服务地址 http://localhost:3000
```

### 关键配置事实

| 事实 | 说明 |
|---|---|
| `.env` 在**根目录** | `server/config/.env` **不存在**；`index.js` 显式加载该路径会落空，根 `.env` 实际是靠 `server/config/database.js` 的 `dotenv.config()`（默认 cwd）加载的 |
| 服务实际是 HTTP | 无本地 SSL 证书时回退 HTTP；启动横幅里的 `https://` 是文案错误，别被误导 |
| Redis 可缺省 | 未配置/连不上时自动降级内存存储，会话和额度检查 fail-open |
| RDS 是必需的 | `RDS_HOST` 有值时启动会强制初始化连接池，失败即退出。需要：有效账号密码 + 本机出口 IP 加入 RDS 白名单 + `RDS_SSL=true` |

### 验证服务就绪

```bash
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
curl -s -A "$UA" http://localhost:3000/api/health      # 必须带浏览器 UA，见坑位表
curl -s -A "$UA" http://localhost:3000/api/db/health   # database.connected 应为 true
```

## 2. 典型问题诊断案例

### 案例 A：RDS 认证被拒（Access denied for user 'root'）

**症状**：启动日志 `❌ 数据库连接失败: Access denied for user 'root'@'x.x.x.x' (using password: YES)`。

**诊断路径**（由表及里）：

1. 网络层：错误是"Access denied"而不是超时 → 白名单已通，问题在账号/密码
2. 变量层：对比 **`.env` 定义的变量名** 与 **代码实际读取的变量名**
   - 本次根因：`.env` 定义 `RDS_USERNAME`，代码 `server/config/database.js` 读 `RDS_USER` → 取不到 → 回退默认 `root`
3. 用**不泄露密码**的诊断脚本对比解析结果：

```bash
node -e "
const fs=require('fs');
const line=fs.readFileSync('.env','utf8').split(/\r?\n/).find(l=>l.startsWith('RDS_PASSWORD='));
require('dotenv').config();
const raw=line.match(/^RDS_PASSWORD=(.*)$/)[1];
const p=process.env.RDS_PASSWORD||'';
console.log('raw len='+raw.length+'  dotenv len='+p.length);
console.log('特殊字符:', p.match(/[^A-Za-z0-9]/g)||'无');
"
```

   - 长度不一致 → dotenv 解析改写了值（常见：`#` 未加引号被当注释截断）
   - 长度一致 → 值没问题，回到"代码读错变量名"方向

**修复**：`user: process.env.RDS_USERNAME || process.env.RDS_USER || 'root'`（兼容两个名字）。

### 案例 B：`/api/docs` 404（路由不可达）

**症状**：启动横幅明确标注 `API 文档：https://localhost:3000/api/docs`，实际访问 404。

**诊断路径**：

1. 确认路由存在：`grep -n "api/docs" server/index.js` → 有 `app.get('/api/docs', ...)`
2. 查注册顺序：`notFoundHandler`（第 829 行）注册在 `/api/docs`（第 838 行）**之前** → Express 按注册顺序匹配，404 处理器先截胡，路由永远不可达

**修复**：把 `app.use(notFoundHandler)` 和 `app.use(errorHandler)` 移到 `/api/docs` 路由定义之后。

**通用教训**：Express 的 404 / 统一错误处理中间件必须注册在**所有业务路由之后**；新增路由时如果莫名 404，先查注册顺序。

## 3. 全功能测试清单

### 3.1 自动化测试

```bash
npm run test:unit        # Jest tests/services（30 通过 / 5 跳过，跳过的需真实 DB）
npm run test:integration # Jest tests/integration（9 通过）
```

### 3.2 端点验证（所有 curl 必须带浏览器 UA）

| 分组 | 端点 | 方法 |
|---|---|---|
| 基础 | `/api/health` `/api/models` `/api/auth/status` `/api/docs` `/` `/admin/guestbook.html` | GET |
| 数据库（只读） | `/api/db/family-tree` `/api/db/generation-poems` `/api/db/project-slides` `/api/db/blockchain-records` `/api/db/guest-messages` | GET |
| AI 对话 | `POST /api/chat`、`POST /api/conversation`（首轮不传 sessionId，后续传）、`GET /api/session/:id`、`DELETE /api/session/:id` | 需认证（X-API-Key 或 Bearer token） |
| Waline | `GET/POST /api/waline/article`、`GET/POST /api/waline/comment`、`POST /api/waline/comment/:id/like`、`DELETE /api/waline/comment/:id` | 内存存储，重启即清空 |
| 管理员 | `GET /api/db/guest-messages/pending`、`POST /api/db/guest-messages/:id/approve`、`DELETE /api/db/guest-messages/:id` | 需服务器 API Key |

### 3.3 写接口的安全测试原则（重要）

- **留言**：新提交一律待审核（`is_public=0`），不会出现在生产站点 → 可以安全测试。测完用管理员接口 `DELETE /api/db/guest-messages/:id` 清理并复核
- **Waline**：纯内存 Map 存储，不写生产库 → 任意测试
- **管理员 Key 的不泄露用法**：

```bash
KEY=$(node -e "const c=require('./server/config/auth.json');process.stdout.write(c.serverApiKey||'')")
curl -s -A "$UA" -H "X-API-Key: $KEY" http://localhost:3000/api/db/guest-messages/pending
```

  密钥只进 shell 变量，不进输出。

### 3.4 安全功能顺手验证

| 功能 | 验证方式 | 预期 |
|---|---|---|
| 速率限制 | 短时间密集请求（>30 次/分钟） | 429 |
| UA 过滤 | curl 默认 UA | 403 `FORBIDDEN_USER_AGENT` |
| API 认证 | 无凭据 `POST /api/chat` | 401 |
| 管理员鉴权 | 无 Key 访问 pending 列表 | 401/403 |

## 4. 修复提交与 PR 流程

### 4.1 提交规范

- 一个 bug 一个提交，中文 Conventional Commits（`fix: ...`）
- 提交信息结尾带 Co-Authored-By trailer（空行分隔，用 heredoc 提交）

### 4.2 分支与推送

```bash
git branch fix/<简短描述>            # 从当前 HEAD 建分支
git push origin fix/<简短描述>       # 网络不稳时直接重试
```

### 4.3 创建 PR（本机未安装 gh CLI 的替代方案）

用 Git 已存储的 GitHub 凭证调用 REST API，**token 全程不打印**：

```bash
cat > .tmp-pr.json <<'EOF'
{"title":"fix: ...","head":"fix/<分支>","base":"main","body":"..."}
EOF
CRED=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null)
TOKEN=$(printf "%s\n" "$CRED" | sed -n 's/^password=//p')
curl -s -X POST https://api.github.com/repos/jickylive/hxfund/pulls \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" \
  -d @.tmp-pr.json
rm -f .tmp-pr.json
```

创建后 GET `/repos/jickylive/hxfund/pulls/<号>` 验证 `mergeable` 与 `mergeable_state`（`clean` 即可合并）。

> 备选：推送分支后 GitHub 会输出 `https://github.com/jickylive/hxfund/pull/new/<分支>`，浏览器打开手动创建。

## 5. 已知坑位速查表

| 坑 | 表现 | 对策 |
|---|---|---|
| UA 过滤 | curl 默认 UA 全部 403 | 测试一律带浏览器 User-Agent |
| 速率限制 | 批量测试中途 429 | 控制每 60 秒 ≤30 次请求；429 本身说明限流失效，属通过 |
| 横幅 https 文案 | 实际是 HTTP | 用 `http://localhost:3000` 访问 |
| `server/config/.env` 不存在 | 改了没生效 | 配置改**根目录** `.env` |
| dotenv 不覆盖已存在的环境变量 | 改 `.env` 不生效 | 检查 shell 是否已 export 同名变量 |
| 控制台中文乱码 | API 返回的中文显示为乱码 | 终端编码显示问题，非 API 故障；JSON 本身是合法 UTF-8 |
| mysql2 警告 `acquireTimeout`/`connectionUrl` | 启动日志两条 warning | 已知无害警告（无效配置项被忽略），新版 mysql2 才会报错 |
| 内存告警 89%+ | 测试期间 heap 告警 | 日常开发可忽略，持续高负载再关注 |

---

## 附：本次操作涉及的提交与 PR

| 对象 | 说明 |
|---|---|
| `89656eb` | fix: 数据库账号读取 RDS_USERNAME 变量，修复 RDS 认证被拒 |
| `04e26cf` | fix: /api/docs 路由移到 notFoundHandler 之后注册，修复文档页 404 |
| PR #18 | 上述两提交的合并请求 → main |
