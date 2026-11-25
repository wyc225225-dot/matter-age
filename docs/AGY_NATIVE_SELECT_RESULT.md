# Matter Age 移动端原生选择控件替换 & 挑战历史开篇精简交付报告

交付时间：2026-11-25  
依据任务：`docs/AGY_NATIVE_SELECT_HANDOFF.md`（含两次用户真机实拍追加反馈：原生 `<select>` 弹窗遮挡选料 + 挑战历史第 1/5 步排版啰嗦与文案口径不统一）

---

## 一、线上部署与缓存版本差异核实结论

1. **线上 GitHub Pages 当前版本核实**：
   - `origin/main` 位于 `1252687`（`fix: simplify inner gameplay and improve laboratory selection`）。
   - 实时请求 `https://wyc225225-dot.github.io/matter-age/` 返回 HTTP 200，线上产物 `assets/index-D7JeGhK8.js` 与 `assets/index-CFLil_Mh.css` 已包含 `warehouse-cat-pills`、`warehouse-sort-pill`、`chlorine_water`（131 物质 / 149 规则）与 4 项精简底栏，不再包含「探索 129 种物质」。
   - 线上 PWA `sw.js` 使用 `vite-plugin-pwa` 的 `registerType: "autoUpdate"`（启用 `skipWaiting` 与 `clientsClaim`）。
2. **两份用户真机截图的版本差异**：
   - 首份附件（`.codex-attachments/.../1000066656.jpg`，19:50）呈现 5 项底栏与「129 种物质 / 134 条规则」，对应早期 `809fba8` 或 Android/微信 WebView 尚未完成二次刷新接管的 PWA 旧缓存。
   - 追加附件（`codex-clipboard-3a3af8b4-ee94-47a6-b95e-9d308c7ff806.jpg`，21:09）已命中新版精简顶栏（`返回挑战历史` / `第 1/5 步` / `背景 ▾`），直击当前正式 `src/` 中挑战历史第 1/5 步的真实排版与文案问题。
3. **正式 `src/` 的真实遗留**：
   - 逐项核实 `1252687` 的正式 `src/` 后，确认**全站仍存在 13 处原生 `<select>`**，且挑战历史第 1 步确实存在四层文字堆叠、年代口径不统一与面向玩家无益的括注标签，均需在正式工程彻底根治。

---

## 二、全站 13 处选择控件按选项量分级改造（全站 DOM 0 原生 `<select>`）

遵循「按选项量与场景选型、保留上下文、零多层遮罩冲突、现有筛选排序与状态不丢失」原则，改造如下：

| 模块与控件 | 选项量 | 改造后交互方案 | 保留的上下文与状态 |
|---|---|---|---|
| **实验台 · 手机仓库类别 / 排序** (`Laboratory.tsx`) | 10 / 2 | 保留横向类别胶囊条与排序切换芯片，补齐 `aria-pressed` 与非默认排序激活高亮 | 已选 4 槽、材料网格与底部「完成选择」全程无遮挡 |
| **实验台 · 平板/桌面仓库类别 / 排序** (`Laboratory.tsx`) | 10 / 2 | `CompactSelect`（类别 2 列网格 / 排序紧凑列表），消除平板触控系统弹窗 | 锚定在触发按钮下方，仓库卡片保持可见 |
| **实验台 & 特殊挑战 · 催化剂** (`Laboratory.tsx`, `SpecialChallengeRunner.tsx`) | 1–2（可扩展） | 纯一键触控胶囊（补齐 `aria-pressed`），彻底删除 1px 隐藏原生 `.catalyst-select-sync`；`>4` 项自动切为 `CompactSelect` | 杜绝 Tab 误入隐藏原生 `<select>` |
| **实验台 · 配平方程式选择器** (`Laboratory.tsx`) | 136 | **可搜索列表型 `CompactSelect`**（支持 `R006` / 反应名检索）+ 保留上下题按钮与计数 | 配平系数与分子模型保持可见，不铺满全屏 |
| **物质图鉴 · 分类 / 排序** (`Encyclopedia.tsx`) | 10 / 2 | 分类用 **2 列网格 `CompactSelect`**；排序改为 **内联 2 项分段切换**（`编号排序` / `发现时间`） | 10 类一屏呈现免滚动，排序 1 拍即切 |
| **知识库 · 转化路径 / 元素族筛选** (`KnowledgeLibrary.tsx`) | 5 / 11 | 转化 5 项改为 **横向胶囊筛选条**；元素族 11 项改为 **2 列网格 `CompactSelect`** | 搜索框、条数与卡片列表保持可见 |
| **发现网络 · 类别 / 聚焦路径（竖屏 + 横屏）** (`DiscoveryTree.tsx`) | 10 / 最多 132 | 类别用 **2 列网格 `CompactSelect`**；聚焦物质用 **列表型 `CompactSelect`**（`>6` 项自动启用搜索） | Portal 渲染不被横屏右侧窄栏裁切，左侧画布全程可见 |
| **挑战历史 Ch.01 · 气体指认** (`History.tsx`) | 3 | **内联三选一单选卡片组**（`role="radiogroup"` / `role="radio"`） | 直接对照上方木条/石灰水观测结果点选，零遮挡 |
| **挑战历史 Ch.02 · 质量单位** (`History.tsx`) | 3 | **内联三项分段单选**（`g（克）` / `kg（千克）` / `mg（毫克）`） | 紧贴数值输入框，单点切单位无弹窗 |

### 通用组件 `src/components/CompactSelect.tsx` 与 `src/styles/compact-select.css`
- 基于 `createPortal(..., document.body)` 固定锚定定位，按剩余空间自动上下翻转、视口内边距钳制与横屏 58px 左轨避让；采用实色高对比深底（`#122331`）与清晰边框阴影，**不叠加全屏暗色遮罩**，通过外部 `pointerdown` 关闭，避免多层遮罩冲突。
- 完整支持触控、`ArrowDown`/`ArrowUp`/`Home`/`End`/`Enter`/`Space`/`Tab`/`Escape`；`Escape` 在捕获阶段拦截防止误关父弹窗，关闭与选中后自动将焦点恢复至触发按钮；打开时不自动弹出手机软键盘，搜索输入同步归零高亮索引避免快速回车竞态。

---

## 三、挑战历史独立诊断与全 10 章文案/排版精简（`History.tsx` & `historyChapters.json`）

### 1. 基于真机实拍（`空气中的秘密` 第 1/5 步）的独立诊断
1. **首屏四层文字堆叠与高度重复**：同时平铺「研究问题框（带英文 `RESEARCH QUESTION`）」+「时代背景段」+「24 字括注长标题的 3 条背景线索框」+「带引号的助手旁白框」，且顶栏右上角另有一个名为「背景 ▾」的按钮，视觉拥挤且与首屏概念冲突。
2. **开发者元标注泄露给玩家**：全 5 个可玩章节均直接向玩家展示 `（虚构教学旁白）`（如 `实验室助手（虚构教学旁白）`），另有 `时代背景线索（最终人物归属与结论将在完成实验后揭晓）`、`科学史教学声明（pending 待审校）`、`（触屏友好）`、`（幂等账本防重放）` 等非玩家语境括注。
3. **同一历史时期年代口径不统一**：例如 Ch.01 同时出现 `1770年代（1774 普里斯特利实验）`、`18 世纪 70 年代`、`1770 年代`；Ch.03 混用 `1780年代` 与 `18 世纪 80 年代`；Ch.07 混用 `1869年` 与 `19 世纪 60 年代`；且各章 `eraYear` 普遍缺失数字与中文间统一空格。
4. **按钮语义偏状态机术语**：`进入阶段 2：提出科学假设` / `进入阶段 3：重现经典实验` / `进入第 4/5 步：证据分析` / `完成推理并揭晓历史真相` 过长且与顶部 `第 X/5 步` 重复。

### 2. 正式工程落地改造（保留五阶段纯引擎状态机与准确史实）
- **统一全 10 章年代写法**（`src/data/historyChapters.json`）：
  - Ch.01 统一为 **`1770 年代`**（同步移除时间线卡片上剧透普里斯特利的括注）；Ch.02 统一为 **`18 世纪后期`**；Ch.03 统一为 **`1780 年代`**；Ch.04 统一为 **`1800 年`**（正文区分 `1800 年前后` 与 `1800 年前`）；Ch.05 **`1828 年`**；Ch.06 **`1830 年代`**；Ch.07 统一为 **`1869 年`** / **`1869 年前后`**；Ch.08 **`1898 年`**；Ch.09 **`1909–1911 年`**；Ch.10 **`1909–1913 年`**。
- **去除无益括注与旁白包装，不伪造历史引文**：
  - 数据源继续如实保留 `fictionalized: true` 与完整史实/教学区分说明 `factDistinctionNote`（仅第 5 步揭晓与资料抽屉完整呈现，不伪造任何历史人物引文）；
  - 玩家界面彻底移除 `（虚构教学旁白）`、仿引文引号、`RESEARCH QUESTION · 核心研究问题`、`HISTORICAL MILESTONE REVEALED`、`（触屏友好）`、`（幂等账本防重放）` 等包装文案；并将移动端顶栏右上按钮由 `背景 ▾` 改为 `资料 ▾`（保留 `aria-label="章节背景与材料"`）。
- **重构第 1/5 步信息层级**（`src/pages/History.tsx` & `src/styles/inner-polish.css`）：
  - 收敛为清晰 3 层：**年代与主题标签 + 核心研究问题与单段脉络** → **「本关任务」行动提示卡** → **默认折叠、单点可展开的「时代背景（2 条史实）」**（删去各章第 3 条重复流程说教，既大幅降低首屏阅读负担，又保证科学史背景随时可访问）。
- **自然动作语义主按钮**：统一移动端与桌面端各阶段主操作按钮为 `开始提出假设` → `开始实验` → `整理证据与结论` → `揭晓历史真相`，纯引擎 `canAccessHistoryStage()` 五阶段门禁与存档恢复保持 100% 不变。

---

## 四、全量验证与 13 张真实截图审阅

| 检查项 | 命令 | 结果 | 关键指标 |
|---|---|---|---|
| 单元测试 | `npm test` | **PASS（exit 0）** | 8 文件，**256 / 256** 通过 |
| 数据与逻辑校验 | `npm run validate` | **PASS（exit 0）** | 自动错误 **0**（131 物质 / 149 规则 / 10 章历史 Schema / 102 步闭环 / 532 中文物质 / 435 转化） |
| 正式发布门禁 | `npm run validate:release` | **预期拒绝（exit 1）** | 严格阻断 `pending` 科学及科学史内容 |
| 生产构建与 PWA | `npm run build` | **PASS（exit 0）** | `tsc -b` 0 错误，Workbox 预缓存 22 项资产 |
| 格式检查 | `npm run format:check` | **PASS（exit 0）** | Prettier 全部通过 |
| 端到端回归 | `npm run test:e2e` | **PASS（exit 0）** | **20 / 20** 通过（含 `tests/e2e/native-select-mobile.spec.ts` 竖屏 `390×844` 与横屏 `844×390` 全量断言） |

### 目视审阅截图清单（`output/playwright/native-select-fix/`，全部 13 张逐一核验）
- **竖屏 `390×844`（9 张）**：`portrait-390-lab-picker-filtered.png`、`portrait-390-balancing-expanded.png`、`portrait-390-book-category-expanded.png`、`portrait-390-kb-elements-expanded.png`、`portrait-390-tree-category-expanded.png`、`portrait-390-history-ch01-opening.png`、`portrait-390-history-ch01-opening-facts-expanded.png`、`portrait-390-history-ch01-radio.png`、`portrait-390-history-ch02-unit.png`。
- **横屏 `844×390`（4 张）**：`landscape-844-balancing-expanded.png`、`landscape-844-book-category-expanded.png`、`landscape-844-tree-category-expanded.png`、`landscape-844-history-ch01-opening.png`。
- **审阅期间发现并现场修复的 3 项真实缺陷**：① `CompactSelect` 120ms 透明度淡入导致首帧半透底 → 改为实色深底 `#122331`；② 横屏配平选择器头部因 flex 收缩轻度裁切 → 增加 `flex-shrink: 0`；③ 搜索过滤后紧接 `Enter` 时的 `activeIndex` 异步重置竞态 → 改为输入同步归零并兜底边界。

---

## 五、诚实限制与交接说明

1. **桌面模拟与真机边界**：本轮全部竖屏（`390×844`）与横屏（`844×390`）验证均运行于 Windows 桌面 Playwright Chromium 视口模拟，**不等同于** Android Chrome、微信内置浏览器或 iOS Safari 真机系统弹窗与物理触控验收；上线后仍需真机刷新并做最终实测。
2. **PWA 缓存接管提示**：线上启用 PWA Service Worker 离线预缓存，本次修改上线部署后，曾访问过旧版的 Android 浏览器可能需要关闭重开或二次刷新以激活新版 SW。
3. **审核与提交流程**：全部化学及科学史内容维持 `reviewStatus: "pending"`；按交接要求未执行 `git commit` / `git push`，全部原生选控与历史精简改动均已保留在当前工作区供 Codex 复核上线。
