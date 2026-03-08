# 黄氏家族寻根平台 - 数据库文档

## 📁 文件说明

| 文件 | 说明 | 使用方式 |
|------|------|----------|
| `init.sql` | MySQL 数据库初始化脚本 | `mysql -u root -p < init.sql` |
| `database-init-mongodb.js` | MongoDB 数据库初始化脚本 | `mongosh < database-init-mongodb.js` |

---

## 🗄️ 数据库表结构

### 1. 家族成员表 (family_members)

存储家族树形结构数据。

```sql
CREATE TABLE family_members (
  id VARCHAR(50) PRIMARY KEY,
  parent_id VARCHAR(50),
  name VARCHAR(100),
  title VARCHAR(100),
  period VARCHAR(100),
  avatar VARCHAR(10),
  bio TEXT,
  location VARCHAR(200),
  level INT,
  sort_order INT
);
```

**示例数据：**
- 始祖：伯益
- 三大支系：江夏黄氏、金华黄氏、闽台黄氏
- 共 9 位家族成员

---

### 2. 字辈表 (generation_poems)

存储各分支的字辈诗。

| 分支代码 | 分支名称 | 字辈诗 |
|---------|---------|--------|
| jiangxia | 江夏黄氏 | 文章华国诗礼传家忠孝为本仁义是先 |
| shicheng | 石城黄氏 | 祖德流芳远宗功世泽长箕裘绵骏业俎豆永腾光 |
| mianyang | 绵阳黄氏 | 朝廷文仕正世代永兴隆 |
| fujian | 福建黄氏 | 敦厚垂型远诗书世泽长 |

---

### 3. 项目愿景幻灯片表 (project_slides)

存储项目展示幻灯片。

| 标题 | 副标题 | 图标 |
|------|--------|------|
| 愿景使命 | 数字化传承黄氏家族文化，连接全球宗亲 | 🎯 |
| 核心功能 | 六大模块全面服务宗亲 | ⚙️ |
| 技术架构 | 现代化、可扩展的技术栈 | 🏗️ |
| 数据安全 | 区块链存证，确保数据真实可信 | 🔗 |
| 未来规划 | 持续迭代，打造更好的服务平台 | 🚀 |

---

### 4. 区块链存证记录表 (blockchain_records)

存储区块链存证数据。

| 存证 ID | 成员姓名 | 哈希值 | 状态 |
|--------|---------|--------|------|
| MBR-2024-001 | 黄香 | 0x7a8f9c... | ✅ 已验证 |
| MBR-2024-002 | 黄峭 | 0x3b5d7f... | ✅ 已验证 |
| MBR-2024-003 | 黄岸 | 0x9e8d7c... | ✅ 已验证 |

---

### 5. 留言表 (guest_messages)

存储宗亲留言。

| 留言者 | 内容 | 位置 |
|--------|------|------|
| 黄志强 | 寻找湖南宁乡黄氏宗亲 | 湖南长沙 |
| 黄文华 | 感谢平台让我们这些海外游子能够了解家族历史 | 美国旧金山 |
| 匿名宗亲 | 福建邵武黄氏后裔 | 台湾台北 |

---

### 6. 用户表 (users)

存储用户账户信息。

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(100),
  password_hash VARCHAR(255),
  role ENUM('admin', 'editor', 'user'),
  branch_id INT,
  generation INT
);
```

---

### 7. 会话表 (sessions)

存储用户会话数据。

```sql
CREATE TABLE sessions (
  id VARCHAR(100) PRIMARY KEY,
  user_id INT,
  data JSON,
  expires_at TIMESTAMP
);
```

---

### 8. AI 对话记录表 (ai_conversations)

存储 AI 对话历史。

```sql
CREATE TABLE ai_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(100),
  user_id INT,
  model VARCHAR(50),
  message TEXT,
  response TEXT,
  tokens_used INT,
  temperature DECIMAL(3,2)
);
```

---

### 9. 系统配置表 (system_config)

存储系统配置参数。

| 配置键 | 配置值 | 类型 | 说明 |
|--------|--------|------|------|
| site_name | 黄氏家族寻根平台 | string | 网站名称 |
| site_version | 3.2.0 | string | 系统版本 |
| allowed_origins | [...] | json | CORS 允许源 |
| rate_limit_window_ms | 60000 | number | 速率限制窗口 |
| ai_default_model | qwen3.5-plus | string | 默认 AI 模型 |

---

## 🔧 使用方法

### MySQL 部署

```bash
# 1. 创建数据库并导入数据
mysql -u root -p < database/init.sql

# 2. 验证导入
mysql -u root -p hxfund_db -e "SELECT COUNT(*) FROM family_members;"
```

### MongoDB 部署

```bash
# 1. 启动 MongoDB
mongod --config /etc/mongod.conf

# 2. 导入数据
mongosh < database/database-init-mongodb.js

# 3. 验证导入
mongosh hxfund_db --eval "db.family_members.countDocuments()"
```

---

## 📊 ER 图

```
┌─────────────────┐       ┌──────────────────┐
│ family_members  │       │ generation_poems │
├─────────────────┤       ├──────────────────┤
│ id (PK)         │       │ branch_code (PK) │
│ parent_id (FK)  │       │ branch_name      │
│ name            │       │ poem             │
│ title           │       │ characters       │
│ level           │       └──────────────────┘
└────────┬────────┘
         │
         │ 自关联
         │
┌────────▼────────┐
│ family_members  │
└─────────────────┘

┌─────────────────┐       ┌──────────────────┐
│ users           │       │ sessions         │
├─────────────────┤       ├──────────────────┤
│ id (PK)         │       │ id (PK)          │
│ username        │       │ user_id (FK)     │
│ password_hash   │       │ data (JSON)      │
└────────┬────────┘       └──────────────────┘
         │
         │
┌────────▼────────┐       ┌──────────────────┐
│ ai_conversations│       │ blockchain_records│
├─────────────────┤       ├──────────────────┤
│ session_id (FK) │       │ record_id (PK)   │
│ user_id (FK)    │       │ member_name      │
│ message         │       │ hash_value       │
│ response        │       └──────────────────┘
└─────────────────┘
```

---

## 🔐 安全建议

1. **生产环境修改默认密码**
   ```sql
   ALTER USER 'hxfund_app'@'localhost' IDENTIFIED BY 'your_secure_password';
   ```

2. **启用 SSL 连接**
   ```sql
   -- MySQL
   REQUIRE SSL
   
   -- MongoDB
   tls: true
   ```

3. **定期备份数据库**
   ```bash
   # MySQL
   mysqldump hxfund_db > backup_$(date +%Y%m%d).sql
   
   # MongoDB
   mongodump --db hxfund_db --out backup_$(date +%Y%m%d)
   ```

---

## 📝 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-03-08 | 初始版本，基于 data.js 3.2.0 |

---

**最后更新:** 2026-03-08
