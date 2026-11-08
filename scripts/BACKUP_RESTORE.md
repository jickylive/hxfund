# hxfund 数据库备份与恢复说明

> 背景：此前数据库没有任何有效备份——只有一份结构备份且无数据，而且那份
> schema 备份因外键顺序问题恢复即失败，RDS 误删即不可逆。
> 现在备份由 `scripts/backup-database.sh` 每天凌晨 3 点跑（cron 见下），
> 导出的是**结构 + 数据**的完整 mysqldump，可直接恢复。

## 备份在哪

- 位置：`backups/db/hxfund-YYYYMMDD-HHMMSS.sql.gz`（仓库根目录下，默认保留 7 天）
- 内容：mysqldump 全量导出（结构 + 数据 + 存储过程/触发器/事件），gzip 压缩
- 定时：cron 每天凌晨 3 点（见 `scripts/backup-database.sh` 头部注释）
- 校验：脚本导出后会校验 gzip 完整性与 `Dump completed` 标记，失败即报错

## 手动备份一次

```bash
bash scripts/backup-database.sh
# 只看命令不执行：
bash scripts/backup-database.sh --dry-run
```

## 恢复（误删 / 需要回滚时）

```bash
# 1. 先看有哪些备份，挑一个时间点（文件名就是时间）
ls -lh backups/db/hxfund-*.sql.gz

# 2. 恢复到 RDS（会先清空目标库再导入，生产库操作前务必再备一份当前状态）
#    连接信息从 server/config/.env 读，密码不要写进命令行历史
gunzip -c backups/db/hxfund-20261109-030000.sql.gz | mysql \
  -h "$RDS_HOST" -P "${RDS_PORT:-3306}" -u "$RDS_USERNAME" -p "$RDS_DATABASE"

# 3. 如果只想恢复到一个临时库先检查（推荐做法，避免直接覆盖生产库）：
mysql -h "$RDS_HOST" -u "$RDS_USERNAME" -p \
  -e "CREATE DATABASE IF NOT EXISTS hxfund_restore CHARACTER SET utf8mb4;"
gunzip -c backups/db/hxfund-20261109-030000.sql.gz | mysql \
  -h "$RDS_HOST" -u "$RDS_USERNAME" -p hxfund_restore
```

## 恢复演练（建议每月做一次，别等到真出事）

恢复演练 = 把备份恢复到临时库 `hxfund_restore`，验证数据对不对，再删掉临时库。
全程不碰生产库 `hxfund`。

```bash
# 1. 恢复到临时库
mysql -h "$RDS_HOST" -u "$RDS_USERNAME" -p \
  -e "CREATE DATABASE IF NOT EXISTS hxfund_restore CHARACTER SET utf8mb4;"
gunzip -c backups/db/hxfund-20261109-030000.sql.gz | mysql \
  -h "$RDS_HOST" -u "$RDS_USERNAME" -p hxfund_restore

# 2. 验证：表结构（应为 10 张核心表 + waline 2 张 + schema_migrations 1 张）
mysql -h "$RDS_HOST" -u "$RDS_USERNAME" -p -e \
  "SELECT TABLE_NAME FROM information_schema.TABLES \
   WHERE TABLE_SCHEMA='hxfund_restore' ORDER BY TABLE_NAME;"

# 3. 验证：关键表行数与生产库对比（行数应与备份当天一致）
mysql -h "$RDS_HOST" -u "$RDS_USERNAME" -p -e "
  SELECT 'guest_messages' AS t, COUNT(*) AS n FROM hxfund_restore.guest_messages
  UNION ALL SELECT 'family_members', COUNT(*) FROM hxfund_restore.family_members
  UNION ALL SELECT 'waline_comments', COUNT(*) FROM hxfund_restore.waline_comments
  UNION ALL SELECT 'generation_poems', COUNT(*) FROM hxfund_restore.generation_poems;"

# 4. 验证：抽查一条留言内容能正常读出（中文无乱码）
mysql -h "$RDS_HOST" -u "$RDS_USERNAME" -p -e \
  "SELECT id, user_name, LEFT(content, 20) FROM hxfund_restore.guest_messages \
   ORDER BY id DESC LIMIT 3;"

# 5. 清理临时库
mysql -h "$RDS_HOST" -u "$RDS_USERNAME" -p -e "DROP DATABASE hxfund_restore;"
```

演练通过标准：临时库能建、表全、行数与备份当天一致、中文无乱码。
不通过就按“恢复”一节的步骤重做一次，仍不行说明备份本身有问题，立即排查
备份脚本与 cron 日志（`/var/log/hxfund-backup.log`），不要等真误删才发现。

## 兜底：RDS 自带的备份

- 阿里云 RDS 控制台本身有自动备份与按时间点恢复（PITR），是本脚本之外的第二层兜底。
- 但 RDS 自动备份的保留期与状态此前仓库里零提及、没人确认过，**不要默认它一定可用**；
  恢复前先去 RDS 控制台确认自动备份是开启的、保留期够用。
- 本脚本的 mysqldump 备份是第一层（文件在手、可离线恢复、可演练验证），
  两层都不要只依赖其中一层。

## 注意事项

- 备份文件含全部业务数据（含留言者联系方式等），与生产数据同等敏感：
  不要提交进 git，不要外发，lh 上放 `/var/local/docker/hxfund/backups/db/` 即可。
- `backups/` 已在 `.gitignore` 里（若没有，补一行 `backups/`）。
- 恢复到生产库是破坏性操作（覆盖数据），操作前先用上面的临时库演练一遍，
  并先对当前生产库再跑一次 `scripts/backup-database.sh` 留个“事前快照”。
