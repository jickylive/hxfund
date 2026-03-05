#!/bin/bash
# hxfund 博客模块部署验证脚本
# 用于验证博客模块是否成功部署并正常运行
# 用法：./scripts/validate-blog-deploy.sh

set -e

echo "🔍 开始验证 hxfund 博客模块部署..."

# 默认博客 URL
BLOG_URL="${BLOG_URL:-https://www.hxfund.cn/blog/}"

# 检查博客首页
echo "🌐 检查博客首页访问..."
if curl -s --fail -o /dev/null "$BLOG_URL"; then
    echo "✅ 博客首页访问正常"
else
    echo "❌ 博客首页无法访问"
    exit 1
fi

# 检查关键资源加载
echo "📦 检查关键资源加载..."

# 检查 CSS 文件
CSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BLOG_URLcss/style.css")
if [ "$CSS_STATUS" = "200" ] || [ "$CSS_STATUS" = "304" ]; then
    echo "✅ CSS 文件加载正常"
else
    echo "⚠️ CSS 文件可能存在问题 (HTTP $CSS_STATUS)"
fi

# 检查 JS 文件
JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BLOG_URLjs/script.js")
if [ "$JS_STATUS" = "200" ] || [ "$JS_STATUS" = "304" ]; then
    echo "✅ JS 文件加载正常"
else
    echo "⚠️ JS 文件可能存在问题 (HTTP $JS_STATUS)"
fi

# 检查是否有文章列表
echo "📝 检查文章列表..."
ARTICLE_COUNT=$(curl -s "$BLOG_URL" | grep -c "article-title\|post-title\|entry-title" || echo 0)
if [ "$ARTICLE_COUNT" -gt 0 ]; then
    echo "✅ 发现 $ARTICLE_COUNT 篇文章"
else
    echo "⚠️ 未发现文章列表元素，可能页面结构异常"
fi

# 检查最近的文章
echo "📅 检查最近文章..."
RECENT_POST=$(curl -s "$BLOG_URL" | grep -o '<a[^>]*href="[^"]*"[^>]*class="[^"]*post[^"]*"[^>]*>[^<]*' | head -n 1)
if [ -n "$RECENT_POST" ]; then
    echo "✅ 最近文章链接正常"
else
    echo "⚠️ 未找到最近文章链接"
fi

# 检查 RSS 订阅
echo "📡 检查 RSS 订阅..."
RSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BLOG_URLatom.xml")
if [ "$RSS_STATUS" = "200" ]; then
    echo "✅ RSS 订阅正常"
else
    echo "⚠️ RSS 订阅可能存在问题 (HTTP $RSS_STATUS)"
fi

# 检查响应时间
echo "⏱️ 检查响应时间..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}s" "$BLOG_URL")
RESPONSE_TIME_NUM=$(echo "$RESPONSE_TIME" | sed 's/s//')
if (( $(echo "$RESPONSE_TIME_NUM < 3" | bc -l) )); then
    echo "✅ 响应时间良好 ($RESPONSE_TIME)"
else
    echo "⚠️ 响应时间较慢 ($RESPONSE_TIME)，可能需要优化"
fi

# 检查移动端适配 (简单检查是否有 viewport meta 标签)
echo "📱 检查移动端适配..."
VIEWPORT_TAG=$(curl -s "$BLOG_URL" | grep -c "viewport" || echo 0)
if [ "$VIEWPORT_TAG" -gt 0 ]; then
    echo "✅ 发现 viewport 标签，支持移动端"
else
    echo "⚠️ 未发现 viewport 标签，移动端适配可能有问题"
fi

# 检查搜索功能 (如果存在)
echo "🔍 检查搜索功能..."
SEARCH_FORM=$(curl -s "$BLOG_URL" | grep -c "search\|搜索" || echo 0)
if [ "$SEARCH_FORM" -gt 0 ]; then
    echo "✅ 搜索功能存在"
else
    echo "ℹ️  搜索功能未检测到 (这可能是正常的)"
fi

# 汇总结果
echo ""
echo "📋 博客部署验证汇总："
echo "- 博客首页：✅ 正常"
echo "- CSS/JS 资源：$(if [ "$CSS_STATUS" = "200" ] || [ "$CSS_STATUS" = "304" ]; then echo "✅ 正常"; else echo "⚠️ 异常"; fi)"
echo "- 文章列表：$(if [ "$ARTICLE_COUNT" -gt 0 ]; then echo "✅ $ARTICLE_COUNT 篇"; else echo "⚠️ 未找到"; fi)"
echo "- RSS 订阅：$(if [ "$RSS_STATUS" = "200" ]; then echo "✅ 正常"; else echo "⚠️ 异常"; fi)"
echo "- 响应时间：$(if (( $(echo "$RESPONSE_TIME_NUM < 3" | bc -l) )); then echo "✅ 良好"; else echo "⚠️ 较慢"; fi)"

echo ""
echo "🎉 博客模块部署验证完成！"
echo "🌐 访问地址：$BLOG_URL"
echo ""
echo "如发现问题，请检查："
echo "1. FTP 上传是否完整"
echo "2. 文件权限是否正确"
echo "3. Nginx 配置是否生效"
echo "4. 域名解析是否正确"