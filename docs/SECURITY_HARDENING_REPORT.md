# 凭证安全加固报告

## 执行时间
2026-03-01

## 涉及项目
- hxfund (黄氏家族寻根平台)
- anime-blog (Hexo 博客)

---

## 已修复的敏感信息泄露

### 1. anime-blog/.env

**问题**: 包含明文 FTP 密码和 ECS 配置

**修复前**:
```
FTP_PASSWORD=Qq803200
ECS_SSH_KEY=your_ssh_private_key
ECS_HOST=120.25.77.136
```

**修复后**:
```
FTP_PASSWORD=${FTP_PASSWORD}
ECS_SSH_KEY=${ECS_SSH_KEY}
ECS_HOST=${ECS_HOST}
```

### 2. hxfund/server/config/auth.json

**问题**: 包含明文 API Key 和 JWT Secret

**修复前**:
```json
{
  "serverApiKey": "hs_dev_api_key_2026",
  "jwtSecret": "huangshi_genealogy_platform_jwt_secret_key_2026_secure"
}
```

**修复后**:
```json
{
  "serverApiKey": "${SERVER_API_KEY}",
  "jwtSecret": "${JWT_SECRET}"
}
```

### 3. hxfund/server/config/.env.example

**问题**: 包含示例生产环境配置

**修复后**: 更新为通用示例，使用占位符

---

## .gitignore 更新

### hxfund/.gitignore
```
# 已确保以下文件被忽略
server/config/auth.json
server/config/.env
server/config/ssl_private.key
```

### anime-blog/.gitignore
```
# 已确保以下文件被忽略
.env
.env.*
_config.deploy.yml
```

---

## 需要配置的 GitHub Secrets

### 前端部署 (FTP)
| Secret Name | Value | 用途 |
|-------------|-------|------|
| `FTP_HOST` | `qxu1606470020.my3w.com` | 虚拟主机 FTP 地址 |
| `FTP_USER` | `qxu1606470020` | FTP 用户名 |
| `FTP_PASS` | `Qq803200` | FTP 密码 |
| `FTP_PORT` | `21` | FTP 端口 |

### 后端部署 (ECS)
| Secret Name | Value | 用途 |
|-------------|-------|------|
| `ECS_HOST` | `120.25.77.136` 或 `api.hxfund.cn` | ECS 服务器 |
| `ECS_USER` | `root` | SSH 用户名 |
| `ECS_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | SSH 私钥 |

### API 认证
| Secret Name | 用途 |
|-------------|------|
| `SERVER_API_KEY` | 服务器 API 密钥 |
| `JWT_SECRET` | JWT 签名密钥 |

---

## 本地开发环境配置

### 步骤 1: 复制示例文件
```bash
# hxfund 项目
cd /root/hxfund
cp server/config/.env.example server/config/.env

# anime-blog 项目
cd /root/anime-blog
cp .env.example .env
```

### 步骤 2: 编辑本地 .env 文件
```bash
# 编辑本地配置（仅用于开发，不提交到 Git）
vim server/config/.env
```

### 步骤 3: 生成安全的密钥
```bash
# 生成 JWT Secret (64 字符随机字符串)
openssl rand -hex 32

# 生成 API Key
openssl rand -hex 16
```

---

## 安全检查清单

- [x] 移除 .env 中的明文密码
- [x] 移除 auth.json 中的明文密钥
- [x] 确认 .gitignore 配置正确
- [x] 更新 .env.example 使用占位符
- [ ] 在 GitHub 配置 Secrets
- [ ] 轮换已泄露的密码和密钥

---

## 建议的安全改进

### 1. 立即执行
- [ ] 更改 FTP 密码（因为已在 Git 历史中）
- [ ] 更改 JWT Secret
- [ ] 更改 API Key
- [ ] 轮换 SSH 密钥

### 2. 短期改进
- [ ] 启用 GitHub 2FA
- [ ] 配置 SSH 密钥 passphrase
- [ ] 使用 encrypted secrets 管理工具

### 3. 长期改进
- [ ] 实施密钥轮换策略
- [ ] 使用 Vault 或类似工具管理密钥
- [ ] 实施密钥审计日志

---

## Git 历史清理（可选）

如果需要彻底清除 Git 历史中的敏感信息：

```bash
# 使用 BFG Repo-Cleaner
bfg --delete-files .env
bfg --replace-text passwords.txt

# 或使用 git-filter-repo
git filter-repo --path .env --invert-paths

# 强制推送（危险操作，需要团队协调）
git push --force origin main
```

**注意**: 强制推送会重写 Git 历史，需要谨慎操作。

---

## 验证步骤

```bash
# 检查是否有敏感文件被跟踪
git ls-files | grep -E '\.(env|key|pem|crt)$'

# 检查 Git 历史中的敏感文件
git log --all --full-history -- '*.env'
git log --all --full-history -- 'auth.json'

# 扫描可能的密钥泄露
git log -p | grep -E '(password|secret|api_key)\s*[=:]\s*["\']?[A-Za-z0-9]+'
```

---

**状态**: ✅ 凭证已加固
**下一步**: 配置 GitHub Secrets 并轮换已泄露的凭证
