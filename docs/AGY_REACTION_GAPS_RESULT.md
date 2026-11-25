# Matter Age · 实验台规则与知识库路径断层修复交付报告

完成时间：2026-11-25

## 1. 问题背景与科学核实

用户反馈：`氢气 + 氯气` 在本地知识库存在转化路径，但实际实验台缺少「光照」条件并直接报未匹配规则。

### 1.1 科学参考核实（Harvard Natural Sciences Lecture Demonstrations）
核实参考资料 `https://sciencedemonstrations.fas.harvard.edu/presentations/photochemical-reaction-hydrogen-and-chlorine`（连同 OpenStax *Chemistry 2e* §18.5 / §18.11 与 PubChem CID 313）：
- **反应方程式与配平**：$\text{H}_2\text{(g)} + \text{Cl}_2\text{(g)} \xrightarrow{h\nu} 2\text{HCl(g)}$（1:1:2 整数配比，原子、电荷与按 `1 份 = 1 mol` 基准换算的理论质量 `2.016 + 70.900 = 72.916 g` 严格守恒）。
- **直接产物为气态氯化氢而非盐酸**：反应直接生成共价分子气体 `氯化氢（HCl(g)）`，不能把产物直接视作 `盐酸（HCl(aq) 水溶液）`；只有当 `HCl(g)` 溶于水电离后才形成盐酸溶液。
- **光照不等于所有任意光源**：$\text{Cl–Cl}$ 键能约 `243 kJ/mol`，低能量长波光（如红光、黄光 LED）无法引发反应；必须由足够高能量的短波光子（紫外光或蓝紫光）打断 $\text{Cl–Cl}$ 键生成氯自由基（$\text{Cl}_2 + h\nu \rightarrow 2\text{Cl}^\bullet$），进而触发剧烈放热的自由基链式反应。
- **路径独立性**：点燃燃烧（`氢气在氯气中燃烧`，`conditions: ["ignite"]`）与短波光化学引发（`conditions: ["light"]`）是两条相互独立的引发路径，不得随意合并为必须同时满足的同一组条件。
- **审核状态诚实保留**：新增物质与全部新增规则均保持 `reviewStatus: "pending"`，绝不伪造人工审核；玩家网页严格不展示数据提供方、外部参考链接、仓库 commit 等溯源信息。

---

## 2. 知识库（435 条）与实验台覆盖的系统性缺项清单

修复前通过脚本对 `src/data/knowledgeTransformations.json`（435 条）与 `src/data/substances.json`（129 项）/ `src/data/reactions.json`（134 条）进行逐条结构化对齐：

| 缺项分类 | 修复前数量 | 修复策略 |
|---|---:|---|
| 1. `H2 + Cl2` 缺 `light` 条件与气态 `HCl(g)` 收集项 | 1 | **已补齐**：新增 `light` 条件、独立气态收集项 `hydrogen_chloride`（避免重复 `kb_HCl_g`）、独立 `r101`（光照）与 `r102`（点燃）规则，以及下游 `r103`（`NH3 + HCl(g) → NH4Cl`） |
| 2. 反应物与产物均已在可玩目录中、非 `equation-only`、无特殊气氛、科学明确无歧义的常见缺项 | 11 | **已补齐**：全部在生成源 `scripts/data/github-expansion.ts` 中显式纳入并经守恒/可达/确定性校验 |
| 3. 反应物可玩但产物/条件存在科学歧义或多产物竞争（如 `Na+O2→Na2O` 点燃实以 `Na2O2` 为主、`NO2+2HCl`、`N2+O2` 常规加热不发生、`Cu+O2→Cu2O`、`Fe+O2→Fe2O3`） | 5 | **审慎保留未开放**：拒绝盲目将上游条目直转游戏规则，界面明确标示「资料路径·未开放模拟」 |
| 4. 仅方程式学习资料（`equation-only`，缺完整实验条件模型，如 `Ca+Cl2`、`Cu+Cl2`、`N2+3H2→2NH3` 哈伯法需高压催化） | 193 | **保留未开放**：知识库与实验台失败诊断明确标注「仅方程式学习资料，尚未开放实验台模拟」 |
| 5. 涉及实验台未收录物质、溶液态、离子或瞬态自由基（如 `O3(g) → O(g) + O2(g)` 含氧原子自由基） | 154 | **保留未开放**：界面明确标注原因，不硬造瞬态自由基为可收集瓶装物品 |
| 6. 依赖特殊反应气氛控制（`oxygen` / `inert` 气氛） | 8 | **保留未开放**：当前实验台未建模气氛控制，诚实标注未开放模拟 |
| 7. 常温无明显变化对照记录（`no-reaction`） | 1 | **保留对照**：不作为合成规则 |

> 修复后知识库总覆盖：**74 / 435 条**已真实开放实验台模拟，**361 / 435 条**明确标注为「资料路径·未开放模拟」（**绝不宣称 435 条全部可玩**）。

---

## 3. 本轮具体修复项

### 3.1 条件系统、类型、校验与设备映射
- **`src/types/index.ts` & `src/schemas/contentSchema.ts`**：`Condition` 与 `conditionSchema` 新增 `"light"`（共 11 项实验条件）。
- **`src/data/index.ts` & `src/engine/hintEngine.ts`**：补齐中文名与图标 `{ id: "light", name: "光照", symbol: "☀" }` 及三级提示本地化标签。
- **`src/data/equipment.json` & `src/data/technologies.json` & `src/data/economy.json`**：
  - 经营模式将 `"light"` 映射至 Lv.2 `eq_electrolyzer`（`unlockedConditions: ["electricity", "light"]`，由 `tech_electrolysis` 解锁），体现光化学反应需专用短波光源而非基础台面任意日常灯光，同时保持 Lv.1 初始条件仍为 `["mix"]` 及 8 台功能设备不变；
  - `economy.json` 补充 `chlorine` 与 `hydrogen_chloride` 交易定价以便经营制备闭环。
- **`src/styles.css`**：桌面端 `.conditions-grid` 调整为 `repeat(6, 1fr)`（11 个按钮呈 6+5 两行紧凑排布）；手机竖屏保持 4 列（4+4+3）、横屏保持 3 列（3+3+3+2），全视口可访问且零横向溢出。

### 3.2 新增物质与规则（严格从生成源生成 JSON）
- **`scripts/data/references.ts`**：补充 Harvard 光化学演示参考常量，并在 `scripts/validate-data.ts` 补齐 `harvard.edu` 标签与 `light` 条件提示本地化检查。
- **`scripts/data/substances-source.ts`**：新增气态化合物 `hydrogen_chloride`（`氯化氢`，`HCl`，`state: "gas"`，`category: "compound"`，`chemicalEntityId: "HCl"`，`supply: false`，`reviewStatus: "pending"`），与既有 `hydrochloric_acid`（`盐酸`，`HCl(aq)`，液态溶液）清晰区分，且 `github-expansion.ts` 自动复用 `hydrogen_chloride`，无重复 `kb_HCl_g` ID。可达性 130/130（经 `水→电解→氢气` + `氯气标本` + `光照` 合成）。
- **`scripts/data/reactions-source.ts`**：
  - `r101`：**氢气与氯气光化学反应**（`H2 + Cl2 → 2HCl`，`conditions: ["light"]`，简单+进阶定量，附短波光源边界与气体/盐酸区分说明）；
  - `r102`：**氢气在氯气中燃烧**（`H2 + Cl2 → 2HCl`，`conditions: ["ignite"]`，与 `r101` 完全独立，不同时要求光照+点燃；无条件提交 `H2+Cl2` 时确定性提示缺少 `光照`，同时勾选光照+点燃则返回多规则冲突提示）；
  - `r103`：**气态氯化氢与氨气化合**（`NH3 + HCl → NH4Cl`，`conditions: ["mix"]`，为 `hydrogen_chloride` 提供真实气相白烟下游反应，且与 `r033` `盐酸+氨气` 互不冲突）。
- **`scripts/data/github-expansion.ts`**：补齐 `activation.light = "light"`，并精选纳入 **11** 条科学明确、反应物/产物均已存在、原子与质量严格守恒的常见缺项：
  1. `github_magnesium_acid`：`Mg + 2HCl(aq) → MgCl2(aq) + H2`（混合）
  2. `github_magnesium_oxide_acid`：`MgO + 2HCl(aq) → MgCl2(aq) + H2O`（混合）
  3. `github_magnesium_hydroxide_acid`：`Mg(OH)2 + 2HCl(aq) → MgCl2(aq) + 2H2O`（混合）
  4. `github_neutralization`：`HCl(aq) + NaOH(aq) → NaCl(aq) + H2O`（混合）
  5. `github_magnesium_hydroxide_sodium`：`MgCl2(aq) + 2NaOH(aq) → Mg(OH)2 + 2NaCl(aq)`（混合）
  6. `github_sulfur_combustion`：`S8 + 8O2 → 8SO2`（点燃）
  7. `github_copper_dilute_nitric`：`3Cu + 8HNO3(aq) → 3Cu(NO3)2(aq) + 2NO + 4H2O`（混合）
  8. `github_binary_lithium_o2_li2o`：`4Li + O2 → 2Li2O`（点燃）
  9. `github_binary_magnesium_n2_mg3n2`：`3Mg + N2 → Mg3N2`（点燃）
  10. `github_binary_tin_o2_sno2`：`Sn + O2 → SnO2`（加热）
  11. `github_common_zinc_sulfur`：`8Zn + S8 → 8ZnS`（加热）

### 3.3 纯引擎覆盖度判定与诚实失败反馈（UI 不自行推断反应）
- **新增纯引擎模块 `src/engine/knowledgeCoverage.ts`**（零 React/DOM/存档依赖）：
  - `evaluateKnowledgeTransformationCoverage` / `summarizeKnowledgeCoverage`：按化学式、物态与溶液边界精确计算每条知识库转化是否已开放实验台模拟，并给出结构化原因；
  - `findUnopenedKnowledgePathsForReactants`：仅在实验台 `unmatched` 时由纯引擎查询是否存在「知识库资料已收录但尚未开放模拟」的对照条目（不执行、不推断、不解锁产物）。
- **增强 `src/engine/reactionEngine.ts`**：
  - `diagnoseExperimentFailure()` 明确区分三类失败：
    1. **缺条件/缺催化剂**（`missing_requirements`：如 `氢气 + 氯气` 未选光照 → 明确提示「组合有已收录路径，但缺少所需反应条件或催化剂…缺少：光照」，高亮 `☀ 光照` 并提供一键选中）；
    2. **资料路径尚未开放模拟**（`unopened_knowledge_path`：如 `钙 + 氯气` → 明确提示「未收录可玩规则：知识库中存在相关资料路径…尚未开放实验台模拟」）；
    3. **未收录可玩规则**（`unmatched`：如 `铁 + 石英砂` → 提示「当前组合尚未收录可玩规则」）。
- **更新 `src/components/KnowledgeLibrary.tsx` & `src/pages/Laboratory.tsx`**：
  - 知识库转化列表顶部如实显示 `共收录 435 条转化资料：当前实验台已开放 74 条模拟，其余 361 条为资料路径（尚未开放实验台模拟）`，新增「已开放实验台 / 资料路径（未开放模拟）」筛选，列表项与详情页清晰展示模拟状态、条件与未开放原因；全程零溯源/外链/commit 泄露。

---

## 4. 仍未开放项（诚实边界）

1. 知识库中其余 **361 / 435** 条资料路径（含 193 条仅方程式资料、154 条含未收录物质/离子/瞬态自由基如 `O3(g) → O(g) + O2(g)`、8 条需特殊气氛、1 条无反应记录与 5 条多产物/边界待核验条目）仍明确保持为知识参考，未开放实验台模拟。
2. 全部 **130** 项物质、**148** 条可玩规则、**435** 条知识库转化及科学史内容仍为 `reviewStatus: "pending"`，待化学专业人员逐条人工审核后再进入 `release` 通道。
3. 竖屏/横屏交互验收基于 Playwright Chromium 视口模拟（360×800 / 390×844 / 844×390），真机触控手感待实体机复测。

---

## 5. 验证结果与截图审阅

| 检查项 | 命令 | 结果 | 关键指标 |
|---|---|---|---|
| 单元测试 | `npm test` | **通过（exit 0）** | 8 个测试文件，**254 / 254** 通过（新增 `tests/unit/reaction-gaps.test.ts` 8 组回归测试） |
| 数据与闭环校验 | `npm run validate` | **通过（exit 0）** | **0 错误**；130 物质（130/130 可达）/ 148 规则（140 守恒 + 8 人工核验）/ 87 挑战 / 24 科技 DAG / 102 步 Lv.1→Lv.3 模拟 / 532 中文物质与 435 转化全通过 |
| 正式发布门禁 | `npm run validate:release` | **预期拒绝（exit 1）** | 严格阻断 `pending` 内容 |
| 生产构建与 PWA | `npm run build` | **通过（exit 0）** | `tsc -b` 0 错误；Vite + Workbox 22 项离线预缓存 |
| 代码格式校验 | `npm run format:check` | **通过（exit 0）** | Prettier 全部文件通过 |
| 端到端回归与截图 | `npm run test:e2e` | **通过（exit 0）** | **17 / 17** Playwright 用例全通过（原有 15 组零回归 + 新增 `tests/e2e/reaction-gaps.spec.ts` 2 组全链路） |

已逐张目视审阅 `output/playwright/reaction-gaps/` 全部 7 张真实运行截图：
- `desktop-h2-cl2-missing-light.png`：11 条件呈 6+5 两行整洁排布，`氢气 + 氯气` 无光照时准确提示 `缺少：光照` 并高亮 `☀ 光照` 按钮。
- `desktop-h2-cl2-light-success.png`：选 `光照` 后发现气态 `氯化氢 (HCl)`（非盐酸），方程式 `H₂ + Cl₂ → 2HCl`，右侧科学卡清晰说明短波光照自由基机理与气态/盐酸边界。
- `desktop-h2-cl2-advanced-112.png`：进阶模式 1 份氢气 + 1 份氯气 + 光照 → 完全反应生成 2 份氯化氢，理论质量 `72.916 g = 72.916 g` 守恒与分子重组图完整呈现。
- `desktop-kb-h2-cl2-playable.png` / `desktop-kb-o3-unopened.png`：知识库诚实显示 `74 / 435` 已开放、`361 / 435` 未开放模拟，`H2 + Cl2` 标示 `实验台已开放模拟`，`O3 → O + O2` 标示 `资料路径 · 尚未开放实验台模拟`，页面零来源/外链/commit 泄露。
- `portrait-390-light-condition.png` & `landscape-844-light-condition.png`：手机竖屏（390×844 / 360×800）4+4+3 与横屏（844×390）3+3+3+2 网格均完整可见、可点击操作并合成氯化氢，零横向溢出与零遮挡。
