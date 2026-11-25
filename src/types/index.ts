export type GameMode = "simple" | "advanced" | "hard";

export type Condition =
  | "heat"
  | "ignite"
  | "high_heat"
  | "electricity"
  | "cool"
  | "grind"
  | "mix"
  | "filter"
  | "evaporate"
  | "distill";

export type Category =
  "element" | "compound" | "mixture" | "solution" | "material" | "state";

export type Animation =
  | "energy_release"
  | "bubbles"
  | "precipitate"
  | "dissolve"
  | "crystallize"
  | "color_change"
  | "vaporize"
  | "freeze"
  | "melt"
  | "condense";

export type CalculationStrategy =
  | "stoichiometric"
  | "phase_change"
  | "ionic_stoichiometric"
  | "mixture_unsupported"
  | "material_process_unsupported";

export type ModelKind =
  | "molecule"
  | "ionic_formula_unit"
  | "metallic_network"
  | "covalent_network"
  | "mixture_schematic";

export interface Substance {
  id: string;
  chemicalEntityId: string;
  name: string;
  nameEn: string;
  formula: string | null;
  category: Category;
  group: string;
  state: "solid" | "liquid" | "gas";
  iconId: string;
  color: string;
  eraId: number;
  initialUnlocked: boolean;
  supply: boolean;
  appearance: string;
  molarMass: number | null;
  density: { value: number; unit: string; temperatureC: number } | null;
  elementComposition: Record<string, number> | null;
  charge: number | null;
  modelKind: ModelKind;
  quantitativeResearchEligible: boolean;
  aliases: string[];
  properties: string[];
  uses: string[];
  sources: string[];
  hazards: string[];
  references: string[];
  reviewStatus: "pending" | "reviewed";
}

export interface Component {
  substanceId: string;
  coefficient: number;
}

export interface Reaction {
  id: string;
  name: string;
  reactants: Component[];
  products: Component[];
  conditions: Condition[];
  catalysts: string[];
  reactionType: string;
  changeType: "chemical" | "physical";
  equation: string;
  animation: Animation;
  energyType: string;
  supportedModes: GameMode[];
  stoichiometrySupported: boolean;
  calculationStrategy: CalculationStrategy;
  reversible: boolean;
  simulationOnly: boolean;
  simplificationNotes: string[];
  references: string[];
  reviewStatus: "pending" | "reviewed";
  priority: number;
  orderSensitive?: boolean;
  equipmentIds?: string[];
  procedureId?: string;
  temperatureRange?: [number, number];
  pressureRange?: [number, number];
  concentrationRange?: [number, number];
  reactionDuration?: number;
  operationSequence?: string[];
  safetyLevel?: string;
  expectedObservations: string[];
  explanation: string;
  isTestFixture?: boolean;
  fixtureNote?: string;
}

export interface ExperimentInput {
  substances: string[];
  conditions: Condition[];
  catalysts: string[];
  mode?: GameMode;
}

export interface AdvancedExperimentInput {
  amounts: Record<string, number>;
  conditions: Condition[];
  catalysts: string[];
  mode?: GameMode;
}

export interface ReactantStoichiometryItem {
  substanceId: string;
  coefficient: number;
  input: number;
  consumed: number;
  remaining: number;
  inputMassG: number | null;
  consumedMassG: number | null;
  remainingMassG: number | null;
}

export interface ProductStoichiometryItem {
  substanceId: string;
  coefficient: number;
  produced: number;
  producedMassG: number | null;
}

export interface ConservationReport {
  inputAtoms: Record<string, number>;
  outputAtoms: Record<string, number>;
  atomsConserved: boolean;
  inputCharge: number;
  outputCharge: number;
  chargeConserved: boolean;
  totalInputMassG: number | null;
  totalProducedMassG: number | null;
  totalRemainingMassG: number | null;
  totalOutputMassG: number | null;
  massConserved: boolean | null;
  massBasis: "1_mol_per_portion";
  massBasisLabel: string;
}

export interface IntegerStoichiometryResult {
  reaction: Reaction;
  outcome: "complete" | "partial" | "insufficient";
  extent: number;
  limitingReactants: string[];
  shortfalls: { substanceId: string; provided: number; required: number }[];
  reactants: ReactantStoichiometryItem[];
  products: ProductStoichiometryItem[];
  catalysts: string[];
  portionUtilization: number;
  massUtilization: number | null;
  conservation: ConservationReport;
}

export interface RecordEntry {
  id: string;
  reactionId: string | null;
  time: number;
  message: string;
  products: string[];
  newProducts: string[];
}

export interface QuantitativeHistoryEntry {
  id: string;
  reactionId: string | null;
  reactionName: string;
  time: number;
  outcome:
    | "complete"
    | "partial"
    | "insufficient"
    | "missing"
    | "unmatched"
    | "unsupported_strategy"
    | "pending_review";
  extent: number;
  inputs: Record<string, number>;
  consumed: Record<string, number>;
  produced: Record<string, number>;
  remaining: Record<string, number>;
  portionUtilization: number;
  massUtilization: number | null;
  isDemoFixture?: boolean;
}

export interface BalancingRecord {
  reactionId: string;
  attempts: number;
  solved: boolean;
  simplestRatio: boolean;
  bestCoefficients: { reactants: number[]; products: number[] };
  time: number;
}

export interface ResearchRecord {
  discovered: boolean;
  simpleResearchCompleted: boolean;
  quantitativeResearchCompleted: boolean;
  laboratoryResearchCompleted: boolean;
  completedReactionIds: string[];
  bestExperimentRecord?: {
    reactionId: string;
    portionUtilization: number;
    massUtilization: number | null;
    completeReaction: boolean;
    time: number;
  };
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  initial: string[];
  conditions: Condition[];
  target: string;
  limit: number;
  group: string;
}

export interface QuantitativeChallengeStep {
  reactionId: string;
  inputs: Record<string, number>;
  conditions: Condition[];
  catalysts?: string[];
}

export interface QuantitativeChallenge {
  id: string;
  name: string;
  description: string;
  group: "基础份数" | "剩余物质" | "定量推演";
  kind: "synthesis" | "balancing";
  initialInventory: Record<string, number>;
  catalysts: string[];
  conditions: Condition[];
  target: {
    substanceId: string;
    minAmount: number;
    exactZeroLeftover?: boolean;
    minPortionUtilization?: number;
  };
  balancingReactionId?: string;
  limit: number;
  solutionSteps: QuantitativeChallengeStep[];
  isDemoFixture?: boolean;
}

export interface ChallengeRun {
  id: string;
  inventory: string[];
  attempts: number;
  hints: number;
  complete: boolean;
}

export interface QuantitativeChallengeRun {
  id: string;
  inventory: Record<string, number>;
  catalysts: string[];
  attempts: number;
  hints: number;
  complete: boolean;
  lastUtilization?: number;
  isDemoFixture?: boolean;
}

export * from "./v16";

import type {
  HistoryProgressRecord,
  ManagementHistoryEntry,
  RegionProgressRecord,
} from "./v16";

export interface Save {
  version: 3;
  currentMode: "simple" | "advanced";
  achievements: string[];
  discovered: Record<string, number>;
  completed: string[];
  history: RecordEntry[];
  favorites: string[];
  settings: { sound: boolean; motion: boolean };
  challengeBest: Record<string, { stars: number; attempts: number }>;
  challengeRun: ChallengeRun | null;
  collected: string[];
  totalExperiments: number;
  research: Record<string, ResearchRecord>;
  quantitativeHistory: QuantitativeHistoryEntry[];
  quantitativeChallengeBest: Record<
    string,
    { stars: number; attempts: number; bestUtilization?: number }
  >;
  quantitativeChallengeRun: QuantitativeChallengeRun | null;
  bestUtilization: Record<
    string,
    { portionUtilization: number; massUtilization: number | null }
  >;
  balancingRecords: Record<string, BalancingRecord>;
  // V1.6 Long-term Loop, Management, World Exploration, Challenge History, Museum, Special Challenges
  coins: number;
  researchPoints: number;
  experience: number;
  labLevel: number;
  managementInventory: Record<string, number>;
  equipmentLevels: Record<string, number>;
  unlockedTechIds: string[];
  activeOrderIds: string[];
  completedOrderIds: string[];
  orderDeliveryCount: Record<string, number>;
  unlockedRegionIds: string[];
  regionProgress: Record<string, RegionProgressRecord>;
  historyProgress: Record<string, HistoryProgressRecord>;
  activeHistoryChapterId?: string | null;
  museumUnlocked: Record<string, number>;
  claimedRewardIds: string[];
  claimedAchievementRewards: string[];
  specialChallengeBest: Record<
    string,
    { stars: number; attempts: number; metric?: string }
  >;
  managementHistory: ManagementHistoryEntry[];
}
