import type { Condition, Reaction, Substance } from "../types";
import {
  formatTransformationChinese,
  type KnowledgeSpeciesRecord,
  type KnowledgeTransformationRecord,
} from "../utils/knowledgeNames";

export type KnowledgeCoverageReason =
  | "playable"
  | "equation_only"
  | "no_reaction"
  | "atmosphere_unmodeled"
  | "species_unmodeled"
  | "not_open_yet";

export interface KnowledgeTransformationCoverage {
  transformationId: string;
  sourceId: string;
  playable: boolean;
  reason: KnowledgeCoverageReason;
  statusBadge: string;
  reasonLabel: string;
  detail: string;
  matchedRuleIds: string[];
  requiredConditions: Condition[];
  stateSimplificationNote?: string;
}

export interface UnopenedKnowledgeMatch {
  id: string;
  sourceId: string;
  equation: string;
  chineseSummary: string;
  reasonLabel: string;
}

export interface KnowledgeCoverageSummary {
  total: number;
  playable: number;
  notOpen: number;
  byReason: Record<KnowledgeCoverageReason, number>;
}

const mapKnowledgeState = (state: string): Substance["state"] =>
  state === "g" ? "gas" : state === "l" || state === "aq" ? "liquid" : "solid";

const sortedKey = (ids: string[]) => [...new Set(ids)].sort().join("|");

/**
 * Pure deterministic matcher mapping a neutral knowledge species to an existing
 * playable Substance while strictly preserving state & aqueous-solution boundaries.
 */
export function matchKnowledgeSpeciesToSubstance(
  species: KnowledgeSpeciesRecord | undefined,
  substances: Substance[],
): Substance | null {
  if (!species || species.charge !== 0) return null;
  const targetState = mapKnowledgeState(species.state);
  return (
    substances.find(
      (s) =>
        s.formula === species.formula &&
        s.state === targetState &&
        (species.state === "aq"
          ? s.category === "solution"
          : s.category !== "solution"),
    ) ?? null
  );
}

/**
 * Evaluates whether a knowledge-base transformation has an actually playable workbench rule.
 * Pure engine logic — never fabricates or infers unauthored reactions.
 */
export function evaluateKnowledgeTransformationCoverage(
  record: KnowledgeTransformationRecord,
  speciesById: Record<string, KnowledgeSpeciesRecord>,
  substances: Substance[],
  rules: Reaction[],
  labelCondition: (c: Condition) => string = (c) => c,
): KnowledgeTransformationCoverage {
  if (record.outcome === "no-reaction") {
    return {
      transformationId: record.id,
      sourceId: record.sourceId,
      playable: false,
      reason: "no_reaction",
      statusBadge: "资料参考·无反应记录",
      reasonLabel: "资料记录为常温无明显变化情境，不作为实验台合成规则。",
      detail:
        "该条目记录常温下无明显化学变化的情境，用于对照学习，不对应实验台合成配方。",
      matchedRuleIds: [],
      requiredConditions: [],
    };
  }

  const mappedReactants = record.reactants.map((p) =>
    matchKnowledgeSpeciesToSubstance(speciesById[p.id], substances),
  );
  const mappedProducts = record.products.map((p) =>
    matchKnowledgeSpeciesToSubstance(speciesById[p.id], substances),
  );
  const allReactantsPlayable = mappedReactants.every((s) => s !== null);

  // Also check dissolved-solute reactant mapping for reversible equilibrium mixture rules
  // (e.g. Cl2(aq) + 2H2O(l) -> HOCl + H3O+ + Cl- corresponds to simple-mode Cl2(g) + H2O(l) ⇌ 氯水,
  // explicitly modeled as a reversible equilibrium mixture without assuming 100% stoichiometric conversion).
  const relaxedEquilibriumReactants = record.reactants.map((p) => {
    const direct = matchKnowledgeSpeciesToSubstance(
      speciesById[p.id],
      substances,
    );
    if (direct) return direct;
    const sp = speciesById[p.id];
    if (!sp || sp.charge !== 0 || sp.state !== "aq") return null;
    return (
      substances.find(
        (s) => s.formula === sp.formula && s.category !== "solution",
      ) ?? null
    );
  });

  if (allReactantsPlayable) {
    const reactantKey = sortedKey(
      mappedReactants.map((s) => (s as Substance).id),
    );
    const productFormulasKey = sortedKey(
      record.products.map((p) => speciesById[p.id]?.formula ?? p.id),
    );
    const exactProductIds = mappedProducts.every((s) => s !== null)
      ? sortedKey(mappedProducts.map((s) => (s as Substance).id))
      : null;

    const matchingRules = rules.filter((r) => {
      if (sortedKey(r.reactants.map((p) => p.substanceId)) !== reactantKey) {
        return false;
      }
      if (
        exactProductIds &&
        sortedKey(r.products.map((p) => p.substanceId)) === exactProductIds
      ) {
        return true;
      }
      // Also recognize core playable rules whose products have identical chemical formulas
      // (e.g. 2H2 + O2 -> 2H2O condensed liquid water, or aqueous salt recorded as solid solute).
      const ruleProductFormulas = sortedKey(
        r.products.map(
          (p) =>
            substances.find((s) => s.id === p.substanceId)?.formula ??
            p.substanceId,
        ),
      );
      return ruleProductFormulas === productFormulasKey;
    });

    if (matchingRules.length > 0) {
      const exactMatch = exactProductIds
        ? matchingRules.find(
            (r) =>
              sortedKey(r.products.map((p) => p.substanceId)) ===
              exactProductIds,
          )
        : undefined;
      const condSets = [
        ...new Set(
          matchingRules.map((r) =>
            r.conditions.map(labelCondition).join(" + "),
          ),
        ),
      ];
      const requiredConditions = [
        ...new Set(matchingRules.flatMap((r) => r.conditions)),
      ];
      const stateSimplificationNote = exactMatch
        ? undefined
        : "实验台对应规则在部分产物的凝结/溶解相态上作了教学简化，可在实验结果中查看简化说明。";

      return {
        transformationId: record.id,
        sourceId: record.sourceId,
        playable: true,
        reason: "playable",
        statusBadge: `已开放实验台 · ${condSets.join(" / ")}`,
        reasonLabel: `可在实验台模拟（条件：${condSets.join(" 或 ")}）。`,
        detail: `该路径已接入实验台共享规则（${matchingRules.map((r) => r.name).join(" / ")}），简单模式与进阶定量模式均按对应条件执行。`,
        matchedRuleIds: matchingRules.map((r) => r.id),
        requiredConditions,
        stateSimplificationNote,
      };
    }
  }

  if (relaxedEquilibriumReactants.every((s) => s !== null)) {
    const eqReactantKey = sortedKey(
      relaxedEquilibriumReactants.map((s) => (s as Substance).id),
    );
    const matchingEqRules = rules.filter(
      (r) =>
        r.reactionType === "equilibrium" &&
        r.reversible &&
        r.calculationStrategy === "mixture_unsupported" &&
        sortedKey(r.reactants.map((p) => p.substanceId)) === eqReactantKey,
    );
    if (matchingEqRules.length > 0) {
      const condSets = [
        ...new Set(
          matchingEqRules.map((r) =>
            r.conditions.map(labelCondition).join(" + "),
          ),
        ),
      ];
      const requiredConditions = [
        ...new Set(matchingEqRules.flatMap((r) => r.conditions)),
      ];
      return {
        transformationId: record.id,
        sourceId: record.sourceId,
        playable: true,
        reason: "playable",
        statusBadge: `简单模式·平衡混合（${condSets.join(" / ")}）`,
        reasonLabel: `可在简单模式模拟为可逆平衡混合体系（条件：${condSets.join(" 或 ")}），不默认按 100% 完全转化计量。`,
        detail: `实验台已在简单模式开放该平衡混合体系（${matchingEqRules.map((r) => r.name).join(" / ")}），产物以多组分平衡混合物呈现，不在进阶定量模式默认按 100% 转化作纯物质整数计量。`,
        matchedRuleIds: matchingEqRules.map((r) => r.id),
        requiredConditions,
        stateSimplificationNote:
          "可逆平衡边界：常温下该体系转化不完全，溶液中同时共存未反应溶解物与部分生成物，进阶定量模式拒绝按 100% 完全转化计算。",
      };
    }
  }

  if (record.sourceExecution === "equation-only") {
    return {
      transformationId: record.id,
      sourceId: record.sourceId,
      playable: false,
      reason: "equation_only",
      statusBadge: "资料路径·未开放模拟",
      reasonLabel: "仅方程式学习资料，尚未开放实验台模拟。",
      detail:
        "该条目在知识库中仅作为配平方程式学习资料，缺少完整可执行的实验条件与反应边界模型，当前实验台未开放模拟。",
      matchedRuleIds: [],
      requiredConditions: [],
    };
  }

  if (record.atmosphere) {
    return {
      transformationId: record.id,
      sourceId: record.sourceId,
      playable: false,
      reason: "atmosphere_unmodeled",
      statusBadge: "资料路径·未开放模拟",
      reasonLabel: "涉及特殊反应气氛控制，当前实验台尚未开放模拟。",
      detail:
        "该资料路径依赖特定气氛控制（如富氧或惰性气氛），现有实验台条件体系尚未建模拟合该气氛边界，暂未开放模拟。",
      matchedRuleIds: [],
      requiredConditions: [],
    };
  }

  if (!allReactantsPlayable || mappedProducts.some((s) => s === null)) {
    return {
      transformationId: record.id,
      sourceId: record.sourceId,
      playable: false,
      reason: "species_unmodeled",
      statusBadge: "资料路径·未开放模拟",
      reasonLabel: "包含实验台尚未收录的物质或瞬态/离子物种，尚未开放模拟。",
      detail:
        "该资料路径涉及当前实验台尚未收录的物质、水溶液形态、离子或瞬态自由基，仅用于知识库查阅学习，尚未开放实验台模拟。",
      matchedRuleIds: [],
      requiredConditions: [],
    };
  }

  return {
    transformationId: record.id,
    sourceId: record.sourceId,
    playable: false,
    reason: "not_open_yet",
    statusBadge: "资料路径·未开放模拟",
    reasonLabel: "该资料路径尚未开放实验台模拟。",
    detail:
      "该转化条件或副反应边界尚需人工科学核验，当前仅保留在知识库资料中供参考，尚未开放为实验台可玩规则。",
    matchedRuleIds: [],
    requiredConditions: [],
  };
}

/**
 * Computes exact, honest coverage counts across all knowledge transformations.
 */
export function summarizeKnowledgeCoverage(
  transformations: KnowledgeTransformationRecord[],
  speciesById: Record<string, KnowledgeSpeciesRecord>,
  substances: Substance[],
  rules: Reaction[],
  labelCondition: (c: Condition) => string = (c) => c,
): {
  summary: KnowledgeCoverageSummary;
  byTransformationId: Record<string, KnowledgeTransformationCoverage>;
} {
  const byReason: Record<KnowledgeCoverageReason, number> = {
    playable: 0,
    equation_only: 0,
    no_reaction: 0,
    atmosphere_unmodeled: 0,
    species_unmodeled: 0,
    not_open_yet: 0,
  };
  const byTransformationId: Record<string, KnowledgeTransformationCoverage> =
    {};

  for (const t of transformations) {
    const cov = evaluateKnowledgeTransformationCoverage(
      t,
      speciesById,
      substances,
      rules,
      labelCondition,
    );
    byTransformationId[t.id] = cov;
    byReason[cov.reason]++;
  }

  return {
    summary: {
      total: transformations.length,
      playable: byReason.playable,
      notOpen: transformations.length - byReason.playable,
      byReason,
    },
    byTransformationId,
  };
}

/**
 * Pure engine lookup used ONLY on unmatched workbench attempts to tell the player
 * honestly whether their exact reactant combination appears in the knowledge corpus
 * as an unopened reference path (without executing or inferring any reaction).
 */
export function findUnopenedKnowledgePathsForReactants(
  substanceIds: string[],
  transformations: KnowledgeTransformationRecord[],
  speciesById: Record<string, KnowledgeSpeciesRecord>,
  substances: Substance[],
  rules: Reaction[],
): UnopenedKnowledgeMatch[] {
  if (!substanceIds.length) return [];
  const inputKey = sortedKey(substanceIds);
  const matches: UnopenedKnowledgeMatch[] = [];

  for (const t of transformations) {
    if (t.outcome === "no-reaction") continue;
    const mappedReactants = t.reactants.map((p) =>
      matchKnowledgeSpeciesToSubstance(speciesById[p.id], substances),
    );
    if (mappedReactants.some((s) => !s)) continue;
    const rKey = sortedKey(mappedReactants.map((s) => (s as Substance).id));
    if (rKey !== inputKey) continue;

    const cov = evaluateKnowledgeTransformationCoverage(
      t,
      speciesById,
      substances,
      rules,
    );
    if (cov.playable) continue;

    matches.push({
      id: t.id,
      sourceId: t.sourceId,
      equation: t.equation,
      chineseSummary: formatTransformationChinese(t, speciesById),
      reasonLabel: cov.reasonLabel,
    });
  }

  return matches;
}
