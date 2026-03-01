#!/bin/bash
# 生成安全的密钥和凭证
# 用法：./scripts/generate-secrets.sh

set -e

echo "========================================"
echo "  安全密钥生成工具"
echo "========================================"
echo ""

# 生成 JWT Secret (64 字符十六进制)
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT Secret (64 字符):"
echo "  $JWT_SECRET"
echo ""

# 生成 API Key (32 字符十六进制)
API_KEY=$(openssl rand -hex 16)
echo "API Key (32 字符):"
echo "  $API_KEY"
echo ""

# 生成 Salt (用于密码哈希)
SALT=$(openssl rand -hex 16)
echo "Salt (32 字符):"
echo "  $SALT"
echo ""

# 生成临时密码
TEMP_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9!@#$%^&*' | head -c 20)
echo "临时密码 (20 字符):"
echo "  $TEMP_PASSWORD"
echo ""

echo "========================================"
echo "  使用示例:"
echo "========================================"
echo ""
echo "# 添加到 .env 文件:"
echo "SERVER_API_KEY=$API_KEY"
echo "JWT_SECRET=$JWT_SECRET"
echo ""
echo "# 或者使用 GitHub Secrets:"
echo "gh secret set SERVER_API_KEY --body=\"$API_KEY\""
echo "gh secret set JWT_SECRET --body=\"$JWT_SECRET\""
echo ""
echo "========================================"
echo "  ⚠️ 请妥善保管以上密钥！"
echo "========================================"
