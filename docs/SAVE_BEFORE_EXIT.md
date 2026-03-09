# 黄氏家族寻根平台 - 退出 Qwen 前保存进展

每次准备结束 Qwen 会话前，请执行以下命令：

## 🚀 快速保存并推送

```bash
# 方法 1: 使用 npm 脚本（推荐）
npm run save

# 方法 2: 带自定义消息
npm run save -- --message="完成留言功能开发"

# 方法 3: 直接运行脚本
node scripts/save-progress.js

# 方法 4: 带消息
node scripts/save-progress.js --message="修复 API 连接问题"
```

## 📋 完整流程

```bash
# 1. 检查 Git 状态
git status

# 2. 提交所有未完成的工作
git add .
git commit -m "feat: 完成 XXX 功能"

# 3. 保存项目进展
npm run save

# 4. 推送到所有远程仓库
git push origin main
git push upstream main

# 5. 如果是博客子模块有更新
cd blog
git add .
git commit -m "feat: 博客更新"
git push origin main
git push upstream main
cd ..
git add blog
git commit -m "chore: 更新博客子模块"
git push origin main
git push upstream main
```

## 📝 进展记录内容

自动记录脚本会保存以下信息：

- ✅ 最后更新时间
- 📊 Git 变更文件列表
- 📝 最近提交记录
- 🔄 本次更新说明
- ⚠️ 待解决问题
- 📋 下一步计划

## 📁 相关文件

- `PROJECT_PROGRESS.md` - 项目进展主文件
- `scripts/save-progress.js` - 自动记录脚本
- `.qwen/QWEN.md` - Qwen 配置和记忆

## 💡 提示

1. **每次退出前执行** `npm run save` 确保进展不丢失
2. **推送所有变更** 到 GitCode 和 GitHub
3. **检查子模块** 博客目录的变更需要单独提交
4. **查看进展** 打开 `PROJECT_PROGRESS.md` 了解当前状态

---

**最后更新**: 2026-03-08  
**维护者**: Huangshi Genealogy Project
