# 使用官方 Node.js 运行时作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json (如果存在)
COPY rules/package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制规则引擎源代码
COPY rules/ ./

# 暴露服务端口
EXPOSE 3001

# 启动规则引擎服务
CMD ["node", "server.js"]