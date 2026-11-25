import { z } from "zod";
import { conditionSchema } from "./contentSchema";

const text = z.string().min(1);
const nonNegInt = z.number().int().nonnegative();
const posInt = z.number().int().positive();

const rewardTripleSchema = z.object({
  coins: nonNegInt,
  researchPoints: nonNegInt,
  experience: nonNegInt,
});

export const economyConfigSchema = z.object({
  version: text,
  startingCoins: nonNegInt,
  startingResearchPoints: nonNegInt,
  startingInventory: z.record(text, posInt),
  rewards: z.object({
    firstDiscovery: rewardTripleSchema,
    firstReaction: rewardTripleSchema,
    quantitativeCompletion: rewardTripleSchema,
    balancingSolved: rewardTripleSchema,
    simpleChallengeClear: rewardTripleSchema,
    quantChallengeClear: rewardTripleSchema,
    specialChallengeClear: rewardTripleSchema,
  }),
  researchLevels: z
    .array(
      z.object({
        level: posInt,
        title: text,
        en: text,
        minExperience: nonNegInt,
        badgeColor: text,
        perks: z.array(text).min(1),
      }),
    )
    .min(7),
  materialPrices: z.record(
    text,
    z.object({
      buy: posInt.nullable(),
      sell: nonNegInt,
      minLabLevel: posInt.optional(),
    }),
  ),
});

export const equipmentSchema = z.object({
  id: text,
  name: text,
  en: text,
  category: z.enum([
    "basic",
    "thermal",
    "mechanical",
    "separation",
    "electrochemistry",
    "analysis",
    "industrial_preview",
  ]),
  description: text,
  unlockedConditions: z.array(conditionSchema),
  maxLevel: posInt,
  baseCostCoins: nonNegInt,
  baseCostRP: nonNegInt,
  upgradeCostScale: z.number().positive(),
  requiredLabLevel: posInt,
  requiredTechId: text.optional(),
  batchBonusPerLevel: nonNegInt,
  energyUsagePreviewWatts: nonNegInt,
  lockedPreview: z.boolean().optional(),
  benchSlot: z.object({ x: z.number(), y: z.number() }),
});

export const labLevelSchema = z.object({
  level: posInt,
  name: text,
  en: text,
  tagline: text,
  description: text,
  upgradeCostCoins: nonNegInt,
  upgradeCostRP: nonNegInt,
  requiredTechIds: z.array(text),
  requiredDiscoveredCount: nonNegInt,
  equipmentCapacity: posInt,
  maxBatchMultiplier: posInt,
  activeOrderSlots: posInt,
  visualTheme: z.enum([
    "starter",
    "standard",
    "advanced",
    "industrial_preview",
  ]),
  lockedPreview: z.boolean().optional(),
});

export const technologySchema = z.object({
  id: text,
  name: text,
  en: text,
  category: z.enum([
    "basic_chemistry",
    "thermal_process",
    "metal_materials",
    "acid_base_salt",
    "electrochemistry",
    "laboratory_engineering",
  ]),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  description: text,
  costRP: nonNegInt,
  costCoins: nonNegInt,
  prereqTechIds: z.array(text),
  requiredLabLevel: posInt,
  requiredSubstanceIds: z.array(text).optional(),
  unlocks: z.object({
    conditions: z.array(conditionSchema).optional(),
    equipmentIds: z.array(text).optional(),
    regionIds: z.array(text).optional(),
    labLevel: posInt.optional(),
    bonusNote: text.optional(),
  }),
  position: z.object({ col: nonNegInt, row: nonNegInt }),
});

export const orderSchema = z.object({
  id: text,
  title: text,
  client: text,
  type: z.enum([
    "synthesis",
    "precision_stoich",
    "resource_conservation",
    "discovery_research",
    "equipment_demo",
  ]),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  description: text,
  requiredLabLevel: posInt,
  requiredTechIds: z.array(text).optional(),
  requiredEquipmentIds: z.array(text).optional(),
  deliverables: z.array(z.object({ substanceId: text, amount: posInt })).min(1),
  stoichRequirement: z
    .object({
      reactionId: text,
      minPortionUtilization: z.number().min(0).max(1).optional(),
      exactZeroLeftover: z.boolean().optional(),
    })
    .optional(),
  reward: rewardTripleSchema,
  repeatable: z.boolean().optional(),
});

export const regionSchema = z.object({
  id: z.enum([
    "forest",
    "mountains",
    "ocean",
    "volcano",
    "industrial_ruins",
    "future_city",
  ]),
  name: text,
  en: text,
  playable: z.boolean(),
  themeColor: text,
  tagline: text,
  description: text,
  mapCoord: z.object({ x: z.number(), y: z.number() }),
  unlockRequirement: z.object({
    labLevel: posInt.optional(),
    techIds: z.array(text).optional(),
    coins: nonNegInt.optional(),
  }),
  nodes: z.array(
    z.object({
      id: text,
      name: text,
      description: text,
      x: z.number(),
      y: z.number(),
      costCoins: nonNegInt,
      yields: z.array(z.object({ substanceId: text, amount: posInt })).min(1),
      requiredEquipmentIds: z.array(text).optional(),
      requiredTechIds: z.array(text).optional(),
      experienceGain: nonNegInt,
      freeStarter: z.boolean().optional(),
    }),
  ),
  tasks: z.array(
    z.object({
      id: text,
      title: text,
      description: text,
      targetGatherCount: posInt.optional(),
      targetDeliverSubstance: z
        .object({ substanceId: text, amount: posInt })
        .optional(),
      reward: rewardTripleSchema,
    }),
  ),
  teasedNote: text.optional(),
});

export const explorationEventSchema = z.object({
  id: text,
  regionId: z.enum([
    "forest",
    "mountains",
    "ocean",
    "volcano",
    "industrial_ruins",
    "future_city",
  ]),
  title: text,
  description: text,
  eventType: z.enum([
    "bonus_material",
    "field_note",
    "mineral_vein",
    "equipment_tip",
  ]),
  reward: z.object({
    coins: nonNegInt.optional(),
    researchPoints: nonNegInt.optional(),
    experience: nonNegInt.optional(),
    items: z.record(text, posInt).optional(),
  }),
  weight: posInt,
  scientificNote: text,
});

export const historicalFigureSchema = z.object({
  id: text,
  name: text,
  nameEn: text,
  lifespan: text,
  nationality: text,
  summary: text,
  contributions: z.array(text).min(1),
  collaborationNote: text,
  references: z.array(z.url()).min(1),
  reviewStatus: z.enum(["pending", "reviewed"]),
});

export const historyChapterSchema = z.object({
  id: text,
  number: posInt,
  eraYear: text,
  title: text,
  en: text,
  subtitle: text,
  knowledgeTheme: text,
  playable: z.boolean(),
  teasedNote: text.optional(),
  figureIds: z.array(text),
  reviewStatus: z.enum(["pending", "reviewed"]),
  factDistinctionNote: text,
  references: z.array(z.url()).min(1),
  firstReward: rewardTripleSchema,
  advancedFirstBonus: rewardTripleSchema.optional(),
  repeatReward: rewardTripleSchema,
  maxRepeatRewardClaims: nonNegInt.optional(),
  museumUnlockId: text.optional(),
  archiveRewards: z
    .object({
      manuscriptTitle: text,
      manuscriptSummary: text,
      theoryTitle: text,
      theorySummary: text,
      medalName: text,
      commemorativeInstrument: text,
    })
    .optional(),
  stages: z.any().optional(),
});

export const museumItemSchema = z.object({
  id: text,
  name: text,
  en: text,
  category: z.enum([
    "historical_discovery",
    "iconic_experiment",
    "rare_substance",
    "civilization_milestone",
    "lab_relic",
  ]),
  eraLabel: text,
  description: text,
  scientificSignificance: text,
  unlockHint: text,
  unlockRule: z.object({
    type: z.enum([
      "history_chapter",
      "substance_discovered",
      "reaction_completed",
      "lab_level",
      "tech_unlocked",
      "region_explored",
      "era_reached",
      "quant_solved",
      "special_solved",
      "achievement_count",
    ]),
    target: z.union([text, nonNegInt]),
  }),
  iconKind: text,
  accentColor: text,
});

export const specialChallengeSchema = z.object({
  id: text,
  type: z.enum([
    "extreme_experiment",
    "shortest_path",
    "zero_waste",
    "unknown_identification",
    "reverse_inference",
  ]),
  typeName: text,
  name: text,
  description: text,
  difficulty: z.enum(["简单", "进阶", "推演"]),
  limit: posInt,
  reward: rewardTripleSchema,
  finiteInventory: z.record(text, posInt).optional(),
  catalysts: z.array(text).optional(),
  allowedConditions: z.array(conditionSchema).optional(),
  targetAmount: z
    .object({
      substanceId: text,
      minAmount: posInt,
      exactZeroLeftover: z.boolean().optional(),
    })
    .optional(),
  solutionSteps: z
    .array(
      z.object({
        reactionId: text,
        inputs: z.record(text, posInt),
        conditions: z.array(conditionSchema),
        catalysts: z.array(text).optional(),
      }),
    )
    .optional(),
  initialSubstances: z.array(text).optional(),
  targetSubstanceId: text.optional(),
  maxOptimalSteps: posInt.optional(),
  solutionReactionIds: z.array(text).optional(),
  unknownTargetId: text.optional(),
  candidateIds: z.array(text).optional(),
  reagentTests: z
    .array(
      z.object({
        reagentId: text,
        reagentName: text,
        actionLabel: text,
        observation: text,
        scientificBasis: text,
      }),
    )
    .optional(),
  identificationClue: text.optional(),
  targetReactionId: text.optional(),
  givenProductIds: z.array(text).optional(),
  givenObservations: z.array(text).optional(),
  reactantPoolIds: z.array(text).optional(),
  conditionPool: z.array(conditionSchema).optional(),
});
