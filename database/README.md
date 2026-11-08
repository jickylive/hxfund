# 黄氏家族寻根平台 - 数据模型文档

> 基于**生产库真实结构**整理（2026-11-08 从阿里云 RDS 导出）。
> 生产库：`hxfund` @ `rm-wz9dmu9vp5h91kfuwco.mysql.rds.aliyuncs.com:3306`（MySQL 8.0，InnoDB，utf8mb4_unicode_ci）

## 📁 目录结构

```
database/
├── README.md                # 本文档（数据模型）
├── schema/                  # 当前数据模型（与生产库一致）
│   ├── 001_users.sql            # 按表 DDL，按外键依赖排序，可单独执行
│   ├── 002_sessions.sql
│   ├── 003_ai_conversations.sql
│   ├── 004_family_members.sql
│   ├── 005_generation_poems.sql
│   ├── 006_project_slides.sql
│   ├── 007_blockchain_records.sql
│   ├── 008_guest_messages.sql
│   ├── 009_system_config.sql
│   ├── full-schema.sql        # 合并文件：CREATE DATABASE + 全部 9 表 DDL
│   └── seed.sql               # 初始数据（仅用于初始化空库）
├── backup/                  # 结构备份归档（按日期）
│   └── 2026-11-08/
│       ├── schema.sql           # 完整 DDL 备份
│       └── schema-summary.md    # 结构摘要（表/行数/索引）
├── legacy/                  # 历史脚本（已被 schema/ 取代，仅作归档）
│   ├── create-db.sql
│   ├── init.sql
│   ├── init-simple.sql
│   └── database-init-mongodb.js
└── tools/
    └── dump-schema.js       # 结构导出工具（只读，可重复执行）
```

## 🗄️ 表清单（9 张）

| # | 表 | 用途 | 生产估算行数 | 外键 |
|---|---|---|---|---|
| 1 | `users` | 用户账户 | 0 | — |
| 2 | `sessions` | 用户会话 | 0 | → users |
| 3 | `ai_conversations` | AI 对话记录 | 0 | —（session_id 唯一索引） |
| 4 | `family_members` | 家族成员树 | 9 | → family_members（自关联） |
| 5 | `generation_poems` | 分支字辈诗 | 4 | — |
| 6 | `project_slides` | 项目愿景幻灯片 | 5 | — |
| 7 | `blockchain_records` | 区块链存证记录 | 3 | — |
| 8 | `guest_messages` | 宗亲留言（含楼中楼回复） | 11 | —（parent_id 逻辑关联） |
| 9 | `system_config` | 系统配置键值 | 7 | — |

## 🔗 数据模型

### 1. users（用户表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | int PK | 用户 ID |
| username | varchar(50) UNIQUE | 用户名 |
| email | varchar(100) | 邮箱（idx_email） |
| password_hash | varchar(255) | 密码哈希 |
| role | enum('admin','editor','user') | 角色，默认 user |
| avatar / branch_id / generation / location | — | 头像、所属分支、世代、地区 |
| is_active | tinyint(1) | 是否激活，默认 1 |
| last_login_at / created_at / updated_at | timestamp | 时间戳 |

### 2. sessions（会话表）

- `id` varchar(100) PK（会话 ID），`data` json（会话数据），`expires_at`（idx_expires）
- **外键**：`user_id` → `users(id)`，`ON DELETE CASCADE`

### 3. ai_conversations（AI 对话记录表）

- `session_id` varchar(100) **UNIQUE**（idx_session），`user_id`、`model`
- `message` / `response` text，`tokens_used` int，`temperature` decimal(3,2)，`image_url`
- 注意：当前生产环境 AI 会话实际存 Redis（内存降级），此表为预留结构

### 4. family_members（家族成员表）

树形结构，自关联：

| 字段 | 类型 | 说明 |
|---|---|---|
| id | varchar(50) PK | 成员 ID（如 `ancestor`、`branch-1`、`gen-1-1`） |
| parent_id | varchar(50) | **外键 → family_members(id)**，ON DELETE CASCADE |
| name | varchar(100) | 分支/支系名称 |
| title | varchar(100) | 人物称号/姓名 |
| period / avatar / bio / location | — | 时期、头像、简介、地区 |
| level / sort_order | int | 树层级、排序 |

### 5. generation_poems（字辈表）

- `branch_code` varchar(50) **UNIQUE**（jiangxia / shicheng / mianyang / fujian）
- `branch_name`、`poem`（字辈诗全文）、`characters`（字辈字符序列）

### 6. project_slides（项目愿景幻灯片表）

- `title` / `subtitle` / `content`、`icon`（emoji）、`color`（主题色）、`tags` json
- `sort_order`（idx_sort）、`is_active`（idx_active）

### 7. blockchain_records（区块链存证记录表）

- `record_id` varchar(50) **UNIQUE**（idx_record_id），`member_name`、`hash_value`（idx_hash）
- `is_verified` tinyint(1) 默认 1（idx_verified）、`blockchain_tx`、`verified_at`

### 8. guest_messages（留言表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | int PK | 留言 ID |
| parent_id | bigint | 回复指向的顶级留言 ID（**逻辑关联，无外键约束**，idx_parent_id） |
| user_name / content / location | — | 留言者、内容、地区 |
| contact_info | varchar(200) | 联系方式（加密存储） |
| is_public | tinyint(1) 默认 1 | 是否公开显示（idx_public） |
| is_verified | tinyint(1) 默认 0 | 是否已审核（idx_verified）；新留言一律 0，管理员审核后置 1 |
| ip_address | varchar(50) | 来源 IP |

### 9. system_config（系统配置表）

- `config_key` varchar(100) **UNIQUE**（idx_key），`config_value` text
- `config_type` enum('string','number','boolean','json')，`description`、`is_public`

## 📊 ER 图

```
┌─────────────────┐        ┌──────────────────┐
│     users       │        │ family_members   │
├─────────────────┤        ├──────────────────┤
│ id (PK)         │◄──┐    │ id (PK)          │
│ username (UQ)   │   │    │ parent_id (FK)───┼──► id  (自关联, CASCADE)
│ role            │   │    │ level, sort_order│
└────────┬────────┘   │    └──────────────────┘
         │ 1:N (FK)    │
         ▼             │    ┌──────────────────┐
┌─────────────────┐    │    │ guest_messages   │
│   sessions      │    │    ├──────────────────┤
│ id (PK)         │    │    │ id (PK)          │
│ user_id (FK)◄───┼────┘    │ parent_id ───────┼──► id (逻辑关联, 楼中楼)
│ data (JSON)     │         │ is_public/       │
└─────────────────┘         │ is_verified      │
                            └──────────────────┘
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ai_conversations │  │generation_poems  │  │ system_config    │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ session_id (UQ)  │  │ branch_code (UQ) │  │ config_key (UQ)  │
│ message/response │  │ poem/characters  │  │ config_value     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
┌──────────────────┐  ┌──────────────────┐
│ project_slides   │  │blockchain_records│
├──────────────────┤  ├──────────────────┤
│ sort_order,      │  │ record_id (UQ)   │
│ is_active        │  │ hash_value,      │
└──────────────────┘  │ is_verified      │
                      └──────────────────┘
```

## 🔧 使用方法

### 初始化空数据库（测试/开发环境）

```bash
mysql -u <user> -p < database/schema/full-schema.sql   # 建库 + 9 表结构
mysql -u <user> -p hxfund < database/schema/seed.sql   # 初始数据（可选）
```

### 重新备份生产库结构

```bash
# 项目根目录执行（读取根 .env 的 RDS 配置，只读操作）
node database/tools/dump-schema.js
# 输出到 database/backup/<当天日期>/schema.sql + schema-summary.md
```

> ⚠️ 生产库结构变更流程：先在测试库验证 → 对生产执行 DDL → 重新运行 dump-schema.js → 将新 DDL 同步回 `schema/` 目录并提交。

### legacy/ 目录说明

`legacy/` 下的脚本是历史版本（2026-03 前后），与当前生产结构存在偏差：
- `init.sql`：库名误写为 `hxfund_db`，guest_messages 缺 parent_id/is_public/is_verified 等列
- `create-db.sql` / `init-simple.sql`：仅 6 张表，缺 users/sessions/ai_conversations
- `database-init-mongodb.js`：MongoDB 方案（项目已用 MySQL，废弃）

`scripts/init-database.js` 仍引用 `legacy/init-simple.sql`，如需完整初始化请改用 `schema/` 目录。

## 📝 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-03-08 | 初始版本，基于 data.js 3.2.0 |
| 2.0 | 2026-11-08 | 重构：按生产库真实结构（9 表）重建 schema/，新增结构备份归档与导出工具，旧脚本移入 legacy/ |
