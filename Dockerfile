# 黄氏家族寻根平台后端 - Dockerfile
# 使用 DaoCloud 镜像源

# ============================================
# 生产环境
# ============================================
FROM docker.m.daocloud.io/library/node:18-alpine

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 安装 dumb-init 用于正确处理信号
RUN apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# 复制 package 文件
COPY package.json package-lock.json ./

# 安装生产环境依赖
RUN npm ci --only=production && \
    npm cache clean --force

# 复制应用代码
COPY server/ ./server/
COPY scripts/qwen-code.js ./scripts/qwen-code.js

# 复制前端入口与静态文件（server/index.js 的根路由与 express.static 要用到）
# 注意：之前漏拷这两项，导致镜像里没有 /app/index.html 与 /app/public，
# 线上 GET / 返回 403、静态资源全部 404（2026-11-08 在 lh 容器上实测确认）
COPY index.html ./
COPY public/ ./public/

# 设置文件权限
RUN chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]
