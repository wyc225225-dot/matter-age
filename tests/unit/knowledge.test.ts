import { it, expect } from "vitest";
import elements from "../../src/data/elements.json";
import species from "../../src/data/knowledgeSubstances.json";
import transformations from "../../src/data/knowledgeTransformations.json";
import { reactions, byId } from "../../src/data";
import { executeIntegerStoichiometry } from "../../src/engine/stoichiometry";
it("preserves all 118 authoritative element identities without hypothetical element 119", () => {
  expect(elements).toHaveLength(118);
  expect(new Set(elements.map((e) => e.symbol)).size).toBe(118);
  expect(elements.map((e) => e.atomicNumber)).toEqual(
    Array.from({ length: 118 }, (_, i) => i + 1),
  );
  expect(elements.find((e) => e.symbol === "He")?.name).toBe("氦");
});
it("old and expanded substances use compatible molar masses for every new quantitative reaction", () => {
  for (const r of reactions.filter((r) => r.id.startsWith("github_"))) {
    const inputs = Object.fromEntries(
      r.reactants.map((p) => [p.substanceId, p.coefficient]),
    );
    const result = executeIntegerStoichiometry(r, inputs, byId);
    expect(result.conservation.atomsConserved, r.id).toBe(true);
    expect(result.conservation.chargeConserved, r.id).toBe(true);
    expect(result.conservation.massConserved, r.id).toBe(true);
  }
});
it("every factual transformation conserves atoms and charge and resolves references", () => {
  const db = Object.fromEntries(species.map((s) => [s.id, s]));
  for (const r of transformations) {
    const sums = (parts: { id: string; coefficient: number }[]) => {
      const out: Record<string, number> = { charge: 0 };
      for (const p of parts) {
        expect(db[p.id], r.id).toBeDefined();
        for (const [e, n] of Object.entries(db[p.id].elementComposition))
          if (n) out[e] = (out[e] || 0) + n * p.coefficient;
        out.charge += db[p.id].charge * p.coefficient;
      }
      return Object.fromEntries(
        Object.entries(out)
          .filter(([, n]) => n !== 0)
          .sort(),
      );
    };
    expect(sums(r.reactants), r.id).toEqual(sums(r.products));
    expect(r.references.length, r.id).toBeGreaterThan(0);
    expect(r.gameRuleId).toBeNull();
    expect(r.provenance.commit).toMatch(/^[a-f0-9]{40}$/);
  }
});
