import { describe, it, expect } from "vitest";
import {
  byId,
  historyChapterById,
  historyChapters,
  reactions,
} from "../../src/data";
import { initialSave, validateSave } from "../../src/database";
import {
  canAccessHistoryStage,
  createHistorySession,
  evaluateGasIdentification,
  evaluateHistoryRating,
  evaluateMassComparison,
  evaluatePeriodicPrediction,
  evaluateVoltaicPile,
  evaluateWaterComposition,
  recordHistoryCompletion,
  runHistoryWaterSharedReaction,
  switchHistorySessionDifficulty,
} from "../../src/engine/historyEngine";

describe("Challenge History Deepening: 10-Chapter Alignment, 5 Distinct Puzzles, Session Gating & Anti-Farm", () => {
  it("aligns all 10 chapters to HISTORY_MODE_BRIEF while preserving playable IDs and pending status", () => {
    expect(historyChapters.map((c) => c.id)).toEqual([
      "hist_01",
      "hist_02",
      "hist_03",
      "hist_04",
      "hist_05",
      "hist_06",
      "hist_07",
      "hist_08",
      "hist_09",
      "hist_10",
    ]);
    expect(historyChapters.filter((c) => c.playable).map((c) => c.id)).toEqual([
      "hist_01",
      "hist_02",
      "hist_03",
      "hist_04",
      "hist_07",
    ]);
    expect(historyChapterById.hist_05.title).toContain("生命物质的边界");
    expect(historyChapterById.hist_06.title).toContain("电流的化学法则");
    expect(historyChapterById.hist_08.title).toContain("矿石中的未知信号");
    expect(historyChapterById.hist_09.title).toContain("原子内部的世界");
    expect(historyChapterById.hist_10.title).toContain("来自空气的农业革命");
    expect(historyChapters.every((c) => c.reviewStatus === "pending")).toBe(
      true,
    );
  });

  it("strictly prevents skipping incomplete stages via pure engine guard & preserves attempts on difficulty switch", () => {
    const s = createHistorySession("simple", 1000);
    expect(canAccessHistoryStage(s, "background")).toBe(true);
    expect(canAccessHistoryStage(s, "hypothesis")).toBe(false);
    expect(canAccessHistoryStage(s, "experiment")).toBe(false);
    expect(canAccessHistoryStage(s, "analysis")).toBe(false);
    expect(canAccessHistoryStage(s, "discovery")).toBe(false);

    s.stageCompleted.background = true;
    s.stageCompleted.hypothesis = true;
    s.stageCompleted.experiment = true;
    s.experimentAttempts = 3;
    s.hintsShown = 1;
    s.stage = "analysis";
    expect(canAccessHistoryStage(s, "analysis")).toBe(true);
    expect(canAccessHistoryStage(s, "discovery")).toBe(false);

    // Switching to advanced MUST NOT erase failed attempts or hints, and must require re-passing experiment
    const adv = switchHistorySessionDifficulty(s, "advanced", 2000);
    expect(adv.difficulty).toBe("advanced");
    expect(adv.experimentAttempts).toBe(3);
    expect(adv.hintsShown).toBe(1);
    expect(adv.stage).toBe("experiment");
    expect(adv.stageCompleted.experiment).toBe(false);
  });

  it("CH.01 Oxygen: rejects insufficient evidence without leaking answers, validates restricted-pool & advanced r026 yield", () => {
    const ch1 = historyChapterById.hist_01;
    // Missing limewater on sample_c -> rejected with gap feedback
    const missingLime = evaluateGasIdentification(
      ch1,
      [
        "sample_a:limewater",
        "sample_b:glowingSplint",
        "sample_c:burningSplint",
      ],
      { sample_a: "carbon_dioxide", sample_b: "oxygen", sample_c: "nitrogen" },
      "simple",
    );
    expect(missingLime.passed).toBe(false);
    expect(missingLime.message).toContain("澄清石灰水");

    // Simple pass with >=4 tests including both limewater tests
    const simpleOk = evaluateGasIdentification(
      ch1,
      [
        "sample_a:limewater",
        "sample_b:glowingSplint",
        "sample_c:burningSplint",
        "sample_c:limewater",
      ],
      { sample_a: "carbon_dioxide", sample_b: "oxygen", sample_c: "nitrogen" },
      "simple",
    );
    expect(simpleOk.passed).toBe(true);

    // Advanced requires >=6 tests + real stoichiometry check (6 H2O2 -> 3 O2 via r026)
    const sixTests = [
      "sample_a:burningSplint",
      "sample_a:limewater",
      "sample_b:glowingSplint",
      "sample_b:limewater",
      "sample_c:burningSplint",
      "sample_c:limewater",
    ];
    const advWrongYield = evaluateGasIdentification(
      ch1,
      sixTests,
      { sample_a: "carbon_dioxide", sample_b: "oxygen", sample_c: "nitrogen" },
      "advanced",
      { advancedYieldAnswer: 6, rules: reactions, db: byId },
    );
    expect(advWrongYield.passed).toBe(false);

    const advOk = evaluateGasIdentification(
      ch1,
      sixTests,
      { sample_a: "carbon_dioxide", sample_b: "oxygen", sample_c: "nitrogen" },
      "advanced",
      { advancedYieldAnswer: 3, rules: reactions, db: byId },
    );
    expect(advOk.passed).toBe(true);
  });

  it("CH.02 Mass Conservation: requires both open & closed weighings and validates unit conversions (g/kg/mg)", () => {
    const ch2 = historyChapterById.hist_02;
    const missingClosed = evaluateMassComparison(
      ch2,
      ["trial_open_caco3", "trial_open_cu"],
      1,
      44,
      "simple",
    );
    expect(missingClosed.passed).toBe(false);
    expect(missingClosed.message).toContain("密闭系统");

    const all3 = ["trial_open_caco3", "trial_open_cu", "trial_closed_caco3"];
    expect(
      evaluateMassComparison(ch2, all3, 1, 44, "advanced", "g").passed,
    ).toBe(true);
    expect(
      evaluateMassComparison(ch2, all3, 1, 0.044, "advanced", "kg").passed,
    ).toBe(true);
    expect(
      evaluateMassComparison(ch2, all3, 1, 44000, "advanced", "mg").passed,
    ).toBe(true);
    // Wrong unit (44 kg != 44 g) must fail
    expect(
      evaluateMassComparison(ch2, all3, 1, 44, "advanced", "kg").passed,
    ).toBe(false);
  });

  it("CH.03 Water Identity: delegates to shared execute() & checkEquationBalance() and enforces subscript check in Advanced", () => {
    const ch3 = historyChapterById.hist_03;
    const synthOut = runHistoryWaterSharedReaction("synthesis", reactions);
    expect(synthOut.status).toBe("success");
    const elecOut = runHistoryWaterSharedReaction("electrolysis", reactions);
    expect(elecOut.status).toBe("success");

    // Must observe synthesis first
    expect(
      evaluateWaterComposition(ch3, 1, [2, 1], [2], "simple", reactions, byId, {
        synthObserved: false,
      }).passed,
    ).toBe(false);

    // Advanced requires electrolysis + simplest ratio + subscript concept answer
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
          subscriptChoiceIdx: 1, // wrong
        },
      ).passed,
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
  });

  it("CH.04 Voltaic Pile: simulates identical-metal 0V, dry insulator break, reversed polarity cancellation, and Zn-Ag 1800 prototype", () => {
    const ch4 = historyChapterById.hist_04;
    const sameMetal = evaluateVoltaicPile(
      ch4,
      ["copper", "brine_cloth", "copper"],
      "simple",
      "cu_cu",
    );
    expect(sameMetal.passed).toBe(false);
    expect(sameMetal.voltageV).toBe(0);

    const dryBreak = evaluateVoltaicPile(
      ch4,
      ["zinc", "dry_paper", "copper", "zinc", "brine_cloth", "copper"],
      "simple",
      "zn_cu",
    );
    expect(dryBreak.passed).toBe(false);
    expect(dryBreak.hasDryFault).toBe(true);
    expect(dryBreak.voltageV).toBe(0);

    // Reversed polarity cancels 1 forward cell -> netCells 0
    const reversed = evaluateVoltaicPile(
      ch4,
      ["zinc", "brine_cloth", "copper", "copper", "brine_cloth", "zinc"],
      "simple",
      "zn_cu",
    );
    expect(reversed.passed).toBe(false);
    expect(reversed.reversedCells).toBe(1);
    expect(reversed.netCells).toBe(0);

    // 1800 historical Zn-Ag prototype passes Advanced with 3 cells (2.4V)
    const znAgAdv = evaluateVoltaicPile(
      ch4,
      [
        "zinc",
        "brine_cloth",
        "silver",
        "zinc",
        "brine_cloth",
        "silver",
        "zinc",
        "brine_cloth",
        "silver",
      ],
      "advanced",
      "zn_ag",
    );
    expect(znAgAdv.passed).toBe(true);
    expect(znAgAdv.voltageV).toBe(2.4);
  });

  it("CH.07 Periodic Table: requires explicit gap marking & validates Advanced oxide + atomic weight range", () => {
    const ch7 = historyChapterById.hist_07;
    const validSlots = { "3-1": "Na", "3-3": "Al", "3-4": "Si", "4-1": "K" };

    // Missing explicit gap marking must fail
    const noGap = evaluatePeriodicPrediction(ch7, validSlots, 0, 68, "simple", {
      gapMarked: false,
    });
    expect(noGap.passed).toBe(false);

    // Advanced wrong oxide fails
    const badOxide = evaluatePeriodicPrediction(
      ch7,
      validSlots,
      0,
      69,
      "advanced",
      { gapMarked: true, oxideChoiceIdx: 0 },
    );
    expect(badOxide.passed).toBe(false);

    const advPass = evaluatePeriodicPrediction(
      ch7,
      validSlots,
      0,
      69.5,
      "advanced",
      { gapMarked: true, oxideChoiceIdx: 1 },
    );
    expect(advPass.passed).toBe(true);
  });

  it("computes multi-factor 1-3 star ratings and enforces finite anti-farm repeat reward cap + archive unlocks + save persistence", () => {
    const r3 = evaluateHistoryRating({
      evidenceCompleteness: 1,
      experimentAttempts: 1,
      hypothesisWrongCount: 0,
      analysisWrongCount: 0,
      hintsShown: 0,
      difficulty: "advanced",
    });
    expect(r3.stars).toBe(3);

    const r2 = evaluateHistoryRating({
      evidenceCompleteness: 1,
      experimentAttempts: 2,
      hypothesisWrongCount: 1,
      analysisWrongCount: 0,
      hintsShown: 1,
      difficulty: "simple",
    });
    expect(r2.stars).toBe(2);

    const r1 = evaluateHistoryRating({
      evidenceCompleteness: 1,
      experimentAttempts: 6,
      hypothesisWrongCount: 2,
      analysisWrongCount: 1,
      hintsShown: 3,
      difficulty: "simple",
    });
    expect(r1.stars).toBe(1);

    // Anti-farm repeat cap: first + repeat#1 + repeat#2 + repeat#3 (0 coins/RP!) + one-time Advanced bonus
    let s = initialSave();
    const ch2 = historyChapterById.hist_02;
    const run1 = recordHistoryCompletion(s, ch2, 2, "simple", 2, 1, ["ev"]);
    expect(run1.isFirstCompletion).toBe(true);
    expect(run1.reward.coins).toBe(ch2.firstReward.coins);
    expect(run1.unlockedArchiveLabels.length).toBe(4);
    s = run1.save;

    const run2 = recordHistoryCompletion(s, ch2, 3, "simple", 1, 0, ["ev"]);
    expect(run2.isFirstCompletion).toBe(false);
    expect(run2.reward.coins).toBe(ch2.repeatReward.coins);
    expect(run2.save.historyProgress.hist_02.bestStars).toBe(3);
    s = run2.save;

    const run3 = recordHistoryCompletion(s, ch2, 3, "simple", 1, 0, ["ev"]);
    expect(run3.reward.coins).toBe(ch2.repeatReward.coins);
    s = run3.save;

    // 4th simple run exceeds maxRepeatRewardClaims (2) -> 0 coins/RP (anti-farm!)
    const run4 = recordHistoryCompletion(s, ch2, 3, "simple", 1, 0, ["ev"]);
    expect(run4.repeatCapReached).toBe(true);
    expect(run4.reward.coins).toBe(0);
    expect(run4.reward.researchPoints).toBe(0);
    s = run4.save;

    // Upgrading to Advanced grants one-time advancedFirstBonus cleanly, and a 2nd Advanced run gives 0!
    const adv1 = recordHistoryCompletion(s, ch2, 3, "advanced", 1, 0, ["ev"]);
    expect(adv1.advancedBonusGranted).toBe(true);
    expect(adv1.reward.coins).toBe(ch2.advancedFirstBonus!.coins);
    const adv2 = recordHistoryCompletion(adv1.save, ch2, 3, "advanced", 1, 0, [
      "ev",
    ]);
    expect(adv2.advancedBonusGranted).toBe(false);
    expect(adv2.reward.coins).toBe(0);

    // Mid-chapter session persistence round-trips cleanly through validateSave
    const midSession = createHistorySession("advanced", 5000);
    midSession.stage = "experiment";
    midSession.stageCompleted.background = true;
    midSession.stageCompleted.hypothesis = true;
    midSession.puzzle.massMeasured = ["trial_open_caco3"];
    adv2.save.activeHistoryChapterId = "hist_02";
    adv2.save.historyProgress.hist_02.session = midSession;
    const restored = validateSave(JSON.parse(JSON.stringify(adv2.save)));
    expect(restored.activeHistoryChapterId).toBe("hist_02");
    expect(restored.historyProgress.hist_02.session?.stage).toBe("experiment");
    expect(
      restored.historyProgress.hist_02.session?.puzzle.massMeasured,
    ).toEqual(["trial_open_caco3"]);
  });
});
