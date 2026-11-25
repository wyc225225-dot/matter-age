import { it, expect } from "vitest";
import { isValidElement } from "react";
import {
  rateChallenge,
  bestChallengeScore,
} from "../../src/engine/challengeEngine";
import { achievements } from "../../src/engine/achievementEngine";
import { initialSave, validateSave } from "../../src/database";
import { fmt } from "../../src/components/Shared";

it("awards independent challenge stars, keeps best and allows over-limit completion", () => {
  expect(rateChallenge(false, 1, 0, 3)).toBeNull();
  expect(rateChallenge(true, 3, 0, 3)).toEqual({ stars: 3, attempts: 3 });
  expect(rateChallenge(true, 4, 0, 3)?.stars).toBe(2);
  expect(rateChallenge(true, 2, 1, 3)?.stars).toBe(2);
  expect(rateChallenge(true, 4, 1, 3)?.stars).toBe(1);
  expect(
    bestChallengeScore({ stars: 3, attempts: 2 }, { stars: 2, attempts: 1 }),
  ).toEqual({ stars: 3, attempts: 2 });
  expect(
    bestChallengeScore({ stars: 3, attempts: 2 }, { stars: 3, attempts: 1 }),
  ).toEqual({ stars: 3, attempts: 1 });
});

it("retains achievements after old history is pruned", () => {
  const s = initialSave();
  s.achievements = ["发现者"];
  s.history = [];
  expect(achievements(s).find((a) => a[0] === "发现者")?.[2]).toBe(true);
});

it("migrates v1 saves cleanly to v3 while preserving discoveries, favorites, history, challenges and achievements without replaying historical rewards", () => {
  const v1 = {
    version: 1,
    discovered: {
      water: 1000,
      air: 1000,
      wood: 1000,
      sand: 1000,
      iron: 1000,
      ice: 2000,
    },
    completed: ["r001"],
    history: [
      {
        id: "h1",
        reactionId: "r001",
        time: 2000,
        message: "水的凝固",
        products: ["ice"],
        newProducts: ["ice"],
      },
    ],
    favorites: ["ice"],
    settings: { sound: true, motion: false },
    challengeBest: { c1: { stars: 3, attempts: 1 } },
    challengeRun: null,
  };
  const migrated = validateSave(v1);
  expect(migrated.version).toBe(3);
  expect(migrated.currentMode).toBe("simple");
  expect(migrated.discovered.ice).toBe(2000);
  expect(migrated.favorites).toEqual(["ice"]);
  expect(migrated.challengeBest.c1).toEqual({ stars: 3, attempts: 1 });
  expect(migrated.settings).toEqual({ sound: true, motion: false });
  expect(migrated.achievements).toEqual([]);
  expect(migrated.collected).toEqual([]);
  expect(migrated.totalExperiments).toBe(0);
  expect(migrated.research.ice?.discovered).toBe(true);
  expect(migrated.research.ice?.simpleResearchCompleted).toBe(true);
  expect(migrated.research.ice?.quantitativeResearchCompleted).toBe(false);
  expect(migrated.research.ice?.completedReactionIds).toContain("r001");
  expect(migrated.quantitativeHistory).toEqual([]);
  expect(migrated.balancingRecords).toEqual({});
  // V1.6 defaults seeded without replaying historical first-discovery rewards
  expect(migrated.claimedRewardIds).toContain("first_discovery:ice");
  expect(migrated.claimedRewardIds).toContain("first_reaction:r001");
  expect(migrated.claimedRewardIds).toContain("simple_challenge:c1");
  expect(migrated.labLevel).toBe(1);
  expect(migrated.unlockedRegionIds).toContain("forest");
});

it("formats chemical equations without subscripting leading stoichiometric coefficients", () => {
  const nodes = fmt("2H2 + O2 → 2H2O");
  // Leading "2" and " + O" and " → 2H" must keep stoichiometric coefficients as plain text, not <sub>
  const subs = nodes
    .filter((n) => isValidElement(n) && n.type === "sub")
    .map((n) => (n as { props: { children: string } }).props.children);
  expect(subs).toEqual(["2", "2", "2"]);
  expect(nodes[0]).toBe("2");

  const ionNodes = fmt("SO4^2-");
  const sups = ionNodes
    .filter((n) => isValidElement(n) && n.type === "sup")
    .map((n) => (n as { props: { children: string } }).props.children);
  expect(sups).toEqual(["2-"]);
});
