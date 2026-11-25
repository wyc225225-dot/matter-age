import { parseIon } from "./formulaParser";
import { ADVANCED_LIMITS, MASS_BASIS_LABEL } from "../config/modes";
import type {
  Component,
  ConservationReport,
  IntegerStoichiometryResult,
  ProductStoichiometryItem,
  ReactantStoichiometryItem,
  Reaction,
  Substance,
} from "../types";

export function checkConservation(r: Reaction, db: Record<string, Substance>) {
  const all = [...r.reactants, ...r.products];
  if (all.some((p) => !db[p.substanceId]))
    return { status: "invalid" as const, reason: "未知物质" };
  if (all.some((p) => !db[p.substanceId].formula))
    return {
      status: "manual" as const,
      reason: "混合物或加工材料，无固定分子式，需人工审核",
    };
  const tally = (ps: Component[]) => {
    const out: Record<string, number> = { charge: 0 };
    for (const p of ps) {
      const ion = parseIon(db[p.substanceId].formula!);
      out.charge += ion.charge * p.coefficient;
      for (const [e, n] of Object.entries(ion.elements))
        out[e] = (out[e] || 0) + n * p.coefficient;
    }
    return out;
  };
  const a = tally(r.reactants),
    b = tally(r.products);
  const bad = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(
    (e) => (a[e] || 0) !== (b[e] || 0),
  );
  return {
    status: bad.length ? ("invalid" as const) : ("balanced" as const),
    reason: bad.join(","),
  };
}

/**
 * Continuous molar yield interface retained for future V2.0 / molar-quantity calculations.
 * Do NOT conflate with integer-portion stoichiometry used in V1.5 Advanced Mode.
 */
export function calculateYield(r: Reaction, amounts: Record<string, number>) {
  for (const p of r.reactants) {
    const v = amounts[p.substanceId] ?? 0;
    if (!Number.isFinite(v) || v < 0) throw new Error("无效物质的量");
  }
  const extent = Math.min(
    ...r.reactants.map((p) => (amounts[p.substanceId] ?? 0) / p.coefficient),
  );
  if (!Number.isFinite(extent) || extent < 0) throw new Error("无效物质的量");
  return {
    extent,
    limiting: r.reactants
      .filter((p) => (amounts[p.substanceId] ?? 0) / p.coefficient === extent)
      .map((p) => p.substanceId),
    products: Object.fromEntries(
      r.products.map((p) => [p.substanceId, p.coefficient * extent]),
    ),
    remaining: Object.fromEntries(
      r.reactants.map((p) => [
        p.substanceId,
        (amounts[p.substanceId] ?? 0) - p.coefficient * extent,
      ]),
    ),
  };
}

function roundMass(v: number) {
  return Math.round(v * 1000) / 1000;
}

function getCompositionAndCharge(s: Substance): {
  elements: Record<string, number> | null;
  charge: number;
} {
  if (s.elementComposition) {
    return { elements: s.elementComposition, charge: s.charge ?? 0 };
  }
  if (s.formula) {
    const parsed = parseIon(s.formula);
    return { elements: parsed.elements, charge: parsed.charge };
  }
  return { elements: null, charge: 0 };
}

function addAtoms(
  target: Record<string, number>,
  elements: Record<string, number>,
  factor: number,
) {
  if (factor === 0) return;
  for (const [el, n] of Object.entries(elements)) {
    target[el] = (target[el] || 0) + n * factor;
  }
}

export interface IntegerStoichiometryLimits {
  minPortions?: number;
  maxPortions?: number;
}

/**
 * V1.5 integer-portion stoichiometric calculation engine (pure, DOM/UI/save-independent).
 * - extent = min(floor(inputAmount / coefficient))
 * - consumed = coefficient * extent
 * - remaining = inputAmount - consumed
 * - produced = coefficient * extent
 * - Conservation checks total input vs (produced + remaining unreacted reactants).
 */
export function executeIntegerStoichiometry(
  reaction: Reaction,
  inputs: Record<string, number>,
  db: Record<string, Substance>,
  limits: IntegerStoichiometryLimits = ADVANCED_LIMITS,
): IntegerStoichiometryResult {
  const minPortions = limits.minPortions ?? ADVANCED_LIMITS.minPortions;
  const maxPortions = limits.maxPortions ?? ADVANCED_LIMITS.maxPortions;

  if (
    !reaction.stoichiometrySupported ||
    reaction.calculationStrategy === "mixture_unsupported" ||
    reaction.calculationStrategy === "material_process_unsupported"
  ) {
    throw new Error("该规则不适用纯物质整数化学计量计算");
  }

  const expectedIds = new Set(reaction.reactants.map((p) => p.substanceId));
  const inputIds = Object.keys(inputs);
  if (
    inputIds.length !== expectedIds.size ||
    inputIds.some((id) => !expectedIds.has(id))
  ) {
    throw new Error("投入物质集合与规则反应物不匹配");
  }

  for (const p of reaction.reactants) {
    const s = db[p.substanceId];
    if (!s) throw new Error(`未知反应物：${p.substanceId}`);
    const amount = inputs[p.substanceId];
    if (
      !Number.isInteger(amount) ||
      amount < minPortions ||
      amount > maxPortions
    ) {
      throw new Error(
        `无效份数（需为 ${minPortions}–${maxPortions} 的整数）：${s.name}`,
      );
    }
  }
  for (const p of reaction.products) {
    if (!db[p.substanceId]) throw new Error(`未知产物：${p.substanceId}`);
  }

  const extent = Math.min(
    ...reaction.reactants.map((p) =>
      Math.floor(inputs[p.substanceId] / p.coefficient),
    ),
  );

  const shortfalls = reaction.reactants
    .filter((p) => inputs[p.substanceId] < p.coefficient)
    .map((p) => ({
      substanceId: p.substanceId,
      provided: inputs[p.substanceId],
      required: p.coefficient,
    }));

  // All participating substances must have valid molarMass & formula/composition to display theoretical mass
  const allHaveMass = [...reaction.reactants, ...reaction.products].every(
    (p) => {
      const s = db[p.substanceId];
      return (
        s.molarMass !== null &&
        Number.isFinite(s.molarMass) &&
        s.molarMass > 0 &&
        s.category !== "mixture" &&
        s.category !== "material" &&
        s.formula !== null
      );
    },
  );

  const reactantItems: ReactantStoichiometryItem[] = reaction.reactants.map(
    (p) => {
      const s = db[p.substanceId];
      const input = inputs[p.substanceId];
      const consumed = p.coefficient * extent;
      const remaining = input - consumed;
      const mm = allHaveMass ? s.molarMass! : null;
      return {
        substanceId: p.substanceId,
        coefficient: p.coefficient,
        input,
        consumed,
        remaining,
        inputMassG: mm !== null ? roundMass(input * mm) : null,
        consumedMassG: mm !== null ? roundMass(consumed * mm) : null,
        remainingMassG: mm !== null ? roundMass(remaining * mm) : null,
      };
    },
  );

  const productItems: ProductStoichiometryItem[] = reaction.products.map(
    (p) => {
      const s = db[p.substanceId];
      const produced = p.coefficient * extent;
      const mm = allHaveMass ? s.molarMass! : null;
      return {
        substanceId: p.substanceId,
        coefficient: p.coefficient,
        produced,
        producedMassG: mm !== null ? roundMass(produced * mm) : null,
      };
    },
  );

  const limitingReactants =
    extent > 0
      ? reaction.reactants
          .filter(
            (p) => Math.floor(inputs[p.substanceId] / p.coefficient) === extent,
          )
          .map((p) => p.substanceId)
      : shortfalls.map((x) => x.substanceId);

  const outcome: IntegerStoichiometryResult["outcome"] =
    extent === 0
      ? "insufficient"
      : reactantItems.every((r) => r.remaining === 0)
        ? "complete"
        : "partial";

  // Full conservation check: input total === produced + remaining unreacted reactants
  const inputAtoms: Record<string, number> = {};
  const outputAtoms: Record<string, number> = {};
  let inputCharge = 0;
  let outputCharge = 0;

  for (const r of reactantItems) {
    const { elements, charge } = getCompositionAndCharge(db[r.substanceId]);
    if (elements) {
      addAtoms(inputAtoms, elements, r.input);
      addAtoms(outputAtoms, elements, r.remaining);
    }
    inputCharge += charge * r.input;
    outputCharge += charge * r.remaining;
  }
  for (const p of productItems) {
    const { elements, charge } = getCompositionAndCharge(db[p.substanceId]);
    if (elements) {
      addAtoms(outputAtoms, elements, p.produced);
    }
    outputCharge += charge * p.produced;
  }

  const allElements = [
    ...new Set([...Object.keys(inputAtoms), ...Object.keys(outputAtoms)]),
  ];
  const atomsConserved = allElements.every(
    (el) => (inputAtoms[el] || 0) === (outputAtoms[el] || 0),
  );
  const chargeConserved = inputCharge === outputCharge;

  const totalInputPortions = reactantItems.reduce((n, r) => n + r.input, 0);
  const totalConsumedPortions = reactantItems.reduce(
    (n, r) => n + r.consumed,
    0,
  );
  const portionUtilization =
    totalInputPortions > 0
      ? Math.round((totalConsumedPortions / totalInputPortions) * 10000) / 10000
      : 0;

  const totalInputMassG = allHaveMass
    ? roundMass(reactantItems.reduce((n, r) => n + (r.inputMassG ?? 0), 0))
    : null;
  const totalConsumedMassG = allHaveMass
    ? roundMass(reactantItems.reduce((n, r) => n + (r.consumedMassG ?? 0), 0))
    : null;
  const totalRemainingMassG = allHaveMass
    ? roundMass(reactantItems.reduce((n, r) => n + (r.remainingMassG ?? 0), 0))
    : null;
  const totalProducedMassG = allHaveMass
    ? roundMass(productItems.reduce((n, p) => n + (p.producedMassG ?? 0), 0))
    : null;
  const totalOutputMassG =
    totalProducedMassG !== null && totalRemainingMassG !== null
      ? roundMass(totalProducedMassG + totalRemainingMassG)
      : null;

  const massConserved =
    totalInputMassG !== null && totalOutputMassG !== null
      ? Math.abs(totalInputMassG - totalOutputMassG) <= 0.01
      : null;

  const massUtilization =
    totalInputMassG !== null &&
    totalInputMassG > 0 &&
    totalConsumedMassG !== null
      ? Math.round((totalConsumedMassG / totalInputMassG) * 10000) / 10000
      : null;

  const conservation: ConservationReport = {
    inputAtoms,
    outputAtoms,
    atomsConserved,
    inputCharge,
    outputCharge,
    chargeConserved,
    totalInputMassG,
    totalProducedMassG,
    totalRemainingMassG,
    totalOutputMassG,
    massConserved,
    massBasis: "1_mol_per_portion",
    massBasisLabel: MASS_BASIS_LABEL,
  };

  return {
    reaction,
    outcome,
    extent,
    limitingReactants,
    shortfalls,
    reactants: reactantItems,
    products: productItems,
    catalysts: [...reaction.catalysts],
    portionUtilization,
    massUtilization,
    conservation,
  };
}
