# 数据库初始化指南

## ⚠️ 重要提示

当前 RDS 用户 `hxfund` 没有创建数据库的权限，需要手动在阿里云 RDS 控制台创建数据库。

---

## 📋 步骤 1: 在阿里云 RDS 控制台创建数据库

### 方式 1: 使用阿里云控制台（推荐）

1. 登录 [阿里云 RDS 控制台](https://rds.console.aliyun.com/)
2. 找到实例 `rm-wz9dmu9vp5h91kfuwco`
3. 点击实例 ID 进入详情页
4. 左侧菜单选择 **数据库管理**
5. 点击 **创建数据库**
6. 填写信息：
   - **数据库名称**: `hxfund`
   - **字符集**: `utf8mb4`
   - **初始账号**: 选择 `hxfund`
   - **权限**: `读写`
7. 点击 **确定**

### 方式 2: 使用 SQL 查询窗口

1. 登录 [阿里云 RDS 控制台](https://rds.console.aliyuncs.com/)
2. 进入实例详情页
3. 左侧菜单选择 **SQL 查询**
4. 连接数据库（使用 hxfund 账号）
5. 执行以下 SQL：

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS `hxfund` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

-- 授权（如果需要）
GRANT ALL PRIVILEGES ON `hxfund_db`.* TO 'hxfund'@'%';
FLUSH PRIVILEGES;
```

---

## 📋 步骤 2: 执行初始化脚本

### 方式 1: 使用 SQL 查询窗口（推荐）

1. 在 RDS 控制台 **SQL 查询** 窗口
2. 选择数据库 `hxfund_db`
3. 复制并执行 `database/create-db.sql` 文件内容
4. 查看执行结果

### 方式 2: 使用命令行工具

```bash
# 1. 下载 SQL 文件
# 文件位于：database/create-db.sql

# 2. 使用 mysql 命令行执行
mysql -h rm-wz9dmu9vp5h91kfuwco.mysql.rds.aliyuncs.com \
  -P 3306 \
  -u hxfund \
  -p hxfund_db \
  < database/create-db.sql

# 3. 输入密码：FyJ!Le5Wqc!yWVx
```

### 方式 3: 使用 Navicat/DBeaver 等工具

1. 连接到 RDS
   - 主机：`rm-wz9dmu9vp5h91kfuwco.mysql.rds.aliyuncs.com`
   - 端口：`3306`
   - 用户名：`hxfund`
   - 密码：`FyJ!Le5Wqc!yWVx`
   - 数据库：`hxfund_db`
2. 打开 `database/create-db.sql`
3. 执行 SQL 脚本

---

## 📋 步骤 3: 验证初始化结果

### 方式 1: 使用测试脚本

```bash
node test-rds-connection.js
```

**预期输出:**
```
✓ 基础查询：[ { test: 1 } ]
✓ MySQL 版本：8.0.36
✓ 当前数据库：hxfund_db
✓ 当前用户：hxfund@xxx.xxx.xxx.xxx

📁 检查数据表...
找到 6 个表:
  - family_members
  - generation_poems
  - project_slides
  - blockchain_records
  - guest_messages
  - system_config

🔍 检查关键数据...
✓ 家族成员：9 人
✓ 字辈分支：4 个
✓ 幻灯片：5 个
```

### 方式 2: 使用初始化脚本

```bash
node init-database.js
```

### 方式 3: 使用 SQL 查询

```sql
-- 查看表
SHOW TABLES;

-- 查看家族成员
SELECT title, period FROM family_members;

-- 查看字辈诗
SELECT branch_name, poem FROM generation_poems;

-- 查看幻灯片
SELECT title, subtitle FROM project_slides ORDER BY sort_order;
```

---

## 📋 步骤 4: 启动 API 服务测试

```bash
# 启动服务
npm start

# 测试健康检查
curl http://localhost:3000/api/db/health

# 测试家族树 API
curl http://localhost:3000/api/db/family-tree

# 测试字辈诗 API
curl http://localhost:3000/api/db/generation-poems

# 测试字辈计算
curl "http://localhost:3000/api/db/generation-poems/jiangxia/calculate?generation=10"
```

---

## 🔧 常见问题

### 1. 无法创建数据库

**错误:** `Access denied for user 'hxfund'@'%' to database`

**解决:**
- 使用高权限账号登录 RDS 控制台创建数据库
- 或者联系管理员授权

### 2. 表已存在

**错误:** `Table 'xxx' already exists`

**解决:**
- 忽略错误，继续使用
- 或者先删除表：`DROP TABLE IF EXISTS xxx;`

### 3. 连接超时

**错误:** `ETIMEDOUT`

**解决:**
- 检查 RDS 白名单
- 确认 RDS 实例运行中
- 检查网络连接

---

## 📁 相关文件

| 文件 | 说明 |
|------|------|
| `database/create-db.sql` | 数据库创建 + 初始化脚本 |
| `database/init-simple.sql` | 简化版初始化脚本（不含存储过程） |
| `database/init.sql` | 完整版初始化脚本（含存储过程） |
| `init-database.js` | Node.js 初始化脚本 |
| `test-rds-connection.js` | RDS 连接测试脚本 |

---

## 🔗 阿里云 RDS 链接

- [RDS 控制台](https://rds.console.aliyuncs.com/)
- [SQL 查询窗口](https://help.aliyun.com/document_detail/51933.html)
- [数据库管理](https://help.aliyun.com/document_detail/51934.html)

---

**最后更新:** 2026-03-08
