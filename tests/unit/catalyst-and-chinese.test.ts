import { describe, it, expect } from "vitest";
import { byId, conditionName, reactions } from "../../src/data";
import {
  diagnoseExperimentFailure,
  execute,
  executeAdvanced,
} from "../../src/engine/reactionEngine";
import type { Reaction } from "../../src/types";
import rawSpecies from "../../src/data/knowledgeSubstances.json";
import rawTransformations from "../../src/data/knowledgeTransformations.json";
import {
  formatTransformationChinese,
  speciesSearchText,
  type KnowledgeSpeciesRecord,
  type KnowledgeTransformationRecord,
} from "../../src/utils/knowledgeNames";

describe("Pure-engine catalyst role & contextual failure diagnostics", () => {
  it("diagnoses H2O2 + MnO2 both in reactant slots (simple mode, with & without mix)", () => {
    // Without mix
    const failNoMix = execute(
      {
        substances: ["peroxide", "manganese_dioxide"],
        conditions: [],
        catalysts: [],
      },
      reactions,
    );
    expect(failNoMix.status).toBe("unmatched");
    const diag1 = diagnoseExperimentFailure(
      {
        substances: ["peroxide", "manganese_dioxide"],
        conditions: [],
        catalysts: [],
        mode: "simple",
      },
      failNoMix,
      reactions,
      byId,
      { labelCondition: conditionName },
    );
    expect(diag1?.kind).toBe("catalyst_in_reactants");
    if (diag1?.kind === "catalyst_in_reactants") {
      expect(diag1.candidates).toHaveLength(1);
      expect(diag1.candidates[0].reactionId).toBe("r027");
      expect(diag1.candidates[0].catalystsToMove).toEqual([
        "manganese_dioxide",
      ]);
      expect(diag1.candidates[0].missingConditions).toEqual(["mix"]);
      expect(diag1.summary).toContain("二氧化锰");
      expect(diag1.summary).toContain("催化剂");
      expect(diag1.summary).toContain("混合");
    }

    // With mix already selected
    const failWithMix = execute(
      {
        substances: ["peroxide", "manganese_dioxide"],
        conditions: ["mix"],
        catalysts: [],
      },
      reactions,
    );
    const diag2 = diagnoseExperimentFailure(
      {
        substances: ["peroxide", "manganese_dioxide"],
        conditions: ["mix"],
        catalysts: [],
        mode: "simple",
      },
      failWithMix,
      reactions,
      byId,
      { labelCondition: conditionName },
    );
    expect(diag2?.kind).toBe("catalyst_in_reactants");
    if (diag2?.kind === "catalyst_in_reactants") {
      expect(diag2.candidates[0].missingConditions).toEqual([]);
    }
  });

  it("diagnoses H2O2 + MnO2 both in reactant slots in advanced quantitative mode", () => {
    const res = executeAdvanced(
      {
        amounts: { peroxide: 2, manganese_dioxide: 1 },
        conditions: ["mix"],
        catalysts: [],
        mode: "advanced",
      },
      reactions,
      byId,
    );
    expect(res.status).toBe("unmatched");
    const diag = diagnoseExperimentFailure(
      {
        substances: ["peroxide", "manganese_dioxide"],
        conditions: ["mix"],
        catalysts: [],
        mode: "advanced",
      },
      res,
      reactions,
      byId,
      { labelCondition: conditionName },
    );
    expect(diag?.kind).toBe("catalyst_in_reactants");
    if (diag?.kind === "catalyst_in_reactants") {
      expect(diag.candidates[0].catalystsToMove).toEqual(["manganese_dioxide"]);
    }

    // After moving MnO2 to catalyst slot, advanced reaction succeeds with MnO2 unconsumed!
    const ok = executeAdvanced(
      {
        amounts: { peroxide: 2 },
        conditions: ["mix"],
        catalysts: ["manganese_dioxide"],
        mode: "advanced",
      },
      reactions,
      byId,
    );
    expect(ok.status).toBe("complete");
    expect(
      diagnoseExperimentFailure(
        {
          substances: ["peroxide"],
          conditions: ["mix"],
          catalysts: ["manganese_dioxide"],
          mode: "advanced",
        },
        ok,
        reactions,
        byId,
      ),
    ).toBeNull();
  });

  it("never silently swallows extra non-catalyst materials", () => {
    const res = execute(
      {
        substances: ["peroxide", "manganese_dioxide", "iron"],
        conditions: ["mix"],
        catalysts: [],
      },
      reactions,
    );
    expect(res.status).toBe("unmatched");
    const diag = diagnoseExperimentFailure(
      {
        substances: ["peroxide", "manganese_dioxide", "iron"],
        conditions: ["mix"],
        catalysts: [],
        mode: "simple",
      },
      res,
      reactions,
      byId,
      { labelCondition: conditionName },
    );
    expect(diag?.kind).not.toBe("catalyst_in_reactants");
  });

  it("exposes all candidates when multiple catalyst-role rules are ambiguous", () => {
    const rBase = reactions.find((r) => r.id === "r027")!;
    const syntheticRules: Reaction[] = [
      rBase,
      {
        ...rBase,
        id: "r_ambig_alt",
        name: "假设反向催化规则",
        reactants: [{ substanceId: "manganese_dioxide", coefficient: 1 }],
        catalysts: ["peroxide"],
      },
    ];
    const fail = execute(
      {
        substances: ["peroxide", "manganese_dioxide"],
        conditions: ["mix"],
        catalysts: [],
      },
      syntheticRules,
    );
    const diag = diagnoseExperimentFailure(
      {
        substances: ["peroxide", "manganese_dioxide"],
        conditions: ["mix"],
        catalysts: [],
        mode: "simple",
      },
      fail,
      syntheticRules,
      byId,
      { labelCondition: conditionName },
    );
    expect(diag?.kind).toBe("catalyst_in_reactants");
    if (diag?.kind === "catalyst_in_reactants") {
      expect(diag.candidates.length).toBe(2);
    }
  });

  it("returns null on successful simple reaction and diagnoses insufficient quantitative portions", () => {
    const ok = execute(
      {
        substances: ["peroxide"],
        conditions: ["mix"],
        catalysts: ["manganese_dioxide"],
      },
      reactions,
    );
    expect(ok.status).toBe("success");
    expect(
      diagnoseExperimentFailure(
        {
          substances: ["peroxide"],
          conditions: ["mix"],
          catalysts: ["manganese_dioxide"],
          mode: "simple",
        },
        ok,
        reactions,
        byId,
      ),
    ).toBeNull();

    const insuff = executeAdvanced(
      {
        amounts: { peroxide: 1 },
        conditions: ["mix"],
        catalysts: ["manganese_dioxide"],
        mode: "advanced",
      },
      reactions,
      byId,
    );
    expect(insuff.status).toBe("insufficient");
    const diag = diagnoseExperimentFailure(
      {
        substances: ["peroxide"],
        conditions: ["mix"],
        catalysts: ["manganese_dioxide"],
        mode: "advanced",
      },
      insuff,
      reactions,
      byId,
    );
    expect(diag?.kind).toBe("insufficient_portions");
    if (diag?.kind === "insufficient_portions") {
      expect(diag.shortfalls[0]).toMatchObject({
        substanceId: "peroxide",
        provided: 1,
        required: 2,
      });
    }
  });
});

describe("Full Chinese knowledge corpus coverage & state-accurate nomenclature", () => {
  const species = rawSpecies as unknown as KnowledgeSpeciesRecord[];
  const transformations =
    rawTransformations as unknown as KnowledgeTransformationRecord[];
  const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));

  it("covers all 532 knowledge species with zero missing Chinese names", () => {
    expect(species.length).toBe(532);
    const missing = species.filter(
      (s) => !s.nameZh || !/[\u4e00-\u9fff]/.test(s.nameZh),
    );
    expect(missing).toEqual([]);
  });

  it("accurately distinguishes entity + physical state (HCl/盐酸, NaOH, H2O/水蒸气/冰, H2/O2)", () => {
    expect(speciesById["HCl"].nameZh).toBe("盐酸");
    expect(speciesSearchText(speciesById["HCl"])).toContain("氯化氢水溶液");
    expect(speciesById["HCl-g"].nameZh).toBe("氯化氢");
    expect(speciesById["NaOH"].nameZh).toBe("氢氧化钠溶液");
    expect(speciesSearchText(speciesById["NaOH"])).toContain("氢氧化钠");
    expect(speciesById["H2"].nameZh).toBe("氢气");
    expect(speciesById["O2"].nameZh).toBe("氧气");
    expect(speciesById["H2O"].nameZh).toBe("水");
    expect(speciesById["H2O-g"].nameZh).toBe("水蒸气");
    expect(speciesById["H2O-ice"].nameZh).toBe("冰");
  });

  it("resolves Chinese names for every participant across all 435 transformations and keeps pending status", () => {
    expect(transformations.length).toBe(435);
    for (const tr of transformations) {
      expect(tr.reviewStatus).toBe("pending");
      for (const p of [...tr.reactants, ...tr.products]) {
        const sp = speciesById[p.id];
        expect(sp, `Missing species ${p.id} in ${tr.id}`).toBeDefined();
        expect(sp.nameZh).toMatch(/[\u4e00-\u9fff]/);
      }
    }
    const h2oSynth = transformations.find(
      (r) => r.id === "atlas:hydrogen-oxygen",
    )!;
    expect(formatTransformationChinese(h2oSynth, speciesById)).toBe(
      "2份氢气 + 1份氧气 → 2份水蒸气",
    );
    expect(h2oSynth.equation).toBe("2H2(g) + O2(g) → 2H2O(g)");
  });
});
