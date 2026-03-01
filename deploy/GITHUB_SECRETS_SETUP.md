# GitHub Secrets 配置指南

## 阿里云虚拟主机 FTP 配置

### 已知信息
| 项目 | 值 |
|------|------|
| FTP 主机 | `qxu1606470020.my3w.com` |
| FTP 用户名 | `qxu1606470020` |
| FTP 密码 | `Qq803200` |
| FTP 端口 | `21` (默认) |
| 部署目录 | `/htdocs/` (主站) |
| 博客目录 | `/htdocs/blog/` (子目录) |

### 配置步骤

1. **进入 GitHub 仓库**
   - 打开 https://github.com/jickylive/hxfund/settings/secrets/actions

2. **添加 Repository Secrets**

   依次添加以下 secrets：

   | Secret Name | Value |
   |-------------|-------|
   | `FTP_HOST` | `qxu1606470020.my3w.com` |
   | `FTP_USER` | `qxu1606470020` |
   | `FTP_PASS` | `Qq803200` |
   | `FTP_PORT` | `21` |
   | `FRONTEND_DOMAIN` | `www.hxfund.cn` |

3. **添加 Variables (可选)**

   | Variable Name | Value |
   |---------------|-------|
   | `FRONTEND_URL` | `https://www.hxfund.cn` |

---

## 阿里云 ECS 配置（后端部署）

### 需要的信息
| Secret Name | 说明 | 示例 |
|-------------|------|------|
| `ECS_HOST` | ECS 服务器 IP 或域名 | `api.hxfund.cn` 或 `123.45.67.89` |
| `ECS_USER` | SSH 用户名 | `root` |
| `ECS_SSH_KEY` | SSH 私钥内容 | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `API_DOMAIN` | API 域名 | `api.hxfund.cn` |
| `PORT` | 服务端口 | `3000` |

### 配置步骤

1. **获取 SSH 私钥**
   ```bash
   # 在本地查看 SSH 私钥
   cat ~/.ssh/id_rsa
   ```

2. **添加 SSH Key 到 Secrets**
   - Name: `ECS_SSH_KEY`
   - Value: 粘贴完整的私钥内容（包括 BEGIN/END 行）

---

## 验证配置

### 前端部署测试
```bash
# 在 GitHub Actions 中手动触发部署
# 访问：https://github.com/jickylive/hxfund/actions/workflows/deploy-frontend-aliyun.yml
# 点击 "Run workflow" 按钮
```

### 后端部署测试
```bash
# 访问：https://github.com/jickylive/hxfund/actions/workflows/deploy-backend-ecs.yml
# 点击 "Run workflow" 按钮
```

### 完整部署测试
```bash
# 访问：https://github.com/jickylive/hxfund/actions/workflows/deploy-full-stack.yml
# 点击 "Run workflow" 按钮
```

---

## 本地 FTP 测试

### 使用命令行测试 FTP 连接
```bash
# 安装 lftp
sudo apt-get install lftp  # Ubuntu/Debian
sudo yum install lftp      # CentOS/Alibaba Cloud Linux

# 连接测试
lftp -u qxu1606470020,Qq803200 qxu1606470020.my3w.com

# 连接后执行命令
lftp -e "ls; quit" -u qxu1606470020,Qq803200 qxu1606470020.my3w.com
```

### 使用部署脚本
```bash
cd /root/hxfund
./deploy/deploy-ssl-cert.sh
```

---

## 安全建议

1. **不要在代码中硬编码密码**
   - 所有敏感信息都应使用 GitHub Secrets

2. **定期更新密码**
   - 建议每 3-6 个月更新一次 FTP 密码

3. **限制 Secrets 访问权限**
   - 只有仓库管理员可以查看和管理 Secrets

4. **使用 SSH 密钥代替密码（ECS）**
   - SSH 密钥比密码更安全
   - 可以设置密钥 passphrase 增加安全性

---

## 故障排除

### FTP 连接失败
1. 检查 FTP 主机名是否正确
2. 检查 FTP 用户名和密码
3. 确认 FTP 端口是 21
4. 检查防火墙设置

### 部署后网站无法访问
1. 确认部署目录是 `/htdocs/`
2. 检查 `index.html` 是否在正确位置
3. 检查文件权限设置

### GitHub Actions 失败
1. 查看 Actions 日志了解详细错误
2. 确认所有 Secrets 已正确配置
3. 检查 workflow 文件语法

---

**更新时间**: 2026-03-01
**仓库**: https://github.com/jickylive/hxfund
