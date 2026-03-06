#!/bin/bash
# 黄氏家族寻根平台 - 安全加固检查脚本

echo "==========================================="
echo "  安全加固检查与建议"
echo "==========================================="

echo
echo "🔍 检查 Git 历史中的敏感信息..."

# 检查是否还存在明文密码
PASSWORD_FOUND=false
if git log --all -S "Qq803200" --quiet; then
    echo "⚠️  警告：在 Git 历史中发现敏感密码！"
    PASSWORD_FOUND=true
else
    echo "✅ 未在 Git 历史中发现已知的明文密码"
fi

echo
echo "🔒 当前 .gitignore 配置检查："
echo "   - .env 文件: $(if grep -q '^\.env$' .gitignore; then echo '✅ 已忽略'; else echo '❌ 未忽略'; fi)"
echo "   - server/config/auth.json: $(if grep -q 'server/config/auth.json' .gitignore; then echo '✅ 已忽略'; else echo '❌ 未忽略'; fi)"
echo "   - server/config/.env: $(if grep -q 'server/config/\.env' .gitignore; then echo '✅ 已忽略'; else echo '❌ 未忽略'; fi)"

echo
echo "🚨 安全建议："
echo "1. 立即轮换以下已泄露的凭证："
echo "   - FTP 密码 (如果仍在使用 Qq803200)"
echo "   - API 密钥 (如果仍在使用开发密钥)"
echo "   - JWT Secret (如果仍在使用默认密钥)"

echo
echo "2. 为防止未来泄露，请执行："
echo "   - 确保所有敏感配置使用环境变量"
echo "   - 定期审查 .gitignore 文件"
echo "   - 使用 pre-commit hooks 检查敏感信息"

echo
if [ "$PASSWORD_FOUND" = true ]; then
    echo "⚠️  需要立即采取行动："
    echo "   如果您计划公开此仓库，强烈建议清理 Git 历史中的敏感信息"
    echo "   参考命令："
    echo "   git filter-repo --path .env --invert-paths  # 示例命令"
    echo "   或使用 BFG Repo-Cleaner 工具"
else
    echo "✅ 未发现已知的敏感信息泄露"
fi

echo
echo "🔐 当前安全状态："
echo "   - 生产环境配置文件已正确忽略: $(if [ -f .env ] && ! git check-ignore -q .env 2>/dev/null; then echo '⚠️  .env 文件未被忽略'; else echo '✅'; fi)"
echo "   - 认证配置文件已正确忽略: $(if [ -f server/config/auth.json ] && ! git check-ignore -q server/config/auth.json 2>/dev/null; then echo '⚠️  auth.json 文件未被忽略'; else echo '✅'; fi)"

echo
echo "==========================================="
echo "安全检查完成"
echo "==========================================="