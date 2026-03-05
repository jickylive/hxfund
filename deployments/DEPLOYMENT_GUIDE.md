# 黄氏家族寻根平台 - 阿里云虚拟主机部署指南

## 概述

本文档详细介绍了如何将黄氏家族寻根平台的前端文件部署到阿里云虚拟主机。

## 部署前准备

### 1. 环境要求
- Node.js (v14.0 或更高版本)
- npm 包管理器
- SSH 客户端 (用于远程部署)
- 阿里云虚拟主机账户及访问权限

### 2. 阿里云虚拟主机配置要求
- 支持 HTML5 的现代浏览器
- 支持 HTTPS (推荐)
- 支持静态文件服务 (CSS, JS, 图片等)
- 支持 PWA 功能 (Service Worker)

## 构建项目

### 1. 安装依赖
```bash
cd /path/to/hxfund
npm install
```

### 2. 运行构建
```bash
npm run build
```

构建成功后，会在 `dist/` 目录生成以下文件结构：
```
dist/
├── index.html          # 主页面文件
├── css/
│   ├── style.css       # 原始CSS文件
│   └── style.min.css   # 压缩后的CSS文件
├── js/
│   ├── data.js         # 数据模块 (原始)
│   ├── data.min.js     # 数据模块 (压缩)
│   ├── main.js         # 主脚本 (原始)
│   ├── main.min.js     # 主脚本 (压缩)
│   ├── modules.js      # 功能模块 (原始)
│   ├── modules.min.js  # 功能模块 (压缩)
│   ├── script.js       # AI客户端脚本 (原始)
│   └── script.min.js   # AI客户端脚本 (压缩)
├── pwa/
│   ├── manifest.json   # PWA配置文件
│   └── icons/          # PWA图标
└── manifest.json       # 构建清单文件
```

## 部署方式

### 方式一：使用自动化部署脚本 (推荐)

运行提供的部署脚本：
```bash
cd /path/to/hxfund
./deployments/deploy-to-aliyun.sh
```

脚本会引导您完成以下步骤：
1. 验证构建文件完整性
2. 选择部署方式 (SCP, RSYNC, FTP)
3. 输入阿里云主机信息
4. 执行文件传输
5. 验证部署结果

### 方式二：手动部署

#### 1. 通过FTP上传
- 使用FTP客户端连接到阿里云虚拟主机
- 将 `dist/` 目录下的所有文件上传到网站根目录
- 确保文件权限正确 (通常为 644)

#### 2. 通过SCP命令
```bash
scp -r dist/* username@your-domain.com:/path/to/webroot/
```

#### 3. 通过Git部署 (如果支持)
```bash
# 在阿里云主机上设置Git钩子
# 推送代码后自动构建和部署
```

## 阿里云虚拟主机配置

### 1. 目录结构
建议将文件部署到以下目录结构：
```
/var/www/html/
└── hxfund/             # 项目根目录
    ├── index.html
    ├── css/
    ├── js/
    ├── pwa/
    └── ...
```

### 2. Web服务器配置 (Apache)

在网站根目录创建 `.htaccess` 文件：
```apache
# 启用 gzip 压缩
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/json
</IfModule>

# 设置缓存头
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType application/font-woff "access plus 1 year"
    ExpiresByType application/font-woff2 "access plus 1 year"
    ExpiresByType application/vnd.ms-fontobject "access plus 1 year"
    ExpiresByType application/x-font-opentype "access plus 1 year"
    ExpiresByType application/x-font-truetype "access plus 1 year"
    ExpiresByType application/x-font-ttf "access plus 1 year"
    ExpiresByType font/eot "access plus 1 year"
    ExpiresByType font/opentype "access plus 1 year"
    ExpiresByType font/otf "access plus 1 year"
    ExpiresByType font/ttf "access plus 1 year"
</IfModule>

# 启用 HTTPS 重定向
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# SPA 路由支持
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [QSA,L]
```

### 3. Web服务器配置 (Nginx)

如果使用 Nginx，请使用以下配置：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # 网站根目录
    root /var/www/html/hxfund;
    index index.html;

    # 静态文件缓存
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # 主页和其他路由
    location / {
        try_files $uri $uri/ /index.html;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    # PWA Service Worker (需要特殊处理)
    location = /pwa/service-worker.js {
        add_header Cache-Control "no-cache";
        try_files $uri =404;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://coding.dashscope.aliyuncs.com https://*.aliyuncs.com;" always;
}
```

## 部署后验证

### 1. 功能测试
- 访问网站首页，确认页面正常加载
- 测试导航功能是否正常
- 验证 PWA 功能 (添加到主屏幕)
- 检查 CSS 样式是否正确应用
- 验证 JavaScript 功能是否正常

### 2. 性能测试
- 使用 Chrome DevTools 检查 Lighthouse 分数
- 验证 PWA 指标
- 检查加载速度
- 确认 Service Worker 正常注册

### 3. 安全检查
- 确认 HTTPS 正常工作
- 验证 CSP (内容安全策略) 配置
- 检查是否启用了必要的安全头

## 常见问题及解决方案

### 1. 文件权限问题
```bash
# 设置正确的文件权限
find /var/www/html/hxfund -type f -exec chmod 644 {} \;
find /var/www/html/hxfund -type d -exec chmod 755 {} \;
```

### 2. Service Worker 无法注册
- 确保通过 HTTPS 访问
- 检查 service-worker.js 文件路径
- 验证服务器 MIME 类型配置

### 3. 静态资源加载失败
- 检查文件路径是否正确
- 验证服务器配置是否允许静态文件访问
- 确认文件权限设置

### 4. PWA 功能不工作
- 验证 manifest.json 是否正确配置
- 检查图标文件是否存在
- 确认 HTTPS 配置

## 回滚方案

如果部署出现问题，可以使用以下方式进行回滚：

### 1. 使用备份
```bash
# 恢复到之前的备份
tar -xzf /path/to/backup.tar.gz -C /var/www/html/
```

### 2. 重新部署稳定版本
- 从版本控制系统获取稳定版本
- 重新构建并部署

## 维护建议

### 1. 定期备份
- 定期备份网站文件
- 备份配置文件
- 记录部署版本和时间

### 2. 监控
- 监控网站可用性
- 检查性能指标
- 监控错误日志

### 3. 更新
- 定期更新前端资源
- 监控安全漏洞
- 保持依赖更新

## 联系信息

如需技术支持，请联系：
- 项目维护者：黄氏家族寻根平台开发团队
- 问题反馈：通过 GitHub Issues
- 紧急支持：[联系方式]

---
**文档版本**: v1.0  
**最后更新**: 2026-03-05  
**适用版本**: 黄氏家族寻根平台 v3.3.0+