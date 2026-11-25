import type {
  Condition,
  EquipmentDef,
  LabLevelDef,
  Reaction,
  Save,
  Substance,
  TechnologyDef,
} from "../types";
import { execute, executeAdvanced } from "./reactionEngine";
import { spendCurrency } from "./economyEngine";
import {
  addManagementItems,
  appendManagementLog,
  consumeManagementItems,
} from "./progressionEngine";

/**
 * Computes conditions allowed inside Management Production Mode ONLY.
 * Free Exploration Mode keeps all 11 conditions unrestricted.
 */
export function getManagementAllowedConditions(
  save: Save,
  equipmentMap: Record<string, EquipmentDef>,
): Condition[] {
  const allowed = new Set<Condition>(["mix"]);
  for (const [eqId, lv] of Object.entries(save.equipmentLevels)) {
    if (lv <= 0) continue;
    const eq = equipmentMap[eqId];
    if (!eq || eq.lockedPreview) continue;
    for (const c of eq.unlockedConditions) {
      allowed.add(c);
    }
  }
  return [...allowed];
}

export function getManagementMaxBatch(
  save: Save,
  labs: LabLevelDef[],
  equipmentMap: Record<string, EquipmentDef>,
): number {
  const lab = labs.find((l) => l.level === save.labLevel) ?? labs[0];
  let bonus = 0;
  for (const [eqId, lv] of Object.entries(save.equipmentLevels)) {
    const eq = equipmentMap[eqId];
    if (!eq || eq.lockedPreview) continue;
    bonus += Math.max(0, lv - 1) * eq.batchBonusPerLevel;
    if (eq.id === "eq_balance" && lv >= 1) {
      bonus += eq.batchBonusPerLevel;
    }
  }
  return Math.min(20, (lab?.maxBatchMultiplier ?? 2) + bonus);
}

export function getEquipmentUpgradeCost(
  eq: EquipmentDef,
  currentLevel: number,
): { coins: number; rp: number } {
  if (currentLevel <= 0) {
    return { coins: eq.baseCostCoins, rp: eq.baseCostRP };
  }
  const scale = Math.pow(eq.upgradeCostScale, currentLevel);
  const baseCoins = Math.max(60, eq.baseCostCoins);
  const baseRP = Math.max(10, eq.baseCostRP);
  return {
    coins: Math.round(baseCoins * scale),
    rp: Math.round(baseRP * scale),
  };
}

export function buildOrUpgradeEquipment(
  save: Save,
  equipmentId: string,
  equipmentMap: Record<string, EquipmentDef>,
  labs: LabLevelDef[],
  techMap: Record<string, TechnologyDef>,
  now = Date.now(),
): { ok: true; save: Save; message: string } | { ok: false; error: string } {
  const eq = equipmentMap[equipmentId];
  if (!eq) return { ok: false, error: "未知实验设备。" };
  if (eq.lockedPreview) {
    return {
      ok: false,
      error: "该设备为 V1.7/V2.0 工业自动化预留接口，当前版本暂未开放。",
    };
  }
  const currentLv = save.equipmentLevels[equipmentId] ?? 0;
  if (currentLv >= eq.maxLevel) {
    return {
      ok: false,
      error: `「${eq.name}」已达到最高等级（Lv.${eq.maxLevel}）。`,
    };
  }
  if (save.labLevel < eq.requiredLabLevel) {
    return {
      ok: false,
      error: `需要 Lv.${eq.requiredLabLevel} 实验室才能建造「${eq.name}」。`,
    };
  }
  if (eq.requiredTechId && !save.unlockedTechIds.includes(eq.requiredTechId)) {
    const techName = techMap[eq.requiredTechId]?.name ?? eq.requiredTechId;
    return { ok: false, error: `需先研究科技「${techName}」。` };
  }

  const lab = labs.find((l) => l.level === save.labLevel);
  const installedCount = Object.keys(save.equipmentLevels).length;
  if (currentLv === 0 && lab && installedCount >= lab.equipmentCapacity) {
    return {
      ok: false,
      error: `当前实验室设备槽位已满（${installedCount}/${lab.equipmentCapacity}），请先升级实验室。`,
    };
  }

  const cost = getEquipmentUpgradeCost(eq, currentLv);
  const spent = spendCurrency(save, cost.coins, cost.rp);
  if (!spent.ok) return spent;

  const nextLv = currentLv + 1;
  const actionLabel = currentLv === 0 ? "建造" : "升级";
  const nextSave = appendManagementLog(
    {
      ...spent.save,
      equipmentLevels: {
        ...spent.save.equipmentLevels,
        [equipmentId]: nextLv,
      },
      experience: spent.save.experience + (currentLv === 0 ? 35 : 25),
    },
    "upgrade",
    `${actionLabel}设备「${eq.name}」至 Lv.${nextLv}（-${cost.coins} 金币，-${cost.rp} RP）`,
    now,
  );
  return {
    ok: true,
    save: nextSave,
    message: `已${actionLabel}「${eq.name}」至 Lv.${nextLv}！`,
  };
}

export function getNextLabUpgradeCheck(
  save: Save,
  labs: LabLevelDef[],
  techMap: Record<string, TechnologyDef>,
): {
  nextLab: LabLevelDef | null;
  canUpgrade: boolean;
  reasons: string[];
} {
  const nextLab = labs.find((l) => l.level === save.labLevel + 1) ?? null;
  if (!nextLab) {
    return { nextLab: null, canUpgrade: false, reasons: ["已达到最高等级"] };
  }
  if (nextLab.lockedPreview) {
    return {
      nextLab,
      canUpgrade: false,
      reasons: [`Lv.${nextLab.level} 将于后续工业/现代版本开放`],
    };
  }
  const reasons: string[] = [];
  const discoveredCount = Object.keys(save.discovered).length;
  if (discoveredCount < nextLab.requiredDiscoveredCount) {
    reasons.push(
      `需已发现 ${nextLab.requiredDiscoveredCount} 种物质（当前 ${discoveredCount}）`,
    );
  }
  for (const tid of nextLab.requiredTechIds) {
    if (!save.unlockedTechIds.includes(tid)) {
      reasons.push(`需先研究科技「${techMap[tid]?.name ?? tid}」`);
    }
  }
  if (save.coins < nextLab.upgradeCostCoins) {
    reasons.push(`需 ${nextLab.upgradeCostCoins} 金币（当前 ${save.coins}）`);
  }
  if (save.researchPoints < nextLab.upgradeCostRP) {
    reasons.push(
      `需 ${nextLab.upgradeCostRP} 研究点（当前 ${save.researchPoints}）`,
    );
  }
  return { nextLab, canUpgrade: reasons.length === 0, reasons };
}

export function upgradeLaboratory(
  save: Save,
  labs: LabLevelDef[],
  techMap: Record<string, TechnologyDef>,
  now = Date.now(),
): { ok: true; save: Save; message: string } | { ok: false; error: string } {
  const check = getNextLabUpgradeCheck(save, labs, techMap);
  if (!check.nextLab || !check.canUpgrade) {
    return { ok: false, error: check.reasons.join("；") };
  }
  const spent = spendCurrency(
    save,
    check.nextLab.upgradeCostCoins,
    check.nextLab.upgradeCostRP,
  );
  if (!spent.ok) return spent;

  const nextSave = appendManagementLog(
    {
      ...spent.save,
      labLevel: check.nextLab.level,
      experience: spent.save.experience + 100,
    },
    "upgrade",
    `实验室升级至 Lv.${check.nextLab.level}「${check.nextLab.name}」`,
    now,
  );

  return {
    ok: true,
    save: nextSave,
    message: `实验室成功升级至 Lv.${check.nextLab.level}「${check.nextLab.name}」！`,
  };
}

export interface ManagementProductionResult {
  ok: true;
  save: Save;
  reaction: Reaction;
  produced: Record<string, number>;
  consumed: Record<string, number>;
  portionUtilization: number;
  message: string;
}

/**
 * Executes finite-inventory production in Management Mode by delegating strictly to the shared
 * chemistry / integer-stoichiometry engine (`executeAdvanced` for stoichiometric/phase rules,
 * `execute` for mixture/material rules like glass, ceramic, salt_crystal).
 * Catalysts are checked for ownership in managementInventory (or discovered) and NEVER consumed.
 */
export function executeManagementProduction(
  save: Save,
  reactionId: string,
  batchCount: number,
  rules: Reaction[],
  db: Record<string, Substance>,
  equipmentMap: Record<string, EquipmentDef>,
  labs: LabLevelDef[],
  now = Date.now(),
): ManagementProductionResult | { ok: false; error: string } {
  const reaction = rules.find((r) => r.id === reactionId);
  if (!reaction) return { ok: false, error: "未找到对应生产配方。" };

  const maxBatch = getManagementMaxBatch(save, labs, equipmentMap);
  if (
    !Number.isInteger(batchCount) ||
    batchCount < 1 ||
    batchCount > maxBatch
  ) {
    return {
      ok: false,
      error: `批量倍数须为 1–${maxBatch} 的正整数（升级实验室或设备可提高上限）。`,
    };
  }

  const allowedConds = getManagementAllowedConditions(save, equipmentMap);
  const missingConds = reaction.conditions.filter(
    (c) => !allowedConds.includes(c),
  );
  if (missingConds.length > 0) {
    return {
      ok: false,
      error: `经营实验室尚未配备所需设备条件：${missingConds.join("、")}。请先研究科技并建造对应设备。`,
    };
  }

  for (const catId of reaction.catalysts) {
    if ((save.managementInventory[catId] ?? 0) < 1) {
      return {
        ok: false,
        error: `缺少催化剂「${db[catId]?.name ?? catId}」（至少需保有 1 份，反应中不消耗）。`,
      };
    }
  }

  const amounts: Record<string, number> = {};
  for (const r of reaction.reactants) {
    amounts[r.substanceId] = r.coefficient * batchCount;
  }

  // Check inventory availability before execution
  const checkConsume = consumeManagementItems(
    save.managementInventory,
    amounts,
  );
  if (!checkConsume.ok) {
    const missingNames = reaction.reactants
      .filter(
        (r) =>
          (save.managementInventory[r.substanceId] ?? 0) <
          amounts[r.substanceId],
      )
      .map(
        (r) =>
          `${db[r.substanceId]?.name ?? r.substanceId}（需 ${amounts[r.substanceId]}，现 ${save.managementInventory[r.substanceId] ?? 0}）`,
      );
    return { ok: false, error: `经营库存不足：${missingNames.join("；")}` };
  }

  let produced: Record<string, number> = {};
  let consumed: Record<string, number> = {};
  let portionUtilization = 1;

  if (reaction.stoichiometrySupported) {
    const res = executeAdvanced(
      {
        amounts,
        conditions: reaction.conditions,
        catalysts: reaction.catalysts,
        mode: "advanced",
      },
      rules,
      db,
      { maxPortions: 999 },
    );
    if (res.status !== "complete" && res.status !== "partial") {
      return { ok: false, error: res.message };
    }
    for (const item of res.stoichiometry.reactants) {
      consumed[item.substanceId] = item.consumed;
    }
    for (const item of res.stoichiometry.products) {
      produced[item.substanceId] = item.produced;
    }
    portionUtilization = res.stoichiometry.portionUtilization;
  } else {
    const res = execute(
      {
        substances: reaction.reactants.map((r) => r.substanceId),
        conditions: reaction.conditions,
        catalysts: reaction.catalysts,
        mode: "simple",
      },
      rules,
      "preview",
    );
    if (res.status !== "success") {
      return { ok: false, error: res.message };
    }
    consumed = { ...amounts };
    for (const p of reaction.products) {
      produced[p.substanceId] = p.coefficient * batchCount;
    }
    portionUtilization = 1;
  }

  // Deduct actual consumed amounts and add produced amounts atomically
  const deducted = consumeManagementItems(save.managementInventory, consumed);
  if (!deducted.ok) return deducted;
  const nextInventory = addManagementItems(deducted.inventory, produced);

  // Sync newly produced substances into discovered/research cleanly (only for non-fixture real rules)
  const nextDiscovered = { ...save.discovered };
  const nextResearch = { ...save.research };
  const nextCompleted = save.completed.includes(reaction.id)
    ? save.completed
    : [...save.completed, reaction.id];

  for (const pid of Object.keys(produced)) {
    if (!(pid in nextDiscovered)) {
      nextDiscovered[pid] = now;
    }
    if (!nextResearch[pid]) {
      nextResearch[pid] = {
        discovered: true,
        simpleResearchCompleted: true,
        quantitativeResearchCompleted: Boolean(
          reaction.stoichiometrySupported &&
          db[pid]?.quantitativeResearchEligible,
        ),
        laboratoryResearchCompleted: false,
        completedReactionIds: [reaction.id],
      };
    } else {
      nextResearch[pid] = {
        ...nextResearch[pid],
        discovered: true,
        simpleResearchCompleted: true,
        quantitativeResearchCompleted:
          nextResearch[pid].quantitativeResearchCompleted ||
          Boolean(
            reaction.stoichiometrySupported &&
            db[pid]?.quantitativeResearchEligible,
          ),
        completedReactionIds: [
          ...new Set([...nextResearch[pid].completedReactionIds, reaction.id]),
        ],
      };
    }
  }

  const nextBestUtil = { ...save.bestUtilization };
  if (reaction.stoichiometrySupported) {
    const prev = nextBestUtil[reaction.id];
    if (!prev || portionUtilization > prev.portionUtilization) {
      nextBestUtil[reaction.id] = {
        portionUtilization,
        massUtilization: prev?.massUtilization ?? null,
      };
    }
  }

  const producedSummary = Object.entries(produced)
    .map(([id, n]) => `${db[id]?.name ?? id} ×${n}`)
    .join("、");

  const nextSave = appendManagementLog(
    {
      ...save,
      managementInventory: nextInventory,
      discovered: nextDiscovered,
      research: nextResearch,
      completed: nextCompleted,
      bestUtilization: nextBestUtil,
      experience: save.experience + 10 * batchCount,
    },
    "produce",
    `制备「${reaction.name}」×${batchCount}，产出 ${producedSummary}`,
    now,
  );

  return {
    ok: true,
    save: nextSave,
    reaction,
    produced,
    consumed,
    portionUtilization,
    message: `生产完成：获得 ${producedSummary}${reaction.catalysts.length ? "（催化剂未消耗）" : ""}。`,
  };
}
