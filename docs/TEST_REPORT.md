# Matter Age · V1.6 与挑战历史深化测试报告（TEST REPORT）

验证时间：2026-11-25（Node v26.13 · Vitest v5.1.1 · Vite v8.3.8 · Playwright v1.65.1 · Windows）

## 1. 命令执行总表

| 检查项 | 命令 | 实际结果 | 关键指标 |
|---|---|---|---|
| 单元测试 | `npm test` | **通过（exit 0）** | 6 个测试文件，**224 / 224** 通过 |
| 数据与闭环校验 | `npm run validate` | **通过（exit 0）** | 自动错误 **0**；129 物质 / 134 规则 / 87 挑战 / 24 科技 DAG / 10 章历史与 13 人物 / 102 步 Lv.1→Lv.3 模拟通过 |
| 正式发布门禁 | `npm run validate:release` | **预期拒绝（exit 1）** | 正确阻断 `pending` 科学及科学史内容 |
| 生产构建与 PWA | `npm run build` | **通过（exit 0）** | `tsc -b` 0 错误；Vite 构建 + Workbox 预缓存 22 项资产 |
| 端到端与离线验证 | `npm run test:e2e` | **通过（exit 0）** | **11 / 11** Playwright 用例通过（含生产离线 PWA、V1.6 全闭环、挑战历史 5 章全通关与 360/390/768/1440px 响应式） |
| 代码格式检查 | `npm run format:check` | **通过（exit 0）** | Prettier 全部文件格式一致 |

## 2. 单元测试覆盖清单（224 项）

- `tests/unit/engine.test.ts`（183 项）：反应匹配、条件与催化、化学式/离子解析、元素守恒、可达性、36 简单挑战与三级提示、v3 存档拒绝 v4/异常输入。
- `tests/unit/stoichiometry.test.ts`：整数份数计量、双利用率、1 mol 基准质量、守恒、配平与 36 定量挑战有限库存回放。
- `tests/unit/knowledge.test.ts`：118 元素、532 物质资料、435 转化事实、24 学习任务与扩展路线完整性。
- `tests/unit/progress.test.ts`（4 项）：星级评分、成就持久保留、化学式排版、`v1 → v3` 无损迁移与历史奖励不重放。
- `tests/unit/v16.test.ts`（16 项）：经济/XP 与 RP 分离、幂等奖励账本、经营库存隔离、24 科技 DAG、设备条件限制与催化留存、订单防双次提交、零金币森林免费采集恢复、Lv.1→Lv.3 102 步闭环、博物馆/34 成就幂等领奖、世界探索奇遇与任务、15 特殊挑战可解性、`v2 → v3` 迁移与 `v4` 拒绝。
- `tests/unit/history-polish.test.ts`（8 项）：
  - 10 章时间线对齐 `HISTORY_MODE_BRIEF.md` 且全部 `pending`；
  - 纯引擎阶段门禁 `canAccessHistoryStage()` 拒绝跳过未完成前置阶段；难度切换保留原有尝试与提示不清空；
  - CH.01 氧气：缺失石灰水对照给出证据缺口提示不泄密、限定三气候选池鉴别、进阶复用 `r026` 计量核算；
  - CH.02 质量守恒：缺失密闭对照拦截、进阶 `g / kg / mg` 单位换算严格校验（`0.044 kg` 通过、`44 kg` 拒绝）；
  - CH.03 水的身份：强制先执行共享 `execute(r006)`、进阶要求电解对照 + `checkEquationBalance` 最简比 + 系数/下标原理检验；
  - CH.04 伏打电堆：同类金属 0 V、干燥纸板断路 0 V、反向极性抵消净电压、1800 锌-银原型进阶 3 组 2.4 V 通过；
  - CH.07 周期表：强制显式标记铝下空位、进阶氧化物 `E₂O₃` + 原子量区间 `[66, 72]`；
  - 多维 1–3 星评定边界、有限复玩奖励上限（超过 2 次后返回 0 金币/RP 反刷）、进阶首通奖励幂等与中途会话存档往返恢复。

## 3. Playwright 端到端与视觉审阅（11 组）

- 原有 10 组（`game.spec.ts` ×2、`product.spec.ts` ×3 含离线 PWA、`advanced.spec.ts` ×1、`knowledge.spec.ts` ×2、`v16.spec.ts` ×2）全部通过无回归。
- 新增 `tests/e2e/history-polish.spec.ts`（1 组完整长链路）：
  - 完整通关全部 5 个可玩章节（CH.01 简单 + 中途刷新恢复、CH.02 进阶含 `0.044 kg` 单位换算、CH.03 共享反应引擎、CH.04 1800 锌-银原型、CH.07 深链 `#history/hist_07` + 显式空位标记）；
  - 校验第 5 阶段一键跳转 `#museum` 验证藏品点亮，进入 `#history`「科学家档案与历史手稿」核验解锁档案；
  - 校验 360px / 390px / 768px / 1440px 零横向溢出并输出截图至 `output/playwright/history-polish/`。

## 4. 本轮目视截图发现并当场修复的真实缺陷

1. **深链关闭状态回弹 bug**：刷新 `#history/hist_01` 后返回时间线时，`history.replaceState` 未触发 `hashchange` 导致旧 `deepHistoryId` 重新打开章节 → 改为 `location.hash = "history"` + `handledDeepRef` 去重处理，彻底修复。
2. **前四阶段剧透优化**：阶段 1–4 顶部 `fact-notice` 改用防剧透声明，完整人物与史实边界说明在阶段 5「历史揭晓」呈现。
3. **Tailwind `.fixed` 冲突导致 CH.07 周期表错位**：参考格类名 `pg-cell fixed` 被 Tailwind `position: fixed` 覆盖 → 重命名为 `pg-cell ref-cell`，周期表 4×4 网格完全对齐。
4. **CH.02 SVG 天平梁/立柱零宽渐变不可见**：SVG 水平/垂直 `<line>` 使用实色铜金描边，等臂天平结构完整呈现。

## 公开分享部署验证

来源信息网页隐藏后：224单元、11组Playwright回归通过。GitHub Actions运行45583547226成功；线上Pages的/matter-age/子路径、图标、知识库氦元素搜索、来源隐藏和离线刷新均经Chromium验证，0 pageerror / 0 HTTP错误。


## 手机实验台选料改版（2026-11-25）

新增 mobile-lab.spec.ts，覆盖空槽打开选择、连续选水和铁、已选槽位常驻、搜索、完成返回、滚到底部执行凝固、重开选择查看新物质、Escape关闭及滚动锁恢复、切回桌面仓库。更新360px反馈测试适配选料面板。12组端到端用例均通过（首轮10组通过，修正两处测试名称定位后相关3组通过）；224单元测试、数据校验、构建与格式检查通过。截图 output/playwright/mobile-material-picker.png 与 mobile-workbench.png 已人工查看。尚未真机测试。

最终完整重跑：12/12通过。Pages部署后线上390×844触控浏览器选料与凝固流程通过，无运行时错误；截图 output/playwright/github-pages-mobile.png。

---

## 手机端全模式交互重设计 + 入口层级/催化剂诊断/中文知识库验证（2026-11-25）

### 1. 命令执行总表

| 检查项 | 命令 | 实际结果 | 关键指标 |
|---|---|---|---|
| 单元测试 | `npm test` | **通过（exit 0）** | 7 个测试文件，**232 / 232** 通过（新增 `catalyst-and-chinese.test.ts` 8 项） |
| 数据与中文化校验 | `npm run validate` | **通过（exit 0）** | 自动错误 **0**；知识库 **532 / 532** 中文名零缺失、**435 / 435** 转化参与者可解析、实体/物态消歧断言通过 |
| 正式发布门禁 | `npm run validate:release` | **预期拒绝（exit 1）** | 正确阻断 `pending` 科学、知识库与科学史内容 |
| 生产构建与 PWA | `npm run build` | **通过（exit 0）** | `tsc -b` 0 错误；Vite 构建 + Workbox 预缓存 22 项资产 |
| 代码格式检查 | `npm run format:check` | **通过（exit 0）** | Prettier 全部文件格式一致 |
| 端到端与视觉验证 | `npm run test:e2e` | **通过（exit 0）** | **15 / 15** Playwright 用例通过（原有 12 组全回归 + 新增 `mobile-ux.spec.ts` 3 组全覆盖） |

### 2. 新增测试覆盖明细

- **单元测试 `tests/unit/catalyst-and-chinese.test.ts`（8 项）**：
  - `过氧化氢 + 二氧化锰` 同时选入反应物槽时，纯引擎 `diagnoseExperimentFailure` 识别 `r027` 催化剂角色与缺失条件 `mix`，移至催化剂栏后简单模式与进阶定量模式均正常产出水+氧气且不消耗催化剂；
  - 单选 `过氧化氢` 手动设置 `二氧化锰` 催化剂原流程无回归；
  - 额外非催化剂材料（如 `过氧化氢 + 二氧化锰 + 铁`）不被静默忽略或误判成功；
  - 规则含额外反应物或催化剂重复出现在反应物槽时的严格处理；
  - 知识库 532 项中文主名零缺失、关键实体/物态消歧（`HCl` 盐酸 vs `HCl-g` 氯化氢、`NaOH` 氢氧化钠溶液、`H2O` 水 vs `H2O-g` 水蒸气 vs `H2O-ice` 冰）及 435 条转化结构化中文生成校验。
- **端到端 `tests/e2e/mobile-ux.spec.ts`（3 组）**：
  1. **13 路由 × 5 视口零溢出矩阵**：`360×800`、`390×844`、`844×390`、`800×360`、`768×1024` 全部 13 路由零横向溢出、0 `pageerror`、`data-viewport` 分层精确命中；
  2. **竖屏与横屏真实玩法操作 + 转屏状态保持**：大厅分段页签、实验台 390×844 选水 → 旋转 844×390 保留已选水 → 冷却发现冰、360×800 进阶模式、挑战历史 Ch.04 伏打电堆（抽屉、底部固定提交栏、1.6 V 实时电压表同屏、旋转 844×390 状态不丢失）与 Ch.07 选卡提示条、经营首屏订单与有限库存生产、世界探索采集领奖、特殊挑战底部固定栏防重叠，以及科技/博物馆/图鉴/发现网络/设置/平板 768px 截图；
  3. **追加需求专项回归**：一级 → 二级导航全路线（竖屏 + 横屏）、首次进入实验台无自动教程弹窗、过氧化氢 + 二氧化锰同选失败诊断 → 一键移至催化剂栏 → 撤回 → 再次移入 + 选「混合」在简单与进阶模式均成功、中文知识库「盐酸/氯化氢/过氧化氢」检索及转化中文展示且页面无数据来源/外部链接/commit 泄露。

### 3. 目视截图审阅与现场修复（`output/playwright/mobile-ux/`）

审阅全部 22 张真实截图后，现场定位并修复 5 处细节问题并复拍确认：
1. 实验台失败诊断卡片因 `.experiment-message` 继承桌面横向 flex 被挤窄 → 改为纵向全宽堆叠，诊断文案与一键移至催化剂栏按钮清晰居中；
2. 挑战历史 Ch.04 竖屏中长段 `.scope-note` 把 `1.6 V` 电压表顶至底部提交栏边缘 → 竖屏折叠为按需展开摘要，首屏完整容纳全部叠层按钮与电压表；
3. 挑战历史 Ch.04 横屏右栏重复任务文字把提交按钮挤至滚屏下方 → 隐藏右栏重复摘要并固定操作按钮组底部对齐，电压表、反馈与双按钮同屏免滚动可见；
4. 移动端 `.toast` 继承桌面 `width: max-content` 导致长奖励文案右侧截断且在特殊挑战页贴近底部操作栏 → 修正为 `width: auto` 自动换行并提升特殊挑战页避让高度；
5. `portrait-390-tree.png` 捕获时懒加载未完成 → 等待 `.react-flow` 可见后再截图确认画布正常渲染。

### 4. 浏览器模拟与真机验证边界说明

本轮所有移动竖屏（`360×800` / `390×844`）与横屏（`844×390` / `800×360`）验证均运行于 Windows 上 Playwright Chromium 视口模拟环境；尚未在实体 iOS Safari / Android Chrome 真机上实测真实物理触控、手势惯性滚动、刘海屏安全区及软键盘弹出时的可视视口变化。

线上复核：809fba8已成功部署Pages；390×844触控浏览器验证二级导航、氯化氢中文搜索与中文转化路径，844×390横屏切换通过，无运行时错误。

---

## 实验台规则与知识库路径断层修复验证（2026-11-25）

### 1. 命令执行总表

| 检查项 | 命令 | 实际结果 | 关键指标 |
|---|---|---|---|
| 单元测试 | `npm test` | **通过（exit 0）** | 8 个测试文件，**254 / 254** 通过（新增 `tests/unit/reaction-gaps.test.ts` 8 组回归测试） |
| 数据与闭环校验 | `npm run validate` | **通过（exit 0）** | 自动错误 **0**；**130** 物质（130/130 可达）/ **148** 规则（140 守恒 + 8 人工核验）/ 87 挑战 / 24 科技 DAG / 102 步 Lv.1→Lv.3 模拟 / 532 中文物质与 435 转化零缺失 |
| 正式发布门禁 | `npm run validate:release` | **预期拒绝（exit 1）** | 严格阻断 `pending` 科学、知识库与科学史内容 |
| 生产构建与 PWA | `npm run build` | **通过（exit 0）** | `tsc -b` 0 错误；Vite 构建 + Workbox 预缓存 22 项资产 |
| 代码格式检查 | `npm run format:check` | **通过（exit 0）** | Prettier 全部文件格式一致 |
| 端到端与截图审阅 | `npm run test:e2e` | **通过（exit 0）** | **17 / 17** Playwright 用例通过（原有 15 组全回归 + 新增 `tests/e2e/reaction-gaps.spec.ts` 2 组全链路） |

### 2. 新增测试覆盖明细

- **单元测试 `tests/unit/reaction-gaps.test.ts`（8 项）**：
  - `light`（光照）条件注册、气态 `hydrogen_chloride`（氯化氢）与液态 `hydrochloric_acid`（盐酸）严格分离、零重复 `kb_HCl_g`、可达性与 `pending` 状态；
  - `H2 + Cl2` 无条件报缺 `light`、单选 `light` 触发 `r101`、单选 `ignite` 触发独立 `r102`、同选 `light + ignite` 报多规则冲突（不强制捆绑）、`release` 通道严格阻断；
  - 进阶定量 `1 H2 + 1 Cl2 + light → 2 HCl(g)`（1:1:2、原子/电荷/1 mol 基准质量守恒）；
  - 经营模式设备条件映射（初始仅 `mix`、`eq_electrolyzer` 解锁 `light` 后可制备 `r101`）；
  - 11 条新增常见明确缺项与 `r103`（`NH3 + HCl(g) → NH4Cl`）简单/定量双模式守恒回归；
  - 纯引擎 `summarizeKnowledgeCoverage` 诚实分类 435 条转化（74 已开放 / 361 未开放，不宣称全可玩，审慎排除 `Na+O2→Na2O`、`O3→O+O2` 与 `equation-only`）；
  - 失败诊断精确区分缺条件（`missing_requirements`）、资料路径未开放模拟（`unopened_knowledge_path`）与完全未收录（`unmatched`）；
  - v2→v3 迁移与 v3/v4 存档校验兼容。
- **端到端 `tests/e2e/reaction-gaps.spec.ts`（2 组）**：
  1. 桌面真实入口（电解水制氢 + 标本补给领氯气/钙）：`H2 + Cl2` 无光照→提示「缺少：光照」并高亮按钮→选「光照」→发现气态「氯化氢」（非盐酸，配平 `H2 + Cl2 → 2HCl`）；`Ca + Cl2` 区分「尚未收录可玩规则」与「资料路径 · 尚未开放实验台模拟」；进阶模式验证 1:1:2 完全反应与质量守恒；知识库转化路径核验 `74 / 435` 已开放与 `361 / 435` 未开放徽章及零溯源泄露；
  2. 手机竖屏（`390×844`、`360×800`）与横屏（`844×390`）验证 `光照` 条件按钮完整可见、零横向溢出并完成 `氢气 + 氯气 + 光照 → 氯化氢` 全流程。

### 3. 目视截图审阅（`output/playwright/reaction-gaps/`）

已逐张检查全部 7 张截图（`desktop-h2-cl2-missing-light.png`、`desktop-h2-cl2-light-success.png`、`desktop-h2-cl2-advanced-112.png`、`desktop-kb-h2-cl2-playable.png`、`desktop-kb-o3-unopened.png`、`portrait-390-light-condition.png`、`landscape-844-light-condition.png`）：桌面 6+5、竖屏 4+4+3、横屏 3+3+3+2 条件网格均无截断、无遮挡、无横向溢出。详细缺项与修复清单见 `docs/AGY_REACTION_GAPS_RESULT.md`。

---

## 正式工程手机简化改版与氯气加水平衡体系验证（2026-11-25）

### 1. 命令执行总表

| 检查项 | 命令 | 实际结果 | 关键指标 |
|---|---|---|---|
| 单元测试 | `npm test` | **通过（exit 0）** | 8 个测试文件，**256 / 256** 通过（`reaction-gaps.test.ts` 新增氯气加水平衡混合体系与非 100% 转化回归） |
| 数据与闭环校验 | `npm run validate` | **通过（exit 0）** | 自动错误 **0**；**131** 物质（131/131 可达）/ **149** 规则（140 守恒 + 9 混合物/材料加工）/ 87 挑战 / 24 科技 DAG / 102 步 Lv.1→Lv.3 模拟 / 532 中文物质与 435 转化零缺失 |
| 正式发布门禁 | `npm run validate:release` | **预期拒绝（exit 1）** | 严格阻断全部 `pending` 科学、知识库与科学史内容 |
| 生产构建与 PWA | `npm run build` | **通过（exit 0）** | `tsc -b` 0 错误；Vite + Workbox 预缓存 22 项资产 |
| 代码格式检查 | `npm run format:check` | **通过（exit 0）** | Prettier 全部文件格式一致 |
| 端到端与视觉验证 | `npm run test:e2e` | **通过（exit 0）** | **17 / 17** Playwright 用例全通过（零桌面回归，覆盖 4 项一级入口、全二级模式、三级父级返回隐藏底栏、知识库详情返回恢复查询、氯气加水简/进反馈及 5 视口零溢出矩阵） |

### 2. 目视截图审阅与现场修复（`output/playwright/mobile-ux/`）

逐张目视审阅 `390×844`、`360×800` 与 `844×390` 主要模式截图（大厅新手/老玩家/横屏、简单与进阶实验台、失败催化诊断、伏打电堆 L3 竖/横屏、知识库氯化氢列表与详情、经营/世界/科技/博物馆）：
1. 发现 `portrait-360-lab-advanced.png` 中 `.lab-mode-bar` 因 `styles.css` 级联顺序折行 → 改为单行横向滚动并在窄竖屏隐藏已在大厅展示的锁定困难模式占位按钮；
2. 发现 `portrait-390-history-ch04.png` 中旧 `.history-stepper` 被 `.mobile-scroll-strip` 的 `!important` 覆盖未隐藏 → 补齐 `!important` 释放 40px 纵向空间，仅保留 `第 X/5 步` 与 `背景 ▾`；
3. 发现横屏大厅与历史顶栏右上设置按钮未贴右对齐 → 补充 `header.topbar .top-actions { margin-left: auto; }`；
4. 发现 `食盐溶解`（物理溶解）误命中可逆化学平衡提示文案 → 在纯引擎精确限定 `reactionType === "equilibrium"`，严格区分物理溶解与化学平衡混合体系。

以上 4 项均已修复并重跑全量 `npm test`、`npm run validate`、`npm run format:check`、`npm run test:e2e` 及二次截图复查确认。详细交付报告见 `docs/AGY_IMPLEMENT_SIMPLIFY_RESULT.md`。

---

## 内部页面与实验台交互自主优化验证（2026-11-25）

### 1. 命令执行总表

| 检查项 | 命令 | 实际结果 | 关键指标 |
|---|---|---|---|
| 单元测试 | `npm test` | **通过（exit 0）** | 8 个测试文件，**256 / 256** 通过 |
| 数据与闭环校验 | `npm run validate` | **通过（exit 0）** | 自动错误 **0**（131 物质 / 149 规则 / 87 挑战 / 24 科技 / 102 步经营闭环 / 532 中文物质 / 435 转化） |
| 正式发布门禁 | `npm run validate:release` | **预期拒绝（exit 1）** | 严格阻断全部 `pending` 科学、知识库与科学史内容 |
| 生产构建与 PWA | `npm run build` | **通过（exit 0）** | `tsc -b` 0 错误；Vite + Workbox 预缓存 22 项资产 |
| 代码格式检查 | `npm run format:check` | **通过（exit 0）** | Prettier 全部文件格式一致 |
| 端到端与视觉验证 | `npm run test:e2e` | **通过（exit 0）** | **18 / 18** Playwright 用例全通过（原有 17 组全回归 + 新增 `tests/e2e/inner-pages.spec.ts`） |

### 2. 新增端到端回归与目视截图审阅（`output/playwright/inner-polish/`）

- 新增 `tests/e2e/inner-pages.spec.ts`：覆盖手机横屏（`844×390`）仓库卡片高度校验与直接点选投料冷却发现冰、手机竖屏（`390×844`）首屏条件+催化剂同屏、选料类别胶囊、标本补给搜索领取过氧化氢/二氧化锰、一键催化剂胶囊执行分解、进阶槽位与配平上下题切换、挑战三模式无截断、特殊挑战聚焦态无双层头部/重复返回按钮、Ch.04 伏打电堆、图鉴/知识库/世界探索及桌面（`1280×800`）简单/进阶主执行按钮免滚动首屏可见。
- 逐张审阅 `output/playwright/inner-polish/` 全部 16 张前后对照截图，并针对初轮审阅发现的 3 项细节（桌面 `1280×800` 催化剂栏换行导致主按钮贴底 24px 截断、原生 number 输入框右侧微调箭头挤压数字左偏、标本搜索占位符在 390px 略长）现场修复并二次全量复跑通过。详见 `docs/AGY_INNER_PAGES_RESULT.md`。

---

## 全站移动端原生 `<select>` 替换 + 挑战历史文案与开篇排版精简验证（2026-11-25）

### 1. 命令执行总表

| 检查项 | 命令 | 实际结果 | 关键指标 |
|---|---|---|---|
| 单元测试 | `npm test` | **通过（exit 0）** | 8 个测试文件，**256 / 256** 通过（含历史五阶段纯引擎门禁与全部 5 章评估） |
| 数据与逻辑校验 | `npm run validate` | **通过（exit 0）** | 自动错误 **0**（131 物质 / 149 规则 / 87 挑战 / 24 科技 / 10 章历史 Schema / 102 步经营闭环 / 532 中文物质 / 435 转化） |
| 正式发布门禁 | `npm run validate:release` | **预期拒绝（exit 1）** | 严格阻断 `pending` 科学、知识库与科学史内容 |
| 生产构建与 PWA | `npm run build` | **通过（exit 0）** | `tsc -b` 0 错误；Vite + Workbox 预缓存 22 项资产 |
| 代码格式检查 | `npm run format:check` | **通过（exit 0）** | Prettier 全部文件格式一致 |
| 端到端与展开态回归 | `npm run test:e2e` | **通过（exit 0）** | **20 / 20** Playwright 用例全通过（18 组既有回归适配真实可访问交互与动作按钮语义 + 新增 `tests/e2e/native-select-mobile.spec.ts` 2 组竖/横屏展开态与历史开篇专项） |

### 2. 新增真实展开态与历史开篇回归 + 目视截图审阅（`output/playwright/native-select-fix/`）

- 新增 `tests/e2e/native-select-mobile.spec.ts`（2 组长链路，分别运行于竖屏 `390×844` 与横屏 `844×390`）：
  - 逐页断言 DOM 中原生 `<select>` 数量为 **0**（涵盖实验台、选料面板、配平研究、图鉴、知识库元素与转化、发现网络、挑战历史 Ch.01/Ch.02）；
  - 真实点击展开 `CompactSelect` 浮层，校验其 `boundingBox` 完整落在视口内、避让横屏 58px 左轨、高度小于视口 72%（保持上下文可见）且不生成冲突遮罩层；
  - 实测键盘 `ArrowDown` 展开、实时搜索过滤 `R005` + `Enter` 选中、`Escape` 关闭浮层并验证焦点精确恢复至触发按钮、以及筛选/排序状态持久生效；
  - 新增挑战历史 Ch.01 开篇专项断言：校验统一年代 `1770 年代` 展示、无 `虚构教学旁白` / `时代背景线索（` / `RESEARCH QUESTION` / `18 世纪 70 年代` 残留、`时代背景` 默认折叠（`aria-expanded="false"`）且点击可展开查阅史实、`开始提出假设` 主按钮首屏可见。
- 逐张目视审阅全部 **13** 张截图（竖屏 9 张 + 横屏 4 张，含 10 张选控展开态与 3 张历史开篇收起/展开/横屏），并在首轮测试与审阅中当场定位并修复 **3** 项真实缺陷后全量复跑通过：
  1. `CompactSelect` 120ms 淡入动画导致首帧呈现半透明背景透字 → 移除透明度淡入改为实色高对比深底（`#122331`）与清晰边框投影，首帧即完全不透底；
  2. 横屏 `844×390` 下 `.balancing-picker` 因 flex 收缩导致「选择研究方程式」顶部轻度裁切 → 增加 `flex-shrink: 0` 与横屏紧凑内边距彻底消除；
  3. 搜索过滤后紧接按 `Enter` 时 `useEffect` 尚未重置 `activeIndex` 导致未选中首项 → 改为输入 `onChange` 同步归零并在 `Enter`/`Space` 做边界兜底。
- **验证边界声明**：本轮所有竖屏 `390×844` 与横屏 `844×390` 端到端测试与截图均基于 Windows 上 Playwright Chromium 视口模拟，不能等同于 Android Chrome / 微信内置浏览器 / iOS Safari 真机系统弹窗与触控实测；真机仍需线上部署刷新后实测验收。详见 `docs/AGY_NATIVE_SELECT_RESULT.md`。

---

## 挑战历史剩余 5 章（CH.05/06/08/09/10）全量可玩实装与全项目回归验证（2026-11-25）

### 1. 命令执行总表

| 检查项 | 命令 | 实际结果 | 关键指标 |
|---|---|---|---|
| 单元测试 | `npm test` | **通过（exit 0）** | 8 个测试文件，**257 / 257** 通过（`history-polish.test.ts` 新增 5 章纯引擎评估、简/进模式差异、复玩上限与 v3 会话往返覆盖） |
| 数据与逻辑校验 | `npm run validate` | **通过（exit 0）** | 自动错误 **0**；**10 / 10** 历史章节可玩（均 `pending`）、**21** 件博物馆藏品、131 物质 / 149 规则 / 87 挑战 / 24 科技 DAG / 102 步经营闭环 / 532 中文物质与 435 转化 |
| 正式发布门禁 | `npm run validate:release` | **预期拒绝（exit 1）** | 严格阻断 `pending` 科学、知识库与全部 10 章科学史内容 |
| 生产构建与 PWA | `npm run build` | **通过（exit 0）** | `tsc -b` 0 错误；Vite 构建 + Workbox 预缓存 22 项资产 |
| 代码格式检查 | `npm run format:check` | **通过（exit 0）** | Prettier 全部文件格式一致 |
| 端到端与视觉验证 | `npm run test:e2e` | **通过（exit 0）** | **21 / 21** Playwright 用例全通过（20 组既有回归零破坏 + 新增 `tests/e2e/history-remaining.spec.ts` 全链路） |

### 2. 新增端到端回归（`tests/e2e/history-remaining.spec.ts`）

- **CH.05 生命物质的边界（桌面 `1280×800`）**：通过冷启动深链 `/#history/hist_05` 直接入章，验证统一年代 `1828 年` 与无 `虚构教学旁白` / `时代背景线索（` 残留；执行合成与蒸发步骤后触发 `page.reload()` 验证中途会话进度恢复，再完成 3 项对照检验、结论分析与历史揭晓；
- **CH.06 电流的化学法则（桌面 `1280×800` 进阶定量）**：切换「进阶定量模式」，采集 3 组对照通电数据（`Ag⁺` 1A/2A 与 `Cu²⁺` 2A）、归纳双定律并填入串联析出铜份数 `2` 通关；
- **CH.08 矿石中的未知信号（手机竖屏 `390×844`）**：验证 0 原生 `<select>` 与零横向溢出，依次测定 4 组虚拟压电石英验电器电离读数、切换「2. 信号推断」完成新元素推断与揭晓；
- **CH.09 原子内部的世界（竖屏 `390×844` + 横屏 `844×390`）**：验证 0 原生 `<select>`、零横向溢出、模型示意切换与直穿/大角度反弹观测采集；旋转至 `844×390` 横屏验证已采集观测状态不丢失并完成核模型推断；
- **CH.10 来自空气的农业革命（竖屏 `390×844` + 横屏 `844×390`）**：完成基线试车与「中高温 + 中高压 + 铁基促进催化剂 + 原料气循环」工业试车，横屏核验四项 KPI 指标与「成本可控」并完整通关；
- **首奖幂等不重发与博物馆联动**：通关 5 章后复玩 CH.05（重置本章 → 重新通关），验证提示显示「复玩完成」且金币仅增加复玩档 `+26`（绝不重放 `+130` 首通奖励）；跳转 `#museum` 核验全部 5 件新展品均已点亮。

### 3. 测试与目视截图审阅发现并现场修复的真实缺陷（`output/playwright/history-remaining/`）

逐张审阅全部 **7** 张截图（`desktop-ch05-urea.png`、`desktop-ch06-faraday.png`、`portrait-390-ch08-radioactivity.png`、`portrait-390-ch09-scattering.png`、`landscape-844-ch09-scattering.png`、`portrait-390-ch10-haber.png`、`landscape-844-ch10-haber.png`），累计定位并修复 **5** 项真实问题并复拍确认：
1. **React StrictMode 冷启动深链竞态（逻辑缺陷）**：`/#history/hist_05` 冷加载时双次 `useGame.init()` 导致第二次异步读档覆写 `activeHistoryChapterId` 回 `null` → 在 `src/stores/game.ts` 为 `init()` 增加模块级单飞 `initPromise` 与 `if (get().ready) return;` 守卫，并在 `History.tsx` 深链 effect 增加 `if (!game.ready) return;`，彻底消除冷启动深链闪退回时间线问题；
2. **横屏右侧 `.dock-feedback` 裁切**：`landscape-844-ch10-haber.png` 中多行试车反馈受 `max-height: 60px` 限制底部截断 → 调整为 `flex: 1 1 auto; max-height: 175px; overflow-y: auto;`，完整展示全部诊断文本；
3. **竖屏切横屏后外层页面残留纵向滚动偏移**：`landscape-844-ch09-scattering.png` 转屏后顶栏滚出视口 → 在 `History.tsx` 监听 `vp.isMobileLandscape` 时调用 `window.scrollTo(0, 0)`，确保横屏双栏稳固对齐顶部；
4. **横屏 `.toast` 遮挡底部提交栏与舞台**：在横屏媒体查询将 `.toast` 移至右上非阻塞定位（`top: 48px; right: 12px; pointer-events: none;`），不再遮挡实验台与提交按钮；
5. **竖屏 CH.09/CH.10 三选项单列过长**：将 `.param-pill-row` 在竖屏保留 3 列紧凑布局，CH.09 观测角与 CH.10 温度/压强/催化剂 3×3 选控全部首屏同屏可见且零横向溢出；同步压缩横屏 `.step-pill` 避免长标题下 `5. 历史揭晓` 贴边。

### 4. 诚实验证边界

- 所有 5 个新章节与其余 5 章、13 位人物、131 物质、149 规则、532 知识库条目均保持 `reviewStatus: "pending"`，未伪造人工科学或科学史审核；
- 移动竖屏（`390×844`）与横屏（`844×390`）验证均基于 Windows Playwright Chromium 模拟，不能替代真实 Android/iOS 手机的触控手感、安全区与浏览器行为验收。详细交付报告见 `docs/AGY_HISTORY_REMAINING_RESULT.md`。
