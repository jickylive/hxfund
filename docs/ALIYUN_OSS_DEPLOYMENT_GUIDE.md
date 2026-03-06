# 阿里云 OSS 部署指南

## 部署脚本使用说明

我们提供了多种自动化部署脚本，用于将构建的前端文件部署到阿里云 OSS。

## 部署前准备

### 0. 环境变量配置（推荐）

我们建议使用 `.env` 文件来管理部署所需的环境变量。首先复制 `.env.example` 文件并根据您的环境进行配置：

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑配置文件
nano .env  # 或使用您喜欢的编辑器
```

在 `.env` 文件中配置以下变量：

#### 传统部署方式（使用 AccessKey）：
```bash
ALIYUN_OSS_BUCKET_NAME=your-oss-bucket-name
ALIYUN_ACCESS_KEY_ID=your-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret
ALIYUN_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
```

#### STS 部署方式（使用 ECS 实例角色，更安全）：
```bash
ECS_ROLE_NAME=your-ecs-role-name
ALIYUN_OSS_BUCKET_NAME=your-oss-bucket-name
ALIYUN_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
```

确保将 `.env` 文件添加到 `.gitignore` 中以避免泄露敏感信息：

```bash
echo ".env" >> .gitignore
```

### 1. 安装 ossutil

如果您尚未安装阿里云 OSS 客户端工具 `ossutil`，请按以下步骤安装：

#### Linux/macOS:
```bash
wget http://gosspublic.alicdn.com/ossutil/install.sh
sudo sh install.sh
```

或者下载二进制文件：
```bash
# 下载最新版本的 ossutil
wget https://gosspublic.alicdn.com/ossutil/1.7.15/ossutil64
chmod 755 ossutil64
sudo mv ossutil64 /usr/local/bin/ossutil
```

#### Windows:
从 [阿里云官方文档](https://help.aliyun.com/document_detail/50452.htm) 下载并安装。

### 2. 创建 OSS Bucket

1. 登录 [阿里云 OSS 控制台](https://oss.console.aliyun.com/)
2. 创建一个新的 Bucket
3. 设置读写权限为“公共读”
4. 记下 Bucket 名称和 Endpoint

## 部署方式

### 方式零：智能部署（推荐）

这是一种智能的部署方式，它会自动检测运行环境：

- 如果在配置了 RAM 角色的 ECS 实例上运行，则使用 STS 临时凭证
- 如果在其他环境运行，则自动切换到传统 AccessKey 方式

```bash
# 使用 .env 文件配置
cp .env.example .env
nano .env  # 编辑文件，设置所有必要的环境变量

# 运行智能部署
npm run deploy:aliyun:smart
```

### 方式一：使用 ECS 实例角色和 STS 临时凭证（在 ECS 上推荐）

这种方法更加安全，因为它使用临时凭证而非长期访问密钥。

#### 1. 配置 ECS 实例角色

1. 登录 [阿里云 RAM 控制台](https://ram.console.aliyun.com/manage/roles)
2. 创建一个角色，选择" ECS 实例 "作为受信实体
3. 为角色分配适当的 OSS 权限（如 `AliyunOSSFullAccess` 或自定义策略）
4. 将该角色附加到您的 ECS 实例

#### 2. 设置环境变量

```bash
export ECS_ROLE_NAME="your-ecs-role-name"  # 您的 ECS 实例角色名称
export ALIYUN_OSS_BUCKET_NAME="your-bucket-name"  # 您的 OSS Bucket 名称
export ALIYUN_OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"  # 可选，默认为 oss-cn-hangzhou.aliyuncs.com
```

#### 3. 运行部署脚本

```bash
node scripts/deploy-frontend-to-aliyun-oss-sts.js
```

#### 优势：
- 更高的安全性（使用临时凭证）
- 自动凭证轮换
- 无需管理长期访问密钥

### 方式二：使用长期访问密钥（传统方式）

#### 1. 准备阿里云凭据

在部署前，您需要准备以下信息：

1. **AccessKeyId**: 您的阿里云访问密钥 ID
2. **AccessKeySecret**: 您的阿里云访问密钥 Secret
3. **Bucket 名称**: 您要部署到的 OSS Bucket 名称
4. **Endpoint**: OSS 服务接入点（如 `oss-cn-hangzhou.aliyuncs.com`）

#### 2. 运行交互式部署脚本

```bash
node scripts/deploy-frontend-to-aliyun-oss.js
```

#### 3. 或使用环境变量进行非交互式部署

```bash
export ALIYUN_OSS_BUCKET_NAME="your-bucket-name"
export ALIYUN_ACCESS_KEY_ID="your-access-key-id"
export ALIYUN_ACCESS_KEY_SECRET="your-access-key-secret"
export ALIYUN_OSS_ENDPOINT="oss-cn-hangzhou.aliyuncs.com"  # 可选，默认为 oss-cn-hangzhou.aliyuncs.com
node scripts/deploy-frontend-to-aliyun-oss-non-interactive.js
```

## 部署步骤

### 1. 构建项目

首先确保您的项目已经构建：

```bash
npm run build
```

### 2. 选择部署方式并运行相应脚本

根据您的安全需求选择合适的部署方式（见上文）。

### 3. 验证部署

部署完成后，您可以通过以下 URL 访问您的网站：
`https://<bucket-name>.<endpoint-domain>/`

例如：`https://my-hxfund-website.oss-cn-hangzhou.aliyuncs.com/`

## 配置 CDN 加速（推荐）

为了获得更好的访问速度和更低的成本，强烈建议配置 CDN：

1. 登录 [阿里云 CDN 控制台](https://cdn.console.aliyun.com/)
2. 添加域名，将您的自定义域名（如 `www.hxfund.cn`）指向 OSS Bucket
3. 配置 CNAME 解析到 CDN 分配的域名
4. 配置 HTTPS 证书（如果需要）
5. 设置备用源站为您的 ECS 实例或其他服务器

详情请参阅 `docs/ALIYUN_CDN_OSS_BACKUP_SOURCE_CONFIG.md`。

## 缓存策略

部署脚本会自动为不同类型的文件设置适当的缓存策略：

- HTML 文件：1 小时
- CSS/JS 文件：1 年（immutable）
- 图片和其他静态资源：1 年（immutable）
- 其他文件：1 小时

## 故障排除

### 权限错误
- 确保您的 ECS 角色具有足够的权限操作指定的 Bucket（如果使用 STS 方式）
- 检查 Bucket 的读写权限设置

### 连接错误
- 检查网络连接
- 确认 Endpoint 是否正确
- 验证 ECS 实例是否能访问元数据服务（100.100.100.100）

### 文件访问错误
- 确认 Bucket 设置为“公共读”权限
- 检查 CDN 配置（如果使用）

## 安全最佳实践

- **推荐使用 ECS 实例角色和 STS 临时凭证**，避免在代码或配置中存储长期访问密钥
- 定期审查和轮换访问密钥（如果使用长期密钥）
- 使用最小权限原则配置 RAM 策略
- 启用操作审计（ActionTrail）记录所有 API 调用