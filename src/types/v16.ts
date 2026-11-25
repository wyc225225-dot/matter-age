import type { Condition } from "./index";

/* ==================== Economy & Progression ==================== */

export interface ResearchLevelDef {
  level: number;
  title: string;
  en: string;
  minExperience: number;
  badgeColor: string;
  perks: string[];
}

export interface RewardBundle {
  coins?: number;
  researchPoints?: number;
  experience?: number;
  items?: Record<string, number>;
}

export interface MaterialPriceEntry {
  buy: number | null; // null means cannot be purchased directly (must gather or synthesize)
  sell: number;
  minLabLevel?: number;
}

export interface EconomyConfig {
  version: string;
  startingCoins: number;
  startingResearchPoints: number;
  startingInventory: Record<string, number>;
  rewards: {
    firstDiscovery: {
      coins: number;
      researchPoints: number;
      experience: number;
    };
    firstReaction: {
      coins: number;
      researchPoints: number;
      experience: number;
    };
    quantitativeCompletion: {
      coins: number;
      researchPoints: number;
      experience: number;
    };
    balancingSolved: {
      coins: number;
      researchPoints: number;
      experience: number;
    };
    simpleChallengeClear: {
      coins: number;
      researchPoints: number;
      experience: number;
    };
    quantChallengeClear: {
      coins: number;
      researchPoints: number;
      experience: number;
    };
    specialChallengeClear: {
      coins: number;
      researchPoints: number;
      experience: number;
    };
  };
  researchLevels: ResearchLevelDef[];
  materialPrices: Record<string, MaterialPriceEntry>;
}

/* ==================== Reserved V1.7 / V2.0 Interfaces ==================== */

export interface EnergySystemInterface {
  capacityWatts: number;
  currentLoadWatts: number;
  enabledInVersion: "v1.7_preview";
}

export interface AutomationSlotInterface {
  slotId: string;
  recipeId: string | null;
  intervalSeconds: number;
  enabledInVersion: "v2.0_preview";
}

/* ==================== Laboratory & Equipment ==================== */

export type EquipmentCategory =
  | "basic"
  | "thermal"
  | "mechanical"
  | "separation"
  | "electrochemistry"
  | "analysis"
  | "industrial_preview";

export interface EquipmentDef {
  id: string;
  name: string;
  en: string;
  category: EquipmentCategory;
  description: string;
  unlockedConditions: Condition[];
  maxLevel: number;
  baseCostCoins: number;
  baseCostRP: number;
  upgradeCostScale: number;
  requiredLabLevel: number;
  requiredTechId?: string;
  batchBonusPerLevel: number;
  energyUsagePreviewWatts: number;
  lockedPreview?: boolean;
  benchSlot: { x: number; y: number };
}

export interface LabLevelDef {
  level: number;
  name: string;
  en: string;
  tagline: string;
  description: string;
  upgradeCostCoins: number;
  upgradeCostRP: number;
  requiredTechIds: string[];
  requiredDiscoveredCount: number;
  equipmentCapacity: number;
  maxBatchMultiplier: number;
  activeOrderSlots: number;
  visualTheme: "starter" | "standard" | "advanced" | "industrial_preview";
  lockedPreview?: boolean;
}

/* ==================== Technology Tree (Separate from Discovery Network) ==================== */

export type TechCategory =
  | "basic_chemistry"
  | "thermal_process"
  | "metal_materials"
  | "acid_base_salt"
  | "electrochemistry"
  | "laboratory_engineering";

export interface TechnologyDef {
  id: string;
  name: string;
  en: string;
  category: TechCategory;
  tier: 1 | 2 | 3 | 4;
  description: string;
  costRP: number;
  costCoins: number;
  prereqTechIds: string[];
  requiredLabLevel: number;
  requiredSubstanceIds?: string[];
  unlocks: {
    conditions?: Condition[];
    equipmentIds?: string[];
    regionIds?: string[];
    labLevel?: number;
    bonusNote?: string;
  };
  position: { col: number; row: number };
}

/* ==================== Research Orders ==================== */

export type OrderType =
  | "synthesis"
  | "precision_stoich"
  | "resource_conservation"
  | "discovery_research"
  | "equipment_demo";

export interface OrderDeliverable {
  substanceId: string;
  amount: number;
}

export interface OrderDef {
  id: string;
  title: string;
  client: string;
  type: OrderType;
  tier: 1 | 2 | 3;
  description: string;
  requiredLabLevel: number;
  requiredTechIds?: string[];
  requiredEquipmentIds?: string[];
  deliverables: OrderDeliverable[];
  stoichRequirement?: {
    reactionId: string;
    minPortionUtilization?: number;
    exactZeroLeftover?: boolean;
  };
  reward: { coins: number; researchPoints: number; experience: number };
  repeatable?: boolean;
}

/* ==================== World Exploration ==================== */

export type RegionId =
  | "forest"
  | "mountains"
  | "ocean"
  | "volcano"
  | "industrial_ruins"
  | "future_city";

export interface GatheringNodeDef {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  costCoins: number;
  yields: { substanceId: string; amount: number }[];
  requiredEquipmentIds?: string[];
  requiredTechIds?: string[];
  experienceGain: number;
  freeStarter?: boolean;
}

export interface RegionTaskDef {
  id: string;
  title: string;
  description: string;
  targetGatherCount?: number;
  targetDeliverSubstance?: { substanceId: string; amount: number };
  reward: { coins: number; researchPoints: number; experience: number };
}

export interface RegionDef {
  id: RegionId;
  name: string;
  en: string;
  playable: boolean;
  themeColor: string;
  tagline: string;
  description: string;
  mapCoord: { x: number; y: number };
  unlockRequirement: {
    labLevel?: number;
    techIds?: string[];
    coins?: number;
  };
  nodes: GatheringNodeDef[];
  tasks: RegionTaskDef[];
  teasedNote?: string;
}

export interface ExplorationEventDef {
  id: string;
  regionId: RegionId;
  title: string;
  description: string;
  eventType: "bonus_material" | "field_note" | "mineral_vein" | "equipment_tip";
  reward: RewardBundle;
  weight: number;
  scientificNote: string;
}

/* ==================== Challenge History ==================== */

export type HistoryStageId =
  "background" | "hypothesis" | "experiment" | "analysis" | "discovery";

export type HistoryPuzzleType =
  | "gas_identification"
  | "mass_conservation_compare"
  | "water_composition_balance"
  | "voltaic_pile_assembly"
  | "periodic_table_prediction"
  | "urea_isomer_analysis"
  | "faraday_electrolysis_lab"
  | "radioactivity_data_analysis"
  | "rutherford_scattering_model"
  | "haber_bosch_process";

export interface HistoricalFigureDef {
  id: string;
  name: string;
  nameEn: string;
  lifespan: string;
  nationality: string;
  summary: string;
  contributions: string[];
  collaborationNote: string;
  references: string[];
  reviewStatus: "pending" | "reviewed";
}

export interface GasSampleConfig {
  id: string;
  label: string;
  actualGasId: "oxygen" | "carbon_dioxide" | "nitrogen";
  actualGasName: string;
  tests: {
    glowingSplint: string;
    burningSplint: string;
    limewater: string;
  };
}

export interface MassTrialConfig {
  id: string;
  title: string;
  vessel: "open" | "closed";
  description: string;
  beforeMassG: number;
  afterMassG: number;
  escapedGasNote: string;
}

export interface PeriodicCardConfig {
  symbol: string;
  name: string;
  atomicWeightTeaching: number;
  oxideFormula: string;
  densityTeaching: string;
  groupSlot: number;
  periodSlot: number;
  isGapTarget?: boolean;
}

export interface VoltaicConfig {
  requiredSequence: ("zinc" | "brine_cloth" | "copper")[];
  minCellsSimple: number;
  minCellsAdvanced: number;
  voltagePerCellV: number;
  historicalMaterialNote: string;
  modelSimplificationNote: string;
}

export interface HistoryExperimentConfig {
  puzzleType: HistoryPuzzleType;
  objectiveSimple: string;
  objectiveAdvanced: string;
  hints: string[];
  chapterMaterials: string[];
  // Ch 01: Gas identification
  gasSamples?: GasSampleConfig[];
  gasScopeNote?: string;
  advancedYieldCheck?: {
    reactionId: string;
    prompt: string;
    peroxidePortions: number;
    expectedOxygenPortions: number;
  };
  // Ch 02: Mass conservation open vs closed
  massTrials?: MassTrialConfig[];
  massQuestion?: {
    prompt: string;
    options: string[];
    correctIndex: number;
    advancedNumericCheck?: {
      prompt: string;
      expectedGrams: number;
      toleranceGrams: number;
    };
  };
  // Ch 03: Water composition + equation balance
  waterReactionId?: string;
  waterElectrolysisId?: string;
  waterVolumeRatioOptions?: { label: string; correct: boolean }[];
  waterHistoryVsDemoNote?: string;
  waterSubscriptQuestion?: {
    prompt: string;
    options: { label: string; correct: boolean; explanation: string }[];
  };
  // Ch 04: Voltaic pile stack ordering
  voltaicLayers?: VoltaicConfig;
  // Ch 07: Periodic table card ordering & gap prediction
  periodicCards?: PeriodicCardConfig[];
  gapPrediction?: {
    gapName: string;
    actualElement: string;
    prompt: string;
    options: { label: string; correct: boolean; explanation: string }[];
    advancedWeightRange?: [number, number];
    advancedOxideOptions?: { label: string; correct: boolean }[];
  };
  // Ch 05: Wöhler 1828 urea synthesis & isomer analysis
  ureaConfig?: {
    reactionStepLabel: string;
    reactionResultNote: string;
    evaporationStepLabel: string;
    evaporationResultNote: string;
    tests: {
      id: string;
      label: string;
      observation: string;
      evidenceLine: string;
    }[];
    conclusionPrompt: string;
    conclusionOptions: { label: string; correct: boolean; feedback: string }[];
    advancedIsomerPrompt: string;
    advancedIsomerOptions: {
      label: string;
      correct: boolean;
      feedback: string;
    }[];
  };
  // Ch 06: Faraday 1833–1834 laws of electrolysis
  faradayConfig?: {
    modelNote: string;
    electrolytes: {
      id: "water_h2" | "cuso4_cu" | "agno3_ag";
      name: string;
      productName: string;
      halfReaction: string;
      electronsPerUnit: number;
    }[];
    currentsA: number[];
    durationsUnit: number[];
    lawPrompt: string;
    lawOptions: { label: string; correct: boolean; feedback: string }[];
    advancedSeriesPrompt: string;
    advancedExpectedCuPortions: number;
  };
  // Ch 08: Curies 1898 pitchblende ionization virtual data analysis
  radioactivityConfig?: {
    safetyAndModelNote: string;
    samples: {
      id: string;
      label: string;
      compositionNote: string;
      relativeIntensity: number;
      readingDisplay: string;
      spectrumNote: string;
    }[];
    anomalyPrompt: string;
    anomalyOptions: { label: string; correct: boolean; feedback: string }[];
    advancedModelPrompt: string;
    advancedModelOptions: {
      label: string;
      correct: boolean;
      feedback: string;
    }[];
  };
  // Ch 09: Geiger-Marsden 1909 & Rutherford 1911 gold-foil scattering teaching model
  scatteringConfig?: {
    nuclearModelNote: string;
    angles: {
      id: "forward" | "side" | "backscatter";
      label: string;
      rangeLabel: string;
      fractionDisplay: string;
      observation: string;
    }[];
    modelPrompt: string;
    modelOptions: { label: string; correct: boolean; feedback: string }[];
    advancedMechanismPrompt: string;
    advancedMechanismOptions: {
      label: string;
      correct: boolean;
      feedback: string;
    }[];
  };
  // Ch 10: Haber-Bosch 1909–1913 ammonia synthesis abstract industrial equilibrium model
  haberConfig?: {
    modelBoundaryNote: string;
    tempOptions: {
      id: "low" | "mid" | "high";
      label: string;
      detail: string;
    }[];
    pressureOptions: {
      id: "low" | "mid" | "high";
      label: string;
      detail: string;
    }[];
    catalystOptions: {
      id: "none" | "iron" | "osmium";
      label: string;
      detail: string;
    }[];
    advancedRatioPrompt: string;
    advancedRatioOptions: {
      label: string;
      correct: boolean;
      feedback: string;
    }[];
  };
}

export interface HistoryArchiveRewardsDef {
  manuscriptTitle: string;
  manuscriptSummary: string;
  theoryTitle: string;
  theorySummary: string;
  medalName: string;
  commemorativeInstrument: string;
}

export interface HistoryChapterDef {
  id: string;
  number: number;
  eraYear: string;
  title: string;
  en: string;
  subtitle: string;
  knowledgeTheme: string;
  playable: boolean;
  teasedNote?: string;
  figureIds: string[];
  reviewStatus: "pending" | "reviewed";
  factDistinctionNote: string;
  references: string[];
  firstReward: { coins: number; researchPoints: number; experience: number };
  advancedFirstBonus?: {
    coins: number;
    researchPoints: number;
    experience: number;
  };
  repeatReward: { coins: number; researchPoints: number; experience: number };
  maxRepeatRewardClaims?: number;
  museumUnlockId?: string;
  archiveRewards?: HistoryArchiveRewardsDef;
  stages?: {
    background: {
      researchQuestion: string;
      historicalFacts: string[];
      teachingDialogue: {
        speaker: string;
        line: string;
        fictionalized: true;
      }[];
      contextSummary: string;
    };
    hypothesis: {
      question: string;
      options: {
        id: string;
        text: string;
        isRecommended: boolean;
        feedback: string;
      }[];
    };
    experiment: HistoryExperimentConfig;
    analysis: {
      evidenceSummary: string[];
      question: string;
      options: {
        id: string;
        text: string;
        correct: boolean;
        explanation: string;
      }[];
    };
    discovery: {
      milestoneTitle: string;
      scientificConclusion: string;
      historicalImpact: string;
      multiContributorNote: string;
      modernComparisonNote?: string;
    };
  };
}

/* ==================== Museum Collections ==================== */

export type MuseumCategory =
  | "historical_discovery"
  | "iconic_experiment"
  | "rare_substance"
  | "civilization_milestone"
  | "lab_relic";

export interface MuseumItemDef {
  id: string;
  name: string;
  en: string;
  category: MuseumCategory;
  eraLabel: string;
  description: string;
  scientificSignificance: string;
  unlockHint: string;
  unlockRule: {
    type:
      | "history_chapter"
      | "substance_discovered"
      | "reaction_completed"
      | "lab_level"
      | "tech_unlocked"
      | "region_explored"
      | "era_reached"
      | "quant_solved"
      | "special_solved"
      | "achievement_count";
    target: string | number;
  };
  iconKind: string;
  accentColor: string;
}

/* ==================== Special Challenges (15+ across 5 types) ==================== */

export type SpecialChallengeType =
  | "extreme_experiment"
  | "shortest_path"
  | "zero_waste"
  | "unknown_identification"
  | "reverse_inference";

export interface ReagentTestObservation {
  reagentId: string;
  reagentName: string;
  actionLabel: string;
  observation: string;
  scientificBasis: string;
}

export interface SpecialChallengeDef {
  id: string;
  type: SpecialChallengeType;
  typeName: string;
  name: string;
  description: string;
  difficulty: "简单" | "进阶" | "推演";
  limit: number;
  reward: { coins: number; researchPoints: number; experience: number };
  // For extreme_experiment & zero_waste (uses real executeAdvanced)
  finiteInventory?: Record<string, number>;
  catalysts?: string[];
  allowedConditions?: Condition[];
  targetAmount?: {
    substanceId: string;
    minAmount: number;
    exactZeroLeftover?: boolean;
  };
  solutionSteps?: {
    reactionId: string;
    inputs: Record<string, number>;
    conditions: Condition[];
    catalysts?: string[];
  }[];
  // For shortest_path (uses real execute)
  initialSubstances?: string[];
  targetSubstanceId?: string;
  maxOptimalSteps?: number;
  solutionReactionIds?: string[];
  // For unknown_identification
  unknownTargetId?: string;
  candidateIds?: string[];
  reagentTests?: ReagentTestObservation[];
  identificationClue?: string;
  // For reverse_inference (uses real execute)
  targetReactionId?: string;
  givenProductIds?: string[];
  givenObservations?: string[];
  reactantPoolIds?: string[];
  conditionPool?: Condition[];
}

/* ==================== Save v3 State Sub-records ==================== */

export interface RegionProgressRecord {
  gatherCount: number;
  completedTaskIds: string[];
  eventLog: { id: string; time: number; title: string }[];
}

export interface HistoryDifficultyRecord {
  completed: boolean;
  bestStars: number;
  attempts: number;
  hintsUsed: number;
  evidenceCompleteness: number;
  conclusionAccuracy: number;
  bestAt?: number;
}

export interface HistoryPuzzleSessionData {
  // Ch 01
  gasTests?: Record<string, string>;
  gasGuesses?: Record<string, string>;
  gasYieldAnswer?: string;
  // Ch 02
  massSystemView?: "open" | "closed";
  massMeasured?: string[];
  massOpt?: number | null;
  massNumeric?: string;
  massUnit?: "g" | "kg" | "mg";
  // Ch 03
  waterSynthDone?: boolean;
  waterElecDone?: boolean;
  waterRatio?: number | null;
  waterCoeffs?: { h2: number; o2: number; h2o: number };
  waterSubscriptChoice?: number | null;
  // Ch 04
  voltaicPair?: "zn_cu" | "zn_ag" | "cu_cu";
  voltaicStack?: ("zinc" | "brine_cloth" | "copper" | "silver" | "dry_paper")[];
  // Ch 07
  periodicSlots?: Record<string, string>;
  periodicGapMarked?: boolean;
  periodicGapChoice?: number | null;
  periodicWeightGuess?: string;
  periodicOxideChoice?: number | null;
  // Ch 05: Urea synthesis
  ureaReacted?: boolean;
  ureaEvaporated?: boolean;
  ureaTestedIds?: string[];
  ureaConclusionChoice?: number | null;
  ureaIsomerChoice?: number | null;
  // Ch 06: Faraday electrolysis
  faradayElectrolyte?: "water_h2" | "cuso4_cu" | "agno3_ag";
  faradayCurrent?: number;
  faradayDuration?: number;
  faradayLogs?: {
    electrolyteId: "water_h2" | "cuso4_cu" | "agno3_ag";
    currentA: number;
    duration: number;
    chargeQ: number;
    yieldMol: number;
  }[];
  faradayLawChoice?: number | null;
  faradaySeriesAnswer?: string;
  // Ch 08: Radioactivity data analysis
  radioMeasuredIds?: string[];
  radioAnomalyChoice?: number | null;
  radioModelChoice?: number | null;
  // Ch 09: Rutherford scattering
  scatterModelView?: "plum_pudding" | "nuclear";
  scatterComparedBoth?: boolean;
  scatterObservedAngles?: string[];
  scatterModelChoice?: number | null;
  scatterMechanismChoice?: number | null;
  // Ch 10: Haber-Bosch
  haberTemp?: "low" | "mid" | "high";
  haberPressure?: "low" | "mid" | "high";
  haberCatalyst?: "none" | "iron" | "osmium";
  haberRecycle?: boolean;
  haberTrialCount?: number;
  haberTrialHistory?: {
    temp: "low" | "mid" | "high";
    pressure: "low" | "mid" | "high";
    catalyst: "none" | "iron" | "osmium";
    recycle: boolean;
    rateScore: number;
    eqYieldPct: number;
    outputScore: number;
    feasible: boolean;
  }[];
  haberRatioChoice?: number | null;
}

export interface HistorySessionState {
  difficulty: "simple" | "advanced";
  stage: HistoryStageId;
  stageCompleted: {
    background: boolean;
    hypothesis: boolean;
    experiment: boolean;
    analysis: boolean;
  };
  hypothesisChoiceId: string | null;
  hypothesisWrongCount: number;
  analysisChoiceId: string | null;
  analysisWrongCount: number;
  experimentAttempts: number;
  hintsShown: number;
  evidenceCollected: string[];
  feedback: string;
  puzzle: HistoryPuzzleSessionData;
  updatedAt: number;
}

export interface HistoryProgressRecord {
  unlocked: boolean;
  currentStage: HistoryStageId;
  completed: boolean;
  bestStars: number;
  bestDifficulty: "simple" | "advanced";
  attempts: number;
  hintsUsed: number;
  evidenceLog: string[];
  firstCompletedAt?: number;
  difficultyRecords?: Partial<
    Record<"simple" | "advanced", HistoryDifficultyRecord>
  >;
  repeatRewardsClaimed?: number;
  unlockedArchiveRewards?: string[];
  session?: HistorySessionState | null;
}

export interface ManagementHistoryEntry {
  id: string;
  time: number;
  kind: "gather" | "produce" | "buy" | "sell" | "order" | "upgrade" | "tech";
  summary: string;
}
