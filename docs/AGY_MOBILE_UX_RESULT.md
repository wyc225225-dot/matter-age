# Matter Age 手机端全模式交互重设计与追加需求交付报告（AGY_MOBILE_UX_RESULT）

交付日期：2026-11-25
工作区：`G:\化学小游戏`（仅本地工作区交付，未执行 `git commit` 或 `git push`）

---

## 1. 交付总览

本次交付完整落地以下四项核心目标，同时 100% 保留桌面端（`1440×900` / `1280×900`）、平板端（`768×1024`）、化学纯引擎确定性、四套库存隔离、存档 `v3` 迁移与 `pending` 审核诚实原则：

1. **全模式手机端竖屏 + 横屏游戏化重构**：基于 `宽度 × 高度 × 方向` 统一视口分层，消除竖屏超长滚页与手机横屏误判桌面问题，覆盖全部 13 个路由视图及挑战历史全部 5 个可玩章节。
2. **一级与二级入口信息架构**：移动端固定 5 个稳定一级目的入口（`大厅` / `实验` / `经营` / `图鉴` / `更多`），配合按域切换的二级模式导航条 `.domain-subnav`（横屏内联顶栏零高度损耗）与分类「更多」抽屉，保留全部既有 `#hash` 深链与刷新恢复。
3. **实验失败时的纯引擎催化剂角色诊断（非侵入式）**：严格遵循用户优先级指令「就实验失败的时候给提示」——不设首次进入自动教程弹窗、不写教程存档；在 `src/engine/reactionEngine.ts` 新增纯引擎诊断函数 `diagnoseExperimentFailure()`，解决「把过氧化氢和二氧化锰同时选入反应物槽导致无法反应」的真实痛点，提供玩家确认的一键移至独立催化剂栏、缺失条件高亮与可撤回调整。
4. **本地知识库全量中文化（532 物质 + 435 转化）**：在数据导入源头补齐全部 532 项物质中文名与常用别名，严格消歧实体与物态，并将 435 条转化渲染为结构化中文表达与标准化学方程式，接入 `validate-data.ts` 零缺失强制校验；玩家页面不展示数据提供方、外部参考链接、仓库版本或 commit。

---

## 2. 变更文件清单

### 新增文件
- `src/hooks/useViewport.ts`：四类视口分层 Hook（`mobile-portrait`、`mobile-landscape`、`tablet`、`desktop`）
- `src/styles/mobile-ux.css`：全模式手机竖屏单屏聚焦、横屏 58px 左侧导航轨 + 双栏游戏布局、L2 导航、失败诊断与安全区样式系统
- `scripts/knowledge/chinese-names.ts`：532 项知识库物质源头中文名称与别名映射（区分物态与溶液）
- `src/utils/knowledgeNames.ts`：前端中文名、物态/条件/结果中文化与结构化中文转化式格式化工具
- `tests/unit/catalyst-and-chinese.test.ts`：纯引擎催化剂角色诊断、原流程/歧义/多余材料安全、简单+定量模式及 532/435 中文化单元测试（8 项）
- `tests/e2e/mobile-ux.spec.ts`：13 路由 × 5 视口零溢出矩阵、全模式竖/横屏实操与转屏状态保持、L1/L2 路由、失败催化诊断与撤回、中文知识库 E2E（3 大组）
- `docs/MOBILE_UX_DESIGN.md`：全模式交互重设计方案与 L1/L2 入口映射设计文档
- `docs/AGY_MOBILE_UX_RESULT.md`：本交付报告

### 修改文件
- **全局壳层与样式**：`src/App.tsx`、`src/main.tsx`、`src/styles/mobile-laboratory.css`、`src/components/knowledge.css`
- **全模式页面与组件**：`src/pages/Home.tsx`、`src/pages/Laboratory.tsx`、`src/pages/Challenges.tsx`、`src/components/SpecialChallengeRunner.tsx`、`src/pages/WorldMap.tsx`、`src/pages/Management.tsx`、`src/pages/Technology.tsx`、`src/pages/History.tsx`、`src/pages/Museum.tsx`、`src/pages/Encyclopedia.tsx`、`src/components/Detail.tsx`、`src/components/KnowledgeLibrary.tsx`、`src/pages/DiscoveryTree.tsx`、`src/pages/Achievements.tsx`
- **纯引擎与数据/校验**：`src/engine/reactionEngine.ts`、`scripts/knowledge/import-github.ts`、`scripts/validate-data.ts`、`src/data/knowledgeSubstances.json`、`src/data/knowledgeTransformations.json`（及导入同步生成的 `src/data/elements.json`、`knowledge/SOURCES.json`、`docs/CHEMISTRY_REVIEW.md`）
- **项目文档**：`docs/PROGRESS.md`、`docs/TEST_REPORT.md`

---

## 3. 全模式重构与入口层级结果

### 3.1 一级与二级入口映射（已通过 E2E 逐条验证）

| 一级入口 | 二级入口（`.domain-subnav` / 子页签） | 对应路由 | 横屏表现 |
| --- | --- | --- | --- |
| **大厅** | `玩法大厅` / `任务与难度` / `图鉴与收藏` | `#home` | 左栏状态与主 CTA，右栏分页网格 |
| **实验** | `自由实验`（简单/进阶/配平）/ `目标挑战`（简单/定量/特殊）/ `挑战历史`（10章+档案） | `#lab`、`#challenge`、`#history`、`#history/<id>` | 二级条内联进 `36px` 顶栏，下方全高双栏工作区 |
| **经营** | `实验室经营` / `科技研究` / `世界探索` | `#management`、`#tech`、`#world` | 二级条内联顶栏，左栏画面/地图/分支、右栏业务操作 |
| **图鉴** | `物质图鉴`（5档案标签）/ `发现网络` / `科学博物馆` | `#book`、`#tree`、`#museum` | 二级条内联顶栏，多列卡片或画布+侧详情 |
| **更多** | 分类抽屉：`科技演进` / `探索成就` / `实验室设置` + 全玩法直达 | `#eras`、`#achievements`、`#settings` | 居中自适配弹窗抽屉，Escape 可关闭 |

### 3.2 各模式手机竖屏与横屏核心改进
- **探索大厅（`Home.tsx`）**：紧凑 HUD + 吸顶 3 分段页签，首屏 2 列卡片完整展示 6 大模式（含工业文明预告）并支持横屏双栏。
- **简单/进阶定量实验台（`Laboratory.tsx`）**：竖屏拆分「实验台面 / 记录与原理」子页签，合并重复操作条为底部统一 Dock（`选物质 n/4` + `提示` + `开始实验`），保留全部选料弹窗与无障碍契约；横屏采用左台面 + 右「材料库/条件催化/记录」双栏与底部常驻动作栏；旋转屏幕（`390×844 ↔ 844×390`）已选物质与状态完整保留。
- **目标与特殊挑战（`Challenges.tsx` / `SpecialChallengeRunner.tsx`）**：列表页吸顶模式切换 + 分组胶囊；特殊挑战运行器吸顶目标/步数条 + 底部固定选中摘要与确认按钮，无重叠。
- **世界探索（`WorldMap.tsx`）**：吸顶区域切换条 + 可折叠 2D 交互地图 + 「采集点/区域任务/奇遇」分段页签；横屏左地图右操作。
- **实验室经营（`Management.tsx`）**：竖屏吸顶资源 HUD 与 5 模块页签，首屏直达活跃订单；制备支持 `仅看可生产` 与大触控 `+/-` 步进；市场拆分为库存/采购子页签；经营日志折叠收纳；横屏左 2D 等距实验台右双列操作。
- **科技研究树（`Technology.tsx`）**：吸顶 RP/金币与 `可研究 (n)` 快捷过滤；横屏左分支栏右双列节点。
- **挑战历史 5 个可玩章节（`History.tsx`）**：统一吸顶顶栏（返回 + 标题 + 简/进切换 + 按需「材料」信息/插画/重开抽屉）+ 单行 5 阶段步进条 + 底部固定反馈与阶段提交栏；Ch.01 分气瓶页签、Ch.02 称量/结论切换、Ch.03 合成/配平分区、Ch.04 折叠模型说明 + 顶部实时电压表 + 内部滚动叠层柱、Ch.07 顶部元素卡托盘 + 当前手持卡提示条紧贴 4 列网格；横屏左装置右电压表/反馈/提交双按钮同屏免滚。
- **博物馆 / 图鉴 / 发现网络 / 设置 / 成就**：博物馆 2 列（横屏 3 列）展柜 + 滚动弹窗；图鉴吸顶可读档案标签 + 固定关闭头详情弹窗；发现网络折叠筛选 + 底部弹出反应详情抽屉（横屏右侧固定面板）；设置/成就大触控热区与可领取过滤。

---

## 4. 纯引擎催化剂角色诊断与失败提示

- **遵循无自动教程原则**：首次进入实验台不会弹出任何自动引导或教程遮罩，不污染存档结构；仅在玩家实际执行实验失败时提供上下文诊断。
- **纯引擎判定（`src/engine/reactionEngine.ts`）**：
  - 新增 `diagnoseExperimentFailure(selectedIds, selectedConditions, selectedCatalyst, rules, db, mode)`，完全基于共享 `reactions.json` 与 `substances.json` 运算，React/UI 零硬编码物质 ID。
  - **真实验证（`r027` 过氧化氢催化分解）**：规则定义为 `reactants: [peroxide ×2]`、`catalysts: [manganese_dioxide]`、`conditions: [mix]`、`supportedModes: ["simple", "advanced"]`。
  - 当玩家将 `过氧化氢 + 二氧化锰` 同选入反应物槽后点击开始实验：
    1. 实验按科学规则如实失败，不将二氧化锰当作消耗反应物，也不静默吞掉材料；
    2. 诊断卡片清晰提示「二氧化锰」在「过氧化氢催化分解」中作为催化剂，并列出缺失条件「混合」（同时高亮界面上的「混合」按钮）；
    3. 玩家点击「将「二氧化锰」移至催化剂栏」后，自动将二氧化锰移出反应物槽并写入独立催化剂栏，支持一键「撤回角色调整」回到原槽位；
    4. 选上「混合」再次点击开始实验，简单模式与进阶定量模式均成功生成水 + 氧气且催化剂不消耗；
    5. 多规则/多角色歧义时列出全部候选由玩家选择；夹杂额外非催化剂物质（如铁）时不误吞。

---

## 5. 本地知识库全量中文化核验

- **物质中文化**：`src/data/knowledgeSubstances.json` 全部 **532 / 532** 项具备准确 `nameZh` 与 `aliasesZh`（0 缺失），严格区分实体与物态（如 `HCl` aq = `盐酸`、`HCl-g` g = `氯化氢`、`NaOH` aq = `氢氧化钠溶液`、`H2` = `氢气`、`O2` = `氧气`、`H2O` l = `水`、`H2O-g` g = `水蒸气`、`H2O-ice` s = `冰`）。
- **转化中文化**：`src/data/knowledgeTransformations.json` 全部 **435 / 435** 条转化在界面保留化学方程式的同时，由结构化反应物/产物与系数实时生成中文可读转化描述（如 `2份氢气 + 1份氧气 → 2份水蒸气`），物态、激活条件、氛围、类型与反应结果全量中文展示。
- **零溯源泄露与诚实审核**：玩家端不显示数据提供方、外部参考链接、仓库版本或 commit；所有知识库条目保持 `reviewStatus: "pending"`。

---

## 6. 自动化测试与视觉审阅结果

### 6.1 命令执行结果

| 验证命令 | 结果 | 核心输出 |
| --- | --- | --- |
| `npm test` | **PASS（exit 0）** | 7 个测试文件，**232 / 232** 通过 |
| `npm run validate` | **PASS（exit 0）** | 0 自动错误；532/532 中文物质、435/435 转化参与者校验通过 |
| `npm run validate:release` | **PASS（预期 exit 1）** | 严格拒绝 `pending` 科学/知识库/科学史内容 |
| `npm run build` | **PASS（exit 0）** | `tsc -b` 0 错误；Vite + PWA 预缓存 22 项（2538.39 KiB） |
| `npm run format:check` | **PASS（exit 0）** | Prettier 全部文件一致 |
| `npm run test:e2e` | **PASS（exit 0）** | **15 / 15** Playwright 端到端测试通过（含原有 12 组全回归） |

### 6.2 截图审阅清单（`output/playwright/mobile-ux/`）

全部 22 张真实渲染截图均已通过目视检查，并现场修复了 5 项视觉细节（失败诊断卡片横向挤压、Ch.04 竖屏模型说明占高、Ch.04 横屏右栏重复目标挤出按钮、移动端 `.toast` 继承 `width: max-content` 截断与特殊挑战页高度冲突、发现网络懒加载截图时机）：

- 大厅：`portrait-390-home.png`、`landscape-844-home.png`
- 实验台与催化诊断：`portrait-390-lab.png`、`landscape-844-lab.png`、`portrait-360-lab-advanced.png`、`portrait-390-lab-catalyst-diag.png`、`portrait-390-lab-catalyst-success.png`
- 挑战历史：`portrait-390-history-timeline.png`、`portrait-390-history-ch04.png`、`landscape-844-history-ch04.png`、`portrait-390-history-ch07.png`
- 经营与探索：`portrait-390-management.png`、`landscape-800-management.png`、`portrait-390-world.png`、`landscape-844-world.png`
- 挑战、科技、博物馆、知识库、发现网络、设置与平板：`portrait-390-special-challenge.png`、`portrait-390-tech.png`、`portrait-390-museum.png`、`portrait-390-book.png`、`portrait-390-knowledge-transform-zh.png`、`portrait-390-tree.png`、`landscape-844-tree.png`、`portrait-390-settings.png`、`tablet-768-lab.png`

---

## 7. 诚实限制与待真机确认项

1. **模拟环境 vs 实机差异**：本轮移动竖屏（`360×800`、`390×844`）与横屏（`844×390`、`800×360`）验收基于 Windows 上的 Playwright Chromium 视口模拟，尚未在实体 iOS Safari 与 Android Chrome 设备上实测多点触控手感、刘海/灵动岛真实安全区及系统软键盘弹起时的可视区动态缩放。
2. **人工审校状态**：全部 129 项核心物质、134 条核心规则、532 项知识库物质、435 条知识库转化、10 章科学史与 13 位人物档案均如实保留 `reviewStatus: "pending"`，正式发布前仍需专业人员逐条人工审校。
