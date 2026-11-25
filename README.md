# 物质纪元 · Matter Age

**直接试玩：[打开物质纪元](https://wyc225225-dot.github.io/matter-age/)** · 无需安装或注册，进度保存在各自浏览器。
（V1.6 开发预览）

移动优先、本地离线运行的化学探索、定量化学与科学策略模拟游戏，基于 React + TypeScript + Vite + Tailwind + Zustand + Dexie + Zod 构建。数据、纯引擎、状态存储、存档迁移与界面严格分层解耦。

> 当前交付为 **V1.6 可玩开发预览**（完整保留 V1.0 简单探索、V1.5 进阶定量化学、GitHub 本地化学知识库，并全面实装 V1.6 实验室经营、科技研究树、挑战历史、科学博物馆、世界探索、15 道特殊挑战与大厅/导航视觉改造）。全部 129 项物质、134 条规则、8 位科学史人物与 10 个历史章节均如实保留 `reviewStatus: "pending"`，绝不伪造人工审核。

## 快速启动

需要 Node.js 22.12+（当前验证环境为 Node 26.13），无需后端服务器、用户账号或外部 API：

```powershell
cd G:\化学小游戏
npm ci
npm run dev
```

## 核心玩法与路由入口

| 玩法 / 档案 | 路由 | 说明 |
|---|---|---|
| 探索大厅（游戏主大厅） | `#home` | 实时研究者等级/金币/RP/馆藏状态栏、6 大玩法入口（含 V1.7 工业文明锁定）、存档驱动的实时任务板与难度模型切换 |
| 自由探索实验室 | `#lab` | 无限探索实验台、全部 10 条件开放、简单模式 + 进阶定量模式（1–99 整数份数、守恒校验、2D 原子/公式单位视图、方程式配平） |
| 实验室经营中心 | `#management` | 2D 等距 SVG 实验台（Lv.1→Lv.3 视觉成长）、有限库存制备（复用共享反应/计量引擎）、30 项研究订单、8 台功能设备工坊与原料市场 |
| 科技研究树（独立于发现网络） | `#tech` | 6 大分支 24 项无环 DAG 科技，消耗 RP/金币解锁设备、区域与实验室升级资格 |
| 世界探索地图 | `#world` | 2D 交互式区域地图（原始森林含永久免费采集点防死锁、矿石山脉、海洋与盐湖 + 3 个后续预告区域）、区域任务与野外奇遇 |
| 挑战历史 | `#history` | 10 章科学史时间线，第 01/02/03/04/07 章可玩（5 种独立互动谜题、5 阶段状态机、简/进双难度、多贡献者史料与 `pending` 标注） |
| 目标挑战（87 关） | `#challenge` | 36 简单探索关 + 36 进阶定量关 + 15 道 V1.6 特殊挑战（极限实验、最短路径、零浪费、未知物质鉴定、逆向推理） |
| 物质图鉴与本地知识库 | `#book` | 129 游戏物质（Lv.1/Lv.2 研究等级）+ 本地 118 元素 / 532 物质资料 / 435 转化路径 / 24 学习任务 |
| 科学发现网络 | `#tree` | React Flow 拓扑发现图谱（独立于科技树）、催化剂虚线边、同化学实体关联与反应节点研究详情 |
| 科学博物馆 | `#museum` | 16 件事件驱动馆藏（暗展厅聚光灯 2D 展柜、收藏时间与科学档案） |
| 科技演进 / 成就 / 设置 | `#eras` `#achievements` `#settings` | 4 大化学文明时代 + 4 条扩展路线、34 项科学成就（幂等领奖）、v3 自动存档与 v1/v2 无损迁移 |

## 常用开发与验证命令

```powershell
npx tsx scripts/generate-data.ts   # 生成核心物质/规则/挑战 JSON（保留 scripts/data/github-expansion.ts）与 PNG PWA 图标
npm run validate                   # 校验全部数据 Schema、守恒、可达性、87 关挑战、24 项科技 DAG 及 Lv.1→Lv.3 闭环模拟
npm run validate:release           # 正式发布门禁（因存在 pending 内容，预期拒绝退出码 1）
npm test                           # Vitest 单元测试（216 项）
npm run build                      # TypeScript 严格检查 + Vite 生产构建 + Workbox PWA 预缓存
npm run test:e2e                   # 构建并执行 Playwright 端到端测试（10 组，含离线 PWA 与 360/390/768/1440px 响应式）
npm run format:check               # Prettier 代码格式检查
```

## 文档导航

- 进度与测试：[PROGRESS.md](docs/PROGRESS.md) · [TEST_REPORT.md](docs/TEST_REPORT.md) · [V1.6 交付报告](docs/AGY_V16_RESULT.md)
- 系统设计：[GAME_DESIGN.md](docs/GAME_DESIGN.md) · [ECONOMY_BALANCE.md](docs/ECONOMY_BALANCE.md) · [HISTORY_CONTENT.md](docs/HISTORY_CONTENT.md)
- 架构与数据：[ARCHITECTURE.md](docs/ARCHITECTURE.md) · [DATA_SCHEMA.md](docs/DATA_SCHEMA.md) · [CONTENT_EXPANSION.md](docs/CONTENT_EXPANSION.md) · [ROADMAP.md](docs/ROADMAP.md) · [CHEMISTRY_REVIEW.md](docs/CHEMISTRY_REVIEW.md)

