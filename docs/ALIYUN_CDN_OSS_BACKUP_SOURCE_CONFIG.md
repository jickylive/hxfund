# 阿里云 CDN 配置 - OSS 备用回源设置

## 配置说明

本文档描述如何将阿里云 OSS 设置为 CDN 的备用回源，以 `www.hxfund.cn` 为例。

## 配置步骤

### 1. 登录阿里云 CDN 控制台

访问：https://cdn.console.aliyun.com/

### 2. 添加加速域名

1. 点击"域名管理" -> "添加域名"
2. 填写加速域名：`www.hxfund.cn`
3. 选择源站类型：OSS域名
4. 选择对应的 Bucket 作为主源站

### 3. 配置备用源站

在"源站配置"中设置：

- **主源站**：OSS Bucket 域名 (如 `hxfund-static.oss-cn-hangzhou.aliyuncs.com`)
- **备用源站**：ECS 实例或其他服务器 IP 或域名
- **回源策略**：
  - 优先访问主源站（OSS）
  - 主源站不可用时自动切换到备用源站
  - 配置健康检查确保源站可用性

### 4. 配置缓存规则

```
# 静态资源缓存 1 年
*.css, *.js, *.png, *.jpg, *.jpeg, *.gif, *.svg, *.ico, *.woff, *.woff2, *.ttf
缓存时间：31536000秒 (1年)
缓存遵循源站：否

# HTML 文件缓存 1 小时
*.html
缓存时间：3600秒 (1小时)
缓存遵循源站：否

# 其他文件缓存 1 小时
*.*
缓存时间：3600秒 (1小时)
缓存遵循源站：否
```

### 5. 配置 HTTPS 证书

1. 上传 SSL 证书或使用阿里云免费证书
2. 启用 HTTP 强制跳转 HTTPS
3. 配置 TLS 版本和加密套件

### 6. 高级配置

#### 访问控制
- IP 黑白名单
- Referer 防盗链
- User-Agent 访问控制

#### 性能优化
- Gzip 压缩
- Range 回源
- 忽略参数

## 示例 Nginx 配置（备用源站）

如果备用源站使用 Nginx，可以参考以下配置：

```nginx
server {
    listen 80;
    server_name www.hxfund.cn;

    # 防止直接访问此服务器（仅作为备用）
    location / {
        # 返回特殊响应头表示这是备用源
        add_header X-Source-Type "backup-server";
        
        # 静态文件服务
        root /var/www/hxfund;
        index index.html;
        
        # 设置缓存头
        location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            try_files $uri $uri/ =404;
        }
        
        # HTML 文件
        location ~* \.html$ {
            expires 1h;
            add_header Cache-Control "public";
            try_files $uri $uri/ =404;
        }
        
        # 其他文件
        location / {
            expires 1h;
            add_header Cache-Control "public";
            try_files $uri $uri/ =404;
        }
    }
}
```

## 验证配置

1. **DNS 配置**：确保域名 CNAME 解析到 CDN 分配的域名
2. **源站测试**：验证 CDN 可以正常访问 OSS 源站
3. **备用源测试**：临时禁用 OSS 源站，验证是否正确切换到备用源
4. **HTTPS 测试**：验证 HTTPS 证书正常工作
5. **缓存测试**：验证缓存策略按预期工作

## 监控和告警

1. 配置 CDN 访问日志投递到 SLS
2. 设置源站健康检查告警
3. 配置流量异常告警
4. 监控回源错误率

## 注意事项

1. **安全考虑**：确保 OSS Bucket 策略允许 CDN 服务访问
2. **成本优化**：合理设置缓存时间以减少回源次数
3. **故障切换**：定期测试备用源站的可用性
4. **证书管理**：及时更新 SSL 证书