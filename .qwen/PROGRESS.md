# 项目进度记录

> 最后更新: 2026-03-08

## 项目概要

**黄氏家族寻根平台 (hxfund.cn)** — 前端 Vite + 后端 Express + AI 对话 (Qwen API) + 区块链存证 + Waline 评论

- 前端目录: `frontend/src/`
- 启动: `cd frontend/src && npm run dev` → http://localhost:3001
- 构建: `cd frontend/src && npm run build`

## 已完成工作

### 1. UI 全面扫描检查
检查了所有前端文件，输出见 [UI 扫描报告](#)。

### 2. 修复家谱树 section DOM 结构问题
- **问题**: `genealogy-tree.js` 的 `init()` 方法用 `innerHTML` 覆盖了整个 `#tree` section，导致 `section-header` 等静态 HTML 丢失
- **修复**: 改写 `init()` 为：
  - 保留 `this.container` 内容（`.container` 内的静态子元素）
  - 只在 `this.container` 内追加工具栏和 `#treeRoot` 容器
  - 获取数据后只操作 `#treeRoot`，不再覆盖父容器
- **文件**: `frontend/src/components/genealogy-tree.js`

### 3. 前端 UI 测试
- Vite 开发服务器正常启动: http://localhost:3001
- `#tree` section DOM 结构验证通过: container → section-header + tree-controls + treeRoot 层次保留
- JS 执行无报错, 导航/动画/AI 初始化均正常

## 前端文件结构

```
frontend/src/
├── index.html          # 主页面 (6个 section)
├── app.js              # 主入口
├── main.js             # 另一个入口
├── build.js            # 构建脚本
├── vite.config.js      # Vite 配置
├── css/
│   └── style.css       # 全局样式 (~3200行)
├── js/
│   └── ui-helper.js    # UI 工具函数
├── components/
│   ├── genealogy-tree.js  # 家谱树组件 (已修复)
│   ├── qwen-ai.js      # AI 对话组件
│   └── animations.js   # 动画效果
└── utils/
    └── tree-utils.js   # 家谱树工具函数
```

## index.html 的 6 个 section

| section ID | 内容 | 状态 |
|---|---|---|
| hero | 首页大屏 | ✅ |
| family-history | 家族历史 | ✅ |
| tree | 家谱世系树 | ✅ (已修复) |
| archives | 档案 | ✅ |
| family-map | 家族地图 | ✅ |
| qwen-ai | AI 对话 | ✅ |

## 已知事项
- `npm run dev` 在前端目录 `frontend/src/` 下执行
- 后端入口在项目根目录 `app.js`（Express）
- Qwen AI 有独立的 demo/test HTML 文件在 `frontend/src/` 下
- Vite 配置有 `base: './'` 和 `build.outDir` 在 `../../dist`