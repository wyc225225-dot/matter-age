# Matter Age · 手机简化改版正式工程落地交付报告

完成时间：2026-11-25  
设计依据：`docs/AGY_IMPLEMENT_SIMPLIFY_HANDOFF.md`、`docs/AGY_MOBILE_SIMPLIFY_HANDOFF.md`、`output/mobile-simplify/index.html`

---

## 1. 改版范围与核心架构落地

在保留现有未提交反应缺项工作、全部既有玩法模式、中文内容、v3 存档（含 v1/v2 无损迁移）、全部 `#hash` 与 `#history/<id>` 分享深链及桌面端三栏完整体验的前提下，将手机端简化设计完整实现至 `src/` 正式产品：

### 1.1 四项一级入口、二级模式与三级父级返回（`src/App.tsx`、`src/types/navigation.ts`、`src/styles/mobile-simplify.css`）
- **一级入口收敛为 4 项**：移动端竖屏底栏与横屏左侧轨固定为 `大厅` / `实验` / `经营` / `图鉴`（移除旧第 5 项「更多」抽屉）。
- **右上设置与大厅玩家资料**：
  - 移动端顶栏移除冗余数值芯片与预览长条，仅保留左侧品牌（或父级返回按钮）与右侧固定设置齿轮按钮（进入 `#settings` 后自动记录来源页，支持 `← 返回<父级>`）；
  - 点击大厅顶部玩家资料条直接进入「成就与成长」（整合 `探索成就` 与 `科技演进` 切换，顶部带 `← 返回大厅`）。
- **二级模式导航（`.domain-subnav`）**：
  - `实验`：`自由实验`（直达实验台） / `关卡挑战` / `挑战历史`
  - `经营`：`生产` / `订单` / `设备` / `野外采集` / `科技`（并在经营顶栏提供 `库存市场` 与 `实验台/升级` 快捷 L3 入口，无功能删减）
  - `图鉴`：`我的物质` / `知识库` / `发现网络` / `博物馆`
- **三级详情与防双层固定栏遮挡**：
  - 进入历史章节、特殊挑战、知识库详情、物质图鉴详情、博物馆展品详情、科技详情、经营子视图（库存市场/2D实验台）、设置及成就成长时，`.app` 自动进入 `in-detail-mode`：
    1. 顶栏左侧切换为带父级名称返回按钮（`← 返回挑战历史`、`← 返回知识库`、`← 返回大厅`、`← 返回关卡挑战`、`← 返回经营`、`← 返回科技`、`← 返回博物馆`、`← 返回我的物质`）；
    2. 竖屏隐藏底层 4 项一级主导航，使历史章节提交栏与特殊挑战底部栏直接贴合 `bottom: 0` 并避让 `env(safe-area-inset-bottom)`，彻底消除双层固定底栏遮挡。

### 1.2 核心页面减字与单主动作重设计
- **大厅（`src/pages/Home.tsx`）**：
  - 移动端移走宣传段落、重复统计墙与重复入口按钮；首屏仅保留紧凑玩家资料条、唯一主任务卡（新玩家显示「水会变成什么？→ **开始第一次实验**」；老玩家按真实存档自动续玩进行中的历史章节、挑战或自由实验「**继续实验**」）、紧凑难度切换条与 4 条单行进度摘要；
  - 横屏（`844×390`）采用左任务卡 + 右快捷列表双栏布局，零纵向冗余滚动；桌面端保持原大厅完整展示（动态读取 `substances.length` / `reactions.length`）。
- **自由实验台（`src/pages/Laboratory.tsx`）**：
  - 竖屏移除槽位上方重复的「选择实验物质」横条及条件区重复的「开始实验」按钮；空槽可直接点开选料面板（已选 4 槽常显 + 独立滚动列表），底部操作栏仅保留 `选物质` 与唯一主动作 `开始实验` / `执行定量实验`（提示收纳至台面右上紧凑入口）；
  - 仅在实验失败后就近展示失败诊断与可执行修正（如 `过氧化氢 + 二氧化锰` 一键「移入催化剂栏」并支持「撤回调整」、高亮并一键选中缺失条件 `混合` / `光照`），无首次强制教程弹窗；
  - 横屏左台面/结果、右材料/条件/记录，横竖屏旋转保留全部已选物质、份数、条件与结果。
- **挑战历史（`src/pages/History.tsx`）**：
  - 活跃章节竖屏顶部收敛为 `← 返回挑战历史` + 章节标题 + `第 X/5 步` + 折叠 `背景 ▾`（内含背景、独立实验材料、简单/进阶切换与重开本章），隐藏占高横条，首屏直显一句目标、交互式仪器（如伏打电堆 1.6 V 实时电压表与叠层）与单层底部提交栏；
  - 提交后原地反馈，验证通过后主按钮切换为 `进入第 4/5 步：证据分析`。
- **知识库与图鉴（`src/pages/Encyclopedia.tsx`、`src/components/KnowledgeLibrary.tsx`、`src/components/Detail.tsx`）**：
  - 列表项仅展示中文名、规范上下标化学式与必要物态（如 `氯化氢 HCl 气态` vs `盐酸 HCl 水溶液`），转化路径采用「中文关系 + 配平方程式」双行排版并标示诚实模拟覆盖状态；
  - 移动端进入详情自动收起搜索框、筛选下拉、二级页签与底栏主导航；点击 `← 返回知识库` 精准恢复原搜索词、筛选条件、页码与滚动位置；全程零数据来源/外链/commit 泄露。
- **推广至经营、探索、科技、博物馆与关卡挑战（`Management.tsx`、`WorldMap.tsx`、`Technology.tsx`、`Museum.tsx`、`Challenges.tsx`）**：
  - 全部保留完整底层逻辑与功能，统一采用「紧凑列表摘要 + 单主动作 + 三级详情展开与父级返回」布局；科技节点新增移动端详情弹窗（`← 返回科技`），博物馆展品与特殊挑战接入 L3 父级返回与安全区避让。

---

## 2. 科学规则补齐：氢气氯气独立路径 + 氯气加水平衡混合体系

在原有未提交的 `light`（光照）条件、`hydrogen_chloride`（气态氯化氢）、独立光化学 `r101`（`[light]`）与点燃 `r102`（`[ignite]`）及 11 条精选常见缺项基础上，继续从生成源完成氯气加水平衡混合体系与覆盖诊断：

1. **新增混合物收集项 `chlorine_water`（`scripts/data/substances-source.ts`）**：
   - `name: "氯水"`、`formula: null`、`category: "mixture"`、`state: "liquid"`、`quantitativeResearchEligible: false`、`reviewStatus: "pending"`，绝不伪造单一分子式或摩尔质量。
2. **新增可逆平衡混合规则 `r104`（`scripts/data/reactions-source.ts`）**：
   - `name: "氯气溶于水（可逆平衡体系）"`、`reactants: "chlorine water"`、`products: "chlorine_water"`、`conditions: ["mix"]`、`reactionType: "equilibrium"`、`reversible: true`、`calculationStrategy: "mixture_unsupported"`、`stoichiometrySupported: false`、`supportedModes: ["simple"]`、`equation: "Cl2 + H2O ⇌ 氯水（含溶解 Cl2、HCl、HClO 平衡混合体系）"`、`reviewStatus: "pending"`；
   - 简单模式：未选条件时明确提示缺少「混合」；选「混合」后生成 `氯水`，说明溶解 $\text{Cl}_2$ 与 $\text{H}_2\text{O}$、$\text{HClO}$、$\text{H}_3\text{O}^+$、$\text{Cl}^-$ 共存的平衡特征。
3. **纯引擎拒绝平衡默认 100% 转化（`src/engine/reactionEngine.ts`）**：
   - 进阶定量模式中针对 `reactionType === "equilibrium" && reversible && calculationStrategy === "mixture_unsupported"` 返回 `unsupported_strategy`，明确提示：「属于可逆平衡混合体系（不默认按 100% 完全转化计算），不适用纯物质整数化学计量；请在简单模式中观察该平衡体系」，同时严格保持物理溶解（如 `r054` 食盐溶解）的原有非化学计量提示互不混淆。
4. **知识路径覆盖诚实诊断（`src/engine/knowledgeCoverage.ts`）**：
   - 识别知识库 `atlas:chlorine-water`（`Cl2(aq) + 2H2O(l) → HOCl(aq) + H3O⁺(aq) + Cl⁻(aq)`）与简单模式可逆平衡混合体系 `r104` 的对应关系，标记为 `简单模式·平衡混合（混合）` 并附边界说明「常温下转化不完全，进阶定量模式拒绝按 100% 转化计算」，不误导为 100% 纯物质完全反应；其余未开放资料路径继续诚实标注 `资料路径·未开放模拟`。

---

## 3. 全量验证与截图审阅结果

| 检查项 | 命令 | 结果 | 关键指标 |
|---|---|---|---|
| 单元测试 | `npm test` | **通过（exit 0）** | 8 个测试文件，**256 / 256** 通过 |
| 数据与闭环校验 | `npm run validate` | **通过（exit 0）** | **0 错误**；131 物质（131/131 可达）/ 149 规则（140 守恒 + 9 混合物/材料加工）/ 87 挑战 / 24 科技 DAG / 102 步 Lv.1→Lv.3 模拟 / 532 中文物质与 435 转化 |
| 正式发布门禁 | `npm run validate:release` | **预期拒绝（exit 1）** | 严格阻断全部 `pending` 科学、知识库与科学史内容 |
| 生产构建与 PWA | `npm run build` | **通过（exit 0）** | `tsc -b` 0 错误；Vite + Workbox 22 项离线预缓存 |
| 代码格式检查 | `npm run format:check` | **通过（exit 0）** | Prettier 全部文件通过 |
| 端到端与视觉审阅 | `npm run test:e2e` | **通过（exit 0）** | **17 / 17** Playwright 用例通过，覆盖 `390×844`、`360×800`、`844×390`、`800×360`、`768×1024` 与 `1440×900` |

### 已目视审阅截图与现场修复记录（`output/playwright/mobile-ux/`）
逐张检查 `390×844`、`360×800`、`844×390` 主要模式截图（大厅新手/老玩家/横屏、简单与进阶实验台、失败催化诊断、伏打电堆竖/横屏、知识库氯化氢列表与详情、经营/世界/科技/博物馆），现场定位并修复 4 项问题并重跑复验通过：
1. 360px 进阶实验台 `.lab-mode-bar` 折行 → 强制单行横向滚动并隐藏冗余锁定模式占位；
2. 挑战历史竖屏旧 `.history-stepper` 被 `.mobile-scroll-strip` 的 `!important` 覆盖未隐藏 → 补齐 `!important` 释放 40px 空间；
3. 横屏大厅与历史顶栏右上设置按钮未贴右 → 补充 `header.topbar .top-actions { margin-left: auto; }`；
4. `食盐溶解` 误匹配可逆化学平衡文案 → 精确限定 `reactionType === "equilibrium"`。

---

## 4. 诚实限制与交接说明

1. 全部 131 项物质、149 条可玩规则、435 条知识库转化及 10 章科学史内容均如实保持 `reviewStatus: "pending"`，未伪造人工科学审核。
2. 移动端验证均在 Playwright Chromium 视口模拟环境完成，iOS Safari / Android Chrome 真机触控与物理刘海安全区尚待实机验收。
3. 严格按交接指令未执行 `git commit` / `git push`，全部修改保留在工作区供 Codex 最终复核、推送与部署。
