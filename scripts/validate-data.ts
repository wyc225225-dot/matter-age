import { readFileSync, writeFileSync } from "node:fs";
import {
  substanceSchema,
  reactionSchema,
  challengeSchema,
  quantitativeChallengeSchema,
} from "../src/schemas/contentSchema";
import {
  economyConfigSchema,
  equipmentSchema,
  explorationEventSchema,
  historicalFigureSchema,
  historyChapterSchema,
  labLevelSchema,
  museumItemSchema,
  orderSchema,
  regionSchema,
  specialChallengeSchema,
  technologySchema,
} from "../src/schemas/v16Schema";
import {
  substances,
  reactions,
  byId,
  challenges,
  quantitativeChallenges,
  economyConfig,
  labLevels,
  equipmentList,
  equipmentById,
  technologies,
  techById,
  orders,
  regions,
  explorationEvents,
  historicalFigures,
  figureById,
  historyChapters,
  museumItems,
  museumById,
  specialChallenges,
} from "../src/data";
import { checkConservation } from "../src/engine/stoichiometry";
import {
  execute,
  findPathToTarget,
  reachable,
} from "../src/engine/reactionEngine";
import { verifyQuantitativeChallenge } from "../src/engine/quantitativeChallengeEngine";
import { getHint } from "../src/engine/hintEngine";
import { validateTechDAG } from "../src/engine/technologyEngine";
import { simulateProgressionToLabLv3 } from "../src/engine/orderEngine";
import { verifySpecialChallenge } from "../src/engine/specialChallengeEngine";
import { initialSave } from "../src/database";
import type {
  KnowledgeSpeciesRecord,
  KnowledgeTransformationRecord,
} from "../src/utils/knowledgeNames";

const failures: string[] = [];

for (const s of substances) {
  const parsed = substanceSchema.safeParse(s);
  if (!parsed.success)
    failures.push(
      `${s.id}: 物质 Schema 错误 (${parsed.error.issues[0]?.message})`,
    );
}

if (
  process.argv.includes("--release") &&
  [...substances, ...reactions, ...historicalFigures, ...historyChapters].some(
    (x) => x.reviewStatus !== "reviewed",
  )
)
  failures.push("正式发布被阻止：仍存在 pending 科学或科学史内容。");

function unique(ids: string[], name: string) {
  if (new Set(ids).size !== ids.length) failures.push(name + " ID 重复");
}

unique(
  substances.map((s) => s.id),
  "物质",
);
unique(
  reactions.map((r) => r.id),
  "规则",
);
unique(
  reactions.map((r) => r.name),
  "规则名称",
);
unique(
  challenges.map((c) => c.id),
  "简单挑战",
);
unique(
  quantitativeChallenges.map((c) => c.id),
  "定量挑战",
);

const results = reactions.map((r) => {
  const parsed = reactionSchema.safeParse(r);
  if (!parsed.success)
    failures.push(`${r.id}: Schema 错误 (${parsed.error.issues[0]?.message})`);
  const c = checkConservation(r, byId);
  if (c.status === "invalid") failures.push(`${r.id}: 不守恒 ${c.reason}`);
  if (
    [...r.reactants, ...r.products].some((p) => !byId[p.substanceId]) ||
    r.catalysts.some((id) => !byId[id])
  )
    failures.push(r.id + ": 未知物质");
  if (
    r.catalysts.some((id) =>
      [...r.reactants, ...r.products].some((p) => p.substanceId === id),
    )
  )
    failures.push(r.id + ": 催化剂被消耗");
  const result = execute(
    {
      substances: r.reactants.map((p) => p.substanceId),
      conditions: r.conditions,
      catalysts: r.catalysts,
    },
    reactions,
  );
  if (result.status !== "success" || result.reaction.id !== r.id)
    failures.push(`${r.id}: 匹配冲突`);
  return { r, c };
});

const obtainable = reachable(
  substances.filter((s) => s.initialUnlocked || s.supply).map((s) => s.id),
  reactions,
);
const unreachable = substances.filter((s) => !obtainable.has(s.id));
if (unreachable.length)
  failures.push("不可达: " + unreachable.map((s) => s.id).join(","));

// Validate 30 Simple Challenges
const challengeSteps: Record<string, number> = {};
for (const c of challenges) {
  const parsed = challengeSchema.safeParse(c);
  if (!parsed.success)
    failures.push(
      `${c.id}: 简单挑战 Schema 错误 (${parsed.error.issues[0]?.message})`,
    );
  if (c.initial.some((id) => !byId[id]) || !byId[c.target]) {
    failures.push(`${c.id}: 挑战包含未知物质`);
    continue;
  }
  if (c.initial.includes(c.target)) {
    failures.push(`${c.id}: 目标已在初始库存中`);
    continue;
  }
  const allowedRules = reactions.filter((r) =>
    r.conditions.every((x) => c.conditions.includes(x)),
  );
  const path = findPathToTarget(c.initial, c.target, allowedRules);
  if (!path || path.length === 0) {
    failures.push(`${c.id}: 挑战无解`);
    continue;
  }
  challengeSteps[c.id] = path.length;
  if (c.group === "组合实验" && path.length < 2)
    failures.push(
      `${c.id}: 组合实验应至少需要 2 步，实际存在 ${path.length} 步捷径`,
    );
  if (c.group === "科学推演" && path.length < 3)
    failures.push(
      `${c.id}: 科学推演应至少需要 3 步，实际存在 ${path.length} 步捷径`,
    );
  if (path.length > c.limit)
    failures.push(
      `${c.id}: 最短解需 ${path.length} 步，超过三星次数上限 ${c.limit}`,
    );
  const inv = [...c.initial];
  for (const step of path) {
    for (const lv of [1, 2, 3]) {
      const h = getHint(inv, [], allowedRules, byId, lv, { target: c.target });
      if (!h.rule) {
        failures.push(`${c.id}: L${lv} 提示未找到可执行步骤`);
      } else if (
        ![
          ...h.rule.reactants.map((p) => p.substanceId),
          ...h.rule.catalysts,
        ].every((id) => inv.includes(id))
      ) {
        failures.push(
          `${c.id}: L${lv} 提示推荐了当前不可执行的反应 ${h.rule.id}`,
        );
      }
      if (
        /\b(heat|ignite|high_heat|electricity|light|cool|mix|evaporate|distill|grind|filter)\b/.test(
          h.message,
        )
      ) {
        failures.push(`${c.id}: L${lv} 提示包含未本地化的英文条件 ID`);
      }
    }
    const execRes = execute(
      {
        substances: step.reactants.map((p) => p.substanceId),
        conditions: step.conditions,
        catalysts: step.catalysts,
      },
      allowedRules,
    );
    if (execRes.status !== "success" || execRes.reaction.id !== step.id) {
      failures.push(`${c.id}: 步骤 ${step.id} 在允许规则集下执行失败`);
    }
    for (const p of step.products) {
      if (!inv.includes(p.substanceId)) inv.push(p.substanceId);
    }
  }
}

// Validate 30+ V1.5 Quantitative Challenges by full finite-inventory step replay
let quantReviewedReady = 0;
for (const qc of quantitativeChallenges) {
  const parsed = quantitativeChallengeSchema.safeParse(qc);
  if (!parsed.success) {
    failures.push(
      `${qc.id}: 定量挑战 Schema 错误 (${parsed.error.issues[0]?.message})`,
    );
    continue;
  }
  const replay = verifyQuantitativeChallenge(qc, reactions, byId);
  if (!replay.valid) {
    failures.push(`${qc.id}: 定量挑战回放验证失败 (${replay.error})`);
  }
  if (replay.allStepsReviewed) quantReviewedReady++;
}

// === V1.6 Comprehensive Data, DAG, Solvability & Reachability Checks ===
const ecoParsed = economyConfigSchema.safeParse(economyConfig);
if (!ecoParsed.success) {
  failures.push(
    `economy.json Schema 错误: ${ecoParsed.error.issues[0]?.message}`,
  );
}
for (const sid of Object.keys(economyConfig.materialPrices)) {
  if (!byId[sid]) failures.push(`economy.json 包含未知物质价格: ${sid}`);
}
for (const sid of Object.keys(economyConfig.startingInventory)) {
  if (!byId[sid])
    failures.push(`economy.json 初始经营库存包含未知物质: ${sid}`);
}
for (const lab of labLevels) {
  const p = labLevelSchema.safeParse(lab);
  if (!p.success)
    failures.push(`lab Lv.${lab.level}: ${p.error.issues[0]?.message}`);
  for (const tid of lab.requiredTechIds) {
    if (!techById[tid])
      failures.push(`lab Lv.${lab.level} 引用未知科技 ${tid}`);
  }
}
for (const eq of equipmentList) {
  const p = equipmentSchema.safeParse(eq);
  if (!p.success)
    failures.push(`${eq.id}: 设备 Schema 错误 (${p.error.issues[0]?.message})`);
  if (eq.requiredTechId && !techById[eq.requiredTechId]) {
    failures.push(`${eq.id}: 引用未知前置科技 ${eq.requiredTechId}`);
  }
}
unique(
  equipmentList.map((e) => e.id),
  "实验设备",
);
unique(
  technologies.map((t) => t.id),
  "科技节点",
);
unique(
  orders.map((o) => o.id),
  "研究订单",
);
unique(
  regions.map((r) => r.id),
  "探索区域",
);
unique(
  explorationEvents.map((e) => e.id),
  "探索事件",
);
unique(
  historicalFigures.map((f) => f.id),
  "科学史人物",
);
unique(
  historyChapters.map((c) => c.id),
  "历史章节",
);
unique(
  museumItems.map((m) => m.id),
  "博物馆藏品",
);
unique(
  specialChallenges.map((c) => c.id),
  "特殊挑战",
);

for (const t of technologies) {
  const p = technologySchema.safeParse(t);
  if (!p.success)
    failures.push(`${t.id}: 科技 Schema 错误 (${p.error.issues[0]?.message})`);
  for (const eid of t.unlocks.equipmentIds ?? []) {
    if (!equipmentById[eid]) failures.push(`${t.id}: 解锁未知设备 ${eid}`);
  }
}
const dag = validateTechDAG(technologies);
if (!dag.valid) {
  failures.push(
    `科技树 DAG 校验失败: cycles=[${dag.cycles.join(",")}] missing=[${dag.missingPrereqs.join(",")}] unreachable=[${dag.unreachableFromBase.join(",")}]`,
  );
}

for (const o of orders) {
  const p = orderSchema.safeParse(o);
  if (!p.success)
    failures.push(`${o.id}: 订单 Schema 错误 (${p.error.issues[0]?.message})`);
  for (const d of o.deliverables) {
    if (!byId[d.substanceId])
      failures.push(`${o.id}: 交付未知物质 ${d.substanceId}`);
  }
  for (const eid of o.requiredEquipmentIds ?? []) {
    if (!equipmentById[eid]) failures.push(`${o.id}: 引用未知设备 ${eid}`);
  }
  if (
    o.stoichRequirement &&
    !reactions.some((r) => r.id === o.stoichRequirement!.reactionId)
  ) {
    failures.push(
      `${o.id}: 计量要求引用未知反应 ${o.stoichRequirement.reactionId}`,
    );
  }
}

for (const reg of regions) {
  const p = regionSchema.safeParse(reg);
  if (!p.success)
    failures.push(
      `${reg.id}: 区域 Schema 错误 (${p.error.issues[0]?.message})`,
    );
  for (const node of reg.nodes) {
    for (const y of node.yields) {
      if (!byId[y.substanceId])
        failures.push(`${reg.id}/${node.id}: 产出未知物质 ${y.substanceId}`);
    }
  }
  for (const task of reg.tasks) {
    if (
      task.targetDeliverSubstance &&
      !byId[task.targetDeliverSubstance.substanceId]
    ) {
      failures.push(`${reg.id}/${task.id}: 交付未知物质`);
    }
  }
}
for (const ev of explorationEvents) {
  const p = explorationEventSchema.safeParse(ev);
  if (!p.success)
    failures.push(
      `${ev.id}: 探索事件 Schema 错误 (${p.error.issues[0]?.message})`,
    );
  for (const sid of Object.keys(ev.reward.items ?? {})) {
    if (!byId[sid]) failures.push(`${ev.id}: 事件奖励包含未知物质 ${sid}`);
  }
}
for (const fig of historicalFigures) {
  const p = historicalFigureSchema.safeParse(fig);
  if (!p.success)
    failures.push(
      `${fig.id}: 科学史人物 Schema 错误 (${p.error.issues[0]?.message})`,
    );
}
for (const ch of historyChapters) {
  const p = historyChapterSchema.safeParse(ch);
  if (!p.success)
    failures.push(
      `${ch.id}: 历史章节 Schema 错误 (${p.error.issues[0]?.message})`,
    );
  for (const fid of ch.figureIds) {
    if (!figureById[fid]) failures.push(`${ch.id}: 引用未知科学史人物 ${fid}`);
  }
  if (ch.museumUnlockId && !museumById[ch.museumUnlockId]) {
    failures.push(`${ch.id}: 引用未知博物馆藏品 ${ch.museumUnlockId}`);
  }
}
for (const m of museumItems) {
  const p = museumItemSchema.safeParse(m);
  if (!p.success)
    failures.push(
      `${m.id}: 博物馆藏品 Schema 错误 (${p.error.issues[0]?.message})`,
    );
}
for (const sc of specialChallenges) {
  const p = specialChallengeSchema.safeParse(sc);
  if (!p.success) {
    failures.push(
      `${sc.id}: 特殊挑战 Schema 错误 (${p.error.issues[0]?.message})`,
    );
    continue;
  }
  const verify = verifySpecialChallenge(sc, reactions, byId);
  if (!verify.valid) {
    failures.push(`${sc.id}: 特殊挑战可解性验证失败 (${verify.error})`);
  }
}

const sim = simulateProgressionToLabLv3(initialSave(), {
  economy: economyConfig,
  labs: labLevels,
  equipmentMap: equipmentById,
  techMap: techById,
  allOrders: orders,
  rules: reactions,
  db: byId,
  regions,
});
if (!sim.ok) {
  failures.push(`V1.6 经营主循环可达性验证失败: ${sim.error}`);
}

// === Local Knowledge Corpus Chinese Coverage & Integrity Validation ===
const knowledgeSpecies: KnowledgeSpeciesRecord[] = JSON.parse(
  readFileSync("src/data/knowledgeSubstances.json", "utf8"),
);
const knowledgeTransformations: KnowledgeTransformationRecord[] = JSON.parse(
  readFileSync("src/data/knowledgeTransformations.json", "utf8"),
);
const knowledgeSpeciesById = Object.fromEntries(
  knowledgeSpecies.map((s) => [s.id, s]),
);
let missingZhSpeciesCount = 0;
for (const ks of knowledgeSpecies) {
  if (!ks.nameZh || !/[\u4e00-\u9fff]/.test(ks.nameZh)) {
    missingZhSpeciesCount++;
    failures.push(`知识库物质 ${ks.id} 缺少规范中文名称 (nameZh)`);
  }
  if (!Array.isArray(ks.aliasesZh)) {
    failures.push(`知识库物质 ${ks.id} 缺少 aliasesZh 字段`);
  }
}
// Entity + state disambiguation checks
if (
  knowledgeSpeciesById["HCl"]?.nameZh === knowledgeSpeciesById["HCl-g"]?.nameZh
) {
  failures.push("知识库 HCl(aq) 与 HCl(g) 未按物态区分中文名称");
}
if (
  knowledgeSpeciesById["H2O"]?.nameZh ===
    knowledgeSpeciesById["H2O-g"]?.nameZh ||
  knowledgeSpeciesById["H2O"]?.nameZh ===
    knowledgeSpeciesById["H2O-ice"]?.nameZh
) {
  failures.push("知识库 H2O 液态/气态/固态未按物态区分中文名称");
}
let unresolvedTransformParticipants = 0;
for (const kt of knowledgeTransformations) {
  for (const p of [...kt.reactants, ...kt.products]) {
    const sp = knowledgeSpeciesById[p.id];
    if (!sp || !sp.nameZh || !/[\u4e00-\u9fff]/.test(sp.nameZh)) {
      unresolvedTransformParticipants++;
      failures.push(`知识库转化 ${kt.id} 参与物 ${p.id} 无法解析中文名称`);
    }
  }
}

function refLabel(url: string) {
  if (url.includes("openstax.org")) {
    const seg = url.split("/pages/")[1] || "";
    const num = seg.match(/^(\d+-\d+)/)?.[1]?.replace("-", ".");
    return num ? `OpenStax §${num}` : "OpenStax";
  }
  if (url.includes("rsc.org")) return "RSC Education";
  if (url.includes("harvard.edu")) return "Harvard Lecture Demonstrations";
  if (url.includes("pubchem.ncbi.nlm.nih.gov")) return "PubChem";
  return "参考资料";
}

const multiStepCount = Object.values(challengeSteps).filter(
  (n) => n >= 2,
).length;
const threePlusCount = Object.values(challengeSteps).filter(
  (n) => n >= 3,
).length;
const stoichSupportedCount = reactions.filter(
  (r) => r.stoichiometrySupported,
).length;
const reviewedStoichCount = reactions.filter(
  (r) => r.stoichiometrySupported && r.reviewStatus === "reviewed",
).length;

const report = `# 数据自动校验与人工科学审核清单

生成时间：${new Date().toISOString()}

- 物质收集项：${substances.length}（含 V1.5 元素组成、电荷、结构模型类别与定量研究资格；均保持 pending）
- 候选规则：${reactions.length}（适用计量模型 ${stoichSupportedCount} 条，其中化学计量 ${reactions.filter((r) => r.calculationStrategy === "stoichiometric").length} 条、物态变化 ${reactions.filter((r) => r.calculationStrategy === "phase_change").length} 条；不适用纯物质计量的规则 ${reactions.filter((r) => !r.stoichiometrySupported).length} 条）
- 开发预览可运行适用规则；已人工审核 ${reviewedStoichCount} / ${stoichSupportedCount}，发布状态与本地预览分别记录。
- 元素/电荷守恒通过：${results.filter((x) => x.c.status === "balanced").length}；混合物/溶液/材料加工需人工核验：${results.filter((x) => x.c.status === "manual").length}
- 初始材料与明确标本补给共同可达：${obtainable.size}/${substances.length}
- 简单模式挑战：${challenges.length}（2 步及以上 ${multiStepCount} 关，3 步及以上 ${threePlusCount} 关；全链路与三级提示通过）
- 进阶定量挑战：${quantitativeChallenges.length}（全有限库存逐步回放；已获审底层规则的挑战 ${quantReviewedReady}/${quantitativeChallenges.length}，本地预览不以此阻断）
- V1.6 扩展系统校验：${technologies.length} 项科技（DAG 无环且 100% 可达）、${equipmentList.filter((e) => !e.lockedPreview).length} 台功能设备、${orders.length} 个研究订单、${regions.filter((r) => r.playable).length}/${regions.length} 个探索区域、${historyChapters.filter((c) => c.playable).length}/${historyChapters.length} 个可玩历史章节（均保持 pending）、${museumItems.length} 件博物馆藏品、${specialChallenges.length} 道特殊挑战（全可解验证通过）、初始存档 Lv.1→Lv.2→Lv.3 零死锁闭环模拟通过（${sim.ok ? `${sim.steps} 步` : "失败"}）
- 本地化学知识库中文化校验：${knowledgeSpecies.length} 种物质中文全覆盖（缺失 ${missingZhSpeciesCount}）、${knowledgeTransformations.length} 条转化路径参与物中文全解析（缺失 ${unresolvedTransformParticipants}；全部保持 pending）
- 自动错误：${failures.length}
- 人工科学审核完成：${reactions.filter((r) => r.reviewStatus === "reviewed").length}；**自动校验与参考链接采集绝不替代人工科学审核**。

${failures.length ? "## 自动校验错误\n\n" + failures.map((f) => `- ${f}`).join("\n") + "\n\n" : ""}## 逐条规则人工核验清单

> 以下参考链接已按具体反应主题对应至 OpenStax *Chemistry 2e* 对应章节或 RSC Education 实验资料，但仍需化学专业人员逐条复核实际温度/浓度条件、相态简化、观察现象及安全表述后方可转为 \`reviewed\`。

| ID | 规则 | 计量策略 | 守恒 | 审核状态 | 简化说明与待人工核验事项 | 对应参考资料 |
|---|---|---|---|---|---|---|
${results
  .map(({ r, c }) => {
    const pendingItems = [
      "核验真实反应条件、相态与可观察现象",
      ...r.simplificationNotes,
    ].join("；");
    const links = r.references.map((u) => `[${refLabel(u)}](${u})`).join(" / ");
    return `| ${r.id} | ${r.name} | ${r.calculationStrategy} | ${c.status} | ${r.reviewStatus} | ${pendingItems} | ${links} |`;
  })
  .join("\n")}
`;

if (!process.argv.includes("--release")) {
  writeFileSync("docs/CHEMISTRY_REVIEW.md", report);
}
console.log(report.split("\n").slice(0, 16).join("\n"));
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
