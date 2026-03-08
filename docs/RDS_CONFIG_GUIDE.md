# 阿里云 RDS 接入指南

## 📋 目录

1. [获取 RDS 连接信息](#获取-rds-连接信息)
2. [配置环境变量](#配置环境变量)
3. [SSL 证书配置](#ssl-证书配置)
4. [白名单设置](#白名单设置)
5. [数据库初始化](#数据库初始化)
6. [连接测试](#连接测试)

---

## 🔍 获取 RDS 连接信息

### 步骤 1: 登录阿里云控制台

访问 [阿里云 RDS 控制台](https://rds.console.aliyun.com/)

### 步骤 2: 选择实例

在实例列表中找到你的 RDS 实例，点击进入详情页。

### 步骤 3: 获取连接信息

在 **数据库连接** 页面，找到以下信息：

| 参数 | 说明 | 示例 |
|------|------|------|
| 内网地址 | 同一地域 ECS/容器使用 | `rm-xxx.mysql.rds.aliyuncs.com` |
| 外网地址 | 本地开发或跨地域使用 | `rm-xxx.mysql.rds.aliyuncs.com` |
| 端口 | 默认 3306 | `3306` |

### 步骤 4: 创建数据库账号

1. 进入 **账号管理** 页面
2. 点击 **创建账号**
3. 填写账号信息：
   - 账号名称：`hxfund_app`
   - 密码：设置强密码
   - 账号类型：高权限账号

---

## ⚙️ 配置环境变量

编辑 `.env` 文件，填入 RDS 配置：

```bash
# ============================================
# 阿里云 RDS 数据库配置
# ============================================

# RDS 连接地址（替换为你的实际地址）
RDS_HOST=rm-xxxxxxxxx.mysql.rds.aliyuncs.com
RDS_PORT=3306

# 数据库名称
RDS_DATABASE=hxfund_db

# 数据库账号
RDS_USERNAME=hxfund_app

# 数据库密码（替换为你的实际密码）
RDS_PASSWORD=YourSecurePassword123!

# 数据库字符集
RDS_CHARSET=utf8mb4

# 连接池配置
RDS_CONNECTION_LIMIT=10
RDS_CONNECT_TIMEOUT=10000
RDS_ACQUIRE_TIMEOUT=10000

# SSL 配置（推荐启用）
RDS_SSL=true

# SSL 证书路径（如果启用 SSL）
RDS_SSL_CA=/path/to/ca.pem
RDS_SSL_CERT=/path/to/client-cert.pem
RDS_SSL_KEY=/path/to/client-key.pem
```

---

## 🔐 SSL 证书配置

### 下载 CA 证书

1. 进入 RDS 实例 **数据库连接** 页面
2. 找到 **SSL 证书** 下载链接
3. 下载对应的 CA 证书

### 证书文件说明

| 文件 | 说明 | 用途 |
|------|------|------|
| `ca.pem` | CA 根证书 | 验证服务器身份 |
| `client-cert.pem` | 客户端证书 | 客户端身份认证（可选） |
| `client-key.pem` | 客户端私钥 | 客户端身份认证（可选） |

### 证书存放位置

建议将证书放在项目目录：

```
server/config/ssl/
├── ca.pem
├── client-cert.pem
└── client-key.pem
```

然后修改 `.env` 配置：

```bash
RDS_SSL_CA=./server/config/ssl/ca.pem
RDS_SSL_CERT=./server/config/ssl/client-cert.pem
RDS_SSL_KEY=./server/config/ssl/client-key.pem
```

---

## 🔒 白名单设置

### 添加 IP 白名单

1. 进入 RDS 实例 **白名单设置** 页面
2. 点击 **修改** 或 **添加白名单分组**
3. 添加允许访问的 IP 地址：

**本地开发：**
```
# 查看本机公网 IP
curl cip.cc
```

**ECS 服务器：**
- 如果使用内网连接，添加 ECS 的内网 IP
- 如果使用外网连接，添加 ECS 的公网 IP

**Docker 容器：**
- 使用宿主机 IP
- 或使用 NAT 网关的公网 IP

**示例白名单：**
```
192.168.1.0/24        # 局域网段
123.45.67.89          # 单个 IP
0.0.0.0/0             # 允许所有 IP（不推荐生产环境）
```

---

## 🗄️ 数据库初始化

### 方式 1: 使用命令行

```bash
# 连接到 RDS
mysql -h <RDS_HOST> -P 3306 -u <RDS_USERNAME> -p

# 创建数据库
CREATE DATABASE hxfund_db DEFAULT CHARACTER SET utf8mb4;

# 使用数据库
USE hxfund_db;

# 导入初始化脚本
source database/init.sql;
```

### 方式 2: 使用 Navicat/DBeaver

1. 创建新连接
2. 填写连接信息：
   - 主机：`<RDS_HOST>`
   - 端口：`3306`
   - 用户名：`<RDS_USERNAME>`
   - 密码：`<RDS_PASSWORD>`
3. 连接成功后，运行 `database/init.sql` 脚本

### 方式 3: 使用程序初始化

```javascript
// server/index.js 或专门的初始化脚本
const dbManager = require('./server/config/db-manager');

async function initializeDatabase() {
  try {
    await dbManager.initialize();
    
    // 运行初始化 SQL
    const fs = require('fs');
    const sql = fs.readFileSync('./database/init.sql', 'utf8');
    
    // 分割 SQL 语句并执行
    const statements = sql.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) {
        await dbManager.query(stmt);
      }
    }
    
    console.log('✅ 数据库初始化完成');
  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    await dbManager.close();
  }
}

initializeDatabase();
```

---

## ✅ 连接测试

### 方式 1: 使用 mysql 命令行

```bash
mysql -h <RDS_HOST> -P 3306 -u <RDS_USERNAME> -p<密码>
```

### 方式 2: 使用 Node.js 测试脚本

创建 `test-rds.js`：

```javascript
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  let connection;
  
  try {
    console.log('🔌 正在测试 RDS 连接...');
    console.log('主机:', process.env.RDS_HOST);
    console.log('数据库:', process.env.RDS_DATABASE);
    
    connection = await mysql.createConnection({
      host: process.env.RDS_HOST,
      port: parseInt(process.env.RDS_PORT) || 3306,
      user: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE,
      ssl: process.env.RDS_SSL === 'true' ? {
        rejectUnauthorized: true
      } : false
    });
    
    await connection.ping();
    console.log('✅ 连接成功！');
    
    // 测试查询
    const [rows] = await connection.query('SELECT 1 AS test');
    console.log('测试查询结果:', rows);
    
    // 查询数据库版本
    const [version] = await connection.query('SELECT VERSION()');
    console.log('MySQL 版本:', version[0]);
    
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testConnection();
```

运行测试：

```bash
npm install mysql2 dotenv
node test-rds.js
```

### 方式 3: 使用应用内置测试接口

启动应用后访问：

```
GET /api/health
```

---

## 📊 连接池配置建议

### 开发环境

```bash
RDS_CONNECTION_LIMIT=5
RDS_CONNECT_TIMEOUT=10000
RDS_ACQUIRE_TIMEOUT=10000
```

### 生产环境

```bash
RDS_CONNECTION_LIMIT=20
RDS_CONNECT_TIMEOUT=5000
RDS_ACQUIRE_TIMEOUT=30000
```

### 高并发环境

```bash
RDS_CONNECTION_LIMIT=50
RDS_CONNECT_TIMEOUT=3000
RDS_ACQUIRE_TIMEOUT=60000
```

---

## 🔧 常见问题

### 1. 连接超时

**错误信息：** `ETIMEDOUT`

**解决方案：**
- 检查白名单是否包含当前 IP
- 检查 RDS 实例是否运行中
- 检查网络连接

### 2. 认证失败

**错误信息：** `ER_ACCESS_DENIED_ERROR`

**解决方案：**
- 检查用户名密码是否正确
- 确认账号已创建并启用
- 检查账号是否有对应数据库权限

### 3. SSL 连接失败

**错误信息：** `SSL connection error`

**解决方案：**
- 下载并配置 CA 证书
- 设置 `RDS_SSL=false` 临时禁用 SSL（不推荐生产环境）
- 检查证书路径是否正确

### 4. 字符集问题

**错误信息：** 中文乱码

**解决方案：**
- 确保 `RDS_CHARSET=utf8mb4`
- 数据库和表使用 `utf8mb4` 字符集
- 连接字符串包含 `charset=utf8mb4`

---

## 📁 相关文件

| 文件 | 说明 |
|------|------|
| `.env` | 环境变量配置 |
| `.env.example` | 环境变量模板 |
| `server/config/database.js` | 数据库配置模块 |
| `server/config/db-manager.js` | 数据库连接管理器 |
| `database/init.sql` | 数据库初始化脚本 |

---

## 🔗 参考链接

- [阿里云 RDS MySQL 文档](https://help.aliyun.com/product/29346.html)
- [RDS 白名单设置](https://help.aliyun.com/document_detail/51933.html)
- [RDS SSL 加密连接](https://help.aliyun.com/document_detail/51934.html)
- [mysql2 文档](https://github.com/sidorares/node-mysql2)

---

**最后更新:** 2026-03-08
