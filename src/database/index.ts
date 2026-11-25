import Dexie, { type Table } from "dexie";
import type { ResearchRecord, Save } from "../types";
import {
  saveV1Schema,
  saveV2Schema,
  saveV3Schema,
} from "../schemas/saveSchema";
import {
  substances,
  reactions,
  challenges,
  quantitativeChallenges,
  economyConfig,
  labLevels,
  equipmentById,
  techById,
  orderById,
  orders,
  regionById,
  historyChapterById,
  museumById,
  specialChallengeById,
} from "../data";
import { refreshActiveOrders } from "../engine/orderEngine";
import { syncMuseumUnlocks } from "../engine/museumEngine";

const db = new Dexie("matter-age");
db.version(1).stores({ saves: "id" });
const saves = db.table("saves") as Table<{ id: string; data: Save }>;

function buildResearchFromSimple(
  discovered: Record<string, number>,
  completed: string[],
): Record<string, ResearchRecord> {
  const out: Record<string, ResearchRecord> = {};
  for (const id of Object.keys(discovered)) {
    const related = completed.filter((rid) => {
      const r = reactions.find((x) => x.id === rid);
      return (
        r &&
        ([...r.reactants, ...r.products].some((p) => p.substanceId === id) ||
          r.catalysts.includes(id))
      );
    });
    out[id] = {
      discovered: true,
      simpleResearchCompleted: true,
      quantitativeResearchCompleted: false,
      laboratoryResearchCompleted: false,
      completedReactionIds: related,
    };
  }
  return out;
}

/**
 * Seeds claimedRewardIds for historical records already present when initializing or migrating
 * from v1/v2 -> v3 so existing discoveries/completions are NEVER replayed for duplicate rewards.
 */
function seedHistoricalClaimedIds(v2: {
  discovered: Record<string, number>;
  completed: string[];
  challengeBest: Record<string, unknown>;
  quantitativeChallengeBest: Record<string, unknown>;
  balancingRecords: Record<string, { solved: boolean }>;
}): string[] {
  const claimed = new Set<string>();
  for (const id of Object.keys(v2.discovered)) {
    claimed.add(`first_discovery:${id}`);
  }
  for (const rid of v2.completed) {
    claimed.add(`first_reaction:${rid}`);
  }
  for (const cid of Object.keys(v2.challengeBest)) {
    claimed.add(`simple_challenge:${cid}`);
  }
  for (const qid of Object.keys(v2.quantitativeChallengeBest)) {
    claimed.add(`quant_challenge:${qid}`);
  }
  for (const [rid, rec] of Object.entries(v2.balancingRecords)) {
    if (rec.solved) claimed.add(`balancing:${rid}`);
  }
  return [...claimed];
}

function buildV3DefaultsFromV2(
  v2: ReturnType<typeof saveV2Schema.parse>,
): Save {
  const base: Save = saveV3Schema.parse({
    ...v2,
    version: 3,
    coins: economyConfig.startingCoins,
    researchPoints: economyConfig.startingResearchPoints,
    experience: 0,
    labLevel: 1,
    managementInventory: { ...economyConfig.startingInventory },
    equipmentLevels: { eq_basic_bench: 1 },
    unlockedTechIds: [],
    activeOrderIds: [],
    completedOrderIds: [],
    orderDeliveryCount: {},
    unlockedRegionIds: ["forest"],
    regionProgress: {},
    historyProgress: {},
    museumUnlocked: {},
    claimedRewardIds: seedHistoricalClaimedIds(v2),
    claimedAchievementRewards: [],
    specialChallengeBest: {},
    managementHistory: [],
  });
  base.activeOrderIds = refreshActiveOrders(base, orders, labLevels);
  return base;
}

export const initialSave = (): Save => {
  const now = Date.now();
  const discovered = Object.fromEntries(
    substances.filter((s) => s.initialUnlocked).map((s) => [s.id, now]),
  );
  const v2Seed = saveV2Schema.parse({
    version: 2,
    currentMode: "simple",
    achievements: [],
    discovered,
    completed: [],
    history: [],
    favorites: [],
    settings: { sound: false, motion: true },
    challengeBest: {},
    challengeRun: null,
    collected: [],
    totalExperiments: 0,
    research: buildResearchFromSimple(discovered, []),
    quantitativeHistory: [],
    quantitativeChallengeBest: {},
    quantitativeChallengeRun: null,
    bestUtilization: {},
    balancingRecords: {},
  });
  const s = buildV3DefaultsFromV2(v2Seed);
  s.museumUnlocked = syncMuseumUnlocks(
    s,
    Object.values(museumById),
    now,
  ).museumUnlocked;
  return s;
};

/**
 * Explicit save version migration boundary:
 * - v1 -> v2 -> v3: preserves ALL v1 progress, seeds v2 research & v3 economy/management defaults,
 *   and pre-seeds claimedRewardIds so historical discoveries are NEVER replayed for duplicate rewards.
 * - v2 -> v3: preserves ALL v2 progress & quantitative/balancing records with zero reward replay.
 * - v3: validated directly via saveV3Schema.
 * - Unknown / future versions (e.g. v4): rejected safely.
 */
export function migrateSave(input: unknown): Save {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("存档格式无效");
  }
  const obj = input as Record<string, unknown>;

  if (obj.version === 1) {
    const v1 = saveV1Schema.parse({
      achievements: [],
      collected: [],
      totalExperiments: 0,
      ...obj,
    });
    const v2 = saveV2Schema.parse({
      ...v1,
      version: 2,
      currentMode: "simple",
      research: buildResearchFromSimple(v1.discovered, v1.completed),
      quantitativeHistory: [],
      quantitativeChallengeBest: {},
      quantitativeChallengeRun: null,
      bestUtilization: {},
      balancingRecords: {},
    });
    return buildV3DefaultsFromV2(v2);
  }

  if (obj.version === 2) {
    const v2 = saveV2Schema.parse(obj);
    return buildV3DefaultsFromV2(v2);
  }

  if (obj.version === 3) {
    const parsed = saveV3Schema.parse(obj);
    if (!parsed.activeOrderIds.length) {
      parsed.activeOrderIds = refreshActiveOrders(parsed, orders, labLevels);
    }
    return parsed;
  }

  throw new Error(`不支持的存档版本：${String(obj.version)}`);
}

export function validateSave(input: unknown): Save {
  const s = migrateSave(input);
  const known = new Set(substances.map((x) => x.id));
  const rules = new Set(reactions.map((r) => r.id));
  const simpleChallengeIds = new Set(challenges.map((c) => c.id));
  const quantChallengeIds = new Set(quantitativeChallenges.map((c) => c.id));

  const allSubstanceIds = [
    ...Object.keys(s.discovered),
    ...Object.keys(s.research),
    ...Object.keys(s.managementInventory),
    ...s.favorites,
    ...s.collected,
    ...s.history.flatMap((h) => [...h.products, ...h.newProducts]),
    ...(s.challengeRun?.inventory || []),
    ...(s.quantitativeChallengeRun
      ? [
          ...Object.keys(s.quantitativeChallengeRun.inventory),
          ...s.quantitativeChallengeRun.catalysts,
        ]
      : []),
    ...s.quantitativeHistory.flatMap((qh) => [
      ...Object.keys(qh.inputs),
      ...Object.keys(qh.consumed),
      ...Object.keys(qh.produced),
      ...Object.keys(qh.remaining),
    ]),
  ];

  if (
    allSubstanceIds.some((id) => !known.has(id)) ||
    s.completed.some((id) => !rules.has(id)) ||
    s.history.some((h) => h.reactionId && !rules.has(h.reactionId)) ||
    s.quantitativeHistory.some(
      (qh) => qh.reactionId && !rules.has(qh.reactionId),
    ) ||
    Object.keys(s.bestUtilization).some((id) => !rules.has(id)) ||
    Object.keys(s.balancingRecords).some((id) => !rules.has(id)) ||
    Object.keys(s.challengeBest).some((id) => !simpleChallengeIds.has(id)) ||
    (s.challengeRun && !simpleChallengeIds.has(s.challengeRun.id)) ||
    Object.keys(s.quantitativeChallengeBest).some(
      (id) => !quantChallengeIds.has(id),
    ) ||
    (s.quantitativeChallengeRun &&
      !quantChallengeIds.has(s.quantitativeChallengeRun.id)) ||
    Object.keys(s.equipmentLevels).some((id) => !equipmentById[id]) ||
    s.unlockedTechIds.some((id) => !techById[id]) ||
    s.activeOrderIds.some((id) => !orderById[id]) ||
    s.completedOrderIds.some((id) => !orderById[id]) ||
    Object.keys(s.orderDeliveryCount).some((id) => !orderById[id]) ||
    s.unlockedRegionIds.some((id) => !regionById[id]) ||
    Object.keys(s.regionProgress).some((id) => !regionById[id]) ||
    Object.keys(s.historyProgress).some((id) => !historyChapterById[id]) ||
    (s.activeHistoryChapterId &&
      !historyChapterById[s.activeHistoryChapterId]) ||
    Object.keys(s.museumUnlocked).some((id) => !museumById[id]) ||
    Object.keys(s.specialChallengeBest).some((id) => !specialChallengeById[id])
  ) {
    throw new Error("存档包含未知数据");
  }

  if (substances.some((x) => x.initialUnlocked && !(x.id in s.discovered))) {
    throw new Error("缺少初始材料");
  }

  return s;
}

export async function loadSave() {
  const row = await saves.get("main");
  return row ? validateSave(row.data) : initialSave();
}

let queue = Promise.resolve();
export function persistSave(data: Save) {
  const task = queue.then(() => saves.put({ id: "main", data })).then(() => {});
  queue = task.catch(() => {});
  return task;
}
