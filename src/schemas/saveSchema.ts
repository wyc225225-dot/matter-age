import { z } from "zod";

const id = z.string().min(1).max(80);
const ids = z.array(id).max(1000);
const time = z.number().finite().nonnegative();
const intMap = z.record(id, z.number().int().nonnegative());

const historyItemSchema = z.object({
  id,
  reactionId: id.nullable(),
  time,
  message: z.string().max(3000),
  products: ids,
  newProducts: ids,
});

const challengeBestItemSchema = z.object({
  stars: z.number().int().min(1).max(3),
  attempts: z.number().int().nonnegative(),
});

const challengeRunSchema = z
  .object({
    id,
    inventory: ids,
    attempts: z.number().int().nonnegative(),
    hints: z.number().int().nonnegative(),
    complete: z.boolean(),
  })
  .nullable();

const researchRecordSchema = z.object({
  discovered: z.boolean(),
  simpleResearchCompleted: z.boolean(),
  quantitativeResearchCompleted: z.boolean(),
  laboratoryResearchCompleted: z.boolean(),
  completedReactionIds: ids,
  bestExperimentRecord: z
    .object({
      reactionId: id,
      portionUtilization: z.number().min(0).max(1),
      massUtilization: z.number().min(0).max(1).nullable(),
      completeReaction: z.boolean(),
      time,
    })
    .optional(),
});

const quantitativeHistoryItemSchema = z.object({
  id,
  reactionId: id.nullable(),
  reactionName: z.string().max(200),
  time,
  outcome: z.enum([
    "complete",
    "partial",
    "insufficient",
    "missing",
    "unmatched",
    "unsupported_strategy",
    "pending_review",
  ]),
  extent: z.number().int().nonnegative(),
  inputs: intMap,
  consumed: intMap,
  produced: intMap,
  remaining: intMap,
  portionUtilization: z.number().min(0).max(1),
  massUtilization: z.number().min(0).max(1).nullable(),
  isDemoFixture: z.boolean().optional(),
});

const balancingRecordSchema = z.object({
  reactionId: id,
  attempts: z.number().int().nonnegative(),
  solved: z.boolean(),
  simplestRatio: z.boolean(),
  bestCoefficients: z.object({
    reactants: z.array(z.number().int().positive()).max(8),
    products: z.array(z.number().int().positive()).max(8),
  }),
  time,
});

const quantitativeChallengeRunSchema = z
  .object({
    id,
    inventory: intMap,
    catalysts: ids,
    attempts: z.number().int().nonnegative(),
    hints: z.number().int().nonnegative(),
    complete: z.boolean(),
    lastUtilization: z.number().min(0).max(1).optional(),
    isDemoFixture: z.boolean().optional(),
  })
  .nullable();

export const saveV1Schema = z.object({
  version: z.literal(1),
  achievements: ids.default([]),
  discovered: z.record(id, time),
  completed: ids,
  history: z.array(historyItemSchema).max(200),
  favorites: ids,
  settings: z.object({ sound: z.boolean(), motion: z.boolean() }),
  challengeBest: z.record(id, challengeBestItemSchema),
  challengeRun: challengeRunSchema,
  collected: ids.default([]),
  totalExperiments: z.number().int().nonnegative().default(0),
});

export const saveV2Schema = z.object({
  version: z.literal(2),
  currentMode: z.enum(["simple", "advanced"]).default("simple"),
  achievements: ids.default([]),
  discovered: z.record(id, time),
  completed: ids,
  history: z.array(historyItemSchema).max(200),
  favorites: ids,
  settings: z.object({ sound: z.boolean(), motion: z.boolean() }),
  challengeBest: z.record(id, challengeBestItemSchema),
  challengeRun: challengeRunSchema,
  collected: ids.default([]),
  totalExperiments: z.number().int().nonnegative().default(0),
  research: z.record(id, researchRecordSchema).default({}),
  quantitativeHistory: z
    .array(quantitativeHistoryItemSchema)
    .max(200)
    .default([]),
  quantitativeChallengeBest: z
    .record(
      id,
      z.object({
        stars: z.number().int().min(1).max(3),
        attempts: z.number().int().nonnegative(),
        bestUtilization: z.number().min(0).max(1).optional(),
      }),
    )
    .default({}),
  quantitativeChallengeRun: quantitativeChallengeRunSchema.default(null),
  bestUtilization: z
    .record(
      id,
      z.object({
        portionUtilization: z.number().min(0).max(1),
        massUtilization: z.number().min(0).max(1).nullable(),
      }),
    )
    .default({}),
  balancingRecords: z.record(id, balancingRecordSchema).default({}),
});

const regionProgressSchema = z.object({
  gatherCount: z.number().int().nonnegative(),
  completedTaskIds: ids,
  eventLog: z
    .array(
      z.object({
        id,
        time,
        title: z.string().max(200),
      }),
    )
    .max(50),
});

const historyDifficultyRecordSchema = z.object({
  completed: z.boolean(),
  bestStars: z.number().int().min(0).max(3),
  attempts: z.number().int().nonnegative(),
  hintsUsed: z.number().int().nonnegative(),
  evidenceCompleteness: z.number().min(0).max(1),
  conclusionAccuracy: z.number().min(0).max(1),
  bestAt: time.optional(),
});

const historyPuzzleSessionSchema = z
  .object({
    gasTests: z.record(z.string(), z.string()).optional(),
    gasGuesses: z.record(z.string(), z.string()).optional(),
    gasYieldAnswer: z.string().max(40).optional(),
    massSystemView: z.enum(["open", "closed"]).optional(),
    massMeasured: z.array(id).max(10).optional(),
    massOpt: z.number().int().nonnegative().nullable().optional(),
    massNumeric: z.string().max(40).optional(),
    massUnit: z.enum(["g", "kg", "mg"]).optional(),
    waterSynthDone: z.boolean().optional(),
    waterElecDone: z.boolean().optional(),
    waterRatio: z.number().int().nonnegative().nullable().optional(),
    waterCoeffs: z
      .object({
        h2: z.number().int().min(1).max(99),
        o2: z.number().int().min(1).max(99),
        h2o: z.number().int().min(1).max(99),
      })
      .optional(),
    waterSubscriptChoice: z.number().int().nonnegative().nullable().optional(),
    voltaicPair: z.enum(["zn_cu", "zn_ag", "cu_cu"]).optional(),
    voltaicStack: z
      .array(z.enum(["zinc", "brine_cloth", "copper", "silver", "dry_paper"]))
      .max(24)
      .optional(),
    periodicSlots: z.record(z.string(), z.string()).optional(),
    periodicGapMarked: z.boolean().optional(),
    periodicGapChoice: z.number().int().nonnegative().nullable().optional(),
    periodicWeightGuess: z.string().max(40).optional(),
    periodicOxideChoice: z.number().int().nonnegative().nullable().optional(),
  })
  .default({});

const historySessionSchema = z.object({
  difficulty: z.enum(["simple", "advanced"]),
  stage: z.enum([
    "background",
    "hypothesis",
    "experiment",
    "analysis",
    "discovery",
  ]),
  stageCompleted: z.object({
    background: z.boolean(),
    hypothesis: z.boolean(),
    experiment: z.boolean(),
    analysis: z.boolean(),
  }),
  hypothesisChoiceId: z.string().nullable(),
  hypothesisWrongCount: z.number().int().nonnegative().default(0),
  analysisChoiceId: z.string().nullable(),
  analysisWrongCount: z.number().int().nonnegative().default(0),
  experimentAttempts: z.number().int().nonnegative().default(0),
  hintsShown: z.number().int().nonnegative().default(0),
  evidenceCollected: z.array(z.string().max(400)).max(60).default([]),
  feedback: z.string().max(600).default(""),
  puzzle: historyPuzzleSessionSchema,
  updatedAt: time,
});

const historyProgressSchema = z.object({
  unlocked: z.boolean(),
  currentStage: z.enum([
    "background",
    "hypothesis",
    "experiment",
    "analysis",
    "discovery",
  ]),
  completed: z.boolean(),
  bestStars: z.number().int().min(0).max(3),
  bestDifficulty: z.enum(["simple", "advanced"]),
  attempts: z.number().int().nonnegative(),
  hintsUsed: z.number().int().nonnegative(),
  evidenceLog: z.array(z.string().max(400)).max(60),
  firstCompletedAt: time.optional(),
  difficultyRecords: z
    .record(z.enum(["simple", "advanced"]), historyDifficultyRecordSchema)
    .optional(),
  repeatRewardsClaimed: z.number().int().nonnegative().optional(),
  unlockedArchiveRewards: z.array(z.string().max(120)).max(30).optional(),
  session: historySessionSchema.nullable().optional(),
});

const managementHistoryItemSchema = z.object({
  id,
  time,
  kind: z.enum([
    "gather",
    "produce",
    "buy",
    "sell",
    "order",
    "upgrade",
    "tech",
  ]),
  summary: z.string().max(400),
});

export const saveV3Schema = saveV2Schema.extend({
  version: z.literal(3),
  coins: z.number().int().nonnegative().default(120),
  researchPoints: z.number().int().nonnegative().default(30),
  experience: z.number().int().nonnegative().default(0),
  labLevel: z.number().int().min(1).max(3).default(1),
  managementInventory: intMap.default({}),
  equipmentLevels: z.record(id, z.number().int().positive()).default({
    eq_basic_bench: 1,
  }),
  unlockedTechIds: ids.default([]),
  activeOrderIds: ids.default([]),
  completedOrderIds: ids.default([]),
  orderDeliveryCount: intMap.default({}),
  unlockedRegionIds: ids.default(["forest"]),
  regionProgress: z.record(id, regionProgressSchema).default({}),
  historyProgress: z.record(id, historyProgressSchema).default({}),
  activeHistoryChapterId: id.nullable().optional(),
  museumUnlocked: z.record(id, time).default({}),
  claimedRewardIds: z.array(z.string().min(1).max(160)).max(5000).default([]),
  claimedAchievementRewards: ids.default([]),
  specialChallengeBest: z
    .record(
      id,
      z.object({
        stars: z.number().int().min(1).max(3),
        attempts: z.number().int().nonnegative(),
        metric: z.string().max(80).optional(),
      }),
    )
    .default({}),
  managementHistory: z.array(managementHistoryItemSchema).max(100).default([]),
});

export const saveSchema = saveV3Schema;
