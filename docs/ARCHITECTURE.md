# 技术架构（V1.6）

数据层：共享确定性 JSON 数据库（核心化学目录 + 本地知识库 + V1.6 经营/科技/历史/探索/博物馆/特殊挑战目录） → 独立纯 TypeScript 引擎层（`src/engine/`，零 React/DOM/存档依赖） → Zustand 原子状态层（`src/stores/game.ts`） → React 视觉场景与交互页面。Dexie 单行快照提供 IndexedDB 持久化，异步串行写入队列保证顺序。加载与导入均经 `migrateSave()` 执行显式版本边界迁移（`v1 → v2 → v3`、`v2 → v3`），再经 Zod 与引用完整性校验。

## 目录职责边界

| 目录 | 职责 |
|---|---|
| `src/config` | 难度模式定义（简单 / 进阶 / 困难锁定）、份数上下限（1–99）与理论质量基准常量 |
| `src/types` | 核心化学、计量、知识库、V1.6 经营/科技/探索/历史/博物馆/特殊挑战、预留 V1.7/V2.0 能源自动化接口与 Save v3 类型 |
| `src/schemas` | `contentSchema.ts`、`v16Schema.ts` 与 `saveSchema.ts`（`v1` / `v2` / `v3`）严格 Zod 校验 |
| `src/data` | 129 物质、134 规则、36 简单挑战、36 定量挑战、本地知识库（118/532/435/24）以及 11 份 V1.6 静态 JSON（经济、实验室、8+1 设备、24 科技、30 订单、6 区域、12 奇遇事件、8 科学史人物、10 历史章节、16 博物馆藏品、15 特殊挑战） |
| `src/engine` | 纯函数引擎：`reactionEngine`、`stoichiometry`、`balancingEngine`、`challengeEngine`、`quantitativeChallengeEngine`、`hintEngine`、`progressionEngine`、`economyEngine`、`technologyEngine`、`laboratoryEngine`、`orderEngine`、`explorationEngine`、`historyEngine`、`museumEngine`、`specialChallengeEngine`、`achievementEngine` |
| `src/stores` | Zustand 单一状态树：整合自由探索、挑战隔离、V1.6 原子经营交易、自动成就与博物馆事件同步、幂等领奖与持久化 |
| `src/database` | Dexie IndexedDB 存取、`v1 → v2 → v3` / `v2 → v3` 显式迁移（预置历史 `claimedRewardIds` 防止奖励重放）、引用校验 |
| `src/components` | 化学式排版 `fmt`、物质 SVG 图标、Canvas 反应动画、2D 原子/公式单位模型、方程式配平室、2D 等距 SVG 实验台（`IsometricLabBench`）、特殊挑战执行器（`SpecialChallengeRunner`）、知识库组件 |
| `src/pages` | 大厅（`Home`）、自由探索（`Laboratory`）、实验室经营（`Management`）、科技树（`Technology`）、世界探索（`WorldMap`）、挑战历史（`History`）、科学博物馆（`Museum`）、目标挑战（`Challenges`）、物质图鉴（`Encyclopedia`）、发现网络（`DiscoveryTree`）、时代、成就、设置 |
| `scripts` | `generate-data.ts`（保留 `scripts/data/github-expansion.ts`）与全量数据/DAG/可解性/闭环模拟器 `validate-data.ts` |

## 引擎复用与隔离边界

1. **单一化学引擎**：自由探索、定量挑战、实验室经营生产（`executeManagementProduction`）、挑战历史第 3 章配平（`evaluateWaterComposition`）与 15 道特殊挑战（`specialChallengeEngine`）全部直接调用 `src/engine/reactionEngine.ts`、`stoichiometry.ts` 与 `balancingEngine.ts`，不维护第二套规则。
2. **四套库存隔离**：自由探索解锁集（`discovered`）、挑战临时库存、经营有限非负库存（`managementInventory`）与挑战历史章节独立材料严格分离。
3. **科技树与发现网络分离**：`#tech`（24 节点 DAG，解锁设备/区域/实验室等级）与 `#tree`（React Flow 物质-反应拓扑图谱）数据与路由完全独立。
4. **随机性边界**：随机权重抽取仅用于世界探索的野外奇遇奖励（`pickWeightedEvent`），绝不干扰任何确定性化学反应或计量结果。
5. **PWA 离线**：Vite 生产构建通过 `vite-plugin-pwa` + Workbox 预缓存全部 22 项静态资产与多尺寸 PNG 图标，支持断网刷新与完整本地运行。
