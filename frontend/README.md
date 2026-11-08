# frontend/ —— 已冻结（FROZEN）

> **本目录已冻结，不再构建、不再部署。线上跑的是 `public/` 这一套。**
> 冻结日期：2026-11-08。冻结原因见下。

## 为什么冻结

- 线上实际运行的是 `public/`（`public/index.html` + `public/js/` + `public/css/`），
  由 `npm run build`（`scripts/build.js`）构建到 `dist/` 后部署。
- `frontend/src/` 是一套 Vite 前端（`frontend/src/main.js` 等），每次构建都会跑一遍，
  但产物 `frontend/dist/` 没人加载——`dist/index.html` 是 `scripts/build.js` 从
  `public/index.html` 生成的，不是 `frontend/dist/index.html`。
- 更糟的是，`scripts/build.js` 过去会把 `frontend/dist/` 整个拷进 `dist/`，
  导致 `frontend/dist/js/` 里 5 份带哈希的旧 `main.[hash].js` 死文件（每次构建
  产生一份新哈希，旧的从不清理）随部署一起上传，白白占空间。

## 冻结后是什么状态

- `npm run build` 不再构建 `frontend/src/`（`scripts/build.js` 的 `buildFrontend()`
  已删除），`package.json` 的 `build:frontend` 脚本也已删除。
- `frontend/src/` 目录本身保留（不删除，留给用户决定），但不要再往里面加功能、
  不要再指望它的产物上线。

## 例外：`scripts/build-all.js` 还在构建它

- `npm run build:all`（`scripts/build-all.js`，`scripts/deploy.sh` 在用）步骤 2–3
  仍会构建 `frontend/src/` 并把 `frontend/dist/` 拷进 `dist/`，因为它的 `dist/`
  布局依赖 `frontend/dist/index.html`。
- 这是已知的遗留问题：要彻底下线，需重构 `build-all.js` 的产物布局（改从
  `public/index.html` 生成 `dist/index.html`），改动较大，留待后续单独处理。
- 在那之前，**不要用 `npm run build:all` / `scripts/deploy.sh` 做日常部署**，
  日常部署走 `npm run build`（GitHub Actions 用的就是它）。

## 如果以后想恢复

- 恢复前先确认线上到底跑哪一套（目前是 `public/`），不要两套并行维护。
- 恢复步骤：恢复 `scripts/build.js` 的 `buildFrontend()`（git 历史可找回），
  恢复 `package.json` 的 `build:frontend`，并删掉本 README 的冻结声明。
