# 阿里云虚拟主机 FTP 部署指南

## 部署脚本说明

我们提供了专门的 FTP 部署脚本，用于将构建的前端文件部署到阿里云虚拟主机。

## 部署前准备

### 1. 确保已构建项目

在部署前，请确保项目已构建：

```bash
npm run build
```

### 2. 获取阿里云虚拟主机 FTP 信息

您需要从阿里云控制台获取以下信息：

- **FTP 服务器地址**：通常是虚拟主机的 IP 地址或域名
- **FTP 用户名**：虚拟主机的 FTP 账户
- **FTP 密码**：虚拟主机的 FTP 密码
- **FTP 端口**：通常为 21（FTP）或 22（SFTP）
- **远程目录**：通常是 `/htdocs` 或 `/www` 目录

## 部署方式

### 方式 1: 使用环境变量配置（推荐）

#### 1. 配置环境变量

复制示例配置文件：

```bash
cp .env.example .env
nano .env  # 使用您喜欢的编辑器编辑文件
```

在 `.env` 文件中设置 FTP 相关变量：

```bash
# 阿里云 FTP 虚拟主机配置
ALIYUN_FTP_HOST=your-aliyun-ftp-host.com
ALIYUN_FTP_USER=your-aliyun-ftp-username
ALIYUN_FTP_PASS=your-aliyun-ftp-password
ALIYUN_FTP_PORT=21
ALIYUN_FTP_REMOTE_DIR=/htdocs
ALIYUN_FTP_SECURE=false  # 是否使用 FTPS (SSL)
```

#### 2. 运行部署脚本

```bash
npm run deploy:aliyun:ftp
```

### 方式 2: 使用系统环境变量

```bash
export ALIYUN_FTP_HOST="your-aliyun-ftp-host.com"
export ALIYUN_FTP_USER="your-aliyun-ftp-username"
export ALIYUN_FTP_PASS="your-aliyun-ftp-password"
export ALIYUN_FTP_PORT=21
export ALIYUN_FTP_REMOTE_DIR="/htdocs"

npm run deploy:aliyun:ftp
```

## 阿里云虚拟主机配置说明

### FTP 访问方式

阿里云虚拟主机通常支持以下 FTP 访问方式：

- **标准 FTP**：端口 21，明文传输
- **FTPS (SSL)**：端口 990，加密传输
- **SFTP**：端口 22，SSH 文件传输协议

### 目录结构

典型的阿里云虚拟主机目录结构：

```
/
├── htdocs/          # Web 根目录
│   ├── index.html   # 主页文件
│   ├── css/         # 样式文件
│   ├── js/          # JavaScript 文件
│   └── images/      # 图片文件
└── backup/          # 备份目录
```

## 安全注意事项

1. **使用 .env 文件**：不要在代码中硬编码 FTP 凭据
2. **FTPS 传输**：如果支持，建议使用 FTPS 或 SFTP 加密传输
3. **权限设置**：确保 Web 服务器对上传的文件有正确的读取权限
4. **定期更换密码**：定期更换 FTP 密码以提高安全性

## 故障排除

### 连接问题

- **连接超时**：检查防火墙设置和 FTP 服务器地址
- **认证失败**：确认用户名和密码正确
- **被动模式**：某些网络环境下需要使用被动 FTP 模式

### 文件权限问题

- **403 Forbidden**：检查文件和目录的权限设置
- **无法写入**：确认 FTP 用户对目标目录有写入权限

### 传输问题

- **传输中断**：尝试使用断点续传功能
- **文件损坏**：验证上传文件的完整性

## 部署验证

部署完成后，请验证以下内容：

1. **网站访问**：访问您的域名确认网站正常显示
2. **资源加载**：检查 CSS、JS、图片等资源是否正确加载
3. **功能测试**：测试所有网站功能是否正常工作
4. **响应速度**：确认网站加载速度符合预期

## CDN 集成（可选）

如果使用了 CDN 服务：

1. 部署完成后清除 CDN 缓存
2. 验证 CDN 是否正确分发新版本文件
3. 检查 HTTPS 证书是否正常工作

## 备份和回滚

建议在部署前备份现有网站：

```bash
# 通过 FTP 备份现有文件
# 或使用阿里云控制台的备份功能
```

如需回滚，可从备份恢复文件或重新部署之前的版本。