import type { MuseumItemDef, Save } from "../types";
import { currentEra } from "./achievementEngine";

export function isMuseumRuleMet(save: Save, item: MuseumItemDef): boolean {
  const { type, target } = item.unlockRule;
  switch (type) {
    case "history_chapter":
      return Boolean(save.historyProgress[String(target)]?.completed);
    case "substance_discovered":
      return String(target) in save.discovered;
    case "reaction_completed":
      return save.completed.includes(String(target));
    case "lab_level":
      return save.labLevel >= Number(target);
    case "tech_unlocked":
      return save.unlockedTechIds.includes(String(target));
    case "region_explored":
      return save.unlockedRegionIds.includes(String(target));
    case "era_reached":
      return currentEra(save) >= Number(target);
    case "quant_solved":
      return (
        Object.keys(save.quantitativeChallengeBest).length >= Number(target)
      );
    case "special_solved":
      return Object.keys(save.specialChallengeBest).length >= Number(target);
    case "achievement_count":
      return save.achievements.length >= Number(target);
    default:
      return false;
  }
}

/**
 * Evaluates all museum collectible unlock rules against real player progress and records unlock timestamps
 * strictly once (preserving existing timestamps).
 */
export function syncMuseumUnlocks(
  save: Save,
  items: MuseumItemDef[],
  now = Date.now(),
): { museumUnlocked: Record<string, number>; newlyUnlocked: MuseumItemDef[] } {
  const next = { ...save.museumUnlocked };
  const newlyUnlocked: MuseumItemDef[] = [];
  for (const item of items) {
    if (item.id in next) continue;
    if (isMuseumRuleMet(save, item)) {
      next[item.id] = now;
      newlyUnlocked.push(item);
    }
  }
  return { museumUnlocked: next, newlyUnlocked };
}
