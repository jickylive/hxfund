# 阿里云虚拟主机 FTP 部署示例

## 如何配置和运行

### 1. 配置环境变量

首先，复制示例配置文件：

```bash
cp .env.example .env
```

### 2. 编辑 .env 文件

使用文本编辑器编辑 `.env` 文件：

```bash
nano .env
```

设置以下变量（替换为您的实际值）：

```bash
# 阿里云 FTP 虚拟主机配置
ALIYUN_FTP_HOST=ftp.yourdomain.com
ALIYUN_FTP_USER=your_ftp_username
ALIYUN_FTP_PASS=your_ftp_password
ALIYUN_FTP_PORT=21
ALIYUN_FTP_REMOTE_DIR=/htdocs
ALIYUN_FTP_SECURE=false
```

### 3. 运行部署

确保项目已构建：

```bash
npm run build
```

然后运行 FTP 部署：

```bash
npm run deploy:aliyun:ftp
```

### 4. 或直接设置环境变量（临时）

如果不想修改 .env 文件，可以直接设置环境变量：

```bash
export ALIYUN_FTP_HOST="ftp.yourdomain.com"
export ALIYUN_FTP_USER="your_ftp_username" 
export ALIYUN_FTP_PASS="your_ftp_password"
export ALIYUN_FTP_REMOTE_DIR="/htdocs"

npm run deploy:aliyun:ftp
```

## 阿里云虚拟主机 FTP 信息获取

要获取您的阿里云虚拟主机 FTP 信息：

1. 登录阿里云控制台
2. 进入虚拟主机管理页面
3. 查找 FTP 账户信息，通常包括：
   - FTP 服务器地址（如 ftp.yourdomain.com 或 IP 地址）
   - FTP 用户名（可能是您的域名或特定用户名）
   - FTP 密码（在控制台中重置或查看）
   - FTP 端口（通常是 21）

## 部署验证

部署完成后，您可以通过以下方式验证：

1. 访问您的网站域名
2. 检查网站是否显示最新的内容
3. 验证 CSS、JS、图片等资源是否正确加载

## 故障排除

如果遇到连接问题：

- 确认 FTP 服务器地址、用户名和密码正确
- 检查防火墙设置
- 确认虚拟主机服务是否正常运行
- 联系阿里云技术支持获取帮助