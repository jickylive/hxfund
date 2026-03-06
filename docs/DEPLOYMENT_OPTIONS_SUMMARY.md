# 部署选项摘要

## 部署脚本概览

本项目提供多种部署选项，以适应不同的环境和安全要求：

### 1. 智能部署 (推荐)
- **命令**: `npm run deploy:aliyun:smart`
- **脚本**: `scripts/deploy-frontend-to-aliyun-oss-smart.js`
- **特点**: 自动检测运行环境
  - 在 ECS 实例上：使用 STS 临时凭证（更安全）
  - 在其他环境：使用传统 AccessKey
- **适用场景**: 任何环境，提供最佳的灵活性和安全性

### 2. ECS STS 部署
- **命令**: `npm run deploy:aliyun:sts`
- **脚本**: `scripts/deploy-frontend-to-aliyun-oss-sts.js`
- **特点**: 仅使用 ECS 实例角色和 STS 临时凭证
- **适用场景**: 在配置了 RAM 角色的 ECS 实例上运行
- **安全性**: 最高，不使用长期访问密钥

### 3. 传统部署
- **命令**: `npm run deploy:aliyun`
- **脚本**: `scripts/deploy-frontend-to-aliyun-oss.js` (交互式)
- **脚本**: `scripts/deploy-frontend-to-aliyun-oss-non-interactive.js` (非交互式)
- **特点**: 使用传统的 AccessKey 进行部署
- **适用场景**: 本地开发环境或没有 ECS 角色的环境
- **安全性**: 标准级别

### 4. FTP 部署到虚拟主机
- **命令**: `npm run deploy:aliyun:ftp`
- **脚本**: `scripts/deploy-frontend-to-aliyun-ftp.js`
- **特点**: 通过 FTP/FTPS 协议部署到虚拟主机
- **适用场景**: 阿里云虚拟主机或其他支持 FTP 的托管服务
- **安全性**: 取决于是否使用 FTPS/SSL

## 环境变量配置

### 基本配置 (所有方式都需要)
```bash
ALIYUN_OSS_BUCKET_NAME=your-oss-bucket-name
ALIYUN_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com  # 可选，默认值
```

### 传统部署额外需要
```bash
ALIYUN_ACCESS_KEY_ID=your-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret
```

### ECS STS 部署额外需要
```bash
ECS_ROLE_NAME=your-ecs-role-name
```

## 推荐配置流程

### 1. 使用 .env 文件 (推荐)
```bash
# 复制示例文件
cp .env.example .env

# 编辑配置
nano .env
```

### 2. 选择部署方式
- **开发/测试环境**: 使用智能部署 (`npm run deploy:aliyun:smart`)
- **ECS 生产环境**: 使用智能部署或 ECS STS 部署
- **本地部署**: 使用智能部署

### 3. 验证部署
部署完成后，验证以下内容：
- 网站是否可通过 OSS 域名访问
- CSS 和 JS 文件是否正确加载
- 所有功能是否正常工作

## CDN 配置建议

为了获得更好的性能和用户体验，建议配置阿里云 CDN：

1. 在阿里云 CDN 控制台添加域名
2. 设置主源站为 OSS Bucket
3. 设置备用源站为 ECS 实例或其他服务器
4. 配置 CNAME 解析
5. 启用 HTTPS 证书

详情请参阅 `docs/ALIYUN_CDN_OSS_BACKUP_SOURCE_CONFIG.md`。

## 安全最佳实践

1. **使用智能部署**: 自动选择最适合环境的安全方式
2. **ECS 环境**: 使用 RAM 角色和 STS 临时凭证
3. **避免硬编码**: 使用 .env 文件管理敏感信息
4. **最小权限原则**: 为 RAM 角色分配最小必要权限
5. **定期轮换**: 定期更新 AccessKey (如果使用)