#!/bin/bash
# hxfund 后端自动拉取更新脚本（lh 主机侧）
#
# 用途：定时从阿里云 ACR 拉取最新后端镜像，有新版本时重启 api 容器。
# 与 GitHub Actions 的 deploy-backend.yml 配合：
#   Actions 负责构建并推送镜像到 registry.cn-shenzhen.aliyuncs.com/jicky/hxfund-api:latest，
#   本脚本负责在 lh 上拉取并更新，完全不需要从公网 SSH 进 lh（安全组白名单问题就此绕开）。
#
# 安装（lh 主机上执行一次）：
#   1. 把本脚本放到 /var/local/docker/hxfund/scripts/pull-and-update.sh，chmod +x。
#   2. 加 cron（每 5 分钟检查一次）：
#        */5 * * * * /var/local/docker/hxfund/scripts/pull-and-update.sh >> /var/log/hxfund-pull-update.log 2>&1
#   3. 确认 lh 的 docker 已登录 ACR（docker login registry.cn-shenzhen.aliyuncs.com），
#      且 /var/local/docker/hxfund/docker-compose.yml 的 api 服务已加
#      image: registry.cn-shenzhen.aliyuncs.com/jicky/hxfund-api:latest。
#
# 行为：
#   - 无新镜像：静默退出（只记一行“无更新”日志，不重启、不打扰）。
#   - 有新镜像：拉取 → 重启 api → 健康检查（容器内 curl /api/health，最多 10 次）。
#   - 健康检查通过：记成功日志，清理旧镜像（只保留当前与上一个）。
#   - 健康检查失败：自动回滚到拉取前的旧镜像并重启，记失败日志，退出码 1。
#
# 注意：本脚本假设在 lh 主机上运行，compose 项目目录为 /var/local/docker/hxfund。

set -u  # 未定义变量即报错；不用 set -e（回滚路径需要手动控制退出码）

COMPOSE_DIR="/var/local/docker/hxfund"
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.yml"
SERVICE="api"
CONTAINER="hxfund-api"
IMAGE="registry.cn-shenzhen.aliyuncs.com/jicky/hxfund-api:latest"
HEALTH_RETRIES=10
HEALTH_INTERVAL=3

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# 健康检查：容器内访问 /api/health，200 即健康
health_check() {
  docker exec "${CONTAINER}" node -e \
    "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))" \
    2>/dev/null
}

# 等待健康（最多 HEALTH_RETRIES 次）
wait_healthy() {
  local i=1
  while [ "$i" -le "$HEALTH_RETRIES" ]; do
    if health_check; then
      return 0
    fi
    sleep "$HEALTH_INTERVAL"
    i=$((i + 1))
  done
  return 1
}

main() {
  cd "$COMPOSE_DIR" || { log "错误：无法进入 ${COMPOSE_DIR}"; exit 1; }

  # 记录当前镜像 ID（回滚用）
  OLD_IMAGE_ID=$(docker inspect "${CONTAINER}" --format '{{.Image}}' 2>/dev/null || echo "")
  if [ -z "$OLD_IMAGE_ID" ]; then
    log "警告：容器 ${CONTAINER} 不存在或无法检查，将直接拉取并启动"
  fi

  # 拉取最新镜像
  if ! docker compose -f "$COMPOSE_FILE" pull "$SERVICE" 2>&1 | tee /tmp/hxfund-pull.log; then
    log "错误：拉取镜像失败（网络或 ACR 登录问题），本次不更新"
    exit 1
  fi

  # 判断是否有新镜像：比较拉取后的 latest 摘要与旧容器镜像 ID
  NEW_IMAGE_ID=$(docker images --no-trunc --format '{{.ID}}' "$IMAGE" 2>/dev/null | head -1)
  if [ -n "$OLD_IMAGE_ID" ] && [ "$NEW_IMAGE_ID" = "$OLD_IMAGE_ID" ]; then
    log "无更新：镜像已是最新（${NEW_IMAGE_ID:0:12}），不重启"
    exit 0
  fi

  log "发现新镜像：${OLD_IMAGE_ID:0:12} → ${NEW_IMAGE_ID:0:12}，重启 ${SERVICE}..."

  # 重启容器（compose 会检测到镜像变化并重建）
  if ! docker compose -f "$COMPOSE_FILE" up -d "$SERVICE" 2>&1 | tee /tmp/hxfund-up.log; then
    log "错误：docker compose up 失败，尝试回滚"
    # 回滚：把旧镜像重新打上 latest 标签并重启
    if [ -n "$OLD_IMAGE_ID" ]; then
      docker tag "$OLD_IMAGE_ID" "$IMAGE" 2>/dev/null
      docker compose -f "$COMPOSE_FILE" up -d "$SERVICE" 2>/dev/null
    fi
    exit 1
  fi

  # 健康检查
  if wait_healthy; then
    log "更新成功：${SERVICE} 已更新到 ${NEW_IMAGE_ID:0:12}，健康检查通过"
    # 清理旧镜像，只保留当前与上一个（节省 lh 磁盘，lh 磁盘本就紧张）
    docker image prune -f --filter "until=168h" 2>/dev/null || true
    exit 0
  fi

  # 健康检查失败：回滚到旧镜像
  log "错误：新镜像健康检查失败（${HEALTH_RETRIES} 次），回滚到旧镜像 ${OLD_IMAGE_ID:0:12}"
  if [ -n "$OLD_IMAGE_ID" ]; then
    docker tag "$OLD_IMAGE_ID" "$IMAGE" 2>/dev/null
    docker compose -f "$COMPOSE_FILE" up -d "$SERVICE" 2>/dev/null
    if wait_healthy; then
      log "回滚成功：已恢复到旧镜像，服务正常"
    else
      log "严重：回滚后健康检查仍失败，请人工检查（docker compose logs api）"
    fi
  else
    log "严重：无旧镜像可回滚，请人工检查"
  fi
  exit 1
}

main "$@"
