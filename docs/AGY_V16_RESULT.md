# Matter Age V1.6 增量开发与 UI 重构交付报告（AGY_V16_RESULT）

完成时间：2026-11-25  
工程目录：`G:\化学小游戏`

---

## 1. 交付概览

在完整保留 V1.0 简单探索、V1.5 进阶定量化学与本地 GitHub 化学知识库（129 物质 / 134 规则 / 36 简单挑战 / 36 定量挑战 / 118 元素 / 532 物质资料 / 435 转化事实 / 24 学习任务）的基础上，完成了 **V1.6 全量 P0 / P1 / P2 玩法系统、存档 v3 显式迁移、专业科学策略 UI 与导航入口重构**。

- 所有化学与科学史内容均如实保留 `reviewStatus: "pending"`，未伪造人工科学审核，也未引入阻断本地预览游玩的多余审核弹窗；`npm run validate:release` 继续严格拦截未审核发布。
- 所有核心计算逻辑完全位于纯 TypeScript 引擎层（`src/engine/`，零 React/DOM/存档依赖），且经营生产、挑战历史配平与特殊挑战 100% 复用共享化学反应与计量引擎。

---

## 2. 功能与路由入口映射表

| 模块 | 路由 | 关键源码与数据 | 核心特性 |
|---|---|---|---|
| 游戏主大厅 | `#home` | [Home.tsx](file:///G:/化学小游戏/src/pages/Home.tsx) | 研究者 7 级状态 HUD（累计 XP 与 RP 分离）、6 大玩法入口（含 V1.7 工业锁定）、真实存档驱动任务板、难度模型切换 |
| 自由探索实验室 | `#lab` | [Laboratory.tsx](file:///G:/化学小游戏/src/pages/Laboratory.tsx) | 保留全部 V1.0 简单与 V1.5 定量/配平功能，全部 10 条件开放，与经营有限库存严格隔离 |
| 实验室经营中心 | `#management` | [Management.tsx](file:///G:/化学小游戏/src/pages/Management.tsx)、[IsometricLabBench.tsx](file:///G:/化学小游戏/src/components/IsometricLabBench.tsx)、[laboratoryEngine.ts](file:///G:/化学小游戏/src/engine/laboratoryEngine.ts)、[orderEngine.ts](file:///G:/化学小游戏/src/engine/orderEngine.ts) | Lv.1–Lv.3 视觉成长 2D 等距 SVG 实验台、有限库存制备、30 项研究订单、8 台功能设备（+ 自动化预告）、原料采购与回收市场 |
| 科技研究树（独立） | `#tech` | [Technology.tsx](file:///G:/化学小游戏/src/pages/Technology.tsx)、[technologyEngine.ts](file:///G:/化学小游戏/src/engine/technologyEngine.ts)、[technologies.json](file:///G:/化学小游戏/src/data/technologies.json) | 6 分支 24 项无环 DAG 科技（独立于 `#tree` 发现网络），解锁设备、区域与实验室升级资格 |
| 世界探索地图 | `#world` | [WorldMap.tsx](file:///G:/化学小游戏/src/pages/WorldMap.tsx)、[explorationEngine.ts](file:///G:/化学小游戏/src/engine/explorationEngine.ts)、[regions.json](file:///G:/化学小游戏/src/data/regions.json) | 2D 交互式 SVG 区域地图（原始森林永久免费采集防死锁、矿石山脉、海洋盐湖 + 3 预告锁定区）、区域任务与 12 条野外奇遇事件 |
| 挑战历史 | `#history` | [History.tsx](file:///G:/化学小游戏/src/pages/History.tsx)、[historyEngine.ts](file:///G:/化学小游戏/src/engine/historyEngine.ts)、[historyChapters.json](file:///G:/化学小游戏/src/data/historyChapters.json)、[historicalFigures.json](file:///G:/化学小游戏/src/data/historicalFigures.json) | 10 章科学史时间线，第 01/02/03/04/07 章可玩（5 种独立谜题：气体鉴别、敞口/密闭称量对照、水组成与真实配平、伏打电堆叠层、周期表卡片与类铝预言），5 阶段状态机、简/进双难度、多贡献者档案与史实/教学示意边界说明 |
| 目标挑战（87 关） | `#challenge` | [Challenges.tsx](file:///G:/化学小游戏/src/pages/Challenges.tsx)、[SpecialChallengeRunner.tsx](file:///G:/化学小游戏/src/components/SpecialChallengeRunner.tsx)、[specialChallengeEngine.ts](file:///G:/化学小游戏/src/engine/specialChallengeEngine.ts) | 保留 36 简单 + 36 定量挑战，新增第 3 标签「特殊挑战（15 关）」覆盖极限实验、最短路径、零浪费、未知鉴定与逆向推理 |
| 科学博物馆 | `#museum` | [Museum.tsx](file:///G:/化学小游戏/src/pages/Museum.tsx)、[museumEngine.ts](file:///G:/化学小游戏/src/engine/museumEngine.ts)、[museumCollections.json](file:///G:/化学小游戏/src/data/museumCollections.json) | 暗展厅 2D 聚光灯展柜，16 件真实事件驱动藏品（收藏时间戳与科学意义档案） |
| 探索成就 | `#achievements` | [Achievements.tsx](file:///G:/化学小游戏/src/pages/Achievements.tsx)、[achievementEngine.ts](file:///G:/化学小游戏/src/engine/achievementEngine.ts) | 保留原 12 项 + 新增 22 项（共 34 项分类成就），支持幂等领取金币/RP/XP 奖励 |
| 存档与设置 | `#settings` | [SettingsPage.tsx](file:///G:/化学小游戏/src/pages/SettingsPage.tsx)、[database/index.ts](file:///G:/化学小游戏/src/database/index.ts)、[saveSchema.ts](file:///G:/化学小游戏/src/schemas/saveSchema.ts) | Save v3 自动保存、`v1 → v2 → v3` 与 `v2 → v3` 显式无损迁移（预置 `claimedRewardIds` 不重放历史奖励）、拒绝 `v4+` |

---

## 3. 视觉截图验收（`output/playwright/v16/`）

全部关键界面均经 Playwright 实机渲染截图并人工逐张核验布局与无横向溢出：

- 桌面大厅（1440px）：[desktop-lobby.png](file:///G:/化学小游戏/output/playwright/v16/desktop-lobby.png)
- 实验室经营与 2D 等距实验台（1440px）：[desktop-management.png](file:///G:/化学小游戏/output/playwright/v16/desktop-management.png)
- 科技研究树 6 分支 DAG（1440px）：[desktop-tech.png](file:///G:/化学小游戏/output/playwright/v16/desktop-tech.png)
- 世界探索 2D 区域地图（1440px）：[desktop-world.png](file:///G:/化学小游戏/output/playwright/v16/desktop-world.png)
- 挑战历史 10 章时间线（1440px）：[desktop-history.png](file:///G:/化学小游戏/output/playwright/v16/desktop-history.png)
- 挑战历史第 4 章伏打电堆互动谜题（1440px）：[desktop-history-voltaic.png](file:///G:/化学小游戏/output/playwright/v16/desktop-history-voltaic.png)
- 科学博物馆暗展厅与点亮藏品（1440px）：[desktop-museum.png](file:///G:/化学小游戏/output/playwright/v16/desktop-museum.png)
- 平板大厅（768px）：[tablet-lobby.png](file:///G:/化学小游戏/output/playwright/v16/tablet-lobby.png)
- 移动端大厅 / 经营 / 世界地图（390px）：[mobile-lobby.png](file:///G:/化学小游戏/output/playwright/v16/mobile-lobby.png) · [mobile-management.png](file:///G:/化学小游戏/output/playwright/v16/mobile-management.png) · [mobile-world.png](file:///G:/化学小游戏/output/playwright/v16/mobile-world.png)

---

## 4. 新玩家推荐试玩路线（5 分钟闭环）

1. 打开 `#home` 查看 LV.1 科学学徒状态 HUD、6 入口与实时任务板。
2. 进入 `#world`（世界探索），在「原始森林」点击永久免费的「林间溪泉」采集 3 次，领取「林地基础取样」区域任务奖励。
3. 进入 `#management`（实验室经营），切至「有限库存制备」搜索 `生石灰与水` 生产 `×2`，切回「研究订单」交付「熟石灰建材试样」获得金币与 RP。
4. 进入 `#tech`（科技研究树）研究「基础热化学操作」，返回 `#management` 设备工坊建造「加热设备」，观察 2D 等距实验台亮起 `L1` 设备站。
5. 进入 `#history`（挑战历史）通关第 4 章「伏打电堆与电化学诞生」，再进入 `#museum`（科学博物馆）查看已点亮的「锌铜叠层伏打电堆」馆藏。
6. 进入 `#challenge` →「特殊挑战」体验「无色气体鉴别」或「零余料」推理关卡。

---

## 5. 全量验证结果与可达性证明

- `npm test`：**216 / 216** 单元测试全部通过（含 `tests/unit/v16.test.ts`）。
- `npm run validate`：**0 自动错误**；24 项科技树 DAG 无环且 100% 可达；15 道特殊挑战全自动回放可解；`simulateProgressionToLabLv3()` 从初始存档出发 **102 步零死锁稳定达成 Lv.3 高级定量实验中心**。
- `npm run validate:release`：**按预期拒绝（exit 1）**，确保未审核 `pending` 内容不会混入正式发布。
- `npm run build`：TypeScript 严格编译与 Vite + Workbox PWA 构建通过。
- `npm run test:e2e`：**10 / 10** Playwright 端到端测试全部通过（含生产离线 PWA 与 360/390/768/1440px 响应式）。
- `npm run format:check`：Prettier 检查全部通过。

---

## 6. 诚实说明的未完成边界

1. **人工科学 & 科学史审核**：全部 129 物质、134 规则、8 科学史人物与 10 历史章节仍保持 `pending`，需专业人员逐条复核后才能进入 `release` 正式发布通道。
2. **明确锁定预告内容**：工业文明（Lv.4/Lv.5 实验室、自动化反应单元、能源网、火山/工业遗址/未来科技城）、挑战历史第 05/06/08/09/10 章、困难模式均按 V1.6 边界保留为接口与清晰锁定预告。
3. **真机验收**：尚未在实体 iOS/Android 手机上实测触控拖放、屏幕阅读器与低端机长时帧率。
