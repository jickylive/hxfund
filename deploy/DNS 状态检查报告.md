# 🌐 DNS 状态检查报告

**检查时间:** 2026-03-01
**检查工具:** dig

---

## 📊 DNS 解析状态

| 域名 | 记录类型 | 当前解析值 | 预期值 | 状态 |
|------|----------|------------|--------|------|
| `hxfund.cn` | A | 121.42.118.49 | 虚拟主机 IP | ✅ 正常 |
| `www.hxfund.cn` | CNAME | kunlunaq.com | 虚拟主机 CDN | ✅ 正常 |
| `api.hxfund.cn` | A | 104.21.33.68<br>172.67.159.135 | 120.25.77.136 (ECS) | ⚠️ **Cloudflare 代理** |

---

## 🔍 详细分析

### 1. 主域名 (hxfund.cn)

```bash
$ dig hxfund.cn +short
121.42.118.49
```

**状态:** ✅ 正常  
**说明:** 解析到阿里云虚拟主机

### 2. WWW 域名 (www.hxfund.cn)

```bash
$ dig www.hxfund.cn +short
www.hxfund.cn.w.kunlunaq.com
```

**状态:** ✅ 正常  
**说明:** 通过阿里云 CDN (kunlunaq.com) 加速

### 3. API 域名 (api.hxfund.cn)

```bash
$ dig api.hxfund.cn +short
104.21.33.68
172.67.159.135
```

**状态:** ⚠️ **需要注意**  
**说明:** 当前通过 Cloudflare 代理，而非直接指向 ECS

---

## ⚠️ API 域名配置问题

### 当前情况

- **api.hxfund.cn** 当前使用 Cloudflare CDN 服务
- IP 地址 `104.21.33.68` 和 `172.67.159.135` 属于 Cloudflare
- ECS 实际 IP `120.25.77.136` 未直接使用

### 可能的原因

1. **Cloudflare 代理模式:** 域名通过 Cloudflare 代理，隐藏真实 IP
2. **DNS 未更新:** DNS 记录未更新到 ECS IP
3. **历史配置:** 之前配置的 Cloudflare 未清理

### 建议操作

#### 方案一：保持 Cloudflare 代理（推荐用于海外访问）

如果当前 Cloudflare 配置正常工作，可以保持现状：

1. 确保 Cloudflare SSL/TLS 设置为 **Full** 或 **Full (Strict)**
2. 在 Cloudflare 后台配置回源规则到 ECS IP `120.25.77.136`
3. 确保 ECS 防火墙允许 Cloudflare IP 段访问

**Cloudflare IP 段:** https://www.cloudflare.com/ips/

#### 方案二：直接指向 ECS（推荐用于国内访问）

修改 DNS 记录，直接指向 ECS：

```
主机记录：api
记录类型：A
记录值：120.25.77.136
TTL: 10 分钟
```

**优点:**
- 降低延迟（无 CDN 中转）
- 简化配置

**缺点:**
- 暴露 ECS 真实 IP
- 需自行处理 DDoS 防护

---

## ✅ 验证步骤

### 1. 验证主站访问

```bash
curl -I https://www.hxfund.cn/
```

### 2. 验证博客访问

```bash
curl -I https://www.hxfund.cn/blog/
```

### 3. 验证 API 访问

```bash
curl -I https://api.hxfund.cn/api/health
```

### 4. 验证 Waline API

```bash
curl -I https://api.hxfund.cn/api/waline/health
```

---

## 🔧 修改 DNS（阿里云控制台）

### 步骤

1. 登录阿里云控制台
2. 进入 **云解析 DNS**
3. 选择 `hxfund.cn` 域名
4. 修改/添加记录：

#### 修改 api 记录

```
主机记录：api
记录类型：A
记录值：120.25.77.136
TTL: 10 分钟
```

### DNS 传播时间

- **预计时间:** 10 分钟 - 24 小时
- **TTL 影响:** TTL 值越小，传播越快

---

## 📋 完整 DNS 配置建议

### 推荐配置（国内 + 海外优化）

| 主机记录 | 类型 | 记录值 | 说明 |
|----------|------|--------|------|
| `@` | A | 121.42.118.49 | 主域名 → 虚拟主机 |
| `www` | CNAME | hxfund.cn | www → 主域名 |
| `api` | A | 120.25.77.136 | API → ECS（国内直连） |
| `blog` | CNAME | www.hxfund.cn | 博客子域（可选） |

### 使用 Cloudflare 的配置

| 主机记录 | 类型 | 记录值 | Cloudflare 代理 |
|----------|------|--------|----------------|
| `@` | A | 121.42.118.49 | 🟠 Proxied |
| `www` | CNAME | hxfund.cn | 🟠 Proxied |
| `api` | A | 120.25.77.136 | 🟠 Proxied |

**Cloudflare 设置:**
- SSL/TLS: **Full (Strict)**
- Always Use HTTPS: **On**
- Auto Minify: **Enabled**

---

## 🔗 相关文档

- [DNS 配置指南.md](../deploy/DNS 配置指南.md)
- [INTEGRATION_PLAN.md](./docs/INTEGRATION_PLAN.md)
- [deploy/README.md](../deploy/README.md)

---

**最后更新:** 2026-03-01  
**下次检查:** 部署后验证 DNS 解析
