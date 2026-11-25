import type { Condition, Save, TechnologyDef } from "../types";
import { spendCurrency } from "./economyEngine";
import { appendManagementLog } from "./progressionEngine";

export interface TechDAGValidationResult {
  valid: boolean;
  cycles: string[];
  missingPrereqs: string[];
  unreachableFromBase: string[];
}

/**
 * Validates that the technology graph is a strict DAG (acyclic, valid prereqs, all reachable).
 */
export function validateTechDAG(
  techs: TechnologyDef[],
): TechDAGValidationResult {
  const byId = new Map(techs.map((t) => [t.id, t]));
  const missingPrereqs: string[] = [];
  for (const t of techs) {
    for (const p of t.prereqTechIds) {
      if (!byId.has(p)) missingPrereqs.push(`${t.id}->${p}`);
    }
  }

  // Kahn's algorithm for cycle detection
  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const t of techs) {
    inDegree.set(t.id, 0);
    children.set(t.id, []);
  }
  for (const t of techs) {
    for (const p of t.prereqTechIds) {
      if (!byId.has(p)) continue;
      inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1);
      children.get(p)!.push(t.id);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }
  const visited: string[] = [];
  while (queue.length) {
    const cur = queue.shift()!;
    visited.push(cur);
    for (const ch of children.get(cur) ?? []) {
      const nextDeg = (inDegree.get(ch) ?? 1) - 1;
      inDegree.set(ch, nextDeg);
      if (nextDeg === 0) queue.push(ch);
    }
  }

  const visitedSet = new Set(visited);
  const cycles = techs.filter((t) => !visitedSet.has(t.id)).map((t) => t.id);

  // Reachability simulation starting from Lab Lv.1 (assuming lab upgrades unlock when tech_lab_expansion_2/3 are reached)
  const unlocked = new Set<string>();
  let labLevel = 1;
  let changed = true;
  while (changed) {
    changed = false;
    if (labLevel < 2 && unlocked.has("tech_lab_expansion_2")) {
      labLevel = 2;
      changed = true;
    }
    if (labLevel < 3 && unlocked.has("tech_lab_expansion_3")) {
      labLevel = 3;
      changed = true;
    }
    for (const t of techs) {
      if (unlocked.has(t.id)) continue;
      if (t.requiredLabLevel > labLevel) continue;
      if (t.prereqTechIds.every((p) => unlocked.has(p))) {
        unlocked.add(t.id);
        changed = true;
      }
    }
  }
  const unreachableFromBase = techs
    .filter((t) => !unlocked.has(t.id))
    .map((t) => t.id);

  return {
    valid:
      cycles.length === 0 &&
      missingPrereqs.length === 0 &&
      unreachableFromBase.length === 0,
    cycles,
    missingPrereqs,
    unreachableFromBase,
  };
}

export function getTechUnlockStatus(
  save: Save,
  tech: TechnologyDef,
  techMap: Record<string, TechnologyDef>,
): {
  status: "unlocked" | "available" | "locked";
  reasons: string[];
} {
  if (save.unlockedTechIds.includes(tech.id)) {
    return { status: "unlocked", reasons: [] };
  }
  const reasons: string[] = [];
  if (save.labLevel < tech.requiredLabLevel) {
    reasons.push(`需 Lv.${tech.requiredLabLevel} 实验室`);
  }
  for (const p of tech.prereqTechIds) {
    if (!save.unlockedTechIds.includes(p)) {
      reasons.push(`前置科技：${techMap[p]?.name ?? p}`);
    }
  }
  if (tech.requiredSubstanceIds?.length) {
    for (const sid of tech.requiredSubstanceIds) {
      if (!(sid in save.discovered)) {
        reasons.push(`需先发现物质：${sid}`);
      }
    }
  }
  if (save.researchPoints < tech.costRP) {
    reasons.push(`研究点不足（需 ${tech.costRP} RP）`);
  }
  if (save.coins < tech.costCoins) {
    reasons.push(`金币不足（需 ${tech.costCoins} 金币）`);
  }
  return {
    status: reasons.length === 0 ? "available" : "locked",
    reasons,
  };
}

export function unlockTechnology(
  save: Save,
  techId: string,
  techMap: Record<string, TechnologyDef>,
  now = Date.now(),
): { ok: true; save: Save; message: string } | { ok: false; error: string } {
  const tech = techMap[techId];
  if (!tech) return { ok: false, error: "未知科技节点。" };
  if (save.unlockedTechIds.includes(techId)) {
    return { ok: false, error: "该科技已解锁，不可重复消耗研究点。" };
  }

  const check = getTechUnlockStatus(save, tech, techMap);
  if (check.status !== "available") {
    return { ok: false, error: check.reasons.join("；") };
  }

  const spent = spendCurrency(save, tech.costCoins, tech.costRP);
  if (!spent.ok) return spent;

  const unlockedRegionIds = [
    ...new Set([
      ...spent.save.unlockedRegionIds,
      ...(tech.unlocks.regionIds ?? []),
    ]),
  ];

  const nextSave = appendManagementLog(
    {
      ...spent.save,
      unlockedTechIds: [...spent.save.unlockedTechIds, tech.id],
      unlockedRegionIds,
      experience:
        spent.save.experience + Math.max(15, Math.round(tech.costRP * 0.8)),
    },
    "tech",
    `解锁科技「${tech.name}」（-${tech.costRP} RP，-${tech.costCoins} 金币）`,
    now,
  );

  return {
    ok: true,
    save: nextSave,
    message: `科技「${tech.name}」研究完成！${tech.unlocks.bonusNote ? ` ${tech.unlocks.bonusNote}。` : ""}`,
  };
}

export function getTechUnlockedConditions(
  save: Save,
  techMap: Record<string, TechnologyDef>,
): Condition[] {
  const out = new Set<Condition>();
  for (const id of save.unlockedTechIds) {
    const t = techMap[id];
    if (t?.unlocks.conditions) {
      for (const c of t.unlocks.conditions) out.add(c);
    }
  }
  return [...out];
}
