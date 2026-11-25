import { describe, it, expect } from "vitest";
import { parseFormula, parseIon } from "../../src/engine/formulaParser";
import {
  execute,
  findPathToTarget,
  reachable,
} from "../../src/engine/reactionEngine";
import {
  calculateYield,
  checkConservation,
} from "../../src/engine/stoichiometry";
import { getHint } from "../../src/engine/hintEngine";
import { substances, reactions, byId, challenges } from "../../src/data";
import { initialSave, validateSave } from "../../src/database";

describe("formula parsing and quantitative extension", () => {
  it("handles nested groups and hydrates", () => {
    expect(parseFormula("Ca(OH)2")).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(parseFormula("CuSO4·5H2O")).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
    expect(parseFormula("Al2(SO4)3")).toEqual({ Al: 2, S: 3, O: 12 });
    expect(() => parseFormula("Ca(OH")).toThrow();
    expect(() => parseFormula("H0")).toThrow();
    expect(() => parseFormula("()")).toThrow();
    expect(() => parseFormula("H2O·")).toThrow();
  });

  it("supports explicit ionic charge", () =>
    expect(parseIon("SO4^2-")).toEqual({
      elements: { S: 1, O: 4 },
      charge: -2,
    }));

  it("calculates limiting reactant, leftovers and theoretical yield, and rejects negative input", () => {
    const r = reactions.find((r) => r.name === "氢的燃烧")!;
    expect(calculateYield(r, { hydrogen: 5, oxygen: 2 })).toMatchObject({
      extent: 2,
      limiting: ["oxygen"],
      products: { water: 4 },
      remaining: { hydrogen: 1, oxygen: 0 },
    });
    expect(() => calculateYield(r, { hydrogen: -1, oxygen: 2 })).toThrow();
  });
});

describe("deterministic reaction engine", () => {
  it.each(reactions.map((r) => [r.id, r] as const))(
    "%s matches independently of input order",
    (_, r) => {
      const result = execute(
        {
          substances: r.reactants.map((p) => p.substanceId).reverse(),
          conditions: r.conditions,
          catalysts: r.catalysts,
        },
        reactions,
      );
      expect(result.status).toBe("success");
      if (result.status === "success") expect(result.reaction.id).toBe(r.id);
    },
  );

  it("reports missing conditions, missing catalyst, and extra unnecessary catalyst independently", () => {
    expect(
      execute(
        { substances: ["water"], conditions: [], catalysts: [] },
        reactions,
      ).status,
    ).toBe("missing");

    expect(
      execute(
        { substances: ["peroxide"], conditions: ["mix"], catalysts: [] },
        reactions,
      ),
    ).toMatchObject({ status: "missing", catalysts: ["manganese_dioxide"] });

    expect(
      execute(
        {
          substances: ["peroxide"],
          conditions: ["mix"],
          catalysts: ["manganese_dioxide"],
        },
        reactions,
      ),
    ).toMatchObject({ status: "success" });

    expect(
      execute(
        {
          substances: ["water"],
          conditions: ["cool"],
          catalysts: ["manganese_dioxide"],
        },
        reactions,
      ),
    ).toMatchObject({
      status: "missing",
      extraCatalysts: ["manganese_dioxide"],
    });
  });

  it("does not choose randomly between conflicting conditions", () =>
    expect(
      execute(
        { substances: ["water"], conditions: ["heat", "cool"], catalysts: [] },
        reactions,
      ).status,
    ).toBe("ambiguous"));

  it("does not consume an unrelated extra reactant", () =>
    expect(
      execute(
        { substances: ["water", "iron"], conditions: ["heat"], catalysts: [] },
        reactions,
      ).status,
    ).toBe("unmatched"));

  it("release excludes pending chemistry", () =>
    expect(
      execute(
        { substances: ["water"], conditions: ["cool"], catalysts: [] },
        reactions,
        "release",
      ).status,
    ).toBe("unmatched"));

  it("explicitly declines unimplemented modes", () =>
    expect(
      execute(
        {
          substances: ["water"],
          conditions: ["cool"],
          catalysts: [],
          mode: "hard",
        },
        reactions,
      ).status,
    ).toBe("unsupported"));
});

describe("content, P0 knowledge quality, reachability and multi-step challenges", () => {
  it("all formula-based rules conserve atoms and charge and have unique names", () => {
    expect(new Set(reactions.map((r) => r.name)).size).toBe(reactions.length);
    for (const r of reactions) {
      expect(checkConservation(r, byId).status, r.id).not.toBe("invalid");
      expect(r.reviewStatus, r.id).toBe("pending");
      expect(
        new Set(r.simplificationNotes).size,
        `${r.id} duplicate notes`,
      ).toBe(r.simplificationNotes.length);
    }
  });

  it("all 72 substances have non-placeholder P0 knowledge and valid entity mapping", () => {
    expect(substances.length).toBeGreaterThanOrEqual(120);
    expect(byId.water.chemicalEntityId).toBe("H2O");
    expect(byId.ice.chemicalEntityId).toBe("H2O");
    expect(byId.steam.chemicalEntityId).toBe("H2O");
    expect(byId.sodium_chloride.chemicalEntityId).toBe("NaCl");
    expect(byId.salt_crystal.chemicalEntityId).toBe("NaCl");
    for (const s of substances) {
      expect(s.reviewStatus, s.id).toBe("pending");
      expect(s.appearance, s.id).not.toContain("插画颜色为视觉编码");
      expect(s.uses.join(""), s.id).not.toContain("待审核补全");
      expect(s.properties.join(""), s.id).not.toContain("具体数据正在逐项审核");
      if (s.category === "mixture" || s.category === "material") {
        expect(s.formula, s.id).toBeNull();
        expect(s.molarMass, s.id).toBeNull();
      }
    }
  });

  it("72 items are reachable from initial inventory plus documented supply", () =>
    expect(
      reachable(
        substances
          .filter((s) => s.initialUnlocked || s.supply)
          .map((s) => s.id),
        reactions,
      ).size,
    ).toBe(substances.length));

  it.each(challenges.map((c) => [c.id, c] as const))(
    "%s is solvable with proper tier depth and executable localized hints",
    (_, c) => {
      const allowed = reactions.filter((r) =>
        r.conditions.every((x) => c.conditions.includes(x)),
      );
      const path = findPathToTarget(c.initial, c.target, allowed);
      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThanOrEqual(
        c.group === "科学推演" ? 3 : c.group === "组合实验" ? 2 : 1,
      );
      expect(path!.length).toBeLessThanOrEqual(c.limit);

      // Step through the solution verifying L1-L3 hints are executable and localized
      const inv = [...c.initial];
      for (const step of path!) {
        for (const lv of [1, 2, 3]) {
          const h = getHint(inv, [], allowed, byId, lv, { target: c.target });
          expect(h.rule).not.toBeNull();
          expect(
            [
              ...h.rule!.reactants.map((p) => p.substanceId),
              ...h.rule!.catalysts,
            ].every((id) => inv.includes(id)),
          ).toBe(true);
          expect(h.message).not.toMatch(
            /\b(heat|ignite|high_heat|electricity|light|cool|mix|evaporate|distill|grind|filter)\b/,
          );
        }
        for (const p of step.products) {
          if (!inv.includes(p.substanceId)) inv.push(p.substanceId);
        }
      }
      expect(inv).toContain(c.target);
    },
  );

  it("free-exploration hints only recommend available reactants and catalysts with localized conditions", () => {
    const owned = substances.filter((s) => s.initialUnlocked).map((s) => s.id);
    const h = getHint(owned, [], reactions, byId, 3);
    expect(h.rule).not.toBeNull();
    expect(h.rule!.reactants.every((p) => owned.includes(p.substanceId))).toBe(
      true,
    );
    expect(h.message).not.toMatch(/\b(cool|heat|high_heat|electricity)\b/);
  });

  it("rejects invalid, future and unknown save data", () => {
    expect(validateSave(initialSave()).version).toBe(3);
    expect(() => validateSave({ ...initialSave(), version: 4 })).toThrow();
    expect(() =>
      validateSave({ ...initialSave(), favorites: ["fake"] }),
    ).toThrow();
    expect(() => validateSave({ ...initialSave(), discovered: {} })).toThrow();
  });
});
