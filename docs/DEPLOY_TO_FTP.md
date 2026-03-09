# 部署说明 - 黄氏家族寻根平台

## 部署到阿里云FTP虚拟主机

### 1. 构建项目
首先，确保项目已构建：

```bash
node scripts/build.js
```

这将在 `dist/` 目录中生成所有必要的文件。

### 2. 部署选项

#### 选项 A: 使用FTP部署脚本 (Linux/macOS)

1. 配置FTP环境变量：

   **方法1: 编辑 .env 文件 (推荐)**
   ```bash
   # 编辑 .env 文件，填入您的FTP信息
   nano .env
   ```

   在 .env 文件中设置以下变量：
   ```
   FTP_HOST=your-ftp-server-address
   FTP_USER=your-ftp-username
   FTP_PASS=your-ftp-password
   FTP_PORT=21  # 可选，默认为21
   FTP_REMOTE=/  # 可选，默认为根目录
   ```

   **方法2: 使用 export 命令**
   ```bash
   export FTP_HOST='your-ftp-server-address'
   export FTP_USER='your-ftp-username'
   export FTP_PASS='your-ftp-password'
   export FTP_PORT='21'  # 可选，默认为21
   export FTP_REMOTE='/'  # 可选，默认为根目录
   ```

2. 运行部署脚本：
```bash
npm run deploy:aliyun:ftp
```

注意：需要安装 `lftp` 工具：
- Ubuntu/Debian: `sudo apt-get install lftp`
- CentOS/RHEL: `sudo yum install lftp`
- macOS: `brew install lftp`

#### 选项 B: 使用FTP客户端 (所有系统)

1. 打开FTP客户端（如FileZilla）
2. 连接到您的阿里云FTP服务器
3. 将 `dist/` 目录中的所有文件上传到FTP服务器的根目录或指定目录

### 3. 特殊字符密码处理

如果您的FTP密码包含特殊字符（如 `%`, `"`, `(`, `)`, `$`, `*`, `?`, `[`, `]`, `{`, `}`, 等），请放心使用，部署脚本已经实现对这些特殊字符的安全处理。

例如，如果您的密码是 `"%)(AabhMXUsyiA5"`，可以直接在 `.env` 文件中设置：
```
FTP_PASS="%)(AabhMXUsyiA5"
```

部署脚本会自动处理特殊字符，确保命令正确解析且密码安全。

### 3. 验证部署

部署完成后，通过您的域名或FTP服务器地址访问网站，验证所有功能是否正常工作：

- 首页是否正常显示
- Qwen AI 功能是否正常工作
- 族谱树是否正常显示
- 字辈计算器是否正常工作
- PWA 功能是否正常

### 4. 部署后配置

1. 确保域名解析正确指向FTP服务器
2. 检查SSL证书（如果使用HTTPS）
3. 验证API端点是否正确配置

### 5. 文件结构

部署的文件结构如下：
```
dist/
├── index.html
├── css/
│   ├── style.css
│   └── style.min.css
├── js/
│   ├── data.js
│   ├── data.min.js
│   ├── main.js
│   ├── main.min.js
│   ├── modules.js
│   ├── modules.min.js
│   ├── script.js
│   ├── script.min.js
│   └── web-vitals.js
├── pwa/
│   ├── manifest.json
│   ├── service-worker.js
│   └── icons/
├── backups/  (构建时生成的备份)
└── manifest.json  (构建清单)
```

### 6. 故障排除

如果部署后出现问题：

1. 检查浏览器控制台是否有错误
2. 确认所有文件都已正确上传
3. 验证CSS和JS文件路径是否正确
4. 检查API端点配置是否正确