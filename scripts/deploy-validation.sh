#!/bin/bash
# 部署验证脚本
# 用于验证 hxfund 项目的部署状态

set -e  # 遇到错误时退出

echo "🔍 开始部署验证..."

# 检查环境变量
echo "📋 检查环境变量..."
if [ -z "$API_DOMAIN" ] || [ -z "$FRONTEND_DOMAIN" ]; then
    echo "⚠️  警告: 未设置 API_DOMAIN 或 FRONTEND_DOMAIN 环境变量"
    API_DOMAIN="${API_DOMAIN:-api.hxfund.cn}"
    FRONTEND_DOMAIN="${FRONTEND_DOMAIN:-www.hxfund.cn}"
fi

echo "✅ API_DOMAIN: $API_DOMAIN"
echo "✅ FRONTEND_DOMAIN: $FRONTEND_DOMAIN"

# 验证前端可访问性
echo "🌐 验证前端访问..."
FRONTEND_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "https://$FRONTEND_DOMAIN/" || echo "ERROR")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ 前端访问正常 (状态码: $FRONTEND_STATUS)"
else
    echo "❌ 前端访问异常 (状态码: $FRONTEND_STATUS)"
fi

# 验证博客可访问性
echo "📰 验证博客访问..."
BLOG_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "https://$FRONTEND_DOMAIN/blog/" || echo "ERROR")
if [ "$BLOG_STATUS" = "200" ]; then
    echo "✅ 博客访问正常 (状态码: $BLOG_STATUS)"
else
    echo "❌ 博客访问异常 (状态码: $BLOG_STATUS)"
fi

# 验证后端 API 健康检查
echo "⚙️  验证后端 API..."
API_HEALTH_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "https://$API_DOMAIN/api/health" || echo "ERROR")
if [ "$API_HEALTH_STATUS" = "200" ]; then
    echo "✅ 后端 API 访问正常 (状态码: $API_HEALTH_STATUS)"

    # 获取健康检查详细信息
    echo "📊 获取 API 健康信息..."
    HEALTH_INFO=$(curl -s "https://$API_DOMAIN/api/health" | jq '.' 2>/dev/null || echo "无法解析 JSON")
    if [ "$HEALTH_INFO" != "无法解析 JSON" ]; then
        echo "$HEALTH_INFO"
    fi
else
    echo "❌ 后端 API 访问异常 (状态码: $API_HEALTH_STATUS)"
fi

# 验证 API 文档
echo "📖 验证 API 文档..."
API_DOCS_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "https://$API_DOMAIN/api/docs" || echo "ERROR")
if [ "$API_DOCS_STATUS" = "200" ]; then
    echo "✅ API 文档访问正常 (状态码: $API_DOCS_STATUS)"
else
    echo "❌ API 文档访问异常 (状态码: $API_DOCS_STATUS)"
fi

# 验证 Waline 评论系统
echo "💬 验证 Waline 评论系统..."
WALINE_HEALTH_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "https://$API_DOMAIN/api/waline/health" || echo "ERROR")
if [ "$WALINE_HEALTH_STATUS" = "200" ]; then
    echo "✅ Waline 评论系统访问正常 (状态码: $WALINE_HEALTH_STATUS)"
else
    echo "❌ Waline 评论系统访问异常 (状态码: $WALINE_HEALTH_STATUS)"
fi

# 检查响应时间
echo "⏱️  检查响应时间..."
FRONTEND_TIME=$(curl -o /dev/null -s -w "%{time_total}s" "https://$FRONTEND_DOMAIN/" 2>/dev/null || echo "ERROR")
API_TIME=$(curl -o /dev/null -s -w "%{time_total}s" "https://$API_DOMAIN/api/health" 2>/dev/null || echo "ERROR")

echo "🌐 前端响应时间: $FRONTEND_TIME"
echo "⚙️  API 响应时间: $API_TIME"

# 汇总结果
echo "✅ 部署验证完成"
echo ""
echo "📋 验证摘要:"
echo "- 前端访问: $([ "$FRONTEND_STATUS" = "200" ] && echo "✅ 正常" || echo "❌ 异常")"
echo "- 博客访问: $([ "$BLOG_STATUS" = "200" ] && echo "✅ 正常" || echo "❌ 异常")"
echo "- API 访问: $([ "$API_HEALTH_STATUS" = "200" ] && echo "✅ 正常" || echo "❌ 异常")"
echo "- API 文档: $([ "$API_DOCS_STATUS" = "200" ] && echo "✅ 正常" || echo "❌ 异常")"
echo "- Waline 服务: $([ "$WALINE_HEALTH_STATUS" = "200" ] && echo "✅ 正常" || echo "❌ 异常")"

# 返回退出码
ALL_GOOD=true
for status in $FRONTEND_STATUS $BLOG_STATUS $API_HEALTH_STATUS $API_DOCS_STATUS $WALINE_HEALTH_STATUS; do
    if [ "$status" != "200" ]; then
        ALL_GOOD=false
    fi
done

if [ "$ALL_GOOD" = true ]; then
    echo "🎉 所有服务验证通过！"
    exit 0
else
    echo "🚨 部分服务存在问题，请检查！"
    exit 1
fi