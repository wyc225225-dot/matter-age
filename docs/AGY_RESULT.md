# agycli 续开发交付结果 · 2026-11-25

本次续开发直接在 `G:\化学小游戏` 上增量推进，保留既有工程架构、核心边界与已有功能。当前产物为 **V0.1 开发预览**，全部 72 项物质与 100 条候选规则均保持 `pending`，严禁作为已人工审核的正式 V1.0 发布。

## 一、主要修改列表

### 1. 引擎、科学表达与存档修复（工作块 1）
- [src/components/Shared.tsx](file:///G:/化学小游戏/src/components/Shared.tsx)：修复 `fmt()` 将方程式前导化学计量系数错误排版为下标的缺陷，现仅对元素/原子团后的数字使用 `<sub>`、离子电荷使用 `<sup>`。
- [src/engine/reactionEngine.ts](file:///G:/化学小游戏/src/engine/reactionEngine.ts)：
  - 改进相近规则诊断排序：结合最少缺失/多余项与最多已匹配条件/催化剂数，修复「过氧化氢 + 混合（未选催化剂）」误提示缺少加热而非缺少二氧化锰催化剂的缺陷；
  - 新增 `extraCatalysts` 多余催化剂明确提示；
  - 新增纯函数 `findPathToTarget()`（BFS 最短反应路径求解），不依赖 React/DOM/存档。
- [src/engine/hintEngine.ts](file:///G:/化学小游戏/src/engine/hintEngine.ts)：支持自由探索与多步挑战的目标导向动态三级提示；内置中文化条件标签映射，彻底移除实验台中导致 `high_heat` 被误替换为 `high_加热` 的脆弱正则。
- [src/engine/stoichiometry.ts](file:///G:/化学小游戏/src/engine/stoichiometry.ts)：对所有反应物物质的量增加非负与有限值校验。
- [src/database/index.ts](file:///G:/化学小游戏/src/database/index.ts)：新增显式 `migrateSave()` 迁移早期 v1 存档缺失字段（`achievements` / `collected` / `totalExperiments`），继续拒绝未来版本与非法引用。
- [src/stores/game.ts](file:///G:/化学小游戏/src/stores/game.ts)：防止挑战完成后重复记录尝试次数。
- [src/schemas/contentSchema.ts](file:///G:/化学小游戏/src/schemas/contentSchema.ts)：强化物质 Schema（`uses.min(1)`、无分子式不得设摩尔质量）并新增 `challengeSchema`。

### 2. P0 物质知识补全与 100 条规则资料核查（工作块 2 & 3）
- 拆分并升级生成源（单一事实源，修改源后统一生成产物）：
  - [scripts/data/references.ts](file:///G:/化学小游戏/scripts/data/references.ts)：整理并核对 PubChem 化合物 CID、OpenStax *Chemistry 2e* 对应章节及 RSC Education 实验链接。
  - [scripts/data/substances-source.ts](file:///G:/化学小游戏/scripts/data/substances-source.ts)：补齐全部 72 项物质的真实外观、物理化学性质、主要用途、自然/工业来源与游戏获取途径、具体安全警示、中文俗名及规范 `chemicalEntityId`；纯物质仅填常规密度，混合物/溶液/不确定项保持 `null`；全部保持 `reviewStatus: "pending"`。
  - [scripts/data/reactions-source.ts](file:///G:/化学小游戏/scripts/data/reactions-source.ts)：逐条整理 100 条规则，修复 3 组重复规则名称（`r035`/`r037`、`r044`/`r046`、`r045`/`r047`）及原代码共享数组引用导致 `simplificationNotes` 重复拼接 2–3 次的缺陷；修正高温固相/气固分解动画（如 `CaCO3`、`NaHCO3`、`CO2 + C`、`Fe + 水蒸气` 等不再误用液相气泡动画）并仅对真实水溶液/高温冷凝场景挂载对应简化说明；补齐 `reversible`、`reactionType`、`energyType`、`expectedObservations` 与按主题对应的参考资料入口；全部保持 `reviewStatus: "pending"`。
  - [scripts/generate-data.ts](file:///G:/化学小游戏/scripts/generate-data.ts)：统一重新生成 [src/data/substances.json](file:///G:/化学小游戏/src/data/substances.json)、[src/data/reactions.json](file:///G:/化学小游戏/src/data/reactions.json)、[src/data/challenges.json](file:///G:/化学小游戏/src/data/challenges.json) 及 4 张 PNG 图标。
  - [scripts/validate-data.ts](file:///G:/化学小游戏/scripts/validate-data.ts)：新增唯一规则名校验、30 关最短路径分档校验、逐步执行与三级提示本地化/可执行校验，并确保 `--release` 模式不覆盖审核清单文件；同步更新 [docs/CHEMISTRY_REVIEW.md](file:///G:/化学小游戏/docs/CHEMISTRY_REVIEW.md)。

### 3. 30 关独立多步挑战升级（工作块 4）
- [scripts/data/challenges-source.ts](file:///G:/化学小游戏/scripts/data/challenges-source.ts) → [src/data/challenges.json](file:///G:/化学小游戏/src/data/challenges.json) & [src/data/index.ts](file:///G:/化学小游戏/src/data/index.ts)：独立数据文件承载 30 关（基础探索 10 关单步、组合实验 10 关严格 ≥2 步、科学推演 10 关严格 3–4 步），与自由探索库存完全隔离。
- [src/pages/Challenges.tsx](file:///G:/化学小游戏/src/pages/Challenges.tsx)：展示总星级进度、关卡描述、目标预览徽章、档位说明、步数上限与历史最佳次数。
- [src/pages/Laboratory.tsx](file:///G:/化学小游戏/src/pages/Laboratory.tsx)：挑战模式仅使用关卡允许规则集，动态显示该关步数上限，支持通关后「再试一次」「下一关」「返回自由探索」；挑战仓库按最新合成排序（不泄露自由探索时间戳）；产物增加一键「放入台面」快速串联按钮；新产物解锁后自动重置提示等级至 L1。

### 4. 移动端体验、图鉴、发现网络、动画与 PWA（工作块 5）
- [src/components/ReactionAnimation.tsx](file:///G:/化学小游戏/src/components/ReactionAnimation.tsx)：10 类 Canvas 动画接入产物主色调 `accentColor` 并细化现象表现（气泡高光环、沉淀底床堆积、六角冰晶、结晶菱面、蒸气羽流等）。
- [src/components/Detail.tsx](file:///G:/化学小游戏/src/components/Detail.tsx) & [src/App.tsx](file:///G:/化学小游戏/src/App.tsx)：区分混合物/材料密度说明，新增同化学实体已收集形态跳转芯片与精确参考资料标签。
- [src/pages/Encyclopedia.tsx](file:///G:/化学小游戏/src/pages/Encyclopedia.tsx)：支持中文俗名别名搜索与发现进度展示。
- [src/pages/DiscoveryTree.tsx](file:///G:/化学小游戏/src/pages/DiscoveryTree.tsx)：升级为拓扑分层布局，支持催化剂金色虚线边、同化学实体紫色点线知识关联开关、「来源聚焦」筛选与「未知前沿」锁节点开关。
- [src/pages/Laboratory.tsx](file:///G:/化学小游戏/src/pages/Laboratory.tsx)：将右侧静态「本地存档」替换为真实可交互「已成反应」标签，并在科学知识卡展示可观察现象。
- [scripts/data/generate-icons.ts](file:///G:/化学小游戏/scripts/data/generate-icons.ts)、[vite.config.ts](file:///G:/化学小游戏/vite.config.ts)、[index.html](file:///G:/化学小游戏/index.html)、[src/styles.css](file:///G:/化学小游戏/src/styles.css)：无外部依赖程序化生成 `icon-192.png`、`icon-512.png`、`icon-512-maskable.png`、`apple-touch-icon.png` 并接入 PWA manifest 与 Workbox 预缓存；拆分 Vite vendor chunk（主块从 633 kB 降至 265 kB）；移动端底部导航适配 `safe-area-inset-bottom`。

### 5. 测试与文档更新
- [tests/unit/engine.test.ts](file:///G:/化学小游戏/tests/unit/engine.test.ts)、[tests/unit/progress.test.ts](file:///G:/化学小游戏/tests/unit/progress.test.ts)：扩充至 147 项单元测试。
- [tests/e2e/game.spec.ts](file:///G:/化学小游戏/tests/e2e/game.spec.ts)、[tests/e2e/product.spec.ts](file:///G:/化学小游戏/tests/e2e/product.spec.ts)：5 组端到端测试覆盖多步隔离挑战、俗名搜索、发现网络前沿、PNG 图标 manifest 与离线实验。
- 更新 [docs/PROGRESS.md](file:///G:/化学小游戏/docs/PROGRESS.md)、[docs/TEST_REPORT.md](file:///G:/化学小游戏/docs/TEST_REPORT.md)、[docs/DATA_SCHEMA.md](file:///G:/化学小游戏/docs/DATA_SCHEMA.md)、[docs/CHEMISTRY_REVIEW.md](file:///G:/化学小游戏/docs/CHEMISTRY_REVIEW.md)。

## 二、验证命令与真实结果

| 命令 | 退出码 | 结果摘要 |
|---|---|---|
| `npx tsx scripts/generate-data.ts` | 0 | `72 substances; 100 authored rules; 30 curated challenges; 4 PNG icons` |
| `npm run validate` | 0 | 0 错误；72/72 可达；92 守恒 + 8 manual；30/30 挑战（2 步+ 共 20 关，3 步+ 共 10 关）及全链路 L1–L3 本地化提示通过 |
| `npm run validate:release` | 1（预期） | `正式发布被阻止：仍存在 pending 科学内容。` |
| `npm test` | 0 | 2 个测试文件，147 项单元测试全部通过 |
| `npm run build` | 0 | `tsc -b` + `vite build` 通过；PWA 预缓存 21 项（1167.92 KiB），无大体积 chunk 告警 |
| `npm run test:e2e` | 0 | 构建 + 5/5 Playwright 用例通过（7.8s），360/768/1440px 8 页面零 `pageerror`、零横向溢出，生成截图于 `output/playwright/` |
| `npm run format:check` | 1 | 报告 18 个新增/修改文件与 Prettier 默认换行/尾换行规则有差异 |

### 权限与未执行命令记录
- 早期曾尝试用分号串联多条命令执行，因超出临时精确命令允许规则而被拒；随后全部拆分为单独原始命令逐一执行并全部成功。
- `npx prettier --write` 未在本次会话精确允许列表中，遵循约定未绕过权限执行，因此在 `npm run format:check` 中如实保留 18 个文件的格式化提示。
- 本次运行环境在沙盒内对含中文路径 `G:\化学小游戏` 写入会触发 Windows `EPERM`，上述已授权命令均以非沙盒模式精确执行。

## 三、仍待人工核验与未完成事项

1. **人工科学审核（核心门禁）**：72 项物质与 100 条规则均保持 `reviewStatus: "pending"`，必须由具备化学专业背景的人员逐条复核：
   - 反应条件合理性（如常温混合 vs 加热 vs 高温边界，气固反应 `CaO + CO2`、`Na2O + CO2` 的动力学与微量水分条件）；
   - 高温生成水相冷凝简化（如 `2H2 + O2`、`CuO + H2`、`Fe2O3 + 3H2`、氢氧化物分解等）；
   - 8 条 `manual` 混合物/溶液/材料加工规则（`r074`–`r081`）的科学表述与不可定量声明；
   - 简单模式中盐类收集项代表水溶液溶质实体的边界表述；
   - 逐条可观察现象、安全边界与对应 PubChem/OpenStax/RSC 文献出处核对。
2. **代码格式化**：在用户环境执行一次 `npx prettier --write src scripts tests *.ts *.json` 即可消除 `npm run format:check` 的 18 条样式提示（并在 `scripts/generate-data.ts` 写出 JSON 时末尾补 `\n` 保持一致）。
3. **真机与非功能验收**：iOS Safari / Android Chrome 真机 PWA 添加到主屏幕与离线实测、屏幕阅读器无障碍全流程、长周期存档与低端机 Canvas 帧率实测。

## 四、建议下一步

1. 按 [docs/CHEMISTRY_REVIEW.md](file:///G:/化学小游戏/docs/CHEMISTRY_REVIEW.md) 开展分批次人工科学审核，逐批签字并将确认无误的条目在源文件中更新为 `reviewed`，直至 `npm run validate:release` 通过。
2. 执行一次 Prettier 格式化并重新运行 `npm run format:check` 归零。
3. 在真实手机浏览器验证 PWA 安装、图标显示（含 Android maskable 与 iOS `apple-touch-icon`）及离线冷启动体验。
4. 审核收口 V1.0 后，再基于已预留的 `stoichiometry.ts` 与 `Reaction` 扩展字段进入 V1.5 进阶计量模式。
