# 数据模型与审核约定（V1.6）

## 1. 核心共享化学数据库（统一生成源）
- `src/data/substances.json`：**129** 项收集项（原 72 项 ID 完整保留 + `kb_` 前缀扩展项），含 `chemicalEntityId`、`elementComposition`、`charge`、`modelKind`、`quantitativeResearchEligible` 与来源链接；均保持 `reviewStatus: "pending"`。
- `src/data/reactions.json`：**134** 条规则（原 100 项 ID 完整保留 + `github_` 前缀扩展项），其中 **126** 条适用定量计量（122 条化学计量 + 4 条独立相变 `phase_change`），**8** 条混合物/材料加工规则明确标记 `stoichiometrySupported: false`；均保持 `pending`。
- `src/data/challenges.json`：**36** 道简单模式挑战；`src/data/quantitativeChallenges.json`：**36** 道进阶定量挑战。
- 本地知识库：`elements.json`（118 元素）、`knowledgeSubstances.json`（532 物质资料）、`knowledgeTransformations.json`（435 转化事实）与 `learningTracks.ts`（24 学习任务 / 4 扩展路线），离线本地运行。

## 2. V1.6 新增结构化数据目录（均经 `v16Schema.ts` 校验）

| 文件 | 条目数 | 核心字段与约束 |
|---|---|---|
| `src/data/economy.json` | 1 份配置 | 初始资源、7 级累计经验表（`researchLevels`）、各事件奖励表、原料采购/回收价目表（引用 `substances.json` 真实 ID） |
| `src/data/laboratories.json` | 5 级（3 可玩 + 2 预告） | Lv.1–Lv.3 升级门槛、设备槽位、单次批量上限、活跃订单槽位；Lv.4/Lv.5 标记 `lockedPreview: true` |
| `src/data/equipment.json` | 9 台（8 功能 + 1 预告） | 经营模式条件解锁（`unlockedConditions`）、前置科技/实验室等级、升级成本系数、2D 等距台坐标与 `energyUsagePreviewWatts` |
| `src/data/technologies.json` | 24 项（6 分支） | 严格无环 DAG（`validateTechDAG` 零环、100% 从 Lv.1 可达），消耗 RP/金币解锁设备、区域与实验室升级前置 |
| `src/data/orders.json` | 30 项 | 分 T1–T3 档位，包含合成、精密配比、零浪费、发现研究与设备演示类订单，引用真实物质与反应 ID |
| `src/data/regions.json` | 6 区域（3 可玩 + 3 预告） | 原始森林（含永久免费采集点）、矿石山脉、海洋与盐湖 + 3 锁定预告区；含 2D 地图坐标、采集点与区域任务 |
| `src/data/explorationEvents.json` | 12 条事件 | 按区域加权抽取的野外奇遇（仅影响额外材料/RP/经验奖励，不影响化学规则） |
| `src/data/historicalFigures.json` | 13 位人物/团队 | 覆盖 10 章时间线核心科学家与合作者，含 `collaborationNote` 多贡献者注记与权威链接，全部标注 `reviewStatus: "pending"` |
| `src/data/historyChapters.json` | 10 章（5 可玩 + 5 预告） | 对齐 `HISTORY_MODE_BRIEF.md`（01 氧气、02 质量守恒、03 水的身份、04 伏打电堆、05 尿素预告、06 电解定律预告、07 周期表、08 钋与镭预告、09 核模型预告、10 合成氨预告），含 5 阶段数据、简/进任务、手稿/理论/勋章奖励与有限复玩上限 `maxRepeatRewardClaims`，全部标注 `pending` |
| `src/data/museumCollections.json` | 16 件藏品 | 显式事件驱动 `unlockRule`（历史章节、物质发现、反应完成、实验室等级、区域、特殊挑战等） |
| `src/data/specialChallenges.json` | 15 关（5 类 × 3） | 极限实验、最短路径、零浪费、未知物质鉴定、逆向推理，全部经 `verifySpecialChallenge()` 自动回放验证可解 |

## 3. 存档模型与显式版本迁移（v3）

- `Save.version` 维持 **`3`**（定义于 `src/schemas/saveSchema.ts`），对 v1/v2 与既有 v3 存档保持 100% 向前兼容：新增可选字段 `activeHistoryChapterId` 及 `historyProgress[id]` 内的 `session`（可恢复五阶段与谜题状态）、`difficultyRecords`、`repeatRewardsClaimed`、`unlockedArchiveRewards`，旧存档加载自动默认补齐且不丢数据。
- `migrateSave()` 显式支持 **`v1 → v2 → v3`** 与 **`v2 → v3`** 无损迁移，且在迁移时为既有 `discovered`、`completed`、挑战与配平记录预置 `claimedRewardIds`，确保**绝不重放历史首发现奖励**；严格拒绝 `version >= 4` 或未知格式。
