import type {
  Condition,
  Reaction,
  SpecialChallengeDef,
  Substance,
} from "../types";
import { execute, executeAdvanced } from "./reactionEngine";
import { applyQuantitativeInventory } from "./quantitativeChallengeEngine";

export interface SpecialStepOutcome {
  ok: boolean;
  solved: boolean;
  message: string;
  inventory?: Record<string, number>;
  discoveredInRun?: string[];
  reaction?: Reaction;
  utilization?: number;
}

/**
 * Executes one step of an extreme_experiment or zero_waste special challenge via real executeAdvanced.
 */
export function runFiniteSpecialStep(
  challenge: SpecialChallengeDef,
  currentInventory: Record<string, number>,
  inputs: Record<string, number>,
  conditions: Condition[],
  catalysts: string[],
  rules: Reaction[],
  db: Record<string, Substance>,
): SpecialStepOutcome {
  if (!challenge.targetAmount || !challenge.allowedConditions) {
    return { ok: false, solved: false, message: "挑战配置不完整" };
  }
  const allowed = challenge.allowedConditions;
  if (conditions.some((c) => !allowed.includes(c))) {
    return {
      ok: false,
      solved: false,
      message: "选择了本关不允许的反应条件。",
    };
  }
  for (const [id, amt] of Object.entries(inputs)) {
    if ((currentInventory[id] ?? 0) < amt) {
      return {
        ok: false,
        solved: false,
        message: `有限库存不足：${db[id]?.name ?? id}（需 ${amt}，现 ${currentInventory[id] ?? 0}）。`,
      };
    }
  }
  const availableCats = challenge.catalysts ?? [];
  if (catalysts.some((c) => !availableCats.includes(c))) {
    return { ok: false, solved: false, message: "本关未提供所选催化剂。" };
  }

  const res = executeAdvanced(
    { amounts: inputs, conditions, catalysts, mode: "advanced" },
    rules,
    db,
  );
  if (res.status !== "complete" && res.status !== "partial") {
    return { ok: false, solved: false, message: res.message };
  }

  const nextInv = applyQuantitativeInventory(
    currentInventory,
    res.stoichiometry,
  );
  const target = challenge.targetAmount;
  const hasTarget = (nextInv[target.substanceId] ?? 0) >= target.minAmount;
  const zeroWasteOk = !target.exactZeroLeftover || res.status === "complete";

  if (hasTarget && !zeroWasteOk) {
    return {
      ok: true,
      solved: false,
      inventory: nextInv,
      reaction: res.reaction,
      utilization: res.stoichiometry.portionUtilization,
      message: `已制得目标物质，但当步存在未反应剩余物（份数利用率 ${Math.round(res.stoichiometry.portionUtilization * 100)}%），零浪费挑战要求 100% 完全消耗！请重置再试。`,
    };
  }

  return {
    ok: true,
    solved: hasTarget && zeroWasteOk,
    inventory: nextInv,
    reaction: res.reaction,
    utilization: res.stoichiometry.portionUtilization,
    message:
      hasTarget && zeroWasteOk ? `特殊挑战达成！${res.message}` : res.message,
  };
}

/**
 * Executes one step of a shortest_path special challenge via real execute.
 */
export function runShortestPathStep(
  challenge: SpecialChallengeDef,
  ownedSubstances: string[],
  selectedSubstances: string[],
  conditions: Condition[],
  stepsUsedSoFar: number,
  rules: Reaction[],
): SpecialStepOutcome {
  if (!challenge.targetSubstanceId || !challenge.maxOptimalSteps) {
    return { ok: false, solved: false, message: "最短路径配置不完整" };
  }
  if (selectedSubstances.some((id) => !ownedSubstances.includes(id))) {
    return {
      ok: false,
      solved: false,
      message: "只能使用当前关卡内已拥有的物质。",
    };
  }
  const allowed = challenge.allowedConditions ?? [];
  if (conditions.some((c) => !allowed.includes(c))) {
    return { ok: false, solved: false, message: "包含本关未提供的条件。" };
  }
  const res = execute(
    {
      substances: selectedSubstances,
      conditions,
      catalysts: [],
      mode: "simple",
    },
    rules,
    "preview",
  );
  if (res.status !== "success") {
    return { ok: false, solved: false, message: res.message };
  }
  const nextOwned = [
    ...new Set([
      ...ownedSubstances,
      ...res.reaction.products.map((p) => p.substanceId),
    ]),
  ];
  const nextSteps = stepsUsedSoFar + 1;
  const reached = nextOwned.includes(challenge.targetSubstanceId);
  if (reached && nextSteps <= challenge.maxOptimalSteps) {
    return {
      ok: true,
      solved: true,
      discoveredInRun: nextOwned,
      reaction: res.reaction,
      message: `最短路径达成！仅用 ${nextSteps} 步完成「${res.reaction.name}」并制得目标物质。`,
    };
  }
  if (nextSteps >= challenge.maxOptimalSteps && !reached) {
    return {
      ok: true,
      solved: false,
      discoveredInRun: nextOwned,
      reaction: res.reaction,
      message: `已用完 ${challenge.maxOptimalSteps} 步最优上限仍未合成目标，请点击重置重新规划路径。`,
    };
  }
  return {
    ok: true,
    solved: false,
    discoveredInRun: nextOwned,
    reaction: res.reaction,
    message: `第 ${nextSteps} 步成功：${res.reaction.name}。继续推进至目标！`,
  };
}

/**
 * Evaluates unknown_identification guess after collecting reagent evidence.
 */
export function evaluateUnknownIdentification(
  challenge: SpecialChallengeDef,
  testedReagentIds: string[],
  guessedSubstanceId: string,
  db: Record<string, Substance>,
): { solved: boolean; message: string } {
  if (testedReagentIds.length === 0) {
    return {
      solved: false,
      message: "请至少先执行 1 项试剂检验获取化学证据，再提交鉴定结论。",
    };
  }
  if (guessedSubstanceId === challenge.unknownTargetId) {
    return {
      solved: true,
      message: `鉴定准确！未知样品正是「${db[guessedSubstanceId]?.name ?? guessedSubstanceId}」（已采集 ${testedReagentIds.length} 项试剂证据）。`,
    };
  }
  return {
    solved: false,
    message: `判断与检验现象不符：「${db[guessedSubstanceId]?.name ?? guessedSubstanceId}」无法解释全部观测记录，请核对试剂反应特征再试。`,
  };
}

/**
 * Evaluates reverse_inference by running the player's proposed reactants + conditions through real execute().
 */
export function evaluateReverseInference(
  challenge: SpecialChallengeDef,
  selectedReactants: string[],
  selectedConditions: Condition[],
  rules: Reaction[],
): { solved: boolean; message: string; reaction?: Reaction } {
  if (!challenge.targetReactionId) {
    return { solved: false, message: "逆向推理配置不完整" };
  }
  if (!selectedReactants.length) {
    return { solved: false, message: "请先从候选原料池选择至少 1 种反应物。" };
  }
  const res = execute(
    {
      substances: selectedReactants,
      conditions: selectedConditions,
      catalysts: [],
      mode: "simple",
    },
    rules,
    "preview",
  );
  if (res.status !== "success") {
    return {
      solved: false,
      message: `所选原料与条件未能复现目标产物：${res.message}`,
    };
  }
  if (res.reaction.id === challenge.targetReactionId) {
    return {
      solved: true,
      reaction: res.reaction,
      message: `逆向推理成功！完整复现「${res.reaction.name}」（${res.reaction.equation}）。`,
    };
  }
  return {
    solved: false,
    reaction: res.reaction,
    message: `该组合触发的是「${res.reaction.name}」，与目标日志产物线索不完全一致，请重新推演。`,
  };
}

/**
 * Automated verifier used by scripts/validate-data.ts & unit tests to prove ALL special challenges are solvable.
 */
export function verifySpecialChallenge(
  c: SpecialChallengeDef,
  rules: Reaction[],
  db: Record<string, Substance>,
): { valid: boolean; error?: string } {
  if (c.type === "extreme_experiment" || c.type === "zero_waste") {
    if (!c.finiteInventory || !c.solutionSteps?.length || !c.targetAmount) {
      return { valid: false, error: "缺少有限库存、目标或验证解步骤" };
    }
    let inv = { ...c.finiteInventory };
    let solved = false;
    for (const step of c.solutionSteps) {
      const out = runFiniteSpecialStep(
        c,
        inv,
        step.inputs,
        step.conditions,
        step.catalysts ?? [],
        rules,
        db,
      );
      if (!out.ok || !out.inventory) {
        return { valid: false, error: out.message };
      }
      if (out.reaction?.id !== step.reactionId) {
        return {
          valid: false,
          error: `步骤匹配规则 ${out.reaction?.id} 与预期 ${step.reactionId} 不一致`,
        };
      }
      inv = out.inventory;
      solved = out.solved;
    }
    return solved
      ? { valid: true }
      : { valid: false, error: "执行完验证解步骤后未达成目标" };
  }

  if (c.type === "shortest_path") {
    if (
      !c.initialSubstances?.length ||
      !c.targetSubstanceId ||
      !c.solutionReactionIds?.length
    ) {
      return { valid: false, error: "最短路径缺少起点、目标或解步骤" };
    }
    let owned = [...c.initialSubstances];
    let steps = 0;
    let solved = false;
    for (const rid of c.solutionReactionIds) {
      const rxn = rules.find((r) => r.id === rid);
      if (!rxn) return { valid: false, error: `未知反应 ${rid}` };
      const out = runShortestPathStep(
        c,
        owned,
        rxn.reactants.map((p) => p.substanceId),
        rxn.conditions,
        steps,
        rules,
      );
      if (!out.ok || !out.discoveredInRun) {
        return { valid: false, error: out.message };
      }
      owned = out.discoveredInRun;
      steps++;
      solved = out.solved;
    }
    return solved
      ? { valid: true }
      : { valid: false, error: "最短路径解未在限定步数内达成目标" };
  }

  if (c.type === "unknown_identification") {
    if (
      !c.unknownTargetId ||
      !db[c.unknownTargetId] ||
      !c.candidateIds?.includes(c.unknownTargetId) ||
      !c.reagentTests?.length
    ) {
      return { valid: false, error: "未知物质鉴定配置无效" };
    }
    const out = evaluateUnknownIdentification(
      c,
      [c.reagentTests[0].reagentId],
      c.unknownTargetId,
      db,
    );
    return out.solved ? { valid: true } : { valid: false, error: out.message };
  }

  if (c.type === "reverse_inference") {
    const rxn = rules.find((r) => r.id === c.targetReactionId);
    if (!rxn)
      return { valid: false, error: `未知目标反应 ${c.targetReactionId}` };
    const reactants = rxn.reactants.map((p) => p.substanceId);
    if (reactants.some((id) => !c.reactantPoolIds?.includes(id))) {
      return { valid: false, error: "目标反应物未包含在候选原料池中" };
    }
    if (rxn.conditions.some((cond) => !c.conditionPool?.includes(cond))) {
      return { valid: false, error: "目标反应条件未包含在候选条件池中" };
    }
    const out = evaluateReverseInference(c, reactants, rxn.conditions, rules);
    return out.solved ? { valid: true } : { valid: false, error: out.message };
  }

  return { valid: false, error: "未知特殊挑战类型" };
}
