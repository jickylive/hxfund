#!/bin/bash

# 黄氏家族寻根平台 - 统一构建与部署脚本

set -e  # 遇到错误时停止执行

echo "==========================================="
echo "黄氏家族寻根平台 - 统一构建与部署脚本"
echo "==========================================="

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请以root权限运行此脚本"
    echo "使用: sudo $0"
    exit 1
fi

# 检查Node.js是否已安装
if ! command -v node &> /dev/null; then
    echo "错误: Node.js未安装"
    echo "请先安装Node.js"
    exit 1
fi

# 检查npm是否已安装
if ! command -v npm &> /dev/null; then
    echo "错误: npm未安装"
    echo "请先安装npm"
    exit 1
fi

echo "✓ 环境检查通过"

# 定义目录
PROJECT_DIR="/root/hxfund"
BACKUP_DIR="/root/hxfund/backups"
DIST_DIR="/root/hxfund/dist"

# 创建备份目录
mkdir -p $BACKUP_DIR
mkdir -p $DIST_DIR

echo "步骤 1: 备份当前版本..."

# 创建当前版本备份
BACKUP_NAME="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
if [ -d "$PROJECT_DIR" ]; then
    tar -czf $BACKUP_NAME -C /root hxfund --exclude=node_modules
    echo "✓ 已创建备份: $(basename $BACKUP_NAME)"
else
    echo "⚠️  未找到项目目录，跳过备份"
fi

echo "步骤 2: 安装依赖..."

# 安装后端依赖
cd $PROJECT_DIR
npm ci --only=production

echo "步骤 3: 构建前端资源..."

# 检查是否有前端构建脚本
if [ -f "$PROJECT_DIR/frontend/package.json" ]; then
    cd $PROJECT_DIR/frontend
    npm ci
    
    # 构建前端
    if [ -f "$PROJECT_DIR/frontend/vite.config.js" ]; then
        npm run build
    elif [ -f "$PROJECT_DIR/frontend/webpack.config.js" ]; then
        npx webpack --mode production
    else
        echo "⚠️  未找到前端构建配置，跳过前端构建"
    fi
    
    cd $PROJECT_DIR
fi

echo "步骤 4: 优化静态资源..."

# 压缩CSS/JS文件
if [ -d "$PROJECT_DIR/public/css" ]; then
    for css_file in $PROJECT_DIR/public/css/*.css; do
        if [ -f "$css_file" ] && [ "${css_file##*.}" = "css" ]; then
            minified_file="${css_file%.css}.min.css"
            npx terser --compress --mangle --output "$minified_file" -- "$css_file"
            echo "✓ 压缩CSS: $(basename $css_file)"
        fi
    done
fi

if [ -d "$PROJECT_DIR/public/js" ]; then
    for js_file in $PROJECT_DIR/public/js/*.js; do
        if [ -f "$js_file" ] && [ "${js_file##*.}" = "js" ]; then
            minified_file="${js_file%.js}.min.js"
            npx terser --compress --mangle --output "$minified_file" -- "$js_file"
            echo "✓ 压缩JS: $(basename $js_file)"
        fi
    done
fi

echo "步骤 5: 生成构建信息..."

# 生成构建信息文件
cat > $DIST_DIR/BUILD_INFO.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "$(node -p "require('./package.json').version")",
  "commitHash": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)"
}
EOF

echo "步骤 6: 验证构建产物..."

# 验证关键文件是否存在
REQUIRED_FILES=(
    "$PROJECT_DIR/server/index.js"
    "$PROJECT_DIR/package.json"
    "$PROJECT_DIR/public/index.html"
    "$PROJECT_DIR/qwen-code.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "✗ 错误: 缺少关键文件 $file"
        exit 1
    fi
done

echo "✓ 所有关键文件验证通过"

echo "步骤 7: 准备部署..."

# 复制构建产物到dist目录
rsync -av --exclude='node_modules' --exclude='.git' --exclude='*.log' $PROJECT_DIR/ $DIST_DIR/

# 保留必要的配置文件
if [ -f "$PROJECT_DIR/.env" ]; then
    cp $PROJECT_DIR/.env $DIST_DIR/.env
fi

if [ -f "$PROJECT_DIR/pm2.config.js" ]; then
    cp $PROJECT_DIR/pm2.config.js $DIST_DIR/pm2.config.js
fi

echo "步骤 8: 清理临时文件..."

# 清理npm缓存
npm cache clean --force

# 清理临时构建文件
find $DIST_DIR -name "tmp" -type d -exec rm -rf {} + 2>/dev/null || true
find $DIST_DIR -name ".tmp" -type d -exec rm -rf {} + 2>/dev/null || true

echo "步骤 9: 生成部署清单..."

# 生成部署清单
cat > $DIST_DIR/DEPLOYMENT_MANIFEST.md << EOF
# 部署清单

## 构建信息
- 构建时间: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- 版本: $(node -p "require('./package.json').version")
- 提交哈希: $(git rev-parse HEAD 2>/dev/null || echo 'unknown')

## 部署说明
1. 将 dist 目录内容部署到生产服务器
2. 确保 .env 文件配置正确
3. 运行 \`npm install --production\` 安装依赖
4. 启动服务: \`npm start\` 或使用 PM2

## 服务配置
- API 服务: 端口 3000
- 静态文件: /public 目录
- 日志目录: /logs

## 回滚说明
如需回滚，请从 $BACKUP_DIR 恢复备份文件
EOF

echo "==========================================="
echo "构建完成!"
echo ""
echo "构建产物位置: $DIST_DIR"
echo "备份位置: $BACKUP_DIR"
echo ""
echo "部署命令示例:"
echo "  cd $DIST_DIR && npm install --production"
echo "  npm start"
echo ""
echo "使用 PM2 部署:"
echo "  pm2 start ecosystem.config.js"
echo "==========================================="

# 询问是否部署到生产环境
read -p "是否部署到生产环境? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "开始部署到生产环境..."
    
    # 停止现有服务
    if pgrep -f "server/index.js" > /dev/null; then
        echo "停止现有服务..."
        pkill -f "server/index.js" || true
        sleep 5
    fi
    
    # 复制到生产目录（假设为 /opt/hxfund）
    PROD_DIR="/opt/hxfund"
    mkdir -p $PROD_DIR
    rsync -av --delete $DIST_DIR/ $PROD_DIR/
    
    # 安装生产依赖
    cd $PROD_DIR
    npm install --production
    
    # 启动服务
    if command -v pm2 &> /dev/null; then
        pm2 start ecosystem.config.js || pm2 start server/index.js --name hxfund
        echo "✓ 服务已使用 PM2 启动"
    else
        nohup npm start > /var/log/hxfund.log 2>&1 &
        echo "✓ 服务已启动（后台运行）"
    fi
    
    echo "✓ 部署完成！"
    echo "服务状态检查: curl http://localhost:3000/api/health"
fi