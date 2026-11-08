#!/bin/bash
# 黄氏家族寻根平台 - 数据库备份脚本（结构 + 数据）
#
# 背景：此前数据库没有任何有效备份——只有一份结构备份且无数据，
# 而且那份 schema 备份因外键顺序问题恢复即失败，RDS 误删即不可逆。
# 本脚本用 mysqldump 从 RDS 导出结构 + 数据，gzip 压缩，按日期命名，
# 保留最近 7 天，自动清理旧备份。
#
# 用法：
#   # 1. 先在 server/config/.env 里配好 RDS_HOST / RDS_USERNAME / RDS_PASSWORD /
#   #    RDS_DATABASE（生产库名 hxfund），或直接用环境变量传入（环境变量优先）
#   bash scripts/backup-database.sh
#   BACKUP_DIR=/data/hxfund-backup bash scripts/backup-database.sh
#   bash scripts/backup-database.sh --dry-run   # 只打印命令，不实际备份
#
# 定时任务（cron，每天凌晨 3 点跑，日志进文件）：
#   0 3 * * * cd /var/local/docker/hxfund && bash scripts/backup-database.sh >> /var/log/hxfund-backup.log 2>&1
#   注意：脚本所在目录须能读到 server/config/.env；不要在 lh 上直接跑本仓库的
#   副本之前，先确认 .env 是 lh 的那份（RDS_HOST 指向 rm-wz9dmu9vp5h91kfuw）。
#
# 恢复方法见 scripts/BACKUP_RESTORE.md（恢复命令 + 恢复演练步骤）。
# 密码绝不写进脚本、不打印到日志：只从环境变量或 server/config/.env 读取。
#
# 依赖：mysqldump（mysql-client）、gzip。RDS 要求 SSL 时自动加 --ssl-mode。

set -euo pipefail

# ---------- 参数 ----------
DRY_RUN=false
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=true
elif [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  # 打印本文件头部的注释块（从第 2 行起，到第一个非注释行之前）
  # 注意：不能先 sub 掉开头的 # 再判断（sub 会改掉 $0，导致后一条规则误判退出）
  awk 'NR == 1 { next } /^# / { print substr($0, 3); next } /^#$/ { print ""; next } { exit }' "$0"
  exit 0
elif [ -n "${1:-}" ]; then
  echo "未知参数：$1（只支持 --dry-run / --help）" >&2
  exit 1
fi

# ---------- 读配置：环境变量优先，缺了再从 server/config/.env 补 ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/server/config/.env}"

# 只取需要的几个 RDS_* 键，不 source 整个 .env（避免执行意外内容）
read_env_file() {
  local key="$1" file="$2"
  [ -f "$file" ] || return 0
  grep -E "^${key}=" "$file" | tail -n 1 | cut -d= -f2- | tr -d '\r' | \
    sed -e "s/^['\"]//" -e "s/['\"]$//"
}

RDS_HOST="${RDS_HOST:-$(read_env_file RDS_HOST "$ENV_FILE")}"
RDS_PORT="${RDS_PORT:-$(read_env_file RDS_PORT "$ENV_FILE")}"
RDS_DATABASE="${RDS_DATABASE:-$(read_env_file RDS_DATABASE "$ENV_FILE")}"
RDS_USERNAME="${RDS_USERNAME:-$(read_env_file RDS_USERNAME "$ENV_FILE")}"
RDS_PASSWORD="${RDS_PASSWORD:-$(read_env_file RDS_PASSWORD "$ENV_FILE")}"
RDS_SSL="${RDS_SSL:-$(read_env_file RDS_SSL "$ENV_FILE")}"
MYSQL_SSL_CA_PATH="${MYSQL_SSL_CA_PATH:-$(read_env_file MYSQL_SSL_CA_PATH "$ENV_FILE")}"

# ---------- 校验 ----------
missing=()
[ -z "$RDS_HOST" ] && missing+=("RDS_HOST")
[ -z "$RDS_DATABASE" ] && missing+=("RDS_DATABASE")
[ -z "$RDS_USERNAME" ] && missing+=("RDS_USERNAME")
[ -z "$RDS_PASSWORD" ] && missing+=("RDS_PASSWORD")
if [ "${#missing[@]}" -gt 0 ]; then
  echo "❌ 缺少数据库配置：${missing[*]}" >&2
  echo "   请在环境变量或 $ENV_FILE 里配好（密码不要写进脚本）" >&2
  exit 1
fi
RDS_PORT="${RDS_PORT:-3306}"

# ---------- 备份目录与保留期 ----------
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups/db}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/hxfund-$TIMESTAMP.sql.gz"

command -v gzip >/dev/null 2>&1 || {
  echo "❌ 未找到 gzip，请先安装 gzip" >&2
  exit 1
}

mkdir -p "$BACKUP_DIR"

# ---------- mysqldump 参数 ----------
# --single-transaction：InnoDB 一致性快照，备份时不锁表
# --routines --triggers --events：连存储过程、触发器、事件一起备
# --set-gtid-purged=OFF：RDS 上 GTID 导出会报错，必须关掉
# --default-character-set=utf8mb4：与库字符集一致，避免乱码
DUMP_ARGS=(
  --host="$RDS_HOST"
  --port="$RDS_PORT"
  --user="$RDS_USERNAME"
  --protocol=TCP
  --single-transaction
  --routines
  --triggers
  --events
  --set-gtid-purged=OFF
  --default-character-set=utf8mb4
)
# RDS 要求 SSL：RDS_SSL=true 时强制 SSL；有 CA 文件就校验它
if [ "$RDS_SSL" = "true" ]; then
  DUMP_ARGS+=(--ssl-mode=REQUIRED)
  if [ -n "$MYSQL_SSL_CA_PATH" ] && [ -f "$MYSQL_SSL_CA_PATH" ]; then
    DUMP_ARGS+=(--ssl-ca="$MYSQL_SSL_CA_PATH")
  fi
fi

# 密码用 MYSQL_PWD 环境变量传，不出现在命令行（ps 看不到）
export MYSQL_PWD="$RDS_PASSWORD"

echo "==========================================="
echo "  hxfund 数据库备份"
echo "  库：$RDS_DATABASE @ $RDS_HOST:$RDS_PORT"
echo "  输出：$BACKUP_FILE"
echo "  保留：最近 $RETENTION_DAYS 天"
echo "==========================================="

if [ "$DRY_RUN" = true ]; then
  echo "[dry-run] mysqldump <参数> $RDS_DATABASE | gzip > $BACKUP_FILE"
  echo "[dry-run] 不实际执行"
  exit 0
fi

# 导出（结构 + 数据），直接 gzip
# mysqldump 检查放这里：--dry-run 不需要它，不该被它挡住
command -v mysqldump >/dev/null 2>&1 || {
  echo "❌ 未找到 mysqldump，请先安装 mysql-client" >&2
  exit 1
}
mysqldump "${DUMP_ARGS[@]}" "$RDS_DATABASE" | gzip > "$BACKUP_FILE"
unset MYSQL_PWD

# ---------- 校验备份 ----------
# 1. 文件非空；2. gzip 完整；3. 尾部有 mysqldump 完成标记
if [ ! -s "$BACKUP_FILE" ]; then
  echo "❌ 备份文件为空：$BACKUP_FILE" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi
gzip -t "$BACKUP_FILE" || {
  echo "❌ 备份文件损坏（gzip 校验失败）：$BACKUP_FILE" >&2
  exit 1
}
if ! zgrep -q "Dump completed on" "$BACKUP_FILE"; then
  echo "❌ 备份不完整（缺少 Dump completed 标记）：$BACKUP_FILE" >&2
  exit 1
fi

SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"
TABLES="$(zgrep -c '^-- Table structure for table' "$BACKUP_FILE" || true)"
echo "✅ 备份完成：$BACKUP_FILE（$SIZE，约 $TABLES 张表）"

# ---------- 清理旧备份 ----------
# 只删本脚本命名格式的文件，不碰别的
find "$BACKUP_DIR" -maxdepth 1 -name 'hxfund-*.sql.gz' -mtime +"$RETENTION_DAYS" -print -delete | \
  while read -r old; do echo "🗑️  已删旧备份：$old"; done

echo "当前备份："
ls -lh "$BACKUP_DIR"/hxfund-*.sql.gz
