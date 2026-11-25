import type {
  EconomyConfig,
  ResearchLevelDef,
  RewardBundle,
  Save,
} from "../types";

export interface ResearchLevelStatus {
  current: ResearchLevelDef;
  next: ResearchLevelDef | null;
  experience: number;
  progressPercent: number;
  xpToNext: number;
}

/**
 * Computes the researcher's level strictly from cumulative experience (never reduced by spending RP).
 */
export function getResearchLevelStatus(
  experience: number,
  config: EconomyConfig,
): ResearchLevelStatus {
  const safeXp = Math.max(0, Math.floor(experience));
  const tiers = [...config.researchLevels].sort(
    (a, b) => a.minExperience - b.minExperience,
  );
  let current = tiers[0];
  let next: ResearchLevelDef | null = null;
  for (let i = 0; i < tiers.length; i++) {
    if (safeXp >= tiers[i].minExperience) {
      current = tiers[i];
      next = tiers[i + 1] ?? null;
    } else {
      break;
    }
  }
  if (!next) {
    return {
      current,
      next: null,
      experience: safeXp,
      progressPercent: 100,
      xpToNext: 0,
    };
  }
  const span = Math.max(1, next.minExperience - current.minExperience);
  const gained = safeXp - current.minExperience;
  return {
    current,
    next,
    experience: safeXp,
    progressPercent: Math.min(100, Math.round((gained / span) * 100)),
    xpToNext: Math.max(0, next.minExperience - safeXp),
  };
}

/**
 * Pure non-negative management inventory utilities (strictly isolated from free exploration & challenges).
 */
export function addManagementItems(
  inventory: Record<string, number>,
  items: Record<string, number>,
): Record<string, number> {
  const next = { ...inventory };
  for (const [id, amount] of Object.entries(items)) {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error(`无效入库数量：${id}=${amount}`);
    }
    if (amount === 0) continue;
    next[id] = (next[id] ?? 0) + amount;
  }
  return next;
}

export function hasManagementItems(
  inventory: Record<string, number>,
  required: Record<string, number>,
): boolean {
  return Object.entries(required).every(([id, amount]) => {
    if (!Number.isInteger(amount) || amount < 0) return false;
    return (inventory[id] ?? 0) >= amount;
  });
}

export function consumeManagementItems(
  inventory: Record<string, number>,
  required: Record<string, number>,
):
  | { ok: true; inventory: Record<string, number> }
  | { ok: false; error: string } {
  for (const [id, amount] of Object.entries(required)) {
    if (!Number.isInteger(amount) || amount < 0) {
      return { ok: false, error: `无效消耗数量：${id}` };
    }
    if ((inventory[id] ?? 0) < amount) {
      return { ok: false, error: `经营库存不足：${id}` };
    }
  }
  const next = { ...inventory };
  for (const [id, amount] of Object.entries(required)) {
    if (amount === 0) continue;
    const rem = (next[id] ?? 0) - amount;
    if (rem <= 0) {
      delete next[id];
    } else {
      next[id] = rem;
    }
  }
  return { ok: true, inventory: next };
}

/**
 * Applies a reward bundle directly (for repeatable actions like order delivery or gathering).
 */
export function applyRewardBundle(save: Save, reward: RewardBundle): Save {
  const coins = save.coins + Math.max(0, Math.floor(reward.coins ?? 0));
  const researchPoints =
    save.researchPoints + Math.max(0, Math.floor(reward.researchPoints ?? 0));
  const experience =
    save.experience + Math.max(0, Math.floor(reward.experience ?? 0));
  const managementInventory = reward.items
    ? addManagementItems(save.managementInventory, reward.items)
    : save.managementInventory;

  return {
    ...save,
    coins,
    researchPoints,
    experience,
    managementInventory,
  };
}

/**
 * Idempotent event-ledger reward claim.
 * Guarantees that any one-time reward (first discovery, first reaction, first challenge clear,
 * achievement claim, region task, history first clear) can NEVER be claimed twice or replayed on reload.
 */
export function claimRewardOnce(
  save: Save,
  eventId: string,
  reward: RewardBundle,
): { save: Save; claimed: boolean } {
  if (!eventId || save.claimedRewardIds.includes(eventId)) {
    return { save, claimed: false };
  }
  const rewarded = applyRewardBundle(save, reward);
  return {
    save: {
      ...rewarded,
      claimedRewardIds: [...rewarded.claimedRewardIds, eventId],
    },
    claimed: true,
  };
}

export function appendManagementLog(
  save: Save,
  kind: Save["managementHistory"][number]["kind"],
  summary: string,
  time = Date.now(),
): Save {
  const entry = {
    id: `m_${time}_${Math.random().toString(36).slice(2, 8)}`,
    time,
    kind,
    summary,
  };
  return {
    ...save,
    managementHistory: [entry, ...save.managementHistory].slice(0, 100),
  };
}
