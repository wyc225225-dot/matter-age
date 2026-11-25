import { describe, it, expect } from "vitest";
import {
  byId,
  economyConfig,
  equipmentById,
  equipmentList,
  explorationEvents,
  historicalFigures,
  historyChapterById,
  historyChapters,
  labLevels,
  museumItems,
  orders,
  reactions,
  regions,
  specialChallenges,
  techById,
  technologies,
} from "../../src/data";
import { initialSave, migrateSave, validateSave } from "../../src/database";
import {
  claimRewardOnce,
  consumeManagementItems,
  getResearchLevelStatus,
} from "../../src/engine/progressionEngine";
import { buyMaterial, sellMaterial } from "../../src/engine/economyEngine";
import {
  unlockTechnology,
  validateTechDAG,
} from "../../src/engine/technologyEngine";
import {
  buildOrUpgradeEquipment,
  executeManagementProduction,
  getManagementAllowedConditions,
} from "../../src/engine/laboratoryEngine";
import {
  deliverOrder,
  simulateProgressionToLabLv3,
} from "../../src/engine/orderEngine";
import {
  completeRegionTask,
  executeGatherNode,
} from "../../src/engine/explorationEngine";
import {
  evaluateGasIdentification,
  evaluateMassComparison,
  evaluatePeriodicPrediction,
  evaluateVoltaicPile,
  evaluateWaterComposition,
  recordHistoryCompletion,
} from "../../src/engine/historyEngine";
import { syncMuseumUnlocks } from "../../src/engine/museumEngine";
import { verifySpecialChallenge } from "../../src/engine/specialChallengeEngine";
import {
  claimAchievementReward,
  detailedAchievements,
} from "../../src/engine/achievementEngine";

describe("V1.6 P0: Economy, Inventory Isolation, Tech DAG, Equipment & Lab Progression", () => {
  it("keeps cumulative experience unaffected when spending research points", () => {
    const s = initialSave();
    s.experience = 400;
    s.researchPoints = 50;
    const beforeLv = getResearchLevelStatus(s.experience, economyConfig);
    expect(beforeLv.current.level).toBe(3);

    const unlocked = unlockTechnology(s, "tech_phase_control", techById);
    expect(unlocked.ok).toBe(true);
    if (unlocked.ok) {
      expect(unlocked.save.researchPoints).toBe(
        50 - techById.tech_phase_control.costRP,
      );
      expect(unlocked.save.experience).toBeGreaterThanOrEqual(400);
      expect(
        getResearchLevelStatus(unlocked.save.experience, economyConfig).current
          .level,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("enforces idempotent reward ledger (no duplicate claim or reload replay)", () => {
    const s = initialSave();
    const first = claimRewardOnce(s, "test:event:1", {
      coins: 50,
      researchPoints: 10,
      experience: 20,
    });
    expect(first.claimed).toBe(true);
    expect(first.save.coins).toBe(s.coins + 50);

    const second = claimRewardOnce(first.save, "test:event:1", {
      coins: 50,
      researchPoints: 10,
      experience: 20,
    });
    expect(second.claimed).toBe(false);
    expect(second.save.coins).toBe(first.save.coins);
  });

  it("rejects negative management inventory & keeps free-exploration discoveries separate from finite management stock", () => {
    const s = initialSave();
    expect(
      consumeManagementItems(s.managementInventory, { water: 999 }).ok,
    ).toBe(false);
    expect(buyMaterial(s, "water", -3, economyConfig, byId).ok).toBe(false);
    expect(sellMaterial(s, "copper_hydroxide", 1, economyConfig, byId).ok).toBe(
      false,
    );
    // Free-exploration discovery does not auto-grant finite management stock
    s.discovered.ice = Date.now();
    expect(s.managementInventory.ice ?? 0).toBe(0);
  });

  it("validates 24-node technology DAG (acyclic, valid prereqs, 100% reachable) & rejects duplicate unlock", () => {
    expect(technologies.length).toBeGreaterThanOrEqual(24);
    const dag = validateTechDAG(technologies);
    expect(dag.valid).toBe(true);
    expect(dag.cycles).toEqual([]);
    expect(dag.unreachableFromBase).toEqual([]);

    const s = initialSave();
    const first = unlockTechnology(s, "tech_thermal_basics", techById);
    expect(first.ok).toBe(true);
    if (first.ok) {
      const dup = unlockTechnology(first.save, "tech_thermal_basics", techById);
      expect(dup.ok).toBe(false);
    }
  });

  it("restricts conditions by equipment ONLY in Management mode and keeps catalysts unconsumed", () => {
    const s = initialSave();
    expect(getManagementAllowedConditions(s, equipmentById)).toEqual(["mix"]);
    // Attempting heat reaction in Management before heater is built must fail
    const blocked = executeManagementProduction(
      s,
      "r003",
      1,
      reactions,
      byId,
      equipmentById,
      labLevels,
    );
    expect(blocked.ok).toBe(false);

    // Catalytic H2O2 decomposition under mix works and preserves MnO2 catalyst
    const catBefore = s.managementInventory.manganese_dioxide;
    const okProd = executeManagementProduction(
      s,
      "r027",
      1,
      reactions,
      byId,
      equipmentById,
      labLevels,
    );
    expect(okProd.ok).toBe(true);
    if (okProd.ok) {
      expect(okProd.save.managementInventory.manganese_dioxide).toBe(catBefore);
      expect(okProd.save.managementInventory.oxygen).toBe(1);
    }
  });

  it("prevents atomic double-delivery of orders without sufficient inventory", () => {
    let s = initialSave();
    const prod = executeManagementProduction(
      s,
      "r018",
      2,
      reactions,
      byId,
      equipmentById,
      labLevels,
    );
    expect(prod.ok).toBe(true);
    if (!prod.ok) return;
    s = prod.save;
    const firstDeliver = deliverOrder(s, "ord_01", orders, labLevels, byId);
    expect(firstDeliver.ok).toBe(true);
    if (!firstDeliver.ok) return;
    const secondDeliver = deliverOrder(
      firstDeliver.save,
      "ord_01",
      orders,
      labLevels,
      byId,
    );
    expect(secondDeliver.ok).toBe(false);
  });

  it("recovers cleanly from 0 coins & empty inventory via free Primeval Forest gathering (anti-deadlock)", () => {
    const broke = initialSave();
    broke.coins = 0;
    broke.managementInventory = {};

    const gathered = executeGatherNode(
      broke,
      "forest",
      "node_forest_spring",
      regions,
      explorationEvents,
      byId,
      () => 0.99, // no event needed for recovery
    );
    expect(gathered.ok).toBe(true);
    if (gathered.ok) {
      expect(gathered.save.managementInventory.water).toBeGreaterThan(0);
      const sold = sellMaterial(gathered.save, "water", 2, economyConfig, byId);
      expect(sold.ok).toBe(true);
      if (sold.ok) {
        expect(sold.save.coins).toBeGreaterThan(0);
      }
    }
  });

  it("simulates a complete fresh-save progression reaching Lab Lv.1 -> Lv.2 -> Lv.3 with zero deadlocks", () => {
    const sim = simulateProgressionToLabLv3(initialSave(), {
      economy: economyConfig,
      labs: labLevels,
      equipmentMap: equipmentById,
      techMap: techById,
      allOrders: orders,
      rules: reactions,
      db: byId,
      regions,
    });
    expect(sim.ok).toBe(true);
    if (sim.ok) {
      expect(sim.finalSave.labLevel).toBe(3);
      expect(
        Object.keys(sim.finalSave.discovered).length,
      ).toBeGreaterThanOrEqual(14);
    }
  });

  it("blocks preview-locked Lv.4/5 labs & automation equipment cleanly", () => {
    const s = initialSave();
    const res = buildOrUpgradeEquipment(
      s,
      "eq_auto_reactor",
      equipmentById,
      labLevels,
      techById,
    );
    expect(res.ok).toBe(false);
    expect(equipmentList.filter((e) => !e.lockedPreview).length).toBe(8);
  });
});

describe("V1.6 P1: Challenge History (10 Playable Distinct Puzzles), Museum (21) & Achievements", () => {
  it("maintains 10-chapter timeline with all 10 playable pending chapters & multi-contributor historical figures", () => {
    expect(historyChapters.length).toBe(10);
    expect(historyChapters.filter((c) => c.playable).length).toBe(10);
    expect(historyChapters.every((c) => c.reviewStatus === "pending")).toBe(
      true,
    );
    expect(historicalFigures.every((f) => f.reviewStatus === "pending")).toBe(
      true,
    );
  });

  it("evaluates all 5 distinct History puzzles in both Simple and Advanced modes", () => {
    // Ch 01: Gas identification
    const ch1 = historyChapterById.hist_01;
    expect(
      evaluateGasIdentification(
        ch1,
        [
          "sample_a:limewater",
          "sample_b:glowingSplint",
          "sample_c:burningSplint",
          "sample_c:limewater",
        ],
        {
          sample_a: "carbon_dioxide",
          sample_b: "oxygen",
          sample_c: "nitrogen",
        },
        "simple",
      ).passed,
    ).toBe(true);

    // Ch 02: Mass conservation open vs closed
    const ch2 = historyChapterById.hist_02;
    expect(
      evaluateMassComparison(
        ch2,
        ["trial_open_caco3", "trial_open_cu", "trial_closed_caco3"],
        1,
        44,
        "advanced",
      ).passed,
    ).toBe(true);
    expect(
      evaluateMassComparison(
        ch2,
        ["trial_open_caco3", "trial_open_cu", "trial_closed_caco3"],
        1,
        20,
        "advanced",
      ).passed,
    ).toBe(false);

    // Ch 03: Water composition + real equation balancer
    const ch3 = historyChapterById.hist_03;
    expect(
      evaluateWaterComposition(ch3, 1, [4, 2], [4], "simple", reactions, byId)
        .passed,
    ).toBe(true);
    expect(
      evaluateWaterComposition(ch3, 1, [4, 2], [4], "advanced", reactions, byId)
        .passed,
    ).toBe(false);
    expect(
      evaluateWaterComposition(
        ch3,
        1,
        [2, 1],
        [2],
        "advanced",
        reactions,
        byId,
        {
          synthObserved: true,
          elecObserved: true,
          subscriptChoiceIdx: 0,
        },
      ).passed,
    ).toBe(true);

    // Ch 04: Voltaic pile assembly
    const ch4 = historyChapterById.hist_04;
    expect(
      evaluateVoltaicPile(
        ch4,
        ["zinc", "brine_cloth", "copper", "zinc", "brine_cloth", "copper"],
        "simple",
      ).passed,
    ).toBe(true);
    expect(
      evaluateVoltaicPile(ch4, ["zinc", "copper", "brine_cloth"], "simple")
        .passed,
    ).toBe(false);
    expect(
      evaluateVoltaicPile(
        ch4,
        [
          "zinc",
          "brine_cloth",
          "copper",
          "zinc",
          "brine_cloth",
          "copper",
          "zinc",
          "brine_cloth",
          "copper",
        ],
        "advanced",
      ).passed,
    ).toBe(true);

    // Ch 07: Periodic table card ordering & gap prediction
    const ch7 = historyChapterById.hist_07;
    expect(
      evaluatePeriodicPrediction(
        ch7,
        { "3-1": "Na", "3-3": "Al", "3-4": "Si", "4-1": "K" },
        0,
        69.7,
        "advanced",
      ).passed,
    ).toBe(true);
  });

  it("separates first-time vs repeat History rewards and unlocks Museum exhibit", () => {
    const s = initialSave();
    const ch4 = historyChapterById.hist_04;
    const first = recordHistoryCompletion(s, ch4, 2, "simple", 2, 1, ["ev1"]);
    expect(first.isFirstCompletion).toBe(true);
    expect(first.reward).toEqual(ch4.firstReward);
    expect(first.save.museumUnlocked.mus_voltaic_pile).toBeDefined();

    const repeat = recordHistoryCompletion(
      first.save,
      ch4,
      3,
      "advanced",
      1,
      0,
      ["ev2"],
    );
    expect(repeat.isFirstCompletion).toBe(false);
    expect(repeat.advancedBonusGranted).toBe(true);
    expect(repeat.reward.coins).toBe(
      ch4.repeatReward.coins + (ch4.advancedFirstBonus?.coins ?? 0),
    );
    expect(repeat.save.historyProgress.hist_04.bestStars).toBe(3);
  });

  it("unlocks Museum exhibits strictly from real events and enforces idempotent Achievement rewards", () => {
    expect(museumItems.length).toBeGreaterThanOrEqual(15);
    const s = initialSave();
    s.completed.push("r005");
    s.labLevel = 2;
    const synced = syncMuseumUnlocks(s, museumItems, 12345);
    expect(synced.museumUnlocked.mus_electrolysis_tube).toBe(12345);
    expect(synced.museumUnlocked.mus_lab_lv2).toBe(12345);
    expect(synced.museumUnlocked.mus_lab_lv3).toBeUndefined();

    const allAch = detailedAchievements(s);
    expect(allAch.length).toBeGreaterThanOrEqual(32);
    const claim1 = claimAchievementReward(s, "标准实验室");
    expect(claim1.ok).toBe(true);
    if (claim1.ok) {
      const claim2 = claimAchievementReward(claim1.save, "标准实验室");
      expect(claim2.ok).toBe(false);
    }
  });
});

describe("V1.6 P2: World Exploration, 15 Special Challenges & Save v2 -> v3 Migration", () => {
  it("completes region tasks idempotently and triggers weighted exploration events", () => {
    let s = initialSave();
    for (let i = 0; i < 3; i++) {
      const g = executeGatherNode(
        s,
        "forest",
        "node_forest_spring",
        regions,
        explorationEvents,
        byId,
        () => 0.1, // triggers event
      );
      expect(g.ok).toBe(true);
      if (g.ok) s = g.save;
    }
    expect(s.regionProgress.forest.gatherCount).toBe(3);
    expect(s.regionProgress.forest.eventLog.length).toBe(3);

    const t1 = completeRegionTask(s, "forest", "task_forest_1", regions, byId);
    expect(t1.ok).toBe(true);
    if (t1.ok) {
      const dup = completeRegionTask(
        t1.save,
        "forest",
        "task_forest_1",
        regions,
        byId,
      );
      expect(dup.ok).toBe(false);
    }
  });

  it("verifies all 15 special challenges across all 5 types are solvable", () => {
    expect(specialChallenges.length).toBeGreaterThanOrEqual(15);
    const types = new Set(specialChallenges.map((c) => c.type));
    expect(types.size).toBe(5);
    for (const sc of specialChallenges) {
      const res = verifySpecialChallenge(sc, reactions, byId);
      expect(res.valid, `${sc.id}: ${res.error}`).toBe(true);
    }
  });

  it("migrates v2 saves cleanly to v3 without losing quantitative records or replaying rewards, and rejects v4", () => {
    const v2 = {
      version: 2,
      currentMode: "advanced",
      achievements: ["第一次实验"],
      discovered: {
        water: 1000,
        air: 1000,
        wood: 1000,
        sand: 1000,
        iron: 1000,
        hydrogen: 3000,
        oxygen: 3000,
      },
      completed: ["r005"],
      history: [],
      favorites: ["hydrogen"],
      settings: { sound: false, motion: true },
      challengeBest: {},
      challengeRun: null,
      collected: [],
      totalExperiments: 5,
      research: {},
      quantitativeHistory: [],
      quantitativeChallengeBest: {
        q1: { stars: 3, attempts: 1, bestUtilization: 1 },
      },
      quantitativeChallengeRun: null,
      bestUtilization: { r005: { portionUtilization: 1, massUtilization: 1 } },
      balancingRecords: {
        r006: {
          reactionId: "r006",
          attempts: 1,
          solved: true,
          simplestRatio: true,
          bestCoefficients: { reactants: [2, 1], products: [2] },
          time: 4000,
        },
      },
    };

    const migrated = validateSave(v2);
    expect(migrated.version).toBe(3);
    expect(migrated.currentMode).toBe("advanced");
    expect(migrated.quantitativeChallengeBest.q1.stars).toBe(3);
    expect(migrated.balancingRecords.r006.solved).toBe(true);
    expect(migrated.claimedRewardIds).toContain("first_discovery:hydrogen");
    expect(migrated.claimedRewardIds).toContain("quant_challenge:q1");
    expect(migrated.claimedRewardIds).toContain("balancing:r006");

    expect(() => migrateSave({ ...migrated, version: 4 })).toThrow();
    expect(() => migrateSave({ ...migrated, version: 99 })).toThrow();
  });
});
