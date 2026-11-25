import type {
  AdvancedExperimentInput,
  Condition,
  ExperimentInput,
  IntegerStoichiometryResult,
  Reaction,
  Substance,
} from "../types";
import { ADVANCED_LIMITS } from "../config/modes";
import {
  executeIntegerStoichiometry,
  type IntegerStoichiometryLimits,
} from "./stoichiometry";

export type Result =
  | { status: "success"; reaction: Reaction }
  | {
      status: "missing";
      message: string;
      conditions: Condition[];
      catalysts: string[];
      extraCatalysts: string[];
    }
  | { status: "unmatched" | "ambiguous" | "unsupported"; message: string };

export type AdvancedResult =
  | {
      status: "complete" | "partial" | "insufficient";
      reaction: Reaction;
      stoichiometry: IntegerStoichiometryResult;
      message: string;
    }
  | {
      status: "missing";
      message: string;
      conditions: Condition[];
      catalysts: string[];
      extraCatalysts: string[];
    }
  | {
      status:
        | "unmatched"
        | "ambiguous"
        | "unsupported"
        | "unsupported_strategy"
        | "pending_review"
        | "invalid_input";
      message: string;
      reaction?: Reaction;
    };

const key = (a: string[]) => [...new Set(a)].sort().join("|");

export function execute(
  input: ExperimentInput,
  rules: Reaction[],
  channel: "preview" | "release" = "preview",
): Result {
  const mode = input.mode || "simple";
  if (mode !== "simple")
    return { status: "unsupported", message: "当前版本仅支持简单模式。" };

  const candidates = rules.filter(
    (r) =>
      (channel === "preview" || r.reviewStatus === "reviewed") &&
      r.supportedModes.includes(mode) &&
      (r.orderSensitive
        ? r.reactants.map((p) => p.substanceId).join("|") ===
          input.substances.join("|")
        : key(r.reactants.map((p) => p.substanceId)) === key(input.substances)),
  );

  const matches = candidates
    .filter(
      (r) =>
        r.conditions.every((c) => input.conditions.includes(c)) &&
        r.catalysts.every((c) => input.catalysts.includes(c)) &&
        input.catalysts.every((c) => r.catalysts.includes(c)),
    )
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  if (matches.length > 1 && matches[0].priority === matches[1].priority)
    return {
      status: "ambiguous",
      message: "多个规则同时满足，请减少条件后再试。",
    };
  if (matches.length) return { status: "success", reaction: matches[0] };

  if (candidates.length) {
    const distance = (r: Reaction) =>
      r.conditions.filter((c) => !input.conditions.includes(c)).length +
      r.catalysts.filter((c) => !input.catalysts.includes(c)).length +
      input.catalysts.filter((c) => !r.catalysts.includes(c)).length;
    const matched = (r: Reaction) =>
      r.conditions.filter((c) => input.conditions.includes(c)).length +
      r.catalysts.filter((c) => input.catalysts.includes(c)).length;

    const closest = [...candidates].sort(
      (a, b) =>
        distance(a) - distance(b) ||
        matched(b) - matched(a) ||
        b.priority - a.priority ||
        a.id.localeCompare(b.id),
    )[0];

    const missingConditions = closest.conditions.filter(
      (c) => !input.conditions.includes(c),
    );
    const missingCatalysts = closest.catalysts.filter(
      (c) => !input.catalysts.includes(c),
    );
    const extraCatalysts = input.catalysts.filter(
      (c) => !closest.catalysts.includes(c),
    );

    const message =
      extraCatalysts.length &&
      !missingConditions.length &&
      !missingCatalysts.length
        ? "当前反应不需要所选催化剂，请取消催化剂后再试。"
        : "组合有已收录路径，请调整反应条件或催化剂。";

    return {
      status: "missing",
      message,
      conditions: missingConditions,
      catalysts: missingCatalysts,
      extraCatalysts,
    };
  }

  return {
    status: "unmatched",
    message: input.substances.length
      ? "当前组合未匹配已收录规则。你可以调整材料或条件；这不代表现实中绝对不会发生变化。"
      : "先从物质仓库添加材料。",
  };
}

export interface AdvancedExecuteOptions extends IntegerStoichiometryLimits {
  /**
   * Channel gate matching Simple Mode:
   * - `"preview"` (default): allows applicable `stoichiometrySupported` rules in clearly marked dev preview.
   * - `"release"`: strictly enforces `reviewStatus === "reviewed"`.
   */
  channel?: "preview" | "release";
}

/**
 * Deterministic V1.5 Advanced Mode execution engine.
 * Shares the same rule catalog with Simple Mode, enforces channel review gate & stoichiometrySupported,
 * and computes integer-portion extent, consumption, production, remaining reactants, and full conservation.
 */
export function executeAdvanced(
  input: AdvancedExperimentInput,
  rules: Reaction[],
  db: Record<string, Substance>,
  options: AdvancedExecuteOptions = {},
): AdvancedResult {
  const mode = input.mode || "advanced";
  if (mode === "hard") {
    return {
      status: "unsupported",
      message: "困难模式（虚拟实验室流程与仪器）尚未开放，将在 V2.0 提供。",
    };
  }
  if (mode !== "advanced") {
    return {
      status: "unsupported",
      message: "定量引擎仅用于进阶模式（advanced）。",
    };
  }

  const channel = options.channel ?? "preview";
  const minPortions = options.minPortions ?? ADVANCED_LIMITS.minPortions;
  const maxPortions = options.maxPortions ?? ADVANCED_LIMITS.maxPortions;

  const substanceIds = Object.keys(input.amounts);
  if (!substanceIds.length) {
    return {
      status: "invalid_input",
      message: "先从物质仓库添加材料并设定投入份数。",
    };
  }

  for (const id of substanceIds) {
    if (!db[id]) {
      return { status: "invalid_input", message: `未知物质：${id}` };
    }
    const amt = input.amounts[id];
    if (!Number.isInteger(amt) || amt < minPortions || amt > maxPortions) {
      return {
        status: "invalid_input",
        message: `投入份数必须为 ${minPortions}–${maxPortions} 的整数（${db[id].name}）。`,
      };
    }
  }

  const setMatched = rules.filter((r) =>
    r.orderSensitive
      ? r.reactants.map((p) => p.substanceId).join("|") ===
        substanceIds.join("|")
      : key(r.reactants.map((p) => p.substanceId)) === key(substanceIds),
  );

  if (!setMatched.length) {
    return {
      status: "unmatched",
      message:
        "当前组合未匹配已收录规则。你可以调整材料或条件；这不代表现实中绝对不会发生变化。",
    };
  }

  const applicable = setMatched.filter(
    (r) => r.stoichiometrySupported && r.supportedModes.includes("advanced"),
  );
  if (!applicable.length) {
    return {
      status: "unsupported_strategy",
      reaction: setMatched[0],
      message: `「${setMatched[0].name}」属于混合物、溶液分离或材料加工规则，不适用纯物质整数化学计量计算；请在简单模式中探索该过程。`,
    };
  }

  const gatePassed =
    channel === "release"
      ? applicable.filter((r) => r.reviewStatus === "reviewed")
      : applicable;

  if (!gatePassed.length) {
    return {
      status: "pending_review",
      reaction: applicable[0],
      message: `「${applicable[0].name}」尚处于待人工科学审核（pending）状态，正式发布通道（release）暂不执行未审核规则。`,
    };
  }

  const matches = gatePassed
    .filter(
      (r) =>
        r.conditions.every((c) => input.conditions.includes(c)) &&
        r.catalysts.every((c) => input.catalysts.includes(c)) &&
        input.catalysts.every((c) => r.catalysts.includes(c)),
    )
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  if (matches.length > 1 && matches[0].priority === matches[1].priority) {
    return {
      status: "ambiguous",
      message: "多个规则同时满足，请减少条件后再试。",
    };
  }

  if (!matches.length) {
    const distance = (r: Reaction) =>
      r.conditions.filter((c) => !input.conditions.includes(c)).length +
      r.catalysts.filter((c) => !input.catalysts.includes(c)).length +
      input.catalysts.filter((c) => !r.catalysts.includes(c)).length;
    const matched = (r: Reaction) =>
      r.conditions.filter((c) => input.conditions.includes(c)).length +
      r.catalysts.filter((c) => input.catalysts.includes(c)).length;

    const closest = [...gatePassed].sort(
      (a, b) =>
        distance(a) - distance(b) ||
        matched(b) - matched(a) ||
        b.priority - a.priority ||
        a.id.localeCompare(b.id),
    )[0];

    const missingConditions = closest.conditions.filter(
      (c) => !input.conditions.includes(c),
    );
    const missingCatalysts = closest.catalysts.filter(
      (c) => !input.catalysts.includes(c),
    );
    const extraCatalysts = input.catalysts.filter(
      (c) => !closest.catalysts.includes(c),
    );

    const message =
      extraCatalysts.length &&
      !missingConditions.length &&
      !missingCatalysts.length
        ? "当前反应不需要所选催化剂，请取消催化剂后再试。"
        : "组合有已收录路径，请调整反应条件或催化剂。";

    return {
      status: "missing",
      message,
      conditions: missingConditions,
      catalysts: missingCatalysts,
      extraCatalysts,
    };
  }

  const reaction = matches[0];
  const stoichiometry = executeIntegerStoichiometry(
    reaction,
    input.amounts,
    db,
    { minPortions, maxPortions },
  );

  if (stoichiometry.outcome === "insufficient") {
    const detail = stoichiometry.shortfalls
      .map(
        (sf) =>
          `${db[sf.substanceId].name}投入 ${sf.provided} 份（至少需要 ${sf.required} 份）`,
      )
      .join("；");
    return {
      status: "insufficient",
      reaction,
      stoichiometry,
      message: `份数不足，无法完成 1 个整数反应单元：${detail}。`,
    };
  }

  const message =
    reaction.calculationStrategy === "phase_change"
      ? `完成 ${stoichiometry.extent} 份物态变化（独立相变计量，化学组成不变）。`
      : stoichiometry.outcome === "complete"
        ? `完全反应！共进行 ${stoichiometry.extent} 个反应单元，全部投入反应物刚好消耗完毕。`
        : `部分反应：共进行 ${stoichiometry.extent} 个反应单元，限制反应物为${stoichiometry.limitingReactants.map((id) => db[id].name).join("、")}，存在未反应剩余物质。`;

  return {
    status: stoichiometry.outcome,
    reaction,
    stoichiometry,
    message,
  };
}

export function reachable(initial: string[], rules: Reaction[]) {
  const owned = new Set(initial);
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of rules)
      if (
        [...r.reactants.map((p) => p.substanceId), ...r.catalysts].every((id) =>
          owned.has(id),
        )
      )
        for (const p of r.products)
          if (!owned.has(p.substanceId)) {
            owned.add(p.substanceId);
            changed = true;
          }
  }
  return owned;
}

/**
 * Finds a shortest sequence of rules from `initial` inventory that produces `target`.
 * Returns `[]` if `target` is already in `initial`, or `null` if unreachable.
 */
export function findPathToTarget(
  initial: string[],
  target: string,
  rules: Reaction[],
  maxDepth = 8,
): Reaction[] | null {
  if (initial.includes(target)) return [];
  const startSet = new Set(initial);
  const startKey = [...startSet].sort().join("|");
  const visited = new Set<string>([startKey]);
  const queue: { owned: Set<string>; path: Reaction[] }[] = [
    { owned: startSet, path: [] },
  ];

  while (queue.length) {
    const current = queue.shift()!;
    if (current.path.length >= maxDepth) continue;
    for (const r of rules) {
      const canRun = [
        ...r.reactants.map((p) => p.substanceId),
        ...r.catalysts,
      ].every((id) => current.owned.has(id));
      if (!canRun) continue;
      const addsNew = r.products.some((p) => !current.owned.has(p.substanceId));
      if (!addsNew) continue;
      const nextPath = [...current.path, r];
      if (r.products.some((p) => p.substanceId === target)) {
        return nextPath;
      }
      const nextOwned = new Set(current.owned);
      for (const p of r.products) nextOwned.add(p.substanceId);
      const nextKey = [...nextOwned].sort().join("|");
      if (!visited.has(nextKey)) {
        visited.add(nextKey);
        queue.push({ owned: nextOwned, path: nextPath });
      }
    }
  }
  return null;
}
