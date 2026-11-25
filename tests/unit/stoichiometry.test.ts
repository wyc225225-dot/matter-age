import { describe, it, expect } from "vitest";
import {
  executeIntegerStoichiometry,
  calculateYield,
} from "../../src/engine/stoichiometry";
import { executeAdvanced } from "../../src/engine/reactionEngine";
import { checkEquationBalance } from "../../src/engine/balancingEngine";
import {
  applyQuantitativeInventory,
  verifyQuantitativeChallenge,
} from "../../src/engine/quantitativeChallengeEngine";
import {
  byId,
  reactions,
  quantitativeChallenges,
  reviewedAdvancedRules,
} from "../../src/data";
import type { Reaction, Substance } from "../../src/types";

describe("V1.5 integer stoichiometry engine", () => {
  const rH2O2 = reactions.find((r) => r.id === "r006")!; // 2H2 + O2 -> 2H2O
  const rFreeze = reactions.find((r) => r.id === "r001")!; // H2O(l) -> H2O(s)

  it("computes 3 H2 + 2 O2 -> extent 1, 2 H2O produced, 1 H2 & 1 O2 remaining, with full conservation", () => {
    const res = executeIntegerStoichiometry(
      rH2O2,
      { hydrogen: 3, oxygen: 2 },
      byId,
    );
    expect(res.outcome).toBe("partial");
    expect(res.extent).toBe(1);
    expect(res.limitingReactants).toEqual(["hydrogen"]);
    expect(res.reactants).toMatchObject([
      { substanceId: "hydrogen", input: 3, consumed: 2, remaining: 1 },
      { substanceId: "oxygen", input: 2, consumed: 1, remaining: 1 },
    ]);
    expect(res.products).toMatchObject([{ substanceId: "water", produced: 2 }]);

    // Conservation MUST include unreacted remaining substances!
    expect(res.conservation.inputAtoms).toEqual({ H: 6, O: 4 });
    expect(res.conservation.outputAtoms).toEqual({ H: 6, O: 4 });
    expect(res.conservation.atomsConserved).toBe(true);
    expect(res.conservation.chargeConserved).toBe(true);
    expect(res.conservation.massConserved).toBe(true);
    expect(res.conservation.massBasis).toBe("1_mol_per_portion");
    expect(res.conservation.massBasisLabel).toContain("1 mol");

    // Distinct portion utilization vs mass utilization
    expect(res.portionUtilization).toBeCloseTo(0.6, 4);
    expect(res.massUtilization).not.toBeNull();
    expect(res.massUtilization!).not.toBeCloseTo(res.portionUtilization, 2);
    expect(res.massUtilization!).toBeCloseTo(36.03 / 70.044, 3);
  });

  it("handles complete reaction, insufficient portions, and missing conditions cleanly", () => {
    const complete = executeIntegerStoichiometry(
      rH2O2,
      { hydrogen: 4, oxygen: 2 },
      byId,
    );
    expect(complete.outcome).toBe("complete");
    expect(complete.extent).toBe(2);
    expect(complete.portionUtilization).toBe(1);
    expect(complete.massUtilization).toBe(1);
    expect(complete.reactants.every((r) => r.remaining === 0)).toBe(true);

    const insufficient = executeAdvanced(
      {
        amounts: { hydrogen: 1, oxygen: 2 },
        conditions: ["ignite"],
        catalysts: [],
      },
      reactions,
      byId,
      { channel: "preview" },
    );
    expect(insufficient.status).toBe("insufficient");
    if (insufficient.status === "insufficient") {
      expect(insufficient.stoichiometry.shortfalls).toEqual([
        { substanceId: "hydrogen", provided: 1, required: 2 },
      ]);
    }

    const missingCond = executeAdvanced(
      {
        amounts: { hydrogen: 2, oxygen: 1 },
        conditions: [],
        catalysts: [],
      },
      reactions,
      byId,
      { channel: "preview" },
    );
    expect(missingCond.status).toBe("missing");
  });

  it("rejects invalid portion values, missing/extra substances, and unsupported strategies", () => {
    expect(() =>
      executeIntegerStoichiometry(rH2O2, { hydrogen: 0, oxygen: 1 }, byId),
    ).toThrow();
    expect(() =>
      executeIntegerStoichiometry(rH2O2, { hydrogen: 1.5, oxygen: 1 }, byId),
    ).toThrow();
    expect(() =>
      executeIntegerStoichiometry(rH2O2, { hydrogen: 100, oxygen: 1 }, byId),
    ).toThrow();
    expect(() =>
      executeIntegerStoichiometry(rH2O2, { hydrogen: 2 }, byId),
    ).toThrow();

    const mixtureRule = reactions.find((r) => r.id === "r074")!;
    expect(mixtureRule.stoichiometrySupported).toBe(false);
    expect(() =>
      executeIntegerStoichiometry(
        mixtureRule,
        { sodium_chloride: 1, water: 1 },
        byId,
      ),
    ).toThrow();
  });

  it("preserves continuous calculateYield without regression", () => {
    const res = calculateYield(rH2O2, { hydrogen: 3, oxygen: 2 });
    expect(res.extent).toBe(1.5);
    expect(res.products.water).toBe(3);
  });

  it("preserves independent catalyst and supports phase_change strategy independently", () => {
    const catRes = executeAdvanced(
      {
        amounts: { peroxide: 5 },
        conditions: ["mix"],
        catalysts: ["manganese_dioxide"],
      },
      reactions,
      byId,
      { channel: "preview" },
    );
    expect(catRes.status).toBe("partial");
    if (catRes.status === "partial") {
      expect(catRes.stoichiometry.extent).toBe(2);
      expect(catRes.stoichiometry.catalysts).toEqual(["manganese_dioxide"]);
      expect(catRes.stoichiometry.reactants[0].remaining).toBe(1);
      expect(catRes.stoichiometry.products).toMatchObject([
        { substanceId: "water", produced: 4 },
        { substanceId: "oxygen", produced: 2 },
      ]);
      const nextInv = applyQuantitativeInventory(
        { peroxide: 5 },
        catRes.stoichiometry,
      );
      expect(nextInv).toEqual({ peroxide: 1, water: 4, oxygen: 2 });
    }

    const phaseRes = executeAdvanced(
      { amounts: { water: 3 }, conditions: ["cool"], catalysts: [] },
      [rFreeze],
      byId,
      { channel: "preview" },
    );
    expect(phaseRes.status).toBe("complete");
    if (phaseRes.status === "complete") {
      expect(phaseRes.reaction.calculationStrategy).toBe("phase_change");
      expect(phaseRes.stoichiometry.products[0].produced).toBe(3);
    }
  });

  it("verifies ionic charge conservation including unreacted excess ions (isolated test fixture)", () => {
    const ionicDb: Record<string, Substance> = {
      h_ion: {
        ...byId.hydrogen,
        id: "h_ion",
        name: "氢离子",
        formula: "H^+",
        elementComposition: { H: 1 },
        charge: 1,
        molarMass: 1.008,
      },
      oh_ion: {
        ...byId.water,
        id: "oh_ion",
        name: "氢氧根",
        formula: "OH^-",
        elementComposition: { O: 1, H: 1 },
        charge: -1,
        molarMass: 17.007,
      },
      water: byId.water,
    };
    const ionicRule: Reaction = {
      ...rH2O2,
      id: "fixture_ionic_neutral",
      name: "中和离子示意",
      reactants: [
        { substanceId: "h_ion", coefficient: 1 },
        { substanceId: "oh_ion", coefficient: 1 },
      ],
      products: [{ substanceId: "water", coefficient: 1 }],
      conditions: ["mix"],
      calculationStrategy: "ionic_stoichiometric",
      stoichiometrySupported: true,
      reviewStatus: "reviewed",
    };

    const res = executeIntegerStoichiometry(
      ionicRule,
      { h_ion: 3, oh_ion: 2 },
      ionicDb,
    );
    expect(res.extent).toBe(2);
    expect(res.conservation.inputCharge).toBe(1);
    expect(res.conservation.outputCharge).toBe(1);
    expect(res.conservation.chargeConserved).toBe(true);
    expect(res.conservation.atomsConserved).toBe(true);
  });

  it("enforces release channel review gate while preview allows applicable pending rules", () => {
    expect(reviewedAdvancedRules.length).toBe(0);

    // Release channel strictly rejects pending production rules
    const releaseGated = executeAdvanced(
      {
        amounts: { hydrogen: 2, oxygen: 1 },
        conditions: ["ignite"],
        catalysts: [],
      },
      reactions,
      byId,
      { channel: "release" },
    );
    expect(releaseGated.status).toBe("pending_review");

    // Preview channel runs applicable stoichiometric rules
    const previewOk = executeAdvanced(
      {
        amounts: { hydrogen: 2, oxygen: 1 },
        conditions: ["ignite"],
        catalysts: [],
      },
      reactions,
      byId,
      { channel: "preview" },
    );
    expect(previewOk.status).toBe("complete");

    // Mixture/material rule is rejected in both preview & release
    const unsupported = executeAdvanced(
      {
        amounts: { sodium_chloride: 1, water: 1 },
        conditions: ["mix"],
        catalysts: [],
      },
      reactions,
      byId,
      { channel: "preview" },
    );
    expect(unsupported.status).toBe("unsupported_strategy");

    // Hard mode explicitly declined
    const hardRes = executeAdvanced(
      {
        amounts: { hydrogen: 2, oxygen: 1 },
        conditions: ["ignite"],
        catalysts: [],
        mode: "hard",
      },
      reactions,
      byId,
      { channel: "preview" },
    );
    expect(hardRes.status).toBe("unsupported");
  });
});

describe("V1.5 equation balancing & 30 quantitative challenges", () => {
  const rH2O2 = reactions.find((r) => r.id === "r006")!;

  it("accepts proportional balanced answers and identifies simplest integer ratio", () => {
    const simplest = checkEquationBalance(rH2O2, [2, 1], [2], byId);
    expect(simplest.balanced).toBe(true);
    expect(simplest.isSimplestRatio).toBe(true);
    expect(simplest.gcd).toBe(1);

    const proportional = checkEquationBalance(rH2O2, [4, 2], [4], byId);
    expect(proportional.balanced).toBe(true);
    expect(proportional.isSimplestRatio).toBe(false);
    expect(proportional.gcd).toBe(2);

    const unbalanced = checkEquationBalance(rH2O2, [1, 1], [1], byId);
    expect(unbalanced.balanced).toBe(false);
    expect(unbalanced.atomsConserved).toBe(false);

    const invalid = checkEquationBalance(rH2O2, [0, 1], [1], byId);
    expect(invalid.validInput).toBe(false);
  });

  it("replays all 30 quantitative challenges with finite inventory deduction", () => {
    expect(quantitativeChallenges.length).toBeGreaterThanOrEqual(36);
    for (const qc of quantitativeChallenges) {
      const replay = verifyQuantitativeChallenge(qc, reactions, byId);
      expect(replay.valid, `${qc.id}: ${replay.error}`).toBe(true);
      expect(replay.allStepsReviewed, qc.id).toBe(false);
    }
  });

  it("assigns realistic modelKind so ionic salts are not modeled as isolated molecules", () => {
    expect(byId.water.modelKind).toBe("molecule");
    expect(byId.sodium_chloride.modelKind).toBe("ionic_formula_unit");
    expect(byId.calcium_carbonate.modelKind).toBe("ionic_formula_unit");
    expect(byId.copper_sulfate.modelKind).toBe("ionic_formula_unit");
    expect(byId.iron.modelKind).toBe("metallic_network");
    expect(byId.silica.modelKind).toBe("covalent_network");
    expect(byId.air.modelKind).toBe("mixture_schematic");
  });
});
