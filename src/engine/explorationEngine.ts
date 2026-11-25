import type {
  ExplorationEventDef,
  RegionDef,
  RegionId,
  Save,
  Substance,
  TechnologyDef,
} from "../types";
import { spendCurrency } from "./economyEngine";
import {
  addManagementItems,
  appendManagementLog,
  applyRewardBundle,
  claimRewardOnce,
  consumeManagementItems,
} from "./progressionEngine";

export function isRegionUnlocked(save: Save, region: RegionDef): boolean {
  if (!region.playable) return false;
  if (save.unlockedRegionIds.includes(region.id)) return true;
  const req = region.unlockRequirement;
  if (req.labLevel && save.labLevel < req.labLevel) return false;
  if (req.techIds?.some((tid) => !save.unlockedTechIds.includes(tid))) {
    return false;
  }
  return !req.coins;
}

export function getRegionUnlockReasons(
  save: Save,
  region: RegionDef,
  techMap: Record<string, TechnologyDef>,
): string[] {
  if (!region.playable) {
    return [region.teasedNote ?? "后续版本开放"];
  }
  if (isRegionUnlocked(save, region)) return [];
  const reasons: string[] = [];
  if (
    region.unlockRequirement.labLevel &&
    save.labLevel < region.unlockRequirement.labLevel
  ) {
    reasons.push(`需要 Lv.${region.unlockRequirement.labLevel} 实验室`);
  }
  for (const tid of region.unlockRequirement.techIds ?? []) {
    if (!save.unlockedTechIds.includes(tid)) {
      reasons.push(`需先研究科技「${techMap[tid]?.name ?? tid}」`);
    }
  }
  if (
    region.unlockRequirement.coins &&
    save.coins < region.unlockRequirement.coins
  ) {
    reasons.push(`需 ${region.unlockRequirement.coins} 金币`);
  }
  return reasons;
}

export function pickWeightedEvent(
  regionId: RegionId,
  events: ExplorationEventDef[],
  rng: () => number,
  triggerChance = 0.45,
): ExplorationEventDef | null {
  const pool = events.filter((e) => e.regionId === regionId);
  if (!pool.length) return null;
  if (rng() > triggerChance) return null;
  const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng() * totalWeight;
  for (const ev of pool) {
    roll -= ev.weight;
    if (roll <= 0) return ev;
  }
  return pool[pool.length - 1];
}

export interface GatherResult {
  ok: true;
  save: Save;
  yields: Record<string, number>;
  triggeredEvent: ExplorationEventDef | null;
  message: string;
}

/**
 * Executes a world gathering action at a region node.
 * Randomness ONLY affects optional exploration discovery events & bonus rewards, NEVER chemistry rules.
 * Free starter nodes (costCoins === 0) guarantee anti-deadlock recovery even at 0 coins & empty inventory.
 */
export function executeGatherNode(
  save: Save,
  regionId: RegionId,
  nodeId: string,
  allRegions: RegionDef[],
  allEvents: ExplorationEventDef[],
  db: Record<string, Substance>,
  rng: () => number = Math.random,
  now = Date.now(),
): GatherResult | { ok: false; error: string } {
  const region = allRegions.find((r) => r.id === regionId);
  if (!region) return { ok: false, error: "未知探索区域。" };
  if (!isRegionUnlocked(save, region)) {
    return { ok: false, error: `区域「${region.name}」尚未解锁。` };
  }
  const node = region.nodes.find((n) => n.id === nodeId);
  if (!node) return { ok: false, error: "未知采集点。" };

  if (
    node.requiredTechIds?.some((tid) => !save.unlockedTechIds.includes(tid))
  ) {
    return { ok: false, error: "尚未满足该采集点的前置科技要求。" };
  }
  if (
    node.requiredEquipmentIds?.some(
      (eid) => (save.equipmentLevels[eid] ?? 0) < 1,
    )
  ) {
    return { ok: false, error: "尚未建造该采集点所需的勘探设备。" };
  }

  let nextSave = save;
  if (node.costCoins > 0) {
    const spent = spendCurrency(save, node.costCoins, 0);
    if (!spent.ok) return spent;
    nextSave = spent.save;
  }

  const yields: Record<string, number> = {};
  for (const y of node.yields) {
    yields[y.substanceId] = (yields[y.substanceId] ?? 0) + y.amount;
  }

  const nextInventory = addManagementItems(
    nextSave.managementInventory,
    yields,
  );
  const nextDiscovered = { ...nextSave.discovered };
  const nextResearch = { ...nextSave.research };
  for (const sid of Object.keys(yields)) {
    if (!(sid in nextDiscovered)) {
      nextDiscovered[sid] = now;
    }
    if (!nextResearch[sid]) {
      nextResearch[sid] = {
        discovered: true,
        simpleResearchCompleted: true,
        quantitativeResearchCompleted: false,
        laboratoryResearchCompleted: false,
        completedReactionIds: [],
      };
    }
  }

  const prevProgress = nextSave.regionProgress[regionId] ?? {
    gatherCount: 0,
    completedTaskIds: [],
    eventLog: [],
  };

  const triggeredEvent = pickWeightedEvent(regionId, allEvents, rng);
  const nextEventLog = triggeredEvent
    ? [
        { id: triggeredEvent.id, time: now, title: triggeredEvent.title },
        ...prevProgress.eventLog,
      ].slice(0, 50)
    : prevProgress.eventLog;

  nextSave = {
    ...nextSave,
    unlockedRegionIds: nextSave.unlockedRegionIds.includes(regionId)
      ? nextSave.unlockedRegionIds
      : [...nextSave.unlockedRegionIds, regionId],
    managementInventory: nextInventory,
    discovered: nextDiscovered,
    research: nextResearch,
    experience: nextSave.experience + node.experienceGain,
    regionProgress: {
      ...nextSave.regionProgress,
      [regionId]: {
        ...prevProgress,
        gatherCount: prevProgress.gatherCount + 1,
        eventLog: nextEventLog,
      },
    },
  };

  if (triggeredEvent) {
    nextSave = applyRewardBundle(nextSave, triggeredEvent.reward);
  }

  const yieldText = Object.entries(yields)
    .map(([id, n]) => `${db[id]?.name ?? id} ×${n}`)
    .join("、");

  nextSave = appendManagementLog(
    nextSave,
    "gather",
    `在${region.name}·${node.name}采集获得 ${yieldText}${triggeredEvent ? `（奇遇：${triggeredEvent.title}）` : ""}`,
    now,
  );

  return {
    ok: true,
    save: nextSave,
    yields,
    triggeredEvent,
    message: `采集成功：获得 ${yieldText}${triggeredEvent ? `；触发探索事件「${triggeredEvent.title}」！` : "。"}`,
  };
}

export function completeRegionTask(
  save: Save,
  regionId: RegionId,
  taskId: string,
  allRegions: RegionDef[],
  db: Record<string, Substance>,
  now = Date.now(),
): { ok: true; save: Save; message: string } | { ok: false; error: string } {
  const region = allRegions.find((r) => r.id === regionId);
  if (!region || !isRegionUnlocked(save, region)) {
    return { ok: false, error: "区域未解锁。" };
  }
  const task = region.tasks.find((t) => t.id === taskId);
  if (!task) return { ok: false, error: "未找到该区域任务。" };

  const progress = save.regionProgress[regionId] ?? {
    gatherCount: 0,
    completedTaskIds: [],
    eventLog: [],
  };
  if (progress.completedTaskIds.includes(taskId)) {
    return { ok: false, error: "该区域任务已完成并领取奖励。" };
  }

  if (task.targetGatherCount && progress.gatherCount < task.targetGatherCount) {
    return {
      ok: false,
      error: `还需在${region.name}完成 ${task.targetGatherCount - progress.gatherCount} 次采集。`,
    };
  }

  let nextSave = save;
  if (task.targetDeliverSubstance) {
    const req = task.targetDeliverSubstance;
    const consumed = consumeManagementItems(save.managementInventory, {
      [req.substanceId]: req.amount,
    });
    if (!consumed.ok) {
      return {
        ok: false,
        error: `需要交付 ${db[req.substanceId]?.name ?? req.substanceId} ×${req.amount}（当前 ${save.managementInventory[req.substanceId] ?? 0}）。`,
      };
    }
    nextSave = { ...nextSave, managementInventory: consumed.inventory };
  }

  const eventId = `region_task:${regionId}:${taskId}`;
  const claimed = claimRewardOnce(nextSave, eventId, task.reward);
  nextSave = {
    ...claimed.save,
    regionProgress: {
      ...claimed.save.regionProgress,
      [regionId]: {
        ...progress,
        completedTaskIds: [...progress.completedTaskIds, taskId],
      },
    },
  };
  nextSave = appendManagementLog(
    nextSave,
    "order",
    `完成${region.name}任务「${task.title}」（+${task.reward.coins} 金币，+${task.reward.researchPoints} RP）`,
    now,
  );
  return {
    ok: true,
    save: nextSave,
    message: `区域任务「${task.title}」完成！奖励已入账。`,
  };
}
