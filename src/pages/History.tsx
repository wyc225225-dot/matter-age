import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FlaskConical,
  HelpCircle,
  Landmark,
  Lock,
  RotateCcw,
  Scale,
  ScrollText,
  Sparkles,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import type {
  HistoryChapterDef,
  HistorySessionState,
  HistoryStageId,
} from "../types";
import type { Page } from "../types/navigation";
import {
  byId,
  figureById,
  historyChapters,
  museumById,
  reactions,
} from "../data";
import { useGame } from "../stores/game";
import {
  canAccessHistoryStage,
  createHistorySession,
  DEFAULT_MAX_HISTORY_REPEAT_REWARDS,
  evaluateGasIdentification,
  evaluateHistoryRating,
  evaluateMassComparison,
  evaluatePeriodicPrediction,
  evaluateVoltaicPile,
  evaluateWaterComposition,
  HISTORY_STAGE_ORDER,
  runHistoryWaterSharedReaction,
  switchHistorySessionDifficulty,
  type VoltaicDisc,
} from "../engine/historyEngine";
import { SubstanceIcon } from "../components/SubstanceIcon";
import {
  HistoryChapterScene,
  ScientistMedallion,
} from "../components/HistoryVisuals";
import { Formula } from "../components/Shared";

const stageNames: Record<HistoryStageId, string> = {
  background: "1. 历史背景",
  hypothesis: "2. 提出假设",
  experiment: "3. 经典实验",
  analysis: "4. 证据分析",
  discovery: "5. 历史揭晓",
};

export default function History({
  go,
  toast,
  deepChapterId,
}: {
  go: (p: Page) => void;
  toast: (s: string) => void;
  deepChapterId?: string | null;
}) {
  const game = useGame();
  const save = game.save;

  const [viewTab, setViewTab] = useState<"timeline" | "archives">("timeline");
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [lastRatingBreakdown, setLastRatingBreakdown] = useState<string[]>([]);
  const handledDeepRef = useRef<string | null>(null);

  // Deep link support (#history/hist_04) — handle each distinct deep link once so returning to timeline never re-opens it
  useEffect(() => {
    if (!deepChapterId) {
      handledDeepRef.current = null;
      return;
    }
    if (handledDeepRef.current === deepChapterId) return;
    const ch = historyChapters.find((c) => c.id === deepChapterId);
    if (ch && ch.playable) {
      handledDeepRef.current = deepChapterId;
      if (save.activeHistoryChapterId !== ch.id) {
        game.openHistoryChapter(ch.id);
      }
    }
  }, [deepChapterId, game, save.activeHistoryChapterId]);

  const activeChapter =
    historyChapters.find(
      (c) => c.id === save.activeHistoryChapterId && c.playable,
    ) ?? null;
  const activeProg = activeChapter
    ? save.historyProgress[activeChapter.id]
    : undefined;
  const session: HistorySessionState | null = activeChapter
    ? (activeProg?.session ?? createHistorySession("simple"))
    : null;

  function patchSession(
    updater: (cur: HistorySessionState) => HistorySessionState,
  ) {
    if (!activeChapter || !session) return;
    const next = updater(session);
    game.saveHistorySession(activeChapter.id, next);
  }

  function openChapter(
    ch: HistoryChapterDef,
    opts?: { forceRestart?: boolean; difficulty?: "simple" | "advanced" },
  ) {
    if (!ch.playable) {
      toast(`${ch.title}：${ch.teasedNote ?? "后续版本预告章节"}`);
      return;
    }
    setConfirmRestart(false);
    setSelectedCard(null);
    setLastRatingBreakdown([]);
    game.openHistoryChapter(ch.id, opts);
    if (location.hash !== `#history/${ch.id}`) {
      history.replaceState(null, "", `#history/${ch.id}`);
    }
  }

  function returnToTimeline() {
    setConfirmRestart(false);
    // Session remains persisted in save.historyProgress[id].session!
    game.closeHistoryChapter();
    if (location.hash !== "#history") {
      location.hash = "history";
    }
  }

  const playableChapters = historyChapters.filter((c) => c.playable);
  const playableDone = playableChapters.filter(
    (c) => save.historyProgress[c.id]?.completed,
  ).length;

  // Focus resumable chapter by default on timeline
  const resumableChapter =
    playableChapters.find(
      (c) =>
        save.historyProgress[c.id]?.session &&
        save.historyProgress[c.id]?.session?.stage !== "discovery",
    ) ??
    playableChapters.find((c) => !save.historyProgress[c.id]?.completed) ??
    playableChapters[0];

  // Unlocked figures & archives strictly from COMPLETED chapters (zero spoilers!)
  const completedChapters = playableChapters.filter(
    (c) => save.historyProgress[c.id]?.completed,
  );
  const unlockedFigureIds = [
    ...new Set(completedChapters.flatMap((c) => c.figureIds)),
  ];

  /* ==================== VIEW 1: TIMELINE & ARCHIVES ==================== */
  if (!activeChapter || !activeChapter.stages || !session) {
    const resProg = save.historyProgress[resumableChapter.id];
    const hasOngoingSession =
      Boolean(resProg?.session) && resProg?.session?.stage !== "discovery";

    return (
      <div className="page-width standard-page history-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">CHALLENGE HISTORY · SCIENTIFIC ARCHIVES</p>
            <h1>挑战历史：化学史时间线</h1>
            <p>
              进入不同历史时期的实验现场，在当时知识与仪器限制下完成推理与发现。10
              章科学史时间线中，第 01 / 02 / 03 / 04 / 07
              章已完整可玩，支持随时离开与刷新续玩、简单/进阶双难度。
            </p>
          </div>
          <div className="mgmt-quick-stats">
            <div className="stat-chip copper">
              <ScrollText size={15} />
              <strong>{playableDone} / 5</strong>
              <span>可玩章节通关</span>
            </div>
            <div className="stat-chip gold">
              <Star size={15} />
              <strong>
                {playableChapters.reduce(
                  (s, c) => s + (save.historyProgress[c.id]?.bestStars ?? 0),
                  0,
                )}{" "}
                / 15
              </strong>
              <span>历史星级</span>
            </div>
          </div>
        </div>

        {/* Focused Resumable Chapter Spotlight */}
        <section
          className="panel history-focus-banner"
          aria-label="继续历史研究"
        >
          <div className="focus-copy">
            <span className="era-year-pill">
              {hasOngoingSession ? "可继续研究" : "推荐开启章节"} · CH.
              {String(resumableChapter.number).padStart(2, "0")} ·{" "}
              {resumableChapter.eraYear}
            </span>
            <h2>{resumableChapter.title}</h2>
            <p className="muted">{resumableChapter.subtitle}</p>
            <div className="focus-meta-row">
              <span className="tag-pill">
                {resumableChapter.knowledgeTheme}
              </span>
              {hasOngoingSession && resProg?.session && (
                <span className="tag-pill free">
                  进度已保存：{stageNames[resProg.session.stage]}（
                  {resProg.session.difficulty === "advanced" ? "进阶" : "简单"}
                  ）
                </span>
              )}
            </div>
            <div className="stage-actions">
              <button
                className="primary"
                onClick={() => openChapter(resumableChapter)}
              >
                {hasOngoingSession ? "继续当前研究" : "进入历史现场"}
                <ChevronRight size={16} />
              </button>
              <button
                className="secondary"
                onClick={() =>
                  setViewTab(viewTab === "timeline" ? "archives" : "timeline")
                }
              >
                {viewTab === "timeline"
                  ? `查看已解锁档案（${unlockedFigureIds.length} 位科学家）`
                  : "返回 10 章时间线"}
              </button>
            </div>
          </div>
          <HistoryChapterScene chapterId={resumableChapter.id} />
        </section>

        <div className="filter-pills" role="tablist" aria-label="挑战历史视图">
          <button
            role="tab"
            aria-selected={viewTab === "timeline"}
            className={viewTab === "timeline" ? "active" : ""}
            onClick={() => setViewTab("timeline")}
          >
            10 章时间线（5 章可玩 / 5 章预告）
          </button>
          <button
            role="tab"
            aria-selected={viewTab === "archives"}
            className={viewTab === "archives" ? "active" : ""}
            onClick={() => setViewTab("archives")}
          >
            科学家档案与历史手稿（已解锁 {completedChapters.length}/5）
          </button>
        </div>

        {viewTab === "timeline" ? (
          <div className="history-timeline">
            {historyChapters.map((ch) => {
              const prog = save.historyProgress[ch.id];
              const ongoing =
                Boolean(prog?.session) && prog?.session?.stage !== "discovery";
              const simpleStars =
                prog?.difficultyRecords?.simple?.bestStars ?? 0;
              const advStars =
                prog?.difficultyRecords?.advanced?.bestStars ?? 0;
              return (
                <article
                  key={ch.id}
                  className={`panel history-card ${ch.playable ? "playable" : "teased"} ${prog?.completed ? "completed" : ""} ${ongoing ? "ongoing" : ""}`}
                >
                  <div className="history-card-top">
                    <span className="era-year-pill">
                      CH.{String(ch.number).padStart(2, "0")} · {ch.eraYear}
                    </span>
                    <span className="tag-pill">
                      {!ch.playable
                        ? "后续预告"
                        : ongoing
                          ? `进行中：${stageNames[prog!.session!.stage]}`
                          : prog?.completed
                            ? "已通关"
                            : "可玩章节"}
                    </span>
                  </div>
                  <h2>{ch.title}</h2>
                  <p className="muted">{ch.subtitle}</p>
                  <p className="history-theme-line">{ch.knowledgeTheme}</p>
                  {prog?.completed && ch.figureIds.length > 0 ? (
                    <p className="history-figures-inline">
                      <Users size={13} />{" "}
                      {ch.figureIds
                        .map((fid) => figureById[fid]?.name ?? fid)
                        .join(" · ")}
                    </p>
                  ) : ch.playable ? (
                    <p className="history-figures-inline muted">
                      <BookOpen size={13} /> 完成探索后揭晓历史人物与手稿档案
                    </p>
                  ) : (
                    <p className="history-figures-inline">
                      <Users size={13} />{" "}
                      {ch.figureIds
                        .map((fid) => figureById[fid]?.name ?? fid)
                        .join(" · ")}
                    </p>
                  )}

                  {ch.playable ? (
                    <div className="history-card-foot">
                      <div className="history-star-meta">
                        <span
                          className="stars"
                          aria-label={`最佳 ${prog?.bestStars ?? 0} 星`}
                        >
                          {[1, 2, 3].map((n) => (
                            <Star
                              key={n}
                              size={14}
                              fill={
                                (prog?.bestStars ?? 0) >= n
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          ))}
                        </span>
                        <small className="muted">
                          简 {simpleStars}★ · 进 {advStars}★
                        </small>
                      </div>
                      <button
                        className="primary small"
                        onClick={() => openChapter(ch)}
                      >
                        {ongoing
                          ? "继续研究"
                          : prog?.completed
                            ? "再次研习"
                            : "进入历史现场"}
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="history-teased-foot">
                      <Lock size={14} />
                      <span>{ch.teasedNote}</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <section className="history-archives-view">
            {completedChapters.length === 0 ? (
              <div className="panel empty-box">
                <p>
                  尚未解锁历史人物档案与手稿。通关任意可玩历史章节后，对应科学家档案、历史手稿、科学理论条目与博物馆藏品将在此永久陈列（不提前剧透结论）。
                </p>
                <button
                  className="primary"
                  onClick={() => openChapter(resumableChapter)}
                >
                  开始第 {resumableChapter.number} 章研究
                </button>
              </div>
            ) : (
              <>
                <div className="section-heading">
                  <h2>
                    已解锁手稿、勋章与理论条目 <span>MANUSCRIPTS & MEDALS</span>
                  </h2>
                  <div className="stage-actions">
                    <button
                      className="secondary small"
                      onClick={() => go("museum")}
                    >
                      <Landmark size={14} /> 前往科学博物馆
                    </button>
                    <button
                      className="secondary small"
                      onClick={() => go("tech")}
                    >
                      <Cpu size={14} /> 使用研究点 (RP)
                    </button>
                  </div>
                </div>
                <div className="archive-rewards-grid">
                  {completedChapters.map((ch) => {
                    const ar = ch.archiveRewards;
                    const prog = save.historyProgress[ch.id];
                    const mus = ch.museumUnlockId
                      ? museumById[ch.museumUnlockId]
                      : null;
                    return (
                      <article key={ch.id} className="panel archive-card">
                        <span className="era-year-pill">
                          CH.{String(ch.number).padStart(2, "0")} · {ch.eraYear}
                        </span>
                        <h3>{ar?.manuscriptTitle ?? ch.title}</h3>
                        <p className="muted">{ar?.manuscriptSummary}</p>
                        {ar && (
                          <div className="archive-kv-list">
                            <div>
                              <strong>理论条目：</strong>
                              <span>{ar.theoryTitle}</span>
                            </div>
                            <div>
                              <strong>历史勋章：</strong>
                              <span>{ar.medalName}</span>
                            </div>
                            <div>
                              <strong>纪念仪器：</strong>
                              <span>{ar.commemorativeInstrument}</span>
                            </div>
                          </div>
                        )}
                        {mus && (
                          <div className="archive-link-row">
                            <span className="done-badge">
                              <CheckCircle2 size={13} /> 已点亮馆藏：{mus.name}
                            </span>
                            {prog?.firstCompletedAt && (
                              <small className="muted">
                                {new Date(
                                  prog.firstCompletedAt,
                                ).toLocaleDateString()}
                              </small>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                <div className="section-heading" style={{ marginTop: 24 }}>
                  <h2>
                    已解锁科学家档案 <span>SCIENTIST PROFILES</span>
                  </h2>
                </div>
                <div className="figures-grid">
                  {unlockedFigureIds.map((fid) => {
                    const fig = figureById[fid];
                    if (!fig) return null;
                    return (
                      <article key={fig.id} className="panel figure-card rich">
                        <div className="figure-card-head">
                          <ScientistMedallion figure={fig} />
                          <div>
                            <h4>{fig.name}</h4>
                            <small className="muted">
                              {fig.nameEn} · {fig.lifespan}
                            </small>
                            <small className="muted">{fig.nationality}</small>
                          </div>
                        </div>
                        <p>{fig.summary}</p>
                        <small className="collab-note">
                          {fig.collaborationNote}
                        </small>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    );
  }

  /* ==================== VIEW 2: PERSISTENT 5-STAGE WORKSPACE ==================== */
  const st = activeChapter.stages;
  const exp = st.experiment;
  const pz = session.puzzle;
  const maxRepeats =
    activeChapter.maxRepeatRewardClaims ?? DEFAULT_MAX_HISTORY_REPEAT_REWARDS;
  const repeatClaimed = activeProg?.repeatRewardsClaimed ?? 0;

  const voltaicLive =
    exp.puzzleType === "voltaic_pile_assembly"
      ? evaluateVoltaicPile(
          activeChapter,
          (pz.voltaicStack ?? []) as VoltaicDisc[],
          session.difficulty,
          pz.voltaicPair ?? "zn_cu",
        )
      : null;

  function handleSwitchDifficulty(nextDiff: "simple" | "advanced") {
    patchSession((cur) => switchHistorySessionDifficulty(cur, nextDiff));
  }

  function runExperimentCheck() {
    if (!activeChapter || !session) return;
    const nextAttempts = session.experimentAttempts + 1;

    if (exp.puzzleType === "gas_identification") {
      const yieldVal =
        (pz.gasYieldAnswer ?? "").trim() === ""
          ? null
          : Number(pz.gasYieldAnswer);
      const res = evaluateGasIdentification(
        activeChapter,
        Object.keys(pz.gasTests ?? {}),
        pz.gasGuesses ?? {},
        session.difficulty,
        { advancedYieldAnswer: yieldVal, rules: reactions, db: byId },
      );
      patchSession((cur) => ({
        ...cur,
        experimentAttempts: nextAttempts,
        feedback: res.message,
        stageCompleted: {
          ...cur.stageCompleted,
          experiment: cur.stageCompleted.experiment || res.passed,
        },
        evidenceCollected: res.passed
          ? [...new Set([...cur.evidenceCollected, ...res.evidence])]
          : cur.evidenceCollected,
      }));
      return;
    }

    if (exp.puzzleType === "mass_conservation_compare") {
      const numVal =
        (pz.massNumeric ?? "").trim() === "" ? null : Number(pz.massNumeric);
      const res = evaluateMassComparison(
        activeChapter,
        pz.massMeasured ?? [],
        pz.massOpt ?? null,
        numVal,
        session.difficulty,
        pz.massUnit ?? "g",
      );
      patchSession((cur) => ({
        ...cur,
        experimentAttempts: nextAttempts,
        feedback: res.message,
        stageCompleted: {
          ...cur.stageCompleted,
          experiment: cur.stageCompleted.experiment || res.passed,
        },
        evidenceCollected: res.passed
          ? [...new Set([...cur.evidenceCollected, ...res.evidence])]
          : cur.evidenceCollected,
      }));
      return;
    }

    if (exp.puzzleType === "water_composition_balance") {
      const coeffs = pz.waterCoeffs ?? { h2: 1, o2: 1, h2o: 1 };
      const res = evaluateWaterComposition(
        activeChapter,
        pz.waterRatio ?? null,
        [coeffs.h2, coeffs.o2],
        [coeffs.h2o],
        session.difficulty,
        reactions,
        byId,
        {
          synthObserved: Boolean(pz.waterSynthDone),
          elecObserved: Boolean(pz.waterElecDone),
          subscriptChoiceIdx: pz.waterSubscriptChoice ?? null,
        },
      );
      patchSession((cur) => ({
        ...cur,
        experimentAttempts: nextAttempts,
        feedback: res.message,
        stageCompleted: {
          ...cur.stageCompleted,
          experiment: cur.stageCompleted.experiment || res.passed,
        },
        evidenceCollected: res.passed
          ? [...new Set([...cur.evidenceCollected, ...res.evidence])]
          : cur.evidenceCollected,
      }));
      return;
    }

    if (exp.puzzleType === "voltaic_pile_assembly") {
      const res = evaluateVoltaicPile(
        activeChapter,
        (pz.voltaicStack ?? []) as VoltaicDisc[],
        session.difficulty,
        pz.voltaicPair ?? "zn_cu",
      );
      patchSession((cur) => ({
        ...cur,
        experimentAttempts: nextAttempts,
        feedback: res.message,
        stageCompleted: {
          ...cur.stageCompleted,
          experiment: cur.stageCompleted.experiment || res.passed,
        },
        evidenceCollected: res.passed
          ? [...new Set([...cur.evidenceCollected, ...res.evidence])]
          : cur.evidenceCollected,
      }));
      return;
    }

    if (exp.puzzleType === "periodic_table_prediction") {
      const wVal =
        (pz.periodicWeightGuess ?? "").trim() === ""
          ? null
          : Number(pz.periodicWeightGuess);
      const res = evaluatePeriodicPrediction(
        activeChapter,
        pz.periodicSlots ?? {},
        pz.periodicGapChoice ?? null,
        wVal,
        session.difficulty,
        {
          gapMarked: Boolean(pz.periodicGapMarked),
          oxideChoiceIdx: pz.periodicOxideChoice ?? null,
        },
      );
      patchSession((cur) => ({
        ...cur,
        experimentAttempts: nextAttempts,
        feedback: res.message,
        stageCompleted: {
          ...cur.stageCompleted,
          experiment: cur.stageCompleted.experiment || res.passed,
        },
        evidenceCollected: res.passed
          ? [...new Set([...cur.evidenceCollected, ...res.evidence])]
          : cur.evidenceCollected,
      }));
    }
  }

  function handleFinishAnalysis() {
    if (!activeChapter || !session || !session.stageCompleted.analysis) return;
    const rating = evaluateHistoryRating({
      evidenceCompleteness: 1,
      experimentAttempts: Math.max(1, session.experimentAttempts),
      hypothesisWrongCount: session.hypothesisWrongCount,
      analysisWrongCount: session.analysisWrongCount,
      hintsShown: session.hintsShown,
      difficulty: session.difficulty,
    });
    setLastRatingBreakdown(rating.breakdown);
    const res = game.completeHistoryChapter(
      activeChapter.id,
      rating.stars,
      session.difficulty,
      Math.max(1, session.experimentAttempts),
      session.hintsShown,
      session.evidenceCollected,
      {
        evidenceCompleteness: rating.evidenceCompleteness,
        conclusionAccuracy: rating.conclusionAccuracy,
      },
    );
    toast(res.message);
  }

  function moveVoltaicDisc(index: number, delta: -1 | 1) {
    patchSession((cur) => {
      const arr = [...(cur.puzzle.voltaicStack ?? [])];
      const nextIdx = index + delta;
      if (nextIdx < 0 || nextIdx >= arr.length) return cur;
      const tmp = arr[index];
      arr[index] = arr[nextIdx];
      arr[nextIdx] = tmp;
      return {
        ...cur,
        puzzle: { ...cur.puzzle, voltaicStack: arr },
      };
    });
  }

  function removeVoltaicDisc(index: number) {
    patchSession((cur) => {
      const arr = [...(cur.puzzle.voltaicStack ?? [])];
      arr.splice(index, 1);
      return {
        ...cur,
        puzzle: { ...cur.puzzle, voltaicStack: arr },
      };
    });
  }

  return (
    <div className="page-width standard-page history-page">
      <div className="history-workspace-bar">
        <div className="stage-actions">
          <button className="secondary small" onClick={returnToTimeline}>
            <ChevronLeft size={15} />
            返回时间线（保留当前进度）
          </button>
          {confirmRestart ? (
            <>
              <button
                className="danger small"
                onClick={() => {
                  openChapter(activeChapter, {
                    forceRestart: true,
                    difficulty: session.difficulty,
                  });
                  toast(
                    "已重新开始本章研究会话（历史最佳星级与奖励账本保留）。",
                  );
                }}
              >
                确认重开本章
              </button>
              <button
                className="secondary small"
                onClick={() => setConfirmRestart(false)}
              >
                取消
              </button>
            </>
          ) : (
            <button
              className="secondary small"
              onClick={() => setConfirmRestart(true)}
            >
              <RotateCcw size={14} /> 重新开始本章
            </button>
          )}
        </div>

        <div
          className="difficulty-toggle"
          role="group"
          aria-label="历史章节难度"
        >
          <button
            className={session.difficulty === "simple" ? "active" : ""}
            onClick={() => handleSwitchDifficulty("simple")}
          >
            简单模式
          </button>
          <button
            className={session.difficulty === "advanced" ? "active" : ""}
            onClick={() => handleSwitchDifficulty("advanced")}
          >
            进阶定量模式
          </button>
        </div>
      </div>

      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {activeChapter.en} · {activeChapter.eraYear} · 待审校（pending）
          </p>
          <h1>{activeChapter.title}</h1>
          <p>{activeChapter.subtitle}</p>
        </div>
        <div className="chapter-materials-strip">
          <span className="muted">本章独立实验材料（与经营库存隔离）：</span>
          <div className="yield-chips">
            {exp.chapterMaterials.map((id) =>
              byId[id] ? (
                <span key={id} className="yield-chip">
                  <SubstanceIcon s={byId[id]} size={18} />
                  {byId[id].name}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>

      <HistoryChapterScene chapterId={activeChapter.id} />

      <div className="fact-notice">
        <BookOpen size={15} />
        <span>
          {session.stage === "discovery"
            ? activeChapter.factDistinctionNote
            : "科学史教学声明（pending 待审校）：实验环节为教学模拟与独立推理过程，最终历史人物贡献与现代对照将于第 5 阶段「历史揭晓」完整呈现。"}
        </span>
      </div>

      {/* Pure-Engine Gated 5-Stage Progress Stepper */}
      <nav className="history-stepper" aria-label="历史章节五阶段进度">
        {HISTORY_STAGE_ORDER.map((sid) => {
          const allowed = canAccessHistoryStage(session, sid);
          const done =
            sid === "discovery"
              ? Boolean(activeProg?.completed && session.stage === "discovery")
              : session.stageCompleted[sid];
          return (
            <button
              key={sid}
              disabled={!allowed}
              className={`step-pill ${session.stage === sid ? "active" : ""} ${done ? "done" : ""}`}
              onClick={() => {
                if (allowed) {
                  patchSession((cur) => ({ ...cur, stage: sid }));
                }
              }}
            >
              {stageNames[sid]}
            </button>
          );
        })}
      </nav>

      {/* ==================== STAGE 1: BACKGROUND (Spoiler-Free) ==================== */}
      {session.stage === "background" && (
        <section className="panel history-stage-panel">
          <div className="research-question-box">
            <span className="eyebrow">RESEARCH QUESTION · 核心研究问题</span>
            <h2>{st.background.researchQuestion}</h2>
          </div>
          <p>{st.background.contextSummary}</p>
          <div className="history-facts-box">
            <h3>时代背景线索（最终人物归属与结论将在完成实验后揭晓）</h3>
            <ul>
              {st.background.historicalFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
          {st.background.teachingDialogue.map((d, i) => (
            <blockquote key={i} className="teaching-dialogue">
              <strong>{d.speaker}</strong>
              <p>「{d.line}」</p>
            </blockquote>
          ))}
          <div className="stage-actions">
            <button
              className="primary"
              onClick={() =>
                patchSession((cur) => ({
                  ...cur,
                  stage: "hypothesis",
                  stageCompleted: { ...cur.stageCompleted, background: true },
                  feedback: "",
                }))
              }
            >
              进入阶段 2：提出科学假设
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* ==================== STAGE 2: HYPOTHESIS ==================== */}
      {session.stage === "hypothesis" && (
        <section className="panel history-stage-panel">
          <h2>提出你的科学假设</h2>
          <p className="stage-question">{st.hypothesis.question}</p>
          <div className="choice-list">
            {st.hypothesis.options.map((opt) => (
              <button
                key={opt.id}
                className={`choice-card ${session.hypothesisChoiceId === opt.id ? "selected" : ""}`}
                onClick={() =>
                  patchSession((cur) => ({
                    ...cur,
                    hypothesisChoiceId: opt.id,
                    hypothesisWrongCount: opt.isRecommended
                      ? cur.hypothesisWrongCount
                      : cur.hypothesisWrongCount + 1,
                    feedback: opt.feedback,
                    stageCompleted: {
                      ...cur.stageCompleted,
                      hypothesis:
                        cur.stageCompleted.hypothesis || opt.isRecommended,
                    },
                  }))
                }
              >
                <span>{opt.text}</span>
              </button>
            ))}
          </div>
          {session.feedback && (
            <p className="stage-feedback">{session.feedback}</p>
          )}
          <div className="stage-actions">
            <button
              className="primary"
              disabled={!session.stageCompleted.hypothesis}
              onClick={() =>
                patchSession((cur) => ({
                  ...cur,
                  stage: "experiment",
                  feedback: "",
                }))
              }
            >
              进入阶段 3：重现经典实验
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* ==================== STAGE 3: 5 DISTINCT INTERACTIVE DESKS ==================== */}
      {session.stage === "experiment" && (
        <section className="panel history-stage-panel">
          <div className="exp-header-row">
            <div>
              <h2>
                证据实验台 · {activeChapter.title}（
                {session.difficulty === "advanced"
                  ? "进阶定量要求"
                  : "简单模式"}
                ）
              </h2>
              <p className="muted">
                {session.difficulty === "advanced"
                  ? exp.objectiveAdvanced
                  : exp.objectiveSimple}
              </p>
            </div>
            <div className="stage-actions">
              <span className="tag-pill">
                尝试 {session.experimentAttempts} 次
              </span>
              <button
                className="secondary small"
                disabled={session.hintsShown >= exp.hints.length}
                onClick={() =>
                  patchSession((cur) => ({
                    ...cur,
                    hintsShown: Math.min(exp.hints.length, cur.hintsShown + 1),
                  }))
                }
              >
                <HelpCircle size={14} />
                实验提示（{session.hintsShown}/{exp.hints.length}）
              </button>
            </div>
          </div>

          {session.hintsShown > 0 && (
            <div className="history-hints-box">
              {exp.hints.slice(0, session.hintsShown).map((h, i) => (
                <p key={i}>{h}</p>
              ))}
            </div>
          )}

          {/* ---------- PUZZLE 1: CH.01 GAS IDENTIFICATION ---------- */}
          {exp.puzzleType === "gas_identification" && exp.gasSamples && (
            <div className="puzzle-block">
              {exp.gasScopeNote && (
                <p className="scope-note">{exp.gasScopeNote}</p>
              )}
              <div className="puzzle-gas-grid">
                {exp.gasSamples.map((sample) => (
                  <div key={sample.id} className="gas-flask-card">
                    <h3>{sample.label}</h3>
                    <div className="gas-test-btns">
                      {(
                        [
                          ["glowingSplint", "伸入带火星木条"],
                          ["burningSplint", "伸入燃着木条"],
                          ["limewater", "通入澄清石灰水"],
                        ] as const
                      ).map(([testKey, label]) => {
                        const k = `${sample.id}:${testKey}`;
                        const obs = pz.gasTests?.[k];
                        return (
                          <div key={testKey} className="gas-test-row">
                            <button
                              className={`secondary small ${obs ? "tested" : ""}`}
                              onClick={() =>
                                patchSession((cur) => ({
                                  ...cur,
                                  puzzle: {
                                    ...cur.puzzle,
                                    gasTests: {
                                      ...(cur.puzzle.gasTests ?? {}),
                                      [k]: sample.tests[testKey],
                                    },
                                  },
                                }))
                              }
                            >
                              {obs ? `✓ ${label}` : label}
                            </button>
                            {obs && <small className="obs-text">{obs}</small>}
                          </div>
                        );
                      })}
                    </div>
                    <label className="guess-select">
                      <span>限定候选池指认：</span>
                      <select
                        aria-label={`${sample.label}气体指认`}
                        value={pz.gasGuesses?.[sample.id] ?? ""}
                        onChange={(e) =>
                          patchSession((cur) => ({
                            ...cur,
                            puzzle: {
                              ...cur.puzzle,
                              gasGuesses: {
                                ...(cur.puzzle.gasGuesses ?? {}),
                                [sample.id]: e.target.value,
                              },
                            },
                          }))
                        }
                      >
                        <option value="">-- 收集充分证据后选择 --</option>
                        <option value="oxygen">助燃气体（氧气 O₂）</option>
                        <option value="carbon_dioxide">
                          使石灰水浑浊气体（二氧化碳 CO₂）
                        </option>
                        <option value="nitrogen">
                          空气主要惰性组分（氮气 N₂）
                        </option>
                      </select>
                    </label>
                  </div>
                ))}
              </div>

              {session.difficulty === "advanced" && exp.advancedYieldCheck && (
                <div className="advanced-addon-box">
                  <h4>进阶定量核算（复用共享计量引擎 r026）</h4>
                  <label className="numeric-check-row">
                    <span>{exp.advancedYieldCheck.prompt}</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      aria-label="过氧化氢分解氧气份数"
                      placeholder="输入整数份数"
                      value={pz.gasYieldAnswer ?? ""}
                      onChange={(e) =>
                        patchSession((cur) => ({
                          ...cur,
                          puzzle: {
                            ...cur.puzzle,
                            gasYieldAnswer: e.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ---------- PUZZLE 2: CH.02 OPEN VS CLOSED MASS CONSERVATION ---------- */}
          {exp.puzzleType === "mass_conservation_compare" &&
            exp.massTrials &&
            exp.massQuestion && (
              <div className="puzzle-mass-box">
                <div className="sim-data-banner">
                  <Scale size={15} />
                  <strong>
                    教学模拟数据声明：以下天平称量数值均为教学模拟数据，用于演示系统边界与守恒规律，并非拉瓦锡实验室原始手稿读数。
                  </strong>
                </div>

                <div
                  className="system-switcher"
                  role="group"
                  aria-label="选择实验系统"
                >
                  <button
                    className={
                      (pz.massSystemView ?? "open") === "open" ? "active" : ""
                    }
                    onClick={() =>
                      patchSession((cur) => ({
                        ...cur,
                        puzzle: { ...cur.puzzle, massSystemView: "open" },
                      }))
                    }
                  >
                    开放系统（2 组对照）
                  </button>
                  <button
                    className={
                      (pz.massSystemView ?? "open") === "closed" ? "active" : ""
                    }
                    onClick={() =>
                      patchSession((cur) => ({
                        ...cur,
                        puzzle: { ...cur.puzzle, massSystemView: "closed" },
                      }))
                    }
                  >
                    密闭系统（1 组对照）
                  </button>
                  <span className="tag-pill">
                    已完成称量：{(pz.massMeasured ?? []).length}/
                    {exp.massTrials.length}
                  </span>
                </div>

                <div className="mass-trials-grid">
                  {exp.massTrials
                    .filter((tr) => tr.vessel === (pz.massSystemView ?? "open"))
                    .map((tr) => {
                      const done = (pz.massMeasured ?? []).includes(tr.id);
                      return (
                        <div key={tr.id} className="mass-trial-card">
                          <span className="tag-pill">
                            {tr.vessel === "closed"
                              ? "密闭系统 · 教学模拟数据"
                              : "开放系统 · 教学模拟数据"}
                          </span>
                          <h3>{tr.title}</h3>
                          <p className="muted">{tr.description}</p>
                          {done ? (
                            <div className="balance-readout">
                              <div>
                                <span>反应前示数</span>
                                <strong>{tr.beforeMassG.toFixed(1)} g</strong>
                              </div>
                              <div>
                                <span>反应后示数</span>
                                <strong>{tr.afterMassG.toFixed(1)} g</strong>
                              </div>
                              <p className="obs-text">{tr.escapedGasNote}</p>
                            </div>
                          ) : (
                            <button
                              className="primary small"
                              onClick={() =>
                                patchSession((cur) => ({
                                  ...cur,
                                  puzzle: {
                                    ...cur.puzzle,
                                    massMeasured: [
                                      ...new Set([
                                        ...(cur.puzzle.massMeasured ?? []),
                                        tr.id,
                                      ]),
                                    ],
                                  },
                                }))
                              }
                            >
                              放置精密天平并执行称量
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>

                <div className="mass-question-box">
                  <h4>{exp.massQuestion.prompt}</h4>
                  <div className="choice-list">
                    {exp.massQuestion.options.map((opt, idx) => (
                      <button
                        key={opt}
                        className={`choice-card ${pz.massOpt === idx ? "selected" : ""}`}
                        onClick={() =>
                          patchSession((cur) => ({
                            ...cur,
                            puzzle: { ...cur.puzzle, massOpt: idx },
                          }))
                        }
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {session.difficulty === "advanced" &&
                    exp.massQuestion.advancedNumericCheck && (
                      <div className="advanced-addon-box">
                        <label className="numeric-check-row">
                          <span>
                            {exp.massQuestion.advancedNumericCheck.prompt}
                          </span>
                          <div className="unit-input-group">
                            <input
                              type="number"
                              step="any"
                              aria-label="逸散二氧化碳质量"
                              placeholder="输入数值"
                              value={pz.massNumeric ?? ""}
                              onChange={(e) =>
                                patchSession((cur) => ({
                                  ...cur,
                                  puzzle: {
                                    ...cur.puzzle,
                                    massNumeric: e.target.value,
                                  },
                                }))
                              }
                            />
                            <select
                              aria-label="质量单位"
                              value={pz.massUnit ?? "g"}
                              onChange={(e) =>
                                patchSession((cur) => ({
                                  ...cur,
                                  puzzle: {
                                    ...cur.puzzle,
                                    massUnit: e.target.value as
                                      "g" | "kg" | "mg",
                                  },
                                }))
                              }
                            >
                              <option value="g">g（克）</option>
                              <option value="kg">kg（千克）</option>
                              <option value="mg">mg（毫克）</option>
                            </select>
                          </div>
                        </label>
                      </div>
                    )}
                </div>
              </div>
            )}

          {/* ---------- PUZZLE 3: CH.03 WATER COMPOSITION & REAL BALANCING ---------- */}
          {exp.puzzleType === "water_composition_balance" &&
            exp.waterVolumeRatioOptions && (
              <div className="puzzle-water-box">
                {exp.waterHistoryVsDemoNote && (
                  <p className="scope-note">{exp.waterHistoryVsDemoNote}</p>
                )}

                <h4>步骤 A：调用共享化学引擎采集合成与现代分解证据</h4>
                <div className="water-engine-grid">
                  <div className="gas-flask-card">
                    <span className="tag-pill">1780s 历史合成模拟（r006）</span>
                    <h3>氢气 + 氧气 → 点燃合成</h3>
                    <button
                      className={
                        pz.waterSynthDone ? "secondary small" : "primary small"
                      }
                      onClick={() => {
                        const out = runHistoryWaterSharedReaction(
                          "synthesis",
                          reactions,
                        );
                        patchSession((cur) => ({
                          ...cur,
                          feedback:
                            out.status === "success"
                              ? `共享引擎实测：${out.reaction.name}（${out.reaction.equation}），玻璃壁凝结纯净液态水！`
                              : out.message,
                          puzzle: { ...cur.puzzle, waterSynthDone: true },
                        }));
                      }}
                    >
                      <FlaskConical size={14} />
                      {pz.waterSynthDone
                        ? "✓ 已完成氢氧点燃合成"
                        : "执行共享反应：氢氧点燃合成水"}
                    </button>
                    {pz.waterSynthDone && (
                      <small className="obs-text">
                        实测产物：纯净水（H₂O），反应方程式{" "}
                        <Formula value="2H2 + O2 → 2H2O" />
                      </small>
                    )}
                  </div>

                  <div className="gas-flask-card">
                    <span className="tag-pill">
                      现代教学对照（1800 后电解 r005）
                    </span>
                    <h3>纯水 → 通电分解</h3>
                    <button
                      className={
                        pz.waterElecDone ? "secondary small" : "primary small"
                      }
                      onClick={() => {
                        const out = runHistoryWaterSharedReaction(
                          "electrolysis",
                          reactions,
                        );
                        patchSession((cur) => ({
                          ...cur,
                          feedback:
                            out.status === "success"
                              ? `现代教学对照实测：${out.reaction.name}（${out.reaction.equation}），产出 2 份氢气与 1 份氧气。`
                              : out.message,
                          puzzle: { ...cur.puzzle, waterElecDone: true },
                        }));
                      }}
                    >
                      <FlaskConical size={14} />
                      {pz.waterElecDone
                        ? "✓ 已查看现代水电解对照"
                        : "运行现代教学对照：水电解"}
                    </button>
                    {pz.waterElecDone && (
                      <small className="obs-text">
                        现代对照产物：氢气 ×2 + 氧气 ×1（1800
                        年伏打电堆问世后实现）
                      </small>
                    )}
                  </div>
                </div>

                <h4>步骤 B：依据反应证据判断氢气与氧气的化合份数比</h4>
                <div className="choice-row">
                  {exp.waterVolumeRatioOptions.map((opt, idx) => (
                    <button
                      key={opt.label}
                      className={`choice-card ${pz.waterRatio === idx ? "selected" : ""}`}
                      onClick={() =>
                        patchSession((cur) => ({
                          ...cur,
                          puzzle: { ...cur.puzzle, waterRatio: idx },
                        }))
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <h4>
                  步骤 C：方程式系数配平（
                  {session.difficulty === "advanced"
                    ? "进阶必选 · 要求最简整数比"
                    : "可选练习 · 实时调用共享配平引擎"}
                  ）
                </h4>
                <div className="history-balance-row">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    aria-label="氢气系数"
                    value={pz.waterCoeffs?.h2 ?? 1}
                    onChange={(e) =>
                      patchSession((cur) => ({
                        ...cur,
                        puzzle: {
                          ...cur.puzzle,
                          waterCoeffs: {
                            ...(cur.puzzle.waterCoeffs ?? {
                              h2: 1,
                              o2: 1,
                              h2o: 1,
                            }),
                            h2: Math.max(1, Number(e.target.value) || 1),
                          },
                        },
                      }))
                    }
                  />
                  <span>H₂ +</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    aria-label="氧气系数"
                    value={pz.waterCoeffs?.o2 ?? 1}
                    onChange={(e) =>
                      patchSession((cur) => ({
                        ...cur,
                        puzzle: {
                          ...cur.puzzle,
                          waterCoeffs: {
                            ...(cur.puzzle.waterCoeffs ?? {
                              h2: 1,
                              o2: 1,
                              h2o: 1,
                            }),
                            o2: Math.max(1, Number(e.target.value) || 1),
                          },
                        },
                      }))
                    }
                  />
                  <span>O₂ →</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    aria-label="水系数"
                    value={pz.waterCoeffs?.h2o ?? 1}
                    onChange={(e) =>
                      patchSession((cur) => ({
                        ...cur,
                        puzzle: {
                          ...cur.puzzle,
                          waterCoeffs: {
                            ...(cur.puzzle.waterCoeffs ?? {
                              h2: 1,
                              o2: 1,
                              h2o: 1,
                            }),
                            h2o: Math.max(1, Number(e.target.value) || 1),
                          },
                        },
                      }))
                    }
                  />
                  <span>H₂O（下标锁定）</span>
                </div>

                {session.difficulty === "advanced" &&
                  exp.waterSubscriptQuestion && (
                    <div className="advanced-addon-box">
                      <h4>{exp.waterSubscriptQuestion.prompt}</h4>
                      <div className="choice-list">
                        {exp.waterSubscriptQuestion.options.map((opt, idx) => (
                          <button
                            key={opt.label}
                            className={`choice-card ${pz.waterSubscriptChoice === idx ? "selected" : ""}`}
                            onClick={() =>
                              patchSession((cur) => ({
                                ...cur,
                                puzzle: {
                                  ...cur.puzzle,
                                  waterSubscriptChoice: idx,
                                },
                              }))
                            }
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

          {/* ---------- PUZZLE 4: CH.04 VOLTAIC PILE INTERACTIVE STACK ---------- */}
          {exp.puzzleType === "voltaic_pile_assembly" && exp.voltaicLayers && (
            <div className="puzzle-voltaic-box">
              <div className="scope-note">
                <p style={{ margin: "0 0 4px" }}>
                  {exp.voltaicLayers.historicalMaterialNote}
                </p>
                <p style={{ margin: 0 }}>
                  {exp.voltaicLayers.modelSimplificationNote}
                </p>
              </div>

              <div
                className="system-switcher"
                role="group"
                aria-label="选择电堆金属组合"
              >
                {(
                  [
                    ["zn_cu", "锌 + 铜（教学标准）"],
                    ["zn_ag", "锌 + 银（1800 历史原型）"],
                    ["cu_cu", "铜 + 铜（同类金属对照）"],
                  ] as const
                ).map(([pairId, label]) => (
                  <button
                    key={pairId}
                    className={
                      (pz.voltaicPair ?? "zn_cu") === pairId ? "active" : ""
                    }
                    onClick={() =>
                      patchSession((cur) => ({
                        ...cur,
                        puzzle: {
                          ...cur.puzzle,
                          voltaicPair: pairId,
                          voltaicStack: [],
                        },
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="voltaic-controls">
                <button
                  className="secondary small"
                  onClick={() =>
                    patchSession((cur) => ({
                      ...cur,
                      puzzle: {
                        ...cur.puzzle,
                        voltaicStack: [
                          ...(cur.puzzle.voltaicStack ?? []),
                          (cur.puzzle.voltaicPair ?? "zn_cu") === "cu_cu"
                            ? "copper"
                            : "zinc",
                        ],
                      },
                    }))
                  }
                >
                  {(pz.voltaicPair ?? "zn_cu") === "cu_cu"
                    ? "+ 铜片 (Cu)"
                    : "+ 锌片 (Zn)"}
                </button>
                <button
                  className="secondary small"
                  onClick={() =>
                    patchSession((cur) => ({
                      ...cur,
                      puzzle: {
                        ...cur.puzzle,
                        voltaicStack: [
                          ...(cur.puzzle.voltaicStack ?? []),
                          "brine_cloth",
                        ],
                      },
                    }))
                  }
                >
                  + 盐水湿布/纸板（电解质）
                </button>
                <button
                  className="secondary small"
                  onClick={() =>
                    patchSession((cur) => ({
                      ...cur,
                      puzzle: {
                        ...cur.puzzle,
                        voltaicStack: [
                          ...(cur.puzzle.voltaicStack ?? []),
                          (cur.puzzle.voltaicPair ?? "zn_cu") === "zn_ag"
                            ? "silver"
                            : "copper",
                        ],
                      },
                    }))
                  }
                >
                  {(pz.voltaicPair ?? "zn_cu") === "zn_ag"
                    ? "+ 银片 (Ag)"
                    : "+ 铜片 (Cu)"}
                </button>
                <button
                  className="secondary small"
                  onClick={() =>
                    patchSession((cur) => ({
                      ...cur,
                      puzzle: {
                        ...cur.puzzle,
                        voltaicStack: [
                          ...(cur.puzzle.voltaicStack ?? []),
                          "dry_paper",
                        ],
                      },
                    }))
                  }
                >
                  + 干燥绝缘纸（对照测试）
                </button>
                <button
                  className="secondary small"
                  disabled={(pz.voltaicStack ?? []).length === 0}
                  onClick={() =>
                    patchSession((cur) => ({
                      ...cur,
                      puzzle: { ...cur.puzzle, voltaicStack: [] },
                    }))
                  }
                >
                  清空电堆
                </button>
              </div>

              <div className="voltaic-stage">
                <div className="voltaic-column" aria-label="伏打电堆叠层预览">
                  {(pz.voltaicStack ?? []).length === 0 ? (
                    <p className="muted">
                      底座为空：点击上方组件按顺序堆叠；每层支持触屏点击「↑ / ↓
                      / ×」重排与拆除。
                    </p>
                  ) : (
                    [...(pz.voltaicStack ?? [])]
                      .map((disc, origIdx) => ({ disc, origIdx }))
                      .reverse()
                      .map(({ disc, origIdx }) => (
                        <div key={origIdx} className="voltaic-disc-row">
                          <div className={`voltaic-disc ${disc}`}>
                            #{origIdx + 1}{" "}
                            {disc === "zinc"
                              ? "锌片 (Zn)"
                              : disc === "silver"
                                ? "银片 (Ag)"
                                : disc === "brine_cloth"
                                  ? "盐水湿隔层 (NaCl)"
                                  : disc === "dry_paper"
                                    ? "干燥绝缘纸（断路）"
                                    : "铜片 (Cu)"}
                          </div>
                          <div className="disc-mini-actions">
                            <button
                              className="icon-mini"
                              aria-label={`上移第 ${origIdx + 1} 层`}
                              disabled={
                                origIdx === (pz.voltaicStack?.length ?? 1) - 1
                              }
                              onClick={() => moveVoltaicDisc(origIdx, 1)}
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              className="icon-mini"
                              aria-label={`下移第 ${origIdx + 1} 层`}
                              disabled={origIdx === 0}
                              onClick={() => moveVoltaicDisc(origIdx, -1)}
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              className="icon-mini"
                              aria-label={`移除第 ${origIdx + 1} 层`}
                              onClick={() => removeVoltaicDisc(origIdx)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                <div className="voltaic-meter">
                  <span className="eyebrow">SIMPLIFIED TEACHING VOLTMETER</span>
                  <strong>{(voltaicLive?.voltageV ?? 0).toFixed(1)} V</strong>
                  <span>
                    有效正向单元：{voltaicLive?.validCells ?? 0} · 反向单元：
                    {voltaicLive?.reversedCells ?? 0}
                  </span>
                  <span>净串联单元：{voltaicLive?.netCells ?? 0} 组</span>
                  <small className="muted">
                    教学简化示意值（非 1800 年历史实测）
                  </small>
                </div>
              </div>
            </div>
          )}

          {/* ---------- PUZZLE 5: CH.07 1869 PERIODIC CARDS & GAP PREDICTION ---------- */}
          {exp.puzzleType === "periodic_table_prediction" &&
            exp.periodicCards &&
            exp.gapPrediction && (
              <div className="puzzle-periodic-box">
                <p className="scope-note">
                  1869
                  情境还原：当前卡片仅提供当时已知的相对原子质量近似值与氧化物通式（隐去现代原子序数与后世元素名称）。请先归位
                  4 张卡片，再亲自标记铝下方「未知空位」。
                </p>
                <h4>
                  步骤 A：点选 1869 元素卡片，再点击下方周期网格归位（触屏友好）
                </h4>
                <div className="periodic-tray">
                  {exp.periodicCards.map((card) => {
                    const placed = Object.values(
                      pz.periodicSlots ?? {},
                    ).includes(card.symbol);
                    return (
                      <button
                        key={card.symbol}
                        className={`periodic-card ${selectedCard === card.symbol ? "selected" : ""} ${placed ? "placed" : ""}`}
                        onClick={() => setSelectedCard(card.symbol)}
                      >
                        <strong>
                          {card.symbol} {card.name}
                        </strong>
                        <small>
                          相对原子质量 ≈ {card.atomicWeightTeaching}
                        </small>
                        <small>{card.oxideFormula}</small>
                        <small>密度 {card.densityTeaching}</small>
                      </button>
                    );
                  })}
                </div>

                <div className="periodic-grid-mini">
                  <div className="pg-head">周期 \ 族</div>
                  <div className="pg-head">
                    {session.difficulty === "advanced"
                      ? "族 A"
                      : "第 I 族 (R₂O)"}
                  </div>
                  <div className="pg-head">
                    {session.difficulty === "advanced"
                      ? "族 B"
                      : "第 III 族 (R₂O₃)"}
                  </div>
                  <div className="pg-head">
                    {session.difficulty === "advanced"
                      ? "族 C"
                      : "第 IV 族 (RO₂)"}
                  </div>

                  <div className="pg-row-label">第 2 周期（参考）</div>
                  <div className="pg-cell ref-cell">Li (≈7) · Li₂O</div>
                  <div className="pg-cell ref-cell">B (≈11) · B₂O₃</div>
                  <div className="pg-cell ref-cell">C (≈12) · CO₂</div>

                  <div className="pg-row-label">第 3 周期</div>
                  {[1, 3, 4].map((grp) => {
                    const key = `3-${grp}`;
                    const currentSym = pz.periodicSlots?.[key];
                    return (
                      <button
                        key={key}
                        className="pg-cell slot"
                        aria-label={`第3周期第${grp}族槽位`}
                        onClick={() => {
                          if (!selectedCard && currentSym) {
                            patchSession((cur) => {
                              const next = {
                                ...(cur.puzzle.periodicSlots ?? {}),
                              };
                              delete next[key];
                              return {
                                ...cur,
                                puzzle: { ...cur.puzzle, periodicSlots: next },
                              };
                            });
                            return;
                          }
                          if (!selectedCard) return;
                          patchSession((cur) => {
                            const next = {
                              ...(cur.puzzle.periodicSlots ?? {}),
                            };
                            for (const [k, v] of Object.entries(next)) {
                              if (v === selectedCard) delete next[k];
                            }
                            next[key] = selectedCard;
                            return {
                              ...cur,
                              puzzle: { ...cur.puzzle, periodicSlots: next },
                            };
                          });
                          setSelectedCard(null);
                        }}
                      >
                        {currentSym ? (
                          <strong>{currentSym}</strong>
                        ) : (
                          <span>点击放入卡片</span>
                        )}
                      </button>
                    );
                  })}

                  <div className="pg-row-label">第 4 周期</div>
                  <button
                    className="pg-cell slot"
                    aria-label="第4周期第1族槽位"
                    onClick={() => {
                      const currentSym = pz.periodicSlots?.["4-1"];
                      if (!selectedCard && currentSym) {
                        patchSession((cur) => {
                          const next = { ...(cur.puzzle.periodicSlots ?? {}) };
                          delete next["4-1"];
                          return {
                            ...cur,
                            puzzle: { ...cur.puzzle, periodicSlots: next },
                          };
                        });
                        return;
                      }
                      if (!selectedCard) return;
                      patchSession((cur) => {
                        const next = { ...(cur.puzzle.periodicSlots ?? {}) };
                        for (const [k, v] of Object.entries(next)) {
                          if (v === selectedCard) delete next[k];
                        }
                        next["4-1"] = selectedCard;
                        return {
                          ...cur,
                          puzzle: { ...cur.puzzle, periodicSlots: next },
                        };
                      });
                      setSelectedCard(null);
                    }}
                  >
                    {pz.periodicSlots?.["4-1"] ? (
                      <strong>{pz.periodicSlots["4-1"]}</strong>
                    ) : (
                      <span>点击放入卡片</span>
                    )}
                  </button>
                  <button
                    className={`pg-cell gap ${pz.periodicGapMarked ? "marked" : ""}`}
                    aria-label="标记铝下方未知空位"
                    onClick={() =>
                      patchSession((cur) => ({
                        ...cur,
                        puzzle: {
                          ...cur.puzzle,
                          periodicGapMarked: !cur.puzzle.periodicGapMarked,
                        },
                      }))
                    }
                  >
                    <strong>
                      {pz.periodicGapMarked
                        ? "✓ 已预留未知空位（类铝）"
                        : "? 点击标记预留未知空位"}
                    </strong>
                    <small>Zn(≈65) 右侧 · Al 下方</small>
                  </button>
                  <div className="pg-cell ref-cell">
                    第 4 周期重元素邻区（As ≈ 75）
                  </div>
                </div>

                <h4>步骤 B：{exp.gapPrediction.prompt}</h4>
                <div className="choice-list">
                  {exp.gapPrediction.options.map((opt, idx) => (
                    <button
                      key={opt.label}
                      className={`choice-card ${pz.periodicGapChoice === idx ? "selected" : ""}`}
                      onClick={() =>
                        patchSession((cur) => ({
                          ...cur,
                          puzzle: { ...cur.puzzle, periodicGapChoice: idx },
                        }))
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {session.difficulty === "advanced" && (
                  <div className="advanced-addon-box">
                    <h4>进阶定量预言（少表头线索 + 独立估算）</h4>
                    {exp.gapPrediction.advancedOxideOptions && (
                      <>
                        <p className="muted">选择「类铝」最高价氧化物通式：</p>
                        <div className="choice-row">
                          {exp.gapPrediction.advancedOxideOptions.map(
                            (ox, idx) => (
                              <button
                                key={ox.label}
                                className={`choice-card ${pz.periodicOxideChoice === idx ? "selected" : ""}`}
                                onClick={() =>
                                  patchSession((cur) => ({
                                    ...cur,
                                    puzzle: {
                                      ...cur.puzzle,
                                      periodicOxideChoice: idx,
                                    },
                                  }))
                                }
                              >
                                {ox.label}
                              </button>
                            ),
                          )}
                        </div>
                      </>
                    )}
                    <label className="numeric-check-row">
                      <span>
                        估算「类铝」相对原子质量（结合 Zn ≈ 65、As ≈ 75）：
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        aria-label="类铝原子量预言"
                        placeholder="例如 68"
                        value={pz.periodicWeightGuess ?? ""}
                        onChange={(e) =>
                          patchSession((cur) => ({
                            ...cur,
                            puzzle: {
                              ...cur.puzzle,
                              periodicWeightGuess: e.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

          {session.feedback && (
            <p className="stage-feedback">{session.feedback}</p>
          )}

          <div className="stage-actions">
            <button className="primary" onClick={runExperimentCheck}>
              提交实验检验
            </button>
            <button
              className="secondary"
              disabled={!session.stageCompleted.experiment}
              onClick={() =>
                patchSession((cur) => ({
                  ...cur,
                  stage: "analysis",
                  feedback: "",
                }))
              }
            >
              进入阶段 4：证据分析
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* ==================== STAGE 4: EVIDENCE ANALYSIS ==================== */}
      {session.stage === "analysis" && (
        <section className="panel history-stage-panel">
          <h2>证据分析与结论推理</h2>
          <div className="evidence-log-box">
            <h3>你亲手采集的实验证据记录</h3>
            <ul>
              {[...session.evidenceCollected, ...st.analysis.evidenceSummary]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((ev) => (
                  <li key={ev}>
                    <CheckCircle2 size={14} /> {ev}
                  </li>
                ))}
            </ul>
          </div>
          <p className="stage-question">{st.analysis.question}</p>
          <div className="choice-list">
            {st.analysis.options.map((opt) => (
              <button
                key={opt.id}
                className={`choice-card ${session.analysisChoiceId === opt.id ? "selected" : ""}`}
                onClick={() =>
                  patchSession((cur) => ({
                    ...cur,
                    analysisChoiceId: opt.id,
                    analysisWrongCount: opt.correct
                      ? cur.analysisWrongCount
                      : cur.analysisWrongCount + 1,
                    feedback: opt.explanation,
                    stageCompleted: {
                      ...cur.stageCompleted,
                      analysis: cur.stageCompleted.analysis || opt.correct,
                    },
                  }))
                }
              >
                {opt.text}
              </button>
            ))}
          </div>
          {session.feedback && (
            <p className="stage-feedback">{session.feedback}</p>
          )}
          <div className="stage-actions">
            <button
              className="primary"
              disabled={!session.stageCompleted.analysis}
              onClick={handleFinishAnalysis}
            >
              完成推理并揭晓历史真相
              <Award size={16} />
            </button>
          </div>
        </section>
      )}

      {/* ==================== STAGE 5: HISTORICAL REVEAL & TANGIBLE REWARDS ==================== */}
      {session.stage === "discovery" && (
        <section className="panel history-stage-panel discovery-celebration">
          <span className="eyebrow">HISTORICAL MILESTONE REVEALED</span>
          <h2>
            <Sparkles size={20} /> {st.discovery.milestoneTitle}
          </h2>
          <p className="milestone-lead">{st.discovery.scientificConclusion}</p>

          {st.discovery.modernComparisonNote && (
            <div className="comparison-callout">
              <strong>后续科学发现实测对照：</strong>
              <p style={{ margin: "4px 0 0" }}>
                {st.discovery.modernComparisonNote}
              </p>
            </div>
          )}

          <div className="discovery-notes-grid">
            <div className="note-box">
              <h4>历史影响</h4>
              <p>{st.discovery.historicalImpact}</p>
            </div>
            <div className="note-box">
              <h4>多贡献者史实归属</h4>
              <p>{st.discovery.multiContributorNote}</p>
            </div>
          </div>

          {/* Unlocked Scientists Reveal (Hidden until Stage 5!) */}
          <div className="figures-grid">
            {activeChapter.figureIds.map((fid) => {
              const fig = figureById[fid];
              if (!fig) return null;
              return (
                <article key={fig.id} className="figure-card rich">
                  <div className="figure-card-head">
                    <ScientistMedallion figure={fig} />
                    <div>
                      <h4>{fig.name}</h4>
                      <small className="muted">
                        {fig.nameEn} ({fig.lifespan})
                      </small>
                    </div>
                  </div>
                  <p>{fig.summary}</p>
                  <small className="collab-note">{fig.collaborationNote}</small>
                </article>
              );
            })}
          </div>

          {/* Tangible Unlocked Rewards & Evaluation Breakdown */}
          {activeChapter.archiveRewards && (
            <div className="note-box reward-showcase-box">
              <h4>本章已解锁实际内容奖励（幂等账本防重放）</h4>
              <div className="reward-showcase-grid">
                <div>
                  <strong>历史手稿：</strong>
                  {activeChapter.archiveRewards.manuscriptTitle}
                </div>
                <div>
                  <strong>理论条目：</strong>
                  {activeChapter.archiveRewards.theoryTitle}
                </div>
                <div>
                  <strong>历史勋章：</strong>
                  {activeChapter.archiveRewards.medalName}
                </div>
                <div>
                  <strong>纪念仪器：</strong>
                  {activeChapter.archiveRewards.commemorativeInstrument}
                </div>
              </div>
              {lastRatingBreakdown.length > 0 && (
                <ul className="rating-breakdown">
                  {lastRatingBreakdown.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
              <small className="muted">
                复玩有限奖励次数：{repeatClaimed} / {maxRepeats}
                （超过上限后可继续冲星与升级进阶评价，但不再重复发放金币/RP）。
              </small>
            </div>
          )}

          <div className="stage-actions">
            <button className="primary" onClick={() => go("museum")}>
              <Landmark size={16} /> 前往科学博物馆查看藏品
            </button>
            <button className="secondary" onClick={() => go("tech")}>
              <Cpu size={16} /> 前往科技树使用 RP
            </button>
            <button
              className="secondary"
              onClick={() =>
                openChapter(activeChapter, {
                  forceRestart: true,
                  difficulty:
                    session.difficulty === "simple" ? "advanced" : "simple",
                })
              }
            >
              挑战
              {session.difficulty === "simple" ? "进阶定量模式" : "简单模式"}
            </button>
            <button className="secondary" onClick={returnToTimeline}>
              返回 10 章时间线（最高 {activeProg?.bestStars ?? 3} 星）
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
