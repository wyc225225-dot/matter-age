# Matter Age 开发约定

- 玩家网页不显示数据提供方、外部参考链接、仓库版本/commit、来源清单等溯源元数据；原始出处保留在数据与项目文档中供维护。保留科学解释、模拟边界和物质自然分布信息。

- 先读 `docs/PROGRESS.md`、`docs/PRD.md`、`docs/PRD-V1.5.md` 与 `docs/PRD-V1.6.md`，保留简单模式、进阶定量模式、本地知识库与已有功能。
- 所有纯逻辑引擎（`src/engine/`：反应匹配、整数化学计量、配平、有限库存、成长/经济/订单/设备/实验室、科技 DAG、世界探索、挑战历史状态机、博物馆解锁、特殊挑战与成就）严禁依赖 React、DOM 或存档；UI 不自行推断化学反应、配平或库存结算。
- 简单模式、进阶模式、实验室经营生产、挑战历史与特殊挑战共用同一份物质与反应数据库（`src/data/substances.json`、`reactions.json`），不得复制维护第二套不一致规则；修改核心物质/规则生成源 `scripts/generate-data.ts`（保留 `scripts/data/github-expansion.ts`）后再生成 JSON。
- 不伪造科学或科学史人工审核。`pending` 规则与历史内容可在明确标记的开发预览通道（`preview`）中运行；`release` 通道与 `npm run validate:release` 必须严格拒绝未审核内容。
- 物理变化、混合物、溶液、加工材料、物态与纯化合物须区分；不适用纯物质计量的规则不得强行套用整数份数或伪造理论质量；理论质量必须标明 `1 份 = 1 mol` 基准，守恒校验必须包含未反应剩余物。
- 四套库存（自由探索解锁集 / 挑战临时库存 / 实验室经营有限库存 / 挑战历史独立材料）必须严格隔离；设备条件限制仅在实验室经营模式生效；所有一次性奖励须通过 `claimedRewardIds` 幂等账本防重放。
- 存档升级必须提供显式版本迁移（如 `v1 → v2 → v3`、`v2 → v3`），保留玩家全部历史数据且不重放历史首发现奖励，拒绝未知或未来版本（如 `v4`）。
- 结束前运行 `npm test`、`npm run validate`、`npm run build`、`npm run format:check`；涉及交互或 UI 改动时运行 `npm run test:e2e` 并审阅截图。
- 实际进度、测试结果与未完成限制同步至 `docs/PROGRESS.md`、`docs/TEST_REPORT.md` 与对应版本交付报告。
