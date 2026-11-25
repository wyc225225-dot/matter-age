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

export interface MisplacedCatalystCandidate {
  reactionId: string;
  reactionName: string;
  reactants: string[];
  catalystsToMove: string[];
  missingConditions: Condition[];
  extraCatalysts: string[];
}

export interface ExtraReactantCandidate {
  reactionId: string;
  reactionName: string;
  extraReactants: string[];
  missingConditions: Condition[];
  missingCatalysts: string[];
}

export type FailureDiagnostic =
  | {
      kind: "catalyst_in_reactants";
      summary: string;
      candidates: MisplacedCatalystCandidate[];
    }
  | {
      kind: "missing_requirements";
      summary: string;
      missingConditions: Condition[];
      missingCatalysts: string[];
      extraCatalysts: string[];
    }
  | {
      kind: "insufficient_portions";
      summary: string;
      shortfalls: { substanceId: string; provided: number; required: number }[];
    }
  | {
      kind: "extra_reactants";
      summary: string;
      candidates: ExtraReactantCandidate[];
    }
  | {
      kind: "unsupported_strategy";
      summary: string;
      reactionId?: string;
    }
  | {
      kind: "ambiguous";
      summary: string;
    }
  | {
      kind: "unmatched";
      summary: string;
    };

export interface DiagnoseFailureInput {
  substances: string[];
  conditions: Condition[];
  catalysts: string[];
  mode: "simple" | "advanced";
}

export interface DiagnoseFailureOptions {
  channel?: "preview" | "release";
  labelCondition?: (c: Condition) => string;
}

/**
 * Pure-engine contextual failure diagnosis driven exclusively by the shared reaction catalog.
 * Returns null on successful reactions. Never hardcodes substance IDs, never silently swallows
 * extra non-catalyst materials, and exposes all ambiguous role candidates for player choice.
 */
export function diagnoseExperimentFailure(
  input: DiagnoseFailureInput,
  result: Result | AdvancedResult,
  rules: Reaction[],
  db: Record<string, Substance>,
  options: DiagnoseFailureOptions = {},
): FailureDiagnostic | null {
  if (
    result.status === "success" ||
    result.status === "complete" ||
    result.status === "partial"
  ) {
    return null;
  }

  const channel = options.channel ?? "preview";
  const condLabel = options.labelCondition ?? ((c: Condition) => c);
  const subName = (id: string) => db[id]?.name ?? id;

  if (result.status === "insufficient") {
    const detail = result.stoichiometry.shortfalls
      .map(
        (sf) =>
          `${subName(sf.substanceId)}当前 ${sf.provided} 份，至少需 ${sf.required} 份`,
      )
      .join("；");
    return {
      kind: "insufficient_portions",
      summary: `投入份数不足：${detail}。`,
      shortfalls: result.stoichiometry.shortfalls,
    };
  }

  if (result.status === "missing") {
    const parts: string[] = [];
    if (result.conditions.length) {
      parts.push(`缺少条件：${result.conditions.map(condLabel).join("、")}`);
    }
    if (result.catalysts.length) {
      parts.push(`缺少催化剂：${result.catalysts.map(subName).join("、")}`);
    }
    if (result.extraCatalysts.length) {
      parts.push(
        `当前反应不需要催化剂：${result.extraCatalysts.map(subName).join("、")}`,
      );
    }
    return {
      kind: "missing_requirements",
      summary: parts.length ? `${parts.join("；")}。` : result.message,
      missingConditions: result.conditions,
      missingCatalysts: result.catalysts,
      extraCatalysts: result.extraCatalysts,
    };
  }

  if (result.status === "unsupported_strategy") {
    return {
      kind: "unsupported_strategy",
      summary: result.message,
      reactionId: result.reaction?.id,
    };
  }

  if (result.status === "ambiguous") {
    return {
      kind: "ambiguous",
      summary: result.message,
    };
  }

  if (result.status === "unmatched" && input.substances.length > 0) {
    const eligible = rules.filter(
      (r) =>
        (channel === "preview" || r.reviewStatus === "reviewed") &&
        r.supportedModes.includes(input.mode) &&
        (input.mode === "simple" || r.stoichiometrySupported),
    );

    // 1. Check strict misplaced-catalyst role candidates (exact pool match, zero extra non-catalysts)
    const combinedPool = new Set([...input.substances, ...input.catalysts]);
    const misplacedCandidates: MisplacedCatalystCandidate[] = [];

    for (const r of eligible) {
      if (r.catalysts.length === 0) continue;
      const ruleReactants = r.reactants.map((p) => p.substanceId);
      const rulePool = new Set([...ruleReactants, ...r.catalysts]);
      if (rulePool.size !== combinedPool.size) continue;
      if (![...rulePool].every((id) => combinedPool.has(id))) continue;

      const catalystsInReactants = r.catalysts.filter((cid) =>
        input.substances.includes(cid),
      );
      if (catalystsInReactants.length === 0) continue;
      if (!ruleReactants.every((rid) => input.substances.includes(rid))) {
        continue;
      }

      const missingConditions = r.conditions.filter(
        (c) => !input.conditions.includes(c),
      );
      const extraCatalysts = input.catalysts.filter(
        (cid) => !r.catalysts.includes(cid),
      );

      misplacedCandidates.push({
        reactionId: r.id,
        reactionName: r.name,
        reactants: ruleReactants,
        catalystsToMove: catalystsInReactants,
        missingConditions,
        extraCatalysts,
      });
    }

    if (misplacedCandidates.length > 0) {
      misplacedCandidates.sort(
        (a, b) =>
          a.missingConditions.length - b.missingConditions.length ||
          a.reactionId.localeCompare(b.reactionId),
      );
      const summary =
        misplacedCandidates.length === 1
          ? (() => {
              const c = misplacedCandidates[0];
              const catNames = c.catalystsToMove.map(subName).join("、");
              const condHint = c.missingConditions.length
                ? `；另外还需选择条件：${c.missingConditions.map(condLabel).join("、")}`
                : "";
              return `「${catNames}」在候选反应「${c.reactionName}」中作为催化剂（不参与消耗），不属于反应物槽位${condHint}。`;
            })()
          : `当前材料在多个候选反应中可担任不同催化剂角色，请选择要调整的方案。`;
      return {
        kind: "catalyst_in_reactants",
        summary,
        candidates: misplacedCandidates,
      };
    }

    // 2. Check strict extra-reactant candidates (removing extra non-catalyst material matches a rule)
    if (input.substances.length >= 2) {
      const subSet = new Set(input.substances);
      const extraCandidates: ExtraReactantCandidate[] = [];
      for (const r of eligible) {
        const ruleReactants = r.reactants.map((p) => p.substanceId);
        if (
          ruleReactants.length > 0 &&
          ruleReactants.length < subSet.size &&
          ruleReactants.every((id) => subSet.has(id))
        ) {
          const extra = input.substances.filter(
            (id) => !ruleReactants.includes(id),
          );
          if (extra.length > 0) {
            extraCandidates.push({
              reactionId: r.id,
              reactionName: r.name,
              extraReactants: extra,
              missingConditions: r.conditions.filter(
                (c) => !input.conditions.includes(c),
              ),
              missingCatalysts: r.catalysts.filter(
                (c) => !input.catalysts.includes(c),
              ),
            });
          }
        }
      }
      if (extraCandidates.length > 0) {
        extraCandidates.sort(
          (a, b) =>
            a.extraReactants.length - b.extraReactants.length ||
            a.missingConditions.length +
              a.missingCatalysts.length -
              (b.missingConditions.length + b.missingCatalysts.length) ||
            a.reactionId.localeCompare(b.reactionId),
        );
        const top = extraCandidates[0];
        return {
          kind: "extra_reactants",
          summary: `当前台面包含多余材料（如「${top.extraReactants.map(subName).join("、")}」），系统不会忽略多余反应物；请移除多余材料后再试。`,
          candidates: extraCandidates.slice(0, 3),
        };
      }
    }
  }

  return {
    kind: "unmatched",
    summary: result.message,
  };
}
