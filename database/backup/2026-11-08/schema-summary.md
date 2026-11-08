# 数据库结构摘要

- 导出时间：2026-11-08T07:11:23.072Z
- 数据库：`hxfund` @ `rm-wz9dmu9vp5h91kfuwco.mysql.rds.aliyuncs.com:3306`
- 表：9 个　视图：0 个　触发器：0 个

## 表清单

| 表 | 估算行数 | 引擎 | 字符集 | 说明 |
|---|---|---|---|---|
| ai_conversations | 0 | InnoDB | utf8mb4_unicode_ci | AI 对话记录表 |
| blockchain_records | 3 | InnoDB | utf8mb4_unicode_ci | 区块链存证记录表 |
| family_members | 9 | InnoDB | utf8mb4_unicode_ci | 家族成员表 |
| generation_poems | 4 | InnoDB | utf8mb4_unicode_ci | 字辈表 |
| guest_messages | 11 | InnoDB | utf8mb4_unicode_ci | 留言表 |
| project_slides | 5 | InnoDB | utf8mb4_unicode_ci | 项目愿景幻灯片表 |
| sessions | 0 | InnoDB | utf8mb4_unicode_ci | 会话表 |
| system_config | 7 | InnoDB | utf8mb4_unicode_ci | 系统配置表 |
| users | 0 | InnoDB | utf8mb4_unicode_ci | 用户表 |

## 索引

### ai_conversations

- PRIMARY (UNIQUE): id
- idx_session: session_id
- idx_user: user_id
- idx_created: created_at

### blockchain_records

- PRIMARY (UNIQUE): id
- record_id (UNIQUE): record_id
- idx_record_id: record_id
- idx_verified: is_verified
- idx_hash: hash_value

### family_members

- PRIMARY (UNIQUE): id
- idx_parent_id: parent_id
- idx_level: level

### generation_poems

- PRIMARY (UNIQUE): id
- branch_code (UNIQUE): branch_code
- idx_branch_code: branch_code

### guest_messages

- PRIMARY (UNIQUE): id
- idx_public: is_public
- idx_verified: is_verified
- idx_created: created_at
- idx_parent_id: parent_id

### project_slides

- PRIMARY (UNIQUE): id
- idx_sort: sort_order
- idx_active: is_active

### sessions

- PRIMARY (UNIQUE): id
- idx_expires: expires_at
- idx_user_id: user_id

### system_config

- PRIMARY (UNIQUE): id
- config_key (UNIQUE): config_key
- idx_key: config_key

### users

- PRIMARY (UNIQUE): id
- username (UNIQUE): username
- idx_username: username
- idx_email: email
- idx_role: role
