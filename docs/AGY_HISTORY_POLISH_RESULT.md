# Matter Age · 挑战历史模式深化交付报告（AGY_HISTORY_POLISH_RESULT）

完成时间：2026-11-25  
工程目录：`G:\化学小游戏`  
需求依据：[docs/HISTORY_MODE_BRIEF.md](file:///G:/化学小游戏/docs/HISTORY_MODE_BRIEF.md) 与用户补充指令

---

## 1. 本轮实际修改摘要

在完整保留既有 V1.0 简单探索、V1.5 定量化学、GitHub 本地知识库（129 物质 / 134 规则 / 36+36+15 挑战 / 118 元素 / 532 物质资料 / 435 转化事实）及 V1.6 经营/科技/世界/博物馆/导航成果的基础上，对「挑战历史」进行了系统性深化：

1. **10 章时间线全面对齐新稿**（[historyChapters.json](file:///G:/化学小游戏/src/data/historyChapters.json)、[historicalFigures.json](file:///G:/化学小游戏/src/data/historicalFigures.json)）：
   - 保留已完成的 5 个可玩章节 ID（`hist_01`、`hist_02`、`hist_03`、`hist_04`、`hist_07`）、原有 16 件博物馆藏品 ID 与全部奖励账本键；
   - 将第 05/06/08/09/10 个预告章节严格对齐新稿：`05 生命物质的边界（1828 维勒尿素）`、`06 电流的化学法则（1830年代 法拉第电解定律）`、`08 矿石中的未知信号（1898 居里夫妇发现钋与镭，仅虚拟数据分析）`、`09 原子内部的世界（1909–1911 卢瑟福/盖革/马斯登）`、`10 来自空气的农业革命（1909–1913 哈伯/博施合成氨）`，均明确标为预告，不冒充已实装；
   - 人物档案扩充至 13 位/合作团队，拒绝单一英雄归因，全部保持 `reviewStatus: "pending"`。
2. **可恢复五阶段研究会话与纯引擎门禁**（[historyEngine.ts](file:///G:/化学小游戏/src/engine/historyEngine.ts)、[game.ts](file:///G:/化学小游戏/src/stores/game.ts)、[saveSchema.ts](file:///G:/化学小游戏/src/schemas/saveSchema.ts)）：
   - 将原 `History.tsx` 局部 `useState` 全面升级为持久化 `HistorySessionState`（存入 `save.historyProgress[id].session` 与 `activeHistoryChapterId`），离开页面、返回时间线、刷新浏览器或导出导入存档均可精准恢复当前章节、难度、阶段、已做实验记录、尝试与提示计数；
   - 纯引擎 `canAccessHistoryStage()` 禁止跳过未完成的背景/假设/实验/分析阶段；
   - `switchHistorySessionDifficulty()` 切换难度不清空既有失败尝试与提示，且切向进阶模式时要求重新通过进阶实验检验；重开章节须显式点击「重新开始本章 → 确认重开本章」。
3. **五章核心谜题深度差异化（简单 vs 进阶）**：
   - **CH.01 空气中的秘密**：三瓶气体交叉检验台，明确声明仅在限定 `{O₂, CO₂, N₂}` 候选池内方可用排除法区分氮气（一般场景下熄灭木条+石灰水不变不足以唯一鉴定氮气）；缺失石灰水检验时仅指出证据缺口而不泄密；进阶要求 ≥6 项检验 + 复用共享计量引擎 `r026` 核算 6 份 H₂O₂ 分解产氧量（3 份）。
   - **CH.02 消失的质量**：开放系统 / 密闭系统可切换虚拟天平对照，显式横幅标明「教学模拟数据，并非拉瓦锡原始手稿读数」；准确传达系统边界进出概念而非「开放体系不守恒」；进阶要求计算逸出 CO₂ 质量并支持 `g / kg / mg` 真实单位换算校验（如 `0.044 kg`）。
   - **CH.03 水的真正身份**：在实验台直接调用共享 `execute(r006)` 与现代教学对照 `execute(r005)`，明确区分 1780 年代历史合成/热分解与 1800 年后水电解演示；进阶调用共享 `checkEquationBalance()` 要求最简整数比 `2:1:2` 并校验「化学计量系数 vs 下标」概念。
   - **CH.04 人类的第一块电池**：触屏友好叠层装配器（零桌面拖拽依赖，支持每层 `↑ / ↓ / 移除` 重排与清空），支持切换 `锌+铜（教学标准）`、`锌+银（1800 皇家学会历史原型）` 与 `铜+铜（同类金属对照）`，真实模拟同类金属 0 V、干燥绝缘纸板断路 0 V 与反向极性净电压抵消，显式声明单节 0.8 V 为教学简化示意值。
   - **CH.07 尚未发现的元素**：实验阶段刻意隐去现代原子序数与后世元素名（镓 Ga），仅凭 1869 相对原子质量与氧化物通式排布 4 张元素卡并要求显式点击「标记铝下方未知空位」；进阶减少表头线索，要求独立选定氧化物 `E₂O₃` 与定量原子量区间（66–72）；进入第 5 阶段「历史揭晓」方呈现 1875 年镓的实测对照与门捷列夫/迈耶尔多元贡献。
4. **专业历史视觉、防剧透揭晓与实际内容奖励**（[HistoryVisuals.tsx](file:///G:/化学小游戏/src/components/HistoryVisuals.tsx)、[History.tsx](file:///G:/化学小游戏/src/pages/History.tsx)、[v16.css](file:///G:/化学小游戏/src/styles/v16.css)）：
   - 原创本地复古 SVG 章节仪器场景（5 章各异）与铜金镌刻风科学家徽章，零外部不稳定图片链接；
   - 时间线默认聚焦可继续研究章节，支持 `#history/<chapterId>` 深链；第 1–4 阶段隐藏最终人物与结论，第 5 阶段完整揭晓并展示多维星级明细（证据完整度、结论正确率、尝试、提示）与解锁的实际内容奖励（科学家档案、历史手稿、理论条目、历史勋章、纪念仪器、博物馆藏品），支持一键跳转 `#museum` 与 `#tech`；
   - 反刷奖励：首次通关（`history_first:<id>`）与进阶首通（`history_adv_bonus:<id>`）严格幂等；复玩奖励设有限上限 `2` 次（`history_repeat:<id>:1..2` 记入 `claimedRewardIds`），超限后仅刷新星级与研究档案、不再产出金币/RP。

---

## 2. 权威史料来源（均保持 `pending` 待专业审校）

- Science History Institute Scientific Biographies（Joseph Priestley, Carl Wilhelm Scheele, Antoine-Laurent de Lavoisier, Marie-Anne Paulze Lavoisier, Alessandro Volta, Michael Faraday, Dmitri Mendeleev & Julius Lothar Meyer）
- American Chemical Society National Historic Chemical Landmarks（Joseph Priestley & Discovery of Oxygen）
- Royal Society of Chemistry Periodic Table History
- NobelPrize.org Facts & Biographies（Marie Curie 1911, Ernest Rutherford 1908, Fritz Haber 1918）
- Encyclopaedia Britannica & OpenStax *Chemistry 2e*

---

## 3. 测试、存档恢复与验证结果

| 验证项 | 命令 | 实际结果 |
|---|---|---|
| 单元测试 | `npm test` | **224 / 224 通过**（6 个测试文件，新增 [history-polish.test.ts](file:///G:/化学小游戏/tests/unit/history-polish.test.ts) 覆盖五章双难度、防跳关、难度切换保错、单位换算、反刷上限与会话存档恢复） |
| 数据校验 | `npm run validate` | **0 错误**（含 10 章历史/13 人物 Schema、24 科技 DAG、15 特殊挑战与 102 步 Lv.1→Lv.3 闭环） |
| 发布门禁 | `npm run validate:release` | **预期拒绝（exit 1）**（存在 `pending` 科学/科学史内容） |
| 生产构建 | `npm run build` | **通过**（`tsc -b` 0 错误 + Workbox PWA 预缓存 22 项） |
| 端到端回归 | `npm run test:e2e` | **11 / 11 通过**（保留原有 10 组 + 新增 [history-polish.spec.ts](file:///G:/化学小游戏/tests/e2e/history-polish.spec.ts) 真人流程走完 5 章含 Ch02 进阶、刷新恢复、深链、档案与博物馆联动） |
| 格式校验 | `npm run format:check` | **通过** |

- **存档兼容性验证**：保留 `Save.version = 3`，新增字段全部可选并自动默认补齐；`v1 → v3`、`v2 → v3`、旧版 `v3` 及含中途历史会话的 `v3` 均通过 `validateSave()` 与浏览器刷新实测，不清空旧进度、不重放历史奖励。

---

## 4. 视觉截图目视检查（`output/playwright/history-polish/`）

- 10 章时间线与焦点续玩横幅（1440px）：[desktop-timeline.png](file:///G:/化学小游戏/output/playwright/history-polish/desktop-timeline.png)
- CH.01 空气中的秘密证据台与揭晓（1440px）：[desktop-ch01-gas.png](file:///G:/化学小游戏/output/playwright/history-polish/desktop-ch01-gas.png) · [desktop-ch01-discovery.png](file:///G:/化学小游戏/output/playwright/history-polish/desktop-ch01-discovery.png)
- CH.02 消失的质量进阶模式与单位换算（1440px）：[desktop-ch02-mass-advanced.png](file:///G:/化学小游戏/output/playwright/history-polish/desktop-ch02-mass-advanced.png)
- CH.04 人类的第一块电池 1800 锌-银叠层台（1440px）：[desktop-ch04-voltaic.png](file:///G:/化学小游戏/output/playwright/history-polish/desktop-ch04-voltaic.png)
- CH.07 尚未发现的元素 1869 周期卡片与空位预言（1440px）：[desktop-ch07-periodic.png](file:///G:/化学小游戏/output/playwright/history-polish/desktop-ch07-periodic.png)
- 已解锁手稿、勋章与 8 位科学家档案视图（1440px）：[desktop-archives.png](file:///G:/化学小游戏/output/playwright/history-polish/desktop-archives.png)
- 平板（768px）与移动端（390px）零横向溢出：[tablet-timeline.png](file:///G:/化学小游戏/output/playwright/history-polish/tablet-timeline.png) · [mobile-timeline.png](file:///G:/化学小游戏/output/playwright/history-polish/mobile-timeline.png)

---

## 5. 仍待做与诚实边界

1. 全部化学规则与科学史内容均保持 `pending`，上线正式版前须由化学与科学史专业人员逐条人工审校签核。
2. 预告章节（CH.05 尿素、CH.06 电解定律、CH.08 钋与镭虚拟分析、CH.09 散射与核模型、CH.10 合成氨工业化）及困难模式、V1.8 实验室装饰摆放系统按规划留待后续版本实施，不在本轮伪造。
3. 实体移动设备的触控手感与读屏无障碍走查尚待真机验收。
