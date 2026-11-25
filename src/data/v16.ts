import rawEconomy from "./economy.json";
import rawLabs from "./laboratories.json";
import rawEquipment from "./equipment.json";
import rawTechnologies from "./technologies.json";
import rawOrders from "./orders.json";
import rawRegions from "./regions.json";
import rawEvents from "./explorationEvents.json";
import rawFigures from "./historicalFigures.json";
import rawHistoryChapters from "./historyChapters.json";
import rawMuseum from "./museumCollections.json";
import rawSpecialChallenges from "./specialChallenges.json";
import type {
  EconomyConfig,
  EquipmentDef,
  ExplorationEventDef,
  HistoricalFigureDef,
  HistoryChapterDef,
  LabLevelDef,
  MuseumItemDef,
  OrderDef,
  RegionDef,
  SpecialChallengeDef,
  TechnologyDef,
} from "../types";

export const economyConfig = rawEconomy as EconomyConfig;
export const labLevels = rawLabs as LabLevelDef[];
export const equipmentList = rawEquipment as EquipmentDef[];
export const technologies = rawTechnologies as TechnologyDef[];
export const orders = rawOrders as OrderDef[];
export const regions = rawRegions as RegionDef[];
export const explorationEvents = rawEvents as ExplorationEventDef[];
export const historicalFigures = rawFigures as HistoricalFigureDef[];
export const historyChapters = rawHistoryChapters as HistoryChapterDef[];
export const museumItems = rawMuseum as MuseumItemDef[];
export const specialChallenges = rawSpecialChallenges as SpecialChallengeDef[];

export const equipmentById = Object.fromEntries(
  equipmentList.map((e) => [e.id, e]),
) as Record<string, EquipmentDef>;

export const techById = Object.fromEntries(
  technologies.map((t) => [t.id, t]),
) as Record<string, TechnologyDef>;

export const orderById = Object.fromEntries(
  orders.map((o) => [o.id, o]),
) as Record<string, OrderDef>;

export const regionById = Object.fromEntries(
  regions.map((r) => [r.id, r]),
) as Record<string, RegionDef>;

export const figureById = Object.fromEntries(
  historicalFigures.map((f) => [f.id, f]),
) as Record<string, HistoricalFigureDef>;

export const historyChapterById = Object.fromEntries(
  historyChapters.map((c) => [c.id, c]),
) as Record<string, HistoryChapterDef>;

export const museumById = Object.fromEntries(
  museumItems.map((m) => [m.id, m]),
) as Record<string, MuseumItemDef>;

export const specialChallengeById = Object.fromEntries(
  specialChallenges.map((c) => [c.id, c]),
) as Record<string, SpecialChallengeDef>;
