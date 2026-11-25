# Matter Age V1.5 增量开发交付报告 · 2026-11-25

本轮在原 `G:\化学小游戏` 工程上完成了 **Matter Age V1.5 定量化学**全阶段增量开发（保留 V1.0 简单模式及全部既有功能，未重建工程、未调用 AI API、未推送上线）。根据用户最新授权指令，进阶实验台、方程式配平面板与 30 道定量挑战现已直接在**明确标记的开发预览通道（`preview`）**基于共享生产规则目录开放运行，同时完整保留 `pending` 审核状态与 `release` 通道的严格审核筛选（绝不伪造 `reviewed`）。

## 一、核心修改清单

### 1. 难度模式配置与共享数据库 V1.5 元数据
- [src/config/modes.ts](file:///G:/化学小游戏/src/config/modes.ts)：新增简单 / 进阶（1–99 可配置份数）/ 困难（V2.0 锁定预告）配置及理论质量基准常量 `按 1 份 = 1 mol 理论基准换算（g）`。
- [src/types/index.ts](file:///G:/化学小游戏/src/types/index.ts) 与 [src/schemas/contentSchema.ts](file:///G:/化学小游戏/src/schemas/contentSchema.ts)：扩展 `Substance`（`elementComposition`、`charge`、`modelKind`、`quantitativeResearchEligible`）、`Reaction`（`stoichiometrySupported`、`calculationStrategy`）、`IntegerStoichiometryResult`、`QuantitativeChallenge`、`ResearchRecord`、`BalancingRecord` 与 `Save` v2 类型和 Zod Schema。
- [scripts/data/substances-source.ts](file:///G:/化学小游戏/scripts/data/substances-source.ts)、[scripts/data/reactions-source.ts](file:///G:/化学小游戏/scripts/data/reactions-source.ts)、[scripts/data/quantitative-challenges-source.ts](file:///G:/化学小游戏/scripts/data/quantitative-challenges-source.ts)、[scripts/generate-data.ts](file:///G:/化学小游戏/scripts/generate-data.ts)：从单一源生成 [substances.json](file:///G:/化学小游戏/src/data/substances.json)（72 项）、[reactions.json](file:///G:/化学小游戏/src/data/reactions.json)（100 条，含 88 `stoichiometric` + 4 `phase_change` + 6 `mixture_unsupported` + 2 `material_process_unsupported`）、[challenges.json](file:///G:/化学小游戏/src/data/challenges.json)（30 关简单）与 [quantitativeChallenges.json](file:///G:/化学小游戏/src/data/quantitativeChallenges.json)（30 关定量）。所有物质与规则保持 `reviewStatus: "pending"`。

### 2. 独立计量、配平与有限库存引擎（`src/engine/`，不依赖 React/DOM/存档）
- [src/engine/stoichiometry.ts](file:///G:/化学小游戏/src/engine/stoichiometry.ts)：
  - 新增 `executeIntegerStoichiometry()`：实现 `extent = min(floor(input / coefficient))`、消耗/生成/剩余、限制反应物、缺份诊断、含剩余物的原子/电荷/质量守恒校验、明确 `1 份 = 1 mol` 基准理论质量，以及独立命名的「整数份数利用率」与「理论质量利用率」；
  - 完整保留连续摩尔接口 `calculateYield()` 供未来 V2.0 使用。
- [src/engine/reactionEngine.ts](file:///G:/化学小游戏/src/engine/reactionEngine.ts)：新增 `executeAdvanced()`，与简单模式共享规则库及 `preview` / `release` 通道设计；独立处理催化剂零消耗、混合物/材料规则隔离（`unsupported_strategy`）及困难模式显式拒绝。
- [src/engine/balancingEngine.ts](file:///G:/化学小游戏/src/engine/balancingEngine.ts)：实现 `checkEquationBalance()`，仅校验化学式前 1–99 正整数系数（不可改下标），接受任意等比例守恒配平并基于最大公约数识别最简整数比。
- [src/engine/quantitativeChallengeEngine.ts](file:///G:/化学小游戏/src/engine/quantitativeChallengeEngine.ts)：实现有限份数库存扣减、产物入库、催化剂保留、目标校验与全步骤回放验证 `verifyQuantitativeChallenge()`。

### 3. 共享实验台、原子可视化、配平面板、30 关定量挑战、图鉴与发现网络
- [src/pages/Home.tsx](file:///G:/化学小游戏/src/pages/Home.tsx) 与 [src/App.tsx](file:///G:/化学小游戏/src/App.tsx)：首页新增三档难度入口（困难模式锁定），顶部预览栏同步展示当前模式与 `v2` 自动保存状态。
- [src/pages/Laboratory.tsx](file:///G:/化学小游戏/src/pages/Laboratory.tsx)：共享实验台按模式切换简单/进阶控件（进阶提供 1–99 `+/-`、数字输入、重复点击增量、快速清空、独立催化与条件；自由探索不扣全局库存）；提供「定量实验台 / 方程式配平研究」子视图；支持有限份数定量挑战实时扣减库存、保留催化剂与一键重置恢复；移除了玩家路径中的全部 demo fixture。
- [src/components/AtomVisualizer.tsx](file:///G:/化学小游戏/src/components/AtomVisualizer.tsx) 与 [src/components/StoichiometryReport.tsx](file:///G:/化学小游戏/src/components/StoichiometryReport.tsx)：2D SVG 渲染元素专属颜色与元素符号，显式标注 `分子模型` / `离子晶体化学式单位` / `金属晶格单元` / `共价网络单元`（绝不将盐晶体画成孤立分子），展示含剩余物的原子重组守恒图与完整定量报告。
- [src/components/EquationStudio.tsx](file:///G:/化学小游戏/src/components/EquationStudio.tsx)：独立方程式系数配平面板，下标严格只读，实时原子计数校验，明确反馈等比例配平与最简整数比。
- [src/pages/Challenges.tsx](file:///G:/化学小游戏/src/pages/Challenges.tsx)：双模式标签（30 简单挑战 + 30 进阶定量挑战：基础份数 10 / 剩余物质 10 / 定量推演 10），记录最佳星级、次数与利用率。
- [src/pages/Encyclopedia.tsx](file:///G:/化学小游戏/src/pages/Encyclopedia.tsx) 与 [src/components/Detail.tsx](file:///G:/化学小游戏/src/components/Detail.tsx)：新增三级研究等级（Lv.1 发现 / Lv.2 定量研究 / Lv.3 锁定）、结构模型展示、最佳实验记录及按模式分组的反应路径。
- [src/pages/DiscoveryTree.tsx](file:///G:/化学小游戏/src/pages/DiscoveryTree.tsx)：区分 Lv.1/Lv.2 研究状态；点击已验证反应节点展开化学方程式、反应物/产物比例、定量/配平记录与关联定量挑战详情。

### 4. 存档 v2 显式迁移与测试完善
- [src/schemas/saveSchema.ts](file:///G:/化学小游戏/src/schemas/saveSchema.ts)、[src/database/index.ts](file:///G:/化学小游戏/src/database/index.ts)、[src/stores/game.ts](file:///G:/化学小游戏/src/stores/game.ts)：存档升级为 `version: 2`，实现 `v1 → v2` 显式无损迁移并安全拒绝 `v3` 与非法引用；修复并确保任何测试样例不污染真实玩家研究进度。
- 新增 [tests/unit/stoichiometry.test.ts](file:///G:/化学小游戏/tests/unit/stoichiometry.test.ts) 与 [tests/e2e/advanced.spec.ts](file:///G:/化学小游戏/tests/e2e/advanced.spec.ts)，同步更新 [tests/unit/engine.test.ts](file:///G:/化学小游戏/tests/unit/engine.test.ts) 与 [tests/unit/progress.test.ts](file:///G:/化学小游戏/tests/unit/progress.test.ts)。

## 二、全部验证命令与真实结果

| 命令 | 结果 | 关键数据 |
|---|---|---|
| `npx prettier --write src scripts tests *.ts *.json` | 通过（退出码 0） | 全部源码、脚本、测试与 JSON 已统一格式化 |
| `npm test` | 通过（退出码 0） | 3 个测试文件，**157 / 157 项通过** |
| `npm run validate` | 通过（退出码 0） | 0 自动错误；72/72 可达；92 守恒 + 8 manual；30 简单挑战 + 30 定量挑战全有限库存逐步回放通过 |
| `npm run validate:release` | 预期拒绝（退出码 1） | `正式发布被阻止：仍存在 pending 科学内容。` |
| `npm run build` | 通过（退出码 0） | `tsc -b` 0 错误；Vite 构建成功，PWA 预缓存 21 项（1262.67 KiB） |
| `npm run test:e2e` | 通过（退出码 0） | **6 / 6 组 Playwright 通过**（8.0s），含真实预览 `3H₂+2O₂`、份数不足/缺条件/混合物拒算、等比例与最简配平、有限库存催化多步与重置、Lv.2 研究与反应详情、浏览器 v1 存档导入迁移、360/768/1440px 无溢出与生产离线 PWA |
| `npm run format:check` | 通过（退出码 0） | `All matched files use Prettier code style!` |

## 三、门禁状态、已知限制与待验收事项

1. **科学审核状态（未完成，绝不虚称）**：
   - 生产目录中全部 72 项物质与 100 条规则均仍为 `reviewStatus: "pending"`，详情见 [docs/CHEMISTRY_REVIEW.md](file:///G:/化学小游戏/docs/CHEMISTRY_REVIEW.md)。
   - `preview` 通道供明确标记的本地开发预览体验简单与进阶功能；`release` 通道与 `npm run validate:release` 继续严格拦截 `pending` 数据，直至完成人工化学审核并逐条签署 `reviewed`。
2. **尚未完成的外部验收**：
   - 真实 iOS / Android 手机浏览器 PWA 安装、触控体验、屏幕阅读器无障碍全流程及低端设备帧率实测；
   - 长时间大规模历史记录存档压测。
3. **后续版本保留边界**：
   - 困难模式（V2.0 虚拟实验仪器、浓度、温压、操作步骤与实验报告）与 Lv.3 研究等级保持锁定预告；连续摩尔计算接口 `calculateYield` 已保留且未破坏兼容性。
