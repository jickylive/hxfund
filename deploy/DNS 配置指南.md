# 🌐 DNS 配置指南

**域名:** hxfund.cn
**更新时间:** 2026-03-01

---

## 📊 推荐 DNS 配置

### 阿里云 DNS 控制台

访问：https://dns.console.aliyun.com/#/dns/domainList

### 记录配置

| 主机记录 | 记录类型 | 记录值 | TTL | 说明 |
|----------|----------|--------|-----|------|
| `@` | A | 虚拟主机 IP | 10 分钟 | 主域名 → 虚拟主机 |
| `www` | CNAME | `hxfund.cn` | 10 分钟 | www → 主域名 |
| `api` | A | 120.25.77.136 | 10 分钟 | API 服务 → ECS |
| `blog` | CNAME | `www.hxfund.cn` | 10 分钟 | 博客子域（可选） |

---

## 🔧 配置步骤

### 1. 登录阿里云控制台

1. 访问 https://www.aliyun.com
2. 登录账号
3. 进入 控制台 > 域名与网站 > 云解析 DNS

### 2. 添加/修改 DNS 记录

#### 主域名记录（@）

```
主机记录：@
记录类型：A
记录值：[虚拟主机 IP 地址]
TTL: 10 分钟
```

#### WWW 记录

```
主机记录：www
记录类型：CNAME
记录值：hxfund.cn
TTL: 10 分钟
```

#### API 记录

```
主机记录：api
记录类型：A
记录值：120.25.77.136
TTL: 10 分钟
```

#### 博客子域（可选）

```
主机记录：blog
记录类型：CNAME
记录值：www.hxfund.cn
TTL: 10 分钟
```

---

## ✅ 验证 DNS 配置

### 使用 dig 命令

```bash
# 验证主域名
dig hxfund.cn

# 验证 www
dig www.hxfund.cn

# 验证 API
dig api.hxfund.cn
```

### 使用 nslookup

```bash
nslookup hxfund.cn
nslookup www.hxfund.cn
nslookup api.hxfund.cn
```

### 在线工具

- [站长工具 DNS 查询](http://tool.chinaz.com/dns/)
- [DNS Propagation Check](https://www.whatsmydns.net/)

---

## 🔄 DNS 传播时间

| 记录类型 | 预计传播时间 |
|----------|--------------|
| 新增记录 | 10 分钟 - 24 小时 |
| 修改记录 | 10 分钟 - 48 小时 |
| 删除记录 | 10 分钟 - 24 小时 |

**提示:** TTL 值越小，传播速度越快。修改前可将 TTL 设为 10 分钟。

---

## 🚨 常见问题

### 1. DNS 不生效

**原因:**
- DNS 缓存未刷新
- 本地 hosts 文件影响
- 运营商 DNS 缓存

**解决方法:**
```bash
# Windows 刷新 DNS
ipconfig /flushdns

# macOS 刷新 DNS
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Linux 刷新 DNS（根据发行版）
sudo systemctl restart nscd
```

### 2. 域名冲突

确保没有重复的 DNS 记录：
```bash
# 检查所有记录
dig hxfund.cn ANY
```

### 3. HTTPS 证书问题

DNS 修改后，HTTPS 证书可能需要重新验证。

---

## 📋 完整访问路径

### 用户访问流程

```
用户输入
   ↓
┌─────────────────┐
│ www.hxfund.cn   │ ──→ 虚拟主机 /htdocs/
└─────────────────┘
   ↓
┌─────────────────┐
│ /blog/          │ ──→ 虚拟主机 /htdocs/blog/
└─────────────────┘
   ↓
┌─────────────────┐
│ API 调用        │ ──→ api.hxfund.cn → ECS
└─────────────────┘
```

### 域名对应关系

| URL | 物理路径 | 服务器 |
|-----|----------|--------|
| https://www.hxfund.cn/ | /htdocs/ | 虚拟主机 |
| https://www.hxfund.cn/blog/ | /htdocs/blog/ | 虚拟主机 |
| https://api.hxfund.cn/ | /root/hxfund/ | ECS |

---

## 🔗 相关文档

- `./docs/INTEGRATION_PLAN.md` - 项目整合方案
- `../deploy/阿里云部署指南.md` - 部署指南
- `../.github/workflows/deploy-integration.yml` - 部署工作流

---

**配置完成后请验证所有域名访问正常！** ✅
