import { describe, it, expect } from "vitest";
import {
  byId,
  conditionName,
  conditions,
  equipmentById,
  labLevels,
  reactions,
  substances,
} from "../../src/data";
import {
  diagnoseExperimentFailure,
  execute,
  executeAdvanced,
  reachable,
} from "../../src/engine/reactionEngine";
import {
  evaluateKnowledgeTransformationCoverage,
  findUnopenedKnowledgePathsForReactants,
  summarizeKnowledgeCoverage,
} from "../../src/engine/knowledgeCoverage";
import {
  executeManagementProduction,
  getManagementAllowedConditions,
} from "../../src/engine/laboratoryEngine";
import { initialSave, migrateSave, validateSave } from "../../src/database";
import rawSpecies from "../../src/data/knowledgeSubstances.json";
import rawTransformations from "../../src/data/knowledgeTransformations.json";
import type {
  KnowledgeSpeciesRecord,
  KnowledgeTransformationRecord,
} from "../../src/utils/knowledgeNames";

const kSpecies = rawSpecies as unknown as KnowledgeSpeciesRecord[];
const kTrans = rawTransformations as unknown as KnowledgeTransformationRecord[];
const kSpeciesById = Object.fromEntries(kSpecies.map((s) => [s.id, s]));

describe("Photochemical H2 + Cl2 → 2HCl(g) and light condition", () => {
  it("exposes light condition (光照) in catalog, separates HCl(g) from HCl(aq), and keeps pending status", () => {
    expect(conditions.some((c) => c.id === "light" && c.name === "光照")).toBe(
      true,
    );
    expect(conditionName("light")).toBe("光照");

    const hclGas = byId.hydrogen_chloride;
    const hclAq = byId.hydrochloric_acid;
    expect(hclGas).toBeDefined();
    expect(hclGas.name).toBe("氯化氢");
    expect(hclGas.formula).toBe("HCl");
    expect(hclGas.state).toBe("gas");
    expect(hclGas.category).toBe("compound");
    expect(hclGas.chemicalEntityId).toBe("HCl");
    expect(hclGas.reviewStatus).toBe("pending");

    expect(hclAq.name).toBe("盐酸");
    expect(hclAq.state).toBe("liquid");
    expect(hclAq.category).toBe("solution");
    expect(hclAq.chemicalEntityId).toBe("HCl(aq)");

    // Ensure no duplicate kb_HCl_g substance was generated
    expect(substances.some((s) => s.id === "kb_HCl_g")).toBe(false);
    expect(
      substances.filter((s) => s.formula === "HCl" && s.state === "gas"),
    ).toHaveLength(1);

    // Reachable from initial + supply items without needing supply: true on HCl(g)
    expect(hclGas.supply).toBe(false);
    const obtainable = reachable(
      substances.filter((s) => s.initialUnlocked || s.supply).map((s) => s.id),
      reactions,
    );
    expect(obtainable.has("hydrogen_chloride")).toBe(true);
  });

  it("diagnoses missing light when H2 + Cl2 has no condition, succeeds with light alone, and keeps ignite independent", () => {
    // 1. No condition -> missing light (NOT unmatched!)
    const noCond = execute(
      { substances: ["hydrogen", "chlorine"], conditions: [], catalysts: [] },
      reactions,
    );
    expect(noCond.status).toBe("missing");
    if (noCond.status === "missing") {
      expect(noCond.conditions).toEqual(["light"]);
    }
    const diag = diagnoseExperimentFailure(
      {
        substances: ["hydrogen", "chlorine"],
        conditions: [],
        catalysts: [],
        mode: "simple",
      },
      noCond,
      reactions,
      byId,
      { labelCondition: conditionName },
    );
    expect(diag?.kind).toBe("missing_requirements");
    if (diag?.kind === "missing_requirements") {
      expect(diag.missingConditions).toEqual(["light"]);
      expect(diag.summary).toContain("光照");
    }

    // 2. Light condition alone -> r101 -> gaseous hydrogen_chloride (NOT hydrochloric_acid)
    const withLight = execute(
      {
        substances: ["hydrogen", "chlorine"],
        conditions: ["light"],
        catalysts: [],
      },
      reactions,
    );
    expect(withLight.status).toBe("success");
    if (withLight.status === "success") {
      expect(withLight.reaction.id).toBe("r101");
      expect(withLight.reaction.conditions).toEqual(["light"]);
      expect(withLight.reaction.products).toEqual([
        { substanceId: "hydrogen_chloride", coefficient: 2 },
      ]);
      expect(withLight.reaction.equation).toBe("H2 + Cl2 → 2HCl");
      expect(withLight.reaction.reviewStatus).toBe("pending");
    }

    // 3. Ignite condition alone -> independent rule r102 (never requiring both light + ignite)
    const withIgnite = execute(
      {
        substances: ["hydrogen", "chlorine"],
        conditions: ["ignite"],
        catalysts: [],
      },
      reactions,
    );
    expect(withIgnite.status).toBe("success");
    if (withIgnite.status === "success") {
      expect(withIgnite.reaction.id).toBe("r102");
      expect(withIgnite.reaction.conditions).toEqual(["ignite"]);
      expect(withIgnite.reaction.products).toEqual([
        { substanceId: "hydrogen_chloride", coefficient: 2 },
      ]);
    }

    // 4. Selecting BOTH light and ignite simultaneously is rejected as ambiguous, never required together
    const both = execute(
      {
        substances: ["hydrogen", "chlorine"],
        conditions: ["light", "ignite"],
        catalysts: [],
      },
      reactions,
    );
    expect(both.status).toBe("ambiguous");

    // 5. Release channel strictly rejects pending r101
    const releaseRes = execute(
      {
        substances: ["hydrogen", "chlorine"],
        conditions: ["light"],
        catalysts: [],
      },
      reactions,
      "release",
    );
    expect(releaseRes.status).toBe("unmatched");
  });

  it("verifies advanced quantitative 1:1:2 stoichiometry, conservation, and release gate for H2 + Cl2 → 2HCl(g)", () => {
    const advMissing = executeAdvanced(
      {
        amounts: { hydrogen: 1, chlorine: 1 },
        conditions: [],
        catalysts: [],
        mode: "advanced",
      },
      reactions,
      byId,
    );
    expect(advMissing.status).toBe("missing");
    if (advMissing.status === "missing") {
      expect(advMissing.conditions).toEqual(["light"]);
    }

    const advOk = executeAdvanced(
      {
        amounts: { hydrogen: 1, chlorine: 1 },
        conditions: ["light"],
        catalysts: [],
        mode: "advanced",
      },
      reactions,
      byId,
    );
    expect(advOk.status).toBe("complete");
    if (advOk.status === "complete") {
      expect(advOk.reaction.id).toBe("r101");
      expect(advOk.stoichiometry.extent).toBe(1);
      expect(
        advOk.stoichiometry.reactants.map((r) => [r.substanceId, r.consumed]),
      ).toEqual([
        ["hydrogen", 1],
        ["chlorine", 1],
      ]);
      expect(
        advOk.stoichiometry.products.map((p) => [p.substanceId, p.produced]),
      ).toEqual([["hydrogen_chloride", 2]]);
      expect(advOk.stoichiometry.conservation.atomsConserved).toBe(true);
      expect(advOk.stoichiometry.conservation.chargeConserved).toBe(true);
      expect(advOk.stoichiometry.conservation.massConserved).toBe(true);
      expect(advOk.stoichiometry.conservation.massBasis).toBe(
        "1_mol_per_portion",
      );
    }

    const advRelease = executeAdvanced(
      {
        amounts: { hydrogen: 1, chlorine: 1 },
        conditions: ["light"],
        catalysts: [],
        mode: "advanced",
      },
      reactions,
      byId,
      { channel: "release" },
    );
    expect(advRelease.status).toBe("pending_review");
  });

  it("models Cl2 + H2O as a reversible equilibrium mixture (chlorine_water) without assuming 100% stoichiometric conversion", () => {
    const cw = byId.chlorine_water;
    expect(cw).toBeDefined();
    expect(cw.name).toBe("氯水");
    expect(cw.formula).toBeNull();
    expect(cw.category).toBe("mixture");
    expect(cw.quantitativeResearchEligible).toBe(false);
    expect(cw.reviewStatus).toBe("pending");

    // 1. No condition in simple mode -> missing mix
    const noCond = execute(
      { substances: ["chlorine", "water"], conditions: [], catalysts: [] },
      reactions,
    );
    expect(noCond.status).toBe("missing");
    if (noCond.status === "missing") {
      expect(noCond.conditions).toEqual(["mix"]);
    }

    // 2. Simple mode with mix -> reversible equilibrium mixture r104 (chlorine_water)
    const simpleOk = execute(
      { substances: ["chlorine", "water"], conditions: ["mix"], catalysts: [] },
      reactions,
    );
    expect(simpleOk.status).toBe("success");
    if (simpleOk.status === "success") {
      expect(simpleOk.reaction.id).toBe("r104");
      expect(simpleOk.reaction.reversible).toBe(true);
      expect(simpleOk.reaction.stoichiometrySupported).toBe(false);
      expect(simpleOk.reaction.calculationStrategy).toBe("mixture_unsupported");
      expect(simpleOk.reaction.products).toEqual([
        { substanceId: "chlorine_water", coefficient: 1 },
      ]);
      expect(simpleOk.reaction.equation).toContain("⇌");
      expect(simpleOk.reaction.reviewStatus).toBe("pending");
    }

    // 3. Advanced quantitative mode MUST NOT default equilibrium to 100% conversion
    const advEq = executeAdvanced(
      {
        amounts: { chlorine: 1, water: 1 },
        conditions: ["mix"],
        catalysts: [],
        mode: "advanced",
      },
      reactions,
      byId,
    );
    expect(advEq.status).toBe("unsupported_strategy");
    expect(advEq.message).toContain("可逆平衡混合体系");
    expect(advEq.message).toContain("100%");

    // 4. Knowledge base coverage honestly links atlas:chlorine-water to simple-mode equilibrium mixture
    const kbCov = evaluateKnowledgeTransformationCoverage(
      kTrans.find((t) => t.sourceId === "chlorine-water")!,
      kSpeciesById,
      substances,
      reactions,
      conditionName,
    );
    expect(kbCov.playable).toBe(true);
    expect(kbCov.matchedRuleIds).toContain("r104");
    expect(kbCov.statusBadge).toContain("平衡混合");
    expect(kbCov.stateSimplificationNote).toContain("100%");
  });

  it("maps light condition to eq_electrolyzer in Management Mode without breaking starter mix-only isolation", () => {
    const s = initialSave();
    s.managementInventory.hydrogen = 2;
    s.managementInventory.chlorine = 2;
    expect(getManagementAllowedConditions(s, equipmentById)).toEqual(["mix"]);

    const blocked = executeManagementProduction(
      s,
      "r101",
      1,
      reactions,
      byId,
      equipmentById,
      labLevels,
    );
    expect(blocked.ok).toBe(false);

    const upgraded = {
      ...s,
      labLevel: 2,
      equipmentLevels: { ...s.equipmentLevels, eq_electrolyzer: 1 },
    };
    expect(getManagementAllowedConditions(upgraded, equipmentById)).toContain(
      "light",
    );
    const prod = executeManagementProduction(
      upgraded,
      "r101",
      1,
      reactions,
      byId,
      equipmentById,
      labLevels,
    );
    expect(prod.ok).toBe(true);
    if (prod.ok) {
      expect(prod.produced).toEqual({ hydrogen_chloride: 2 });
      expect(prod.consumed).toEqual({ hydrogen: 1, chlorine: 1 });
    }
  });
});

describe("Curated knowledge gap rules and honest 435-path coverage classification", () => {
  it("supports all newly added scientifically unambiguous common gap reactions in simple and quantitative modes", () => {
    const cases: {
      reactants: Record<string, number>;
      conditions: ("mix" | "heat" | "ignite")[];
      expectedProduct: string;
    }[] = [
      {
        reactants: { ammonia: 1, hydrogen_chloride: 1 },
        conditions: ["mix"],
        expectedProduct: "ammonium_chloride",
      },
      {
        reactants: { magnesium: 1, hydrochloric_acid: 2 },
        conditions: ["mix"],
        expectedProduct: "kb_MgCl2",
      },
      {
        reactants: { magnesium_oxide: 1, hydrochloric_acid: 2 },
        conditions: ["mix"],
        expectedProduct: "kb_MgCl2",
      },
      {
        reactants: { magnesium_hydroxide: 1, hydrochloric_acid: 2 },
        conditions: ["mix"],
        expectedProduct: "kb_MgCl2",
      },
      {
        reactants: { hydrochloric_acid: 1, kb_NaOH: 1 },
        conditions: ["mix"],
        expectedProduct: "kb_NaCl",
      },
      {
        reactants: { kb_MgCl2: 1, kb_NaOH: 2 },
        conditions: ["mix"],
        expectedProduct: "magnesium_hydroxide",
      },
      {
        reactants: { kb_S8: 1, oxygen: 8 },
        conditions: ["ignite"],
        expectedProduct: "sulfur_dioxide",
      },
      {
        reactants: { copper: 3, kb_HNO3: 8 },
        conditions: ["mix"],
        expectedProduct: "kb_CuNO3",
      },
      {
        reactants: { kb_Li: 4, oxygen: 1 },
        conditions: ["ignite"],
        expectedProduct: "kb_Li2O",
      },
      {
        reactants: { magnesium: 3, nitrogen: 1 },
        conditions: ["ignite"],
        expectedProduct: "kb_Mg3N2",
      },
      {
        reactants: { kb_Sn_s: 1, oxygen: 1 },
        conditions: ["heat"],
        expectedProduct: "kb_SnO2_s",
      },
      {
        reactants: { zinc: 8, kb_S8: 1 },
        conditions: ["heat"],
        expectedProduct: "kb_ZnS_s",
      },
    ];

    for (const tc of cases) {
      const simple = execute(
        {
          substances: Object.keys(tc.reactants),
          conditions: tc.conditions,
          catalysts: [],
        },
        reactions,
      );
      expect(simple.status, Object.keys(tc.reactants).join("+")).toBe(
        "success",
      );
      const adv = executeAdvanced(
        {
          amounts: tc.reactants,
          conditions: tc.conditions,
          catalysts: [],
          mode: "advanced",
        },
        reactions,
        byId,
      );
      expect(adv.status, Object.keys(tc.reactants).join("+")).toBe("complete");
      if (adv.status === "complete") {
        expect(
          adv.stoichiometry.products.some(
            (p) => p.substanceId === tc.expectedProduct,
          ),
        ).toBe(true);
        expect(adv.stoichiometry.conservation.atomsConserved).toBe(true);
        expect(adv.stoichiometry.conservation.massConserved).toBe(true);
      }
    }
  });

  it("honestly classifies all 435 knowledge transformations without falsely claiming all 435 are playable", () => {
    const { summary, byTransformationId } = summarizeKnowledgeCoverage(
      kTrans,
      kSpeciesById,
      substances,
      reactions,
      conditionName,
    );
    expect(summary.total).toBe(435);
    expect(summary.playable).toBeGreaterThan(70);
    expect(summary.playable).toBeLessThan(435);
    expect(summary.playable + summary.notOpen).toBe(435);

    const h2Cl2 = byTransformationId["atlas:hydrogen-chlorine"];
    expect(h2Cl2.playable).toBe(true);
    expect(h2Cl2.matchedRuleIds).toContain("r101");
    expect(h2Cl2.requiredConditions).toContain("light");

    const o3Photo = byTransformationId["atlas:elements-ozone-photolysis"];
    expect(o3Photo.playable).toBe(false);
    expect(o3Photo.reason).toBe("species_unmodeled");

    const caCl2EqOnly = byTransformationId["atlas:binary-calcium-cl2-cacl2"];
    expect(caCl2EqOnly.playable).toBe(false);
    expect(caCl2EqOnly.reason).toBe("equation_only");

    // Scientifically ambiguous Na + O2 -> Na2O (ignite) is intentionally NOT blindly opened
    const naO2 = evaluateKnowledgeTransformationCoverage(
      kTrans.find((t) => t.sourceId === "binary-sodium-o2-na2o")!,
      kSpeciesById,
      substances,
      reactions,
      conditionName,
    );
    expect(naO2.playable).toBe(false);
  });

  it("distinguishes missing conditions, unopened knowledge-base paths, and truly unrecorded combinations", () => {
    // 1. Unopened knowledge-base path: Ca + Cl2 (equation-only in KB, no playable rule)
    const caCl2Res = execute(
      { substances: ["calcium", "chlorine"], conditions: [], catalysts: [] },
      reactions,
    );
    expect(caCl2Res.status).toBe("unmatched");
    const unopened = findUnopenedKnowledgePathsForReactants(
      ["calcium", "chlorine"],
      kTrans,
      kSpeciesById,
      substances,
      reactions,
    );
    expect(unopened.length).toBeGreaterThan(0);
    const caCl2Diag = diagnoseExperimentFailure(
      {
        substances: ["calcium", "chlorine"],
        conditions: [],
        catalysts: [],
        mode: "simple",
      },
      caCl2Res,
      reactions,
      byId,
      { labelCondition: conditionName, unopenedKnowledgePaths: unopened },
    );
    expect(caCl2Diag?.kind).toBe("unopened_knowledge_path");
    expect(caCl2Diag?.summary).toContain("未收录可玩规则");
    expect(caCl2Diag?.summary).toContain("尚未开放实验台模拟");

    // 2. Completely unrecorded combination: iron + sand
    const unrecordedRes = execute(
      { substances: ["iron", "sand"], conditions: ["mix"], catalysts: [] },
      reactions,
    );
    expect(unrecordedRes.status).toBe("unmatched");
    const unrecordedPaths = findUnopenedKnowledgePathsForReactants(
      ["iron", "sand"],
      kTrans,
      kSpeciesById,
      substances,
      reactions,
    );
    expect(unrecordedPaths).toEqual([]);
    const unrecordedDiag = diagnoseExperimentFailure(
      {
        substances: ["iron", "sand"],
        conditions: ["mix"],
        catalysts: [],
        mode: "simple",
      },
      unrecordedRes,
      reactions,
      byId,
      {
        labelCondition: conditionName,
        unopenedKnowledgePaths: unrecordedPaths,
      },
    );
    expect(unrecordedDiag?.kind).toBe("unmatched");
    expect(unrecordedDiag?.summary).toContain("尚未收录可玩规则");
  });

  it("maintains v1/v2/v3 save migration and validation compatibility with hydrogen_chloride and r101", () => {
    const s = initialSave();
    s.discovered.hydrogen_chloride = Date.now();
    s.completed.push("r101");
    const validated = validateSave(s);
    expect(validated.discovered.hydrogen_chloride).toBeGreaterThan(0);
    expect(validated.completed).toContain("r101");

    const v2 = {
      version: 2,
      currentMode: "simple",
      achievements: [],
      discovered: {
        water: 1,
        air: 1,
        wood: 1,
        sand: 1,
        iron: 1,
        hydrogen: 2,
        chlorine: 3,
      },
      completed: ["r005"],
      history: [],
      favorites: [],
      settings: { sound: true, motion: true },
      challengeBest: {},
      challengeRun: null,
      collected: [],
      totalExperiments: 1,
      research: {},
      quantitativeHistory: [],
      quantitativeChallengeBest: {},
      quantitativeChallengeRun: null,
      bestUtilization: {},
      balancingRecords: {},
    };
    const migrated = migrateSave(v2);
    expect(migrated.version).toBe(3);
    expect(migrated.discovered.chlorine).toBe(3);
    expect(migrated.claimedRewardIds).toContain("first_discovery:chlorine");
    expect(() => validateSave({ ...migrated, version: 4 })).toThrow();
  });
});
