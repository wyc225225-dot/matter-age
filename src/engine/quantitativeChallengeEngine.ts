import { executeAdvanced } from "./reactionEngine";
import type {
  IntegerStoichiometryResult,
  QuantitativeChallenge,
  Reaction,
  Substance,
} from "../types";

/**
 * Applies a completed integer-stoichiometry step to a finite challenge inventory:
 * - Deducts consumed reactant portions (unreacted remainder stays in inventory)
 * - Adds produced product portions
 * - Never consumes catalysts
 */
export function applyQuantitativeInventory(
  inventory: Record<string, number>,
  stoich: IntegerStoichiometryResult,
): Record<string, number> {
  const next: Record<string, number> = { ...inventory };
  for (const r of stoich.reactants) {
    const updated = (next[r.substanceId] || 0) - r.consumed;
    if (updated < 0) {
      throw new Error(`有限库存扣减异常：${r.substanceId} 剩余不足`);
    }
    if (updated === 0) delete next[r.substanceId];
    else next[r.substanceId] = updated;
  }
  for (const p of stoich.products) {
    if (p.produced > 0) {
      next[p.substanceId] = (next[p.substanceId] || 0) + p.produced;
    }
  }
  return next;
}

export function isQuantitativeChallengeTargetMet(
  challenge: QuantitativeChallenge,
  inventory: Record<string, number>,
  lastStoich?: IntegerStoichiometryResult | null,
): boolean {
  const targetCount = inventory[challenge.target.substanceId] || 0;
  if (targetCount < challenge.target.minAmount) return false;
  if (challenge.target.exactZeroLeftover) {
    // No leftover of any non-target initial reactant (excluding byproducts unless all reactants zeroed)
    if (lastStoich && lastStoich.outcome !== "complete") return false;
    const leftoverReactant = Object.keys(challenge.initialInventory).some(
      (id) => id !== challenge.target.substanceId && (inventory[id] || 0) > 0,
    );
    if (leftoverReactant) return false;
  }
  if (
    challenge.target.minPortionUtilization !== undefined &&
    lastStoich &&
    lastStoich.portionUtilization < challenge.target.minPortionUtilization
  ) {
    return false;
  }
  return true;
}

export interface ChallengeReplayResult {
  valid: boolean;
  allStepsReviewed: boolean;
  finalInventory: Record<string, number>;
  stepsExecuted: number;
  error?: string;
}

/**
 * Replays every authored solution step of a QuantitativeChallenge against the real
 * integer-stoichiometry engine and finite inventory deduction to prove full solvability.
 */
export function verifyQuantitativeChallenge(
  challenge: QuantitativeChallenge,
  rules: Reaction[],
  db: Record<string, Substance>,
): ChallengeReplayResult {
  let inventory: Record<string, number> = { ...challenge.initialInventory };
  const allowedRules = rules.filter((r) =>
    r.conditions.every((c) => challenge.conditions.includes(c)),
  );
  let allStepsReviewed = true;
  let lastStoich: IntegerStoichiometryResult | null = null;

  if (challenge.solutionSteps.length > challenge.limit) {
    return {
      valid: false,
      allStepsReviewed: false,
      finalInventory: inventory,
      stepsExecuted: 0,
      error: `解步骤数 (${challenge.solutionSteps.length}) 超过关卡上限 (${challenge.limit})`,
    };
  }

  for (let i = 0; i < challenge.solutionSteps.length; i++) {
    const step = challenge.solutionSteps[i];
    for (const [subId, amount] of Object.entries(step.inputs)) {
      if ((inventory[subId] || 0) < amount) {
        return {
          valid: false,
          allStepsReviewed: false,
          finalInventory: inventory,
          stepsExecuted: i,
          error: `步骤 ${i + 1} 库存不足：需要 ${subId}×${amount}，当前仅剩 ${inventory[subId] || 0}`,
        };
      }
    }
    const stepCats = step.catalysts || [];
    if (stepCats.some((c) => !challenge.catalysts.includes(c))) {
      return {
        valid: false,
        allStepsReviewed: false,
        finalInventory: inventory,
        stepsExecuted: i,
        error: `步骤 ${i + 1} 使用了关卡未提供的催化剂`,
      };
    }

    const res = executeAdvanced(
      {
        amounts: step.inputs,
        conditions: step.conditions,
        catalysts: stepCats,
      },
      allowedRules,
      db,
      { channel: "preview" },
    );

    if (res.status !== "complete" && res.status !== "partial") {
      return {
        valid: false,
        allStepsReviewed: false,
        finalInventory: inventory,
        stepsExecuted: i,
        error: `步骤 ${i + 1} 执行失败：${res.status} (${res.message})`,
      };
    }
    if (res.reaction.id !== step.reactionId) {
      return {
        valid: false,
        allStepsReviewed: false,
        finalInventory: inventory,
        stepsExecuted: i,
        error: `步骤 ${i + 1} 匹配规则 ${res.reaction.id} 与预期 ${step.reactionId} 不一致`,
      };
    }
    if (res.reaction.reviewStatus !== "reviewed") {
      allStepsReviewed = false;
    }
    if (
      !res.stoichiometry.conservation.atomsConserved ||
      !res.stoichiometry.conservation.chargeConserved
    ) {
      return {
        valid: false,
        allStepsReviewed: false,
        finalInventory: inventory,
        stepsExecuted: i,
        error: `步骤 ${i + 1} 守恒校验失败`,
      };
    }

    inventory = applyQuantitativeInventory(inventory, res.stoichiometry);
    lastStoich = res.stoichiometry;
  }

  const met = isQuantitativeChallengeTargetMet(
    challenge,
    inventory,
    lastStoich,
  );
  return {
    valid: met,
    allStepsReviewed,
    finalInventory: inventory,
    stepsExecuted: challenge.solutionSteps.length,
    error: met ? undefined : "执行全部步骤后未满足目标数量或零剩余要求",
  };
}
