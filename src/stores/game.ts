import { create } from "zustand";
import type {
  HistorySessionState,
  IntegerStoichiometryResult,
  QuantitativeChallenge,
  QuantitativeHistoryEntry,
  Reaction,
  RegionId,
  ResearchRecord,
  Save,
} from "../types";
import { initialSave, loadSave, persistSave, validateSave } from "../database";
import {
  byId,
  challenges,
  economyConfig,
  equipmentById,
  explorationEvents,
  historyChapterById,
  labLevels,
  museumItems,
  orders,
  quantitativeChallenges,
  reactions,
  regions,
  specialChallengeById,
  techById,
} from "../data";
import {
  achievements,
  claimAchievementReward,
} from "../engine/achievementEngine";
import { rateChallenge, bestChallengeScore } from "../engine/challengeEngine";
import {
  applyQuantitativeInventory,
  isQuantitativeChallengeTargetMet,
} from "../engine/quantitativeChallengeEngine";
import { claimRewardOnce } from "../engine/progressionEngine";
import { buyMaterial, sellMaterial } from "../engine/economyEngine";
import {
  buildOrUpgradeEquipment,
  executeManagementProduction,
  upgradeLaboratory,
} from "../engine/laboratoryEngine";
import { deliverOrder, refreshActiveOrders } from "../engine/orderEngine";
import { unlockTechnology } from "../engine/technologyEngine";
import {
  completeRegionTask,
  executeGatherNode,
} from "../engine/explorationEngine";
import {
  createHistorySession,
  recordHistoryCompletion,
} from "../engine/historyEngine";
import { syncMuseumUnlocks } from "../engine/museumEngine";

function ensureResearch(s: Save, id: string): ResearchRecord {
  if (!s.research[id]) {
    s.research[id] = {
      discovered: id in s.discovered,
      simpleResearchCompleted: id in s.discovered,
      quantitativeResearchCompleted: false,
      laboratoryResearchCompleted: false,
      completedReactionIds: [],
    };
  }
  return s.research[id];
}

function findQuantChallenge(id: string): QuantitativeChallenge | undefined {
  return quantitativeChallenges.find((c) => c.id === id);
}

export interface ActionFeedback {
  ok: boolean;
  message: string;
}

export const useGame = create<{
  save: Save;
  ready: boolean;
  error: string;
  init: () => Promise<void>;
  update: (fn: (s: Save) => Save) => void;
  setMode: (mode: "simple" | "advanced") => void;
  importSave: (s: unknown) => void;
  reset: () => void;
  collect: (id: string) => void;
  record: (r: Reaction | null, message: string) => string[];
  recordAdvanced: (
    stoich: IntegerStoichiometryResult | null,
    outcome: QuantitativeHistoryEntry["outcome"],
    inputs: Record<string, number>,
    reaction: Reaction | null,
  ) => { newProducts: string[]; challengeCompleted: boolean };
  recordBalancing: (
    reaction: Reaction,
    reactantCoeffs: number[],
    productCoeffs: number[],
    solved: boolean,
    simplestRatio: boolean,
  ) => void;
  startQuantitativeChallenge: (c: QuantitativeChallenge) => void;
  resetQuantitativeChallenge: () => void;
  exitQuantitativeChallenge: () => void;
  // V1.6 Atomic Long-term Loop Actions
  buyMaterialAction: (substanceId: string, quantity: number) => ActionFeedback;
  sellMaterialAction: (substanceId: string, quantity: number) => ActionFeedback;
  produceInManagement: (
    reactionId: string,
    batchCount: number,
  ) => ActionFeedback;
  deliverOrderAction: (orderId: string) => ActionFeedback;
  buildOrUpgradeEquipmentAction: (equipmentId: string) => ActionFeedback;
  upgradeLabAction: () => ActionFeedback;
  unlockTechAction: (techId: string) => ActionFeedback;
  gatherWorldNode: (regionId: RegionId, nodeId: string) => ActionFeedback;
  completeRegionTaskAction: (
    regionId: RegionId,
    taskId: string,
  ) => ActionFeedback;
  openHistoryChapter: (
    chapterId: string,
    options?: { forceRestart?: boolean; difficulty?: "simple" | "advanced" },
  ) => void;
  saveHistorySession: (chapterId: string, session: HistorySessionState) => void;
  closeHistoryChapter: () => void;
  completeHistoryChapter: (
    chapterId: string,
    stars: number,
    difficulty: "simple" | "advanced",
    attempts: number,
    hintsUsed: number,
    evidence: string[],
    metrics?: { evidenceCompleteness?: number; conclusionAccuracy?: number },
  ) => ActionFeedback;
  recordSpecialChallengeResult: (
    challengeId: string,
    stars: number,
    attempts: number,
    metric?: string,
  ) => ActionFeedback;
  claimAchievementRewardAction: (achievementName: string) => ActionFeedback;
}>((set, get) => ({
  save: initialSave(),
  ready: false,
  error: "",
  init: async () => {
    try {
      set({ save: await loadSave(), ready: true });
    } catch {
      set({
        ready: true,
        error: "存档读取失败，当前进度仅保存在内存中。请导出备份。",
      });
    }
  },
  update: (fn) => {
    let save = fn(structuredClone(get().save));
    save.achievements = [
      ...new Set([
        ...save.achievements,
        ...achievements(save)
          .filter((a) => a[2])
          .map((a) => a[0]),
      ]),
    ];
    const museumSync = syncMuseumUnlocks(save, museumItems);
    save.museumUnlocked = museumSync.museumUnlocked;
    save.activeOrderIds = refreshActiveOrders(save, orders, labLevels);
    // Re-check achievements once after museum sync (e.g. museum curator achievement)
    save.achievements = [
      ...new Set([
        ...save.achievements,
        ...achievements(save)
          .filter((a) => a[2])
          .map((a) => a[0]),
      ]),
    ];
    set({ save });
    void persistSave(save).catch(() =>
      set({ error: "自动保存失败，请导出存档备份。" }),
    );
  },
  setMode: (mode) =>
    get().update((s) => ({
      ...s,
      currentMode: mode,
    })),
  importSave: (data) => {
    const save = validateSave(data);
    get().update(() => save);
  },
  reset: () => get().update(() => initialSave()),
  collect: (id) => {
    if (
      !byId[id]?.supply ||
      get().save.challengeRun ||
      get().save.quantitativeChallengeRun
    )
      return;
    get().update((s) => {
      const now = Date.now();
      s.discovered[id] = s.discovered[id] || now;
      s.collected = [...new Set([...s.collected, id])];
      const rec = ensureResearch(s, id);
      rec.discovered = true;
      rec.simpleResearchCompleted = true;
      return s;
    });
  },
  record: (r, message) => {
    let found: string[] = [];
    get().update((s) => {
      let next = s;
      const run = next.challengeRun;
      const inventory = run ? run.inventory : Object.keys(next.discovered);
      const products = r?.products.map((p) => p.substanceId) || [];
      found = products.filter((id) => !inventory.includes(id));
      if (run) {
        if (run.complete) return next;
        run.attempts++;
        run.inventory = [...new Set([...run.inventory, ...products])];
        const c = challenges.find((c) => c.id === run.id)!;
        if (products.includes(c.target)) {
          run.complete = true;
          const score = rateChallenge(true, run.attempts, run.hints, c.limit)!;
          next.challengeBest[c.id] = bestChallengeScore(
            next.challengeBest[c.id],
            score,
          );
          next = claimRewardOnce(
            next,
            `simple_challenge:${c.id}`,
            economyConfig.rewards.simpleChallengeClear,
          ).save;
        }
      } else {
        const now = Date.now();
        for (const id of found) {
          next.discovered[id] = now;
          const rec = ensureResearch(next, id);
          rec.discovered = true;
          rec.simpleResearchCompleted = true;
          next = claimRewardOnce(
            next,
            `first_discovery:${id}`,
            economyConfig.rewards.firstDiscovery,
          ).save;
        }
        if (r) {
          next.completed = [...new Set([...next.completed, r.id])];
          next = claimRewardOnce(
            next,
            `first_reaction:${r.id}`,
            economyConfig.rewards.firstReaction,
          ).save;
          for (const id of [
            ...r.reactants.map((p) => p.substanceId),
            ...r.products.map((p) => p.substanceId),
          ]) {
            if (id in next.discovered) {
              const rec = ensureResearch(next, id);
              rec.completedReactionIds = [
                ...new Set([...rec.completedReactionIds, r.id]),
              ];
            }
          }
        }
        next.totalExperiments++;
        next.history = [
          {
            id: crypto.randomUUID(),
            reactionId: r?.id || null,
            time: now,
            message,
            products,
            newProducts: found,
          },
          ...next.history,
        ].slice(0, 200);
      }
      return next;
    });
    return found;
  },
  recordAdvanced: (stoich, outcome, inputs, reaction) => {
    let newProducts: string[] = [];
    let challengeCompleted = false;
    get().update((s) => {
      let next = s;
      const now = Date.now();
      const qRun = next.quantitativeChallengeRun;
      const consumed = stoich
        ? Object.fromEntries(
            stoich.reactants.map((r) => [r.substanceId, r.consumed]),
          )
        : {};
      const produced = stoich
        ? Object.fromEntries(
            stoich.products.map((p) => [p.substanceId, p.produced]),
          )
        : {};
      const remaining = stoich
        ? Object.fromEntries(
            stoich.reactants.map((r) => [r.substanceId, r.remaining]),
          )
        : { ...inputs };
      const portionUtilization = stoich?.portionUtilization ?? 0;
      const massUtilization = stoich?.massUtilization ?? null;

      if (qRun) {
        if (qRun.complete) return next;
        qRun.attempts++;
        if (stoich && (outcome === "complete" || outcome === "partial")) {
          qRun.inventory = applyQuantitativeInventory(qRun.inventory, stoich);
          qRun.lastUtilization = portionUtilization;
          const c = findQuantChallenge(qRun.id);
          if (
            c &&
            isQuantitativeChallengeTargetMet(c, qRun.inventory, stoich)
          ) {
            qRun.complete = true;
            challengeCompleted = true;
            const score = rateChallenge(
              true,
              qRun.attempts,
              qRun.hints,
              c.limit,
            )!;
            const prev = next.quantitativeChallengeBest[c.id];
            const best = bestChallengeScore(prev, score);
            next.quantitativeChallengeBest[c.id] = {
              ...best,
              bestUtilization: Math.max(
                prev?.bestUtilization ?? 0,
                portionUtilization,
              ),
            };
            next = claimRewardOnce(
              next,
              `quant_challenge:${c.id}`,
              economyConfig.rewards.quantChallengeClear,
            ).save;
          }
        }
      } else {
        next.totalExperiments++;
        if (
          stoich &&
          (outcome === "complete" || outcome === "partial") &&
          reaction &&
          !reaction.isTestFixture
        ) {
          const prodIds = stoich.products.map((p) => p.substanceId);
          newProducts = prodIds.filter((id) => !(id in next.discovered));
          for (const id of newProducts) {
            next.discovered[id] = now;
            next = claimRewardOnce(
              next,
              `first_discovery:${id}`,
              economyConfig.rewards.firstDiscovery,
            ).save;
          }
          const prevUtil = next.bestUtilization[reaction.id];
          if (!prevUtil || portionUtilization > prevUtil.portionUtilization) {
            next.bestUtilization[reaction.id] = {
              portionUtilization,
              massUtilization,
            };
          }
          const involved = [
            ...reaction.reactants.map((p) => p.substanceId),
            ...reaction.products.map((p) => p.substanceId),
          ];
          for (const id of involved) {
            const sub = byId[id];
            if (!sub) continue;
            const rec = ensureResearch(next, id);
            rec.discovered = true;
            rec.simpleResearchCompleted = true;
            if (sub.quantitativeResearchEligible) {
              rec.quantitativeResearchCompleted = true;
            }
            rec.completedReactionIds = [
              ...new Set([...rec.completedReactionIds, reaction.id]),
            ];
            if (
              !rec.bestExperimentRecord ||
              portionUtilization > rec.bestExperimentRecord.portionUtilization
            ) {
              rec.bestExperimentRecord = {
                reactionId: reaction.id,
                portionUtilization,
                massUtilization,
                completeReaction: outcome === "complete",
                time: now,
              };
            }
          }
          next.completed = [...new Set([...next.completed, reaction.id])];
          next = claimRewardOnce(
            next,
            `first_reaction:${reaction.id}`,
            economyConfig.rewards.firstReaction,
          ).save;
          if (outcome === "complete") {
            next = claimRewardOnce(
              next,
              `quant_complete:${reaction.id}`,
              economyConfig.rewards.quantitativeCompletion,
            ).save;
          }
        }

        next.quantitativeHistory = [
          {
            id: crypto.randomUUID(),
            reactionId: reaction?.id || null,
            reactionName: reaction?.name || "未匹配规则",
            time: now,
            outcome,
            extent: stoich?.extent ?? 0,
            inputs: { ...inputs },
            consumed,
            produced,
            remaining,
            portionUtilization,
            massUtilization,
            isDemoFixture: reaction?.isTestFixture,
          },
          ...next.quantitativeHistory,
        ].slice(0, 200);
      }

      return next;
    });
    return { newProducts, challengeCompleted };
  },
  recordBalancing: (
    reaction,
    reactantCoeffs,
    productCoeffs,
    solved,
    simplestRatio,
  ) => {
    if (reaction.isTestFixture) return;
    get().update((s) => {
      let next = s;
      const now = Date.now();
      const prev = next.balancingRecords[reaction.id];
      const nextAttempts = (prev?.attempts ?? 0) + 1;
      next.balancingRecords[reaction.id] = {
        reactionId: reaction.id,
        attempts: nextAttempts,
        solved: Boolean(prev?.solved || solved),
        simplestRatio: Boolean(prev?.simplestRatio || simplestRatio),
        bestCoefficients:
          solved && (!prev?.solved || (simplestRatio && !prev.simplestRatio))
            ? {
                reactants: [...reactantCoeffs],
                products: [...productCoeffs],
              }
            : prev?.bestCoefficients || {
                reactants: [...reactantCoeffs],
                products: [...productCoeffs],
              },
        time: now,
      };

      if (solved) {
        next = claimRewardOnce(
          next,
          `balancing:${reaction.id}`,
          economyConfig.rewards.balancingSolved,
        ).save;
        for (const p of [...reaction.reactants, ...reaction.products]) {
          const sub = byId[p.substanceId];
          if (
            sub &&
            p.substanceId in next.discovered &&
            sub.quantitativeResearchEligible
          ) {
            const rec = ensureResearch(next, p.substanceId);
            rec.quantitativeResearchCompleted = true;
          }
        }
        const qRun = next.quantitativeChallengeRun;
        if (qRun && !qRun.complete) {
          const c = findQuantChallenge(qRun.id);
          if (
            c?.kind === "balancing" &&
            c.balancingReactionId === reaction.id
          ) {
            qRun.attempts++;
            qRun.complete = true;
            const score = rateChallenge(
              true,
              qRun.attempts,
              qRun.hints,
              c.limit,
            )!;
            const prevBest = next.quantitativeChallengeBest[c.id];
            const best = bestChallengeScore(prevBest, score);
            next.quantitativeChallengeBest[c.id] = {
              ...best,
              bestUtilization: simplestRatio ? 1 : 0.85,
            };
            next = claimRewardOnce(
              next,
              `quant_challenge:${c.id}`,
              economyConfig.rewards.quantChallengeClear,
            ).save;
          }
        }
      } else if (
        next.quantitativeChallengeRun &&
        !next.quantitativeChallengeRun.complete
      ) {
        const c = findQuantChallenge(next.quantitativeChallengeRun.id);
        if (c?.kind === "balancing" && c.balancingReactionId === reaction.id) {
          next.quantitativeChallengeRun.attempts++;
        }
      }
      return next;
    });
  },
  startQuantitativeChallenge: (c) =>
    get().update((s) => ({
      ...s,
      currentMode: "advanced",
      challengeRun: null,
      quantitativeChallengeRun: {
        id: c.id,
        inventory: { ...c.initialInventory },
        catalysts: [...c.catalysts],
        attempts: 0,
        hints: 0,
        complete: false,
        isDemoFixture: c.isDemoFixture,
      },
    })),
  resetQuantitativeChallenge: () =>
    get().update((s) => {
      if (!s.quantitativeChallengeRun) return s;
      const c = findQuantChallenge(s.quantitativeChallengeRun.id);
      if (!c) return s;
      return {
        ...s,
        quantitativeChallengeRun: {
          id: c.id,
          inventory: { ...c.initialInventory },
          catalysts: [...c.catalysts],
          attempts: 0,
          hints: 0,
          complete: false,
          isDemoFixture: c.isDemoFixture,
        },
      };
    }),
  exitQuantitativeChallenge: () =>
    get().update((s) => ({
      ...s,
      quantitativeChallengeRun: null,
    })),

  /* ==================== V1.6 Atomic Long-Term Actions ==================== */

  buyMaterialAction: (substanceId, quantity) => {
    let feedback: ActionFeedback = { ok: false, message: "" };
    get().update((s) => {
      const res = buyMaterial(s, substanceId, quantity, economyConfig, byId);
      if (!res.ok) {
        feedback = { ok: false, message: res.error };
        return s;
      }
      feedback = { ok: true, message: res.message };
      return res.save;
    });
    return feedback;
  },
  sellMaterialAction: (substanceId, quantity) => {
    let feedback: ActionFeedback = { ok: false, message: "" };
    get().update((s) => {
      const res = sellMaterial(s, substanceId, quantity, economyConfig, byId);
      if (!res.ok) {
        feedback = { ok: false, message: res.error };
        return s;
      }
      feedback = { ok: true, message: res.message };
      return res.save;
    });
    return feedback;
  },
  produceInManagement: (reactionId, batchCount) => {
    let feedback: ActionFeedback = { ok: false, message: "" };
    get().update((s) => {
      const res = executeManagementProduction(
        s,
        reactionId,
        batchCount,
        reactions,
        byId,
        equipmentById,
        labLevels,
      );
      if (!res.ok) {
        feedback = { ok: false, message: res.error };
        return s;
      }
      feedback = { ok: true, message: res.message };
      return res.save;
    });
    return feedback;
  },
  deliverOrderAction: (orderId) => {
    let feedback: ActionFeedback = { ok: false, message: "" };
    get().update((s) => {
      const res = deliverOrder(s, orderId, orders, labLevels, byId);
      if (!res.ok) {
        feedback = { ok: false, message: res.error };
        return s;
      }
      feedback = { ok: true, message: res.message };
      return res.save;
    });
    return feedback;
  },
  buildOrUpgradeEquipmentAction: (equipmentId) => {
    let feedback: ActionFeedback = { ok: false, message: "" };
    get().update((s) => {
      const res = buildOrUpgradeEquipment(
        s,
        equipmentId,
        equipmentById,
        labLevels,
        techById,
      );
      if (!res.ok) {
        feedback = { ok: false, message: res.error };
        return s;
      }
      feedback = { ok: true, message: res.message };
      return res.save;
    });
    return feedback;
  },
  upgradeLabAction: () => {
    let feedback: ActionFeedback = { ok: false, message: "" };
    get().update((s) => {
      const res = upgradeLaboratory(s, labLevels, techById);
      if (!res.ok) {
        feedback = { ok: false, message: res.error };
        return s;
      }
      feedback = { ok: true, message: res.message };
      return res.save;
    });
    return feedback;
  },
  unlockTechAction: (techId) => {
    let feedback: ActionFeedback = { ok: false, message: "" };
    get().update((s) => {
      const res = unlockTechnology(s, techId, techById);
      if (!res.ok) {
        feedback = { ok: false, message: res.error };
        return s;
      }
      feedback = { ok: true, message: res.message };
      return res.save;
    });
    return feedback;
  },
  gatherWorldNode: (regionId, nodeId) => {
    let feedback: ActionFeedback = { ok: false, message: "" };
    get().update((s) => {
      const res = executeGatherNode(
        s,
        regionId,
        nodeId,
        regions,
        explorationEvents,
        byId,
      );
      if (!res.ok) {
        feedback = { ok: false, message: res.error };
        return s;
      }
      feedback = { ok: true, message: res.message };
      return res.save;
    });
    return feedback;
  },
  completeRegionTaskAction: (regionId, taskId) => {
    let feedback: ActionFeedback = { ok: false, message: "" };
    get().update((s) => {
      const res = completeRegionTask(s, regionId, taskId, regions, byId);
      if (!res.ok) {
        feedback = { ok: false, message: res.error };
        return s;
      }
      feedback = { ok: true, message: res.message };
      return res.save;
    });
    return feedback;
  },
  openHistoryChapter: (chapterId, options) => {
    const ch = historyChapterById[chapterId];
    if (!ch || !ch.playable) return;
    get().update((s) => {
      const prev = s.historyProgress[chapterId];
      const existingSession = prev?.session;
      const shouldCreate = !existingSession || Boolean(options?.forceRestart);
      const nextSession = shouldCreate
        ? createHistorySession(
            options?.difficulty ?? existingSession?.difficulty ?? "simple",
          )
        : existingSession;
      return {
        ...s,
        activeHistoryChapterId: chapterId,
        historyProgress: {
          ...s.historyProgress,
          [chapterId]: {
            unlocked: true,
            currentStage: nextSession.stage,
            completed: prev?.completed ?? false,
            bestStars: prev?.bestStars ?? 0,
            bestDifficulty: prev?.bestDifficulty ?? nextSession.difficulty,
            attempts: prev?.attempts ?? 0,
            hintsUsed: prev?.hintsUsed ?? 0,
            evidenceLog: prev?.evidenceLog ?? [],
            firstCompletedAt: prev?.firstCompletedAt,
            difficultyRecords: prev?.difficultyRecords,
            repeatRewardsClaimed: prev?.repeatRewardsClaimed ?? 0,
            unlockedArchiveRewards: prev?.unlockedArchiveRewards ?? [],
            session: nextSession,
          },
        },
      };
    });
  },
  saveHistorySession: (chapterId, session) => {
    const ch = historyChapterById[chapterId];
    if (!ch || !ch.playable) return;
    get().update((s) => {
      const prev = s.historyProgress[chapterId];
      return {
        ...s,
        activeHistoryChapterId: chapterId,
        historyProgress: {
          ...s.historyProgress,
          [chapterId]: {
            unlocked: true,
            currentStage: session.stage,
            completed: prev?.completed ?? false,
            bestStars: prev?.bestStars ?? 0,
            bestDifficulty: prev?.bestDifficulty ?? session.difficulty,
            attempts: prev?.attempts ?? 0,
            hintsUsed: prev?.hintsUsed ?? 0,
            evidenceLog: prev?.evidenceLog ?? [],
            firstCompletedAt: prev?.firstCompletedAt,
            difficultyRecords: prev?.difficultyRecords,
            repeatRewardsClaimed: prev?.repeatRewardsClaimed ?? 0,
            unlockedArchiveRewards: prev?.unlockedArchiveRewards ?? [],
            session: { ...session, updatedAt: Date.now() },
          },
        },
      };
    });
  },
  closeHistoryChapter: () => {
    get().update((s) => ({
      ...s,
      activeHistoryChapterId: null,
    }));
  },
  completeHistoryChapter: (
    chapterId,
    stars,
    difficulty,
    attempts,
    hintsUsed,
    evidence,
    metrics,
  ) => {
    const ch = historyChapterById[chapterId];
    if (!ch || !ch.playable) {
      return { ok: false, message: "该历史章节尚未开放。" };
    }
    let feedback: ActionFeedback = { ok: false, message: "" };
    get().update((s) => {
      const res = recordHistoryCompletion(
        s,
        ch,
        stars,
        difficulty,
        attempts,
        hintsUsed,
        evidence,
        Date.now(),
        metrics,
      );
      const rewardStr =
        res.reward.coins > 0 || res.reward.researchPoints > 0
          ? `获得 +${res.reward.coins} 金币，+${res.reward.researchPoints} RP，+${res.reward.experience} XP。`
          : "复玩奖励已达本章上限，本次仅更新最佳星级与研究档案。";
      feedback = {
        ok: true,
        message: `${res.isFirstCompletion ? "首次通关" : "复玩完成"}「${ch.title}」（${stars} 星${res.advancedBonusGranted ? " · 含进阶首通奖励" : ""}）！${rewardStr}`,
      };
      return res.save;
    });
    return feedback;
  },
  recordSpecialChallengeResult: (challengeId, stars, attempts, metric) => {
    const sc = specialChallengeById[challengeId];
    if (!sc) return { ok: false, message: "未知特殊挑战。" };
    let feedback: ActionFeedback = { ok: false, message: "" };
    get().update((s) => {
      const prev = s.specialChallengeBest[sc.id];
      const nextBest =
        !prev ||
        stars > prev.stars ||
        (stars === prev.stars && attempts < prev.attempts)
          ? { stars, attempts, metric }
          : prev;
      let next: Save = {
        ...s,
        specialChallengeBest: {
          ...s.specialChallengeBest,
          [sc.id]: nextBest,
        },
      };
      const claimed = claimRewardOnce(
        next,
        `special_challenge:${sc.id}`,
        sc.reward,
      );
      next = claimed.save;
      feedback = {
        ok: true,
        message: claimed.claimed
          ? `特殊挑战「${sc.name}」达成（${stars} 星）！首次奖励：+${sc.reward.coins} 金币，+${sc.reward.researchPoints} RP。`
          : `特殊挑战「${sc.name}」再次达成（${stars} 星）！最佳记录已更新。`,
      };
      return next;
    });
    return feedback;
  },
  claimAchievementRewardAction: (achievementName) => {
    let feedback: ActionFeedback = { ok: false, message: "" };
    get().update((s) => {
      const res = claimAchievementReward(s, achievementName);
      if (!res.ok) {
        feedback = { ok: false, message: res.error };
        return s;
      }
      feedback = { ok: true, message: res.message };
      return res.save;
    });
    return feedback;
  },
}));
