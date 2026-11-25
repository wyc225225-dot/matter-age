import type {
  HistoryChapterDef,
  HistorySessionState,
  HistoryStageId,
  Reaction,
  Save,
  Substance,
} from "../types";
import { checkEquationBalance } from "./balancingEngine";
import { execute } from "./reactionEngine";
import { executeIntegerStoichiometry } from "./stoichiometry";
import { claimRewardOnce } from "./progressionEngine";

export const HISTORY_STAGE_ORDER: HistoryStageId[] = [
  "background",
  "hypothesis",
  "experiment",
  "analysis",
  "discovery",
];

export const DEFAULT_MAX_HISTORY_REPEAT_REWARDS = 2;

export type VoltaicDisc =
  "zinc" | "brine_cloth" | "copper" | "silver" | "dry_paper";

/* ==================== Session Lifecycle & Pure Stage Gating ==================== */

export function createHistorySession(
  difficulty: "simple" | "advanced" = "simple",
  now = Date.now(),
): HistorySessionState {
  return {
    difficulty,
    stage: "background",
    stageCompleted: {
      background: false,
      hypothesis: false,
      experiment: false,
      analysis: false,
    },
    hypothesisChoiceId: null,
    hypothesisWrongCount: 0,
    analysisChoiceId: null,
    analysisWrongCount: 0,
    experimentAttempts: 0,
    hintsShown: 0,
    evidenceCollected: [],
    feedback: "",
    puzzle: {
      gasTests: {},
      gasGuesses: {},
      gasYieldAnswer: "",
      massSystemView: "open",
      massMeasured: [],
      massOpt: null,
      massNumeric: "",
      massUnit: "g",
      waterSynthDone: false,
      waterElecDone: false,
      waterRatio: null,
      waterCoeffs: { h2: 1, o2: 1, h2o: 1 },
      waterSubscriptChoice: null,
      voltaicPair: "zn_cu",
      voltaicStack: [],
      periodicSlots: {},
      periodicGapMarked: false,
      periodicGapChoice: null,
      periodicWeightGuess: "",
      periodicOxideChoice: null,
    },
    updatedAt: now,
  };
}

/**
 * Pure engine stage guard: players can NEVER skip ahead past incomplete background/hypothesis/experiment/analysis stages.
 */
export function canAccessHistoryStage(
  session: HistorySessionState,
  target: HistoryStageId,
): boolean {
  if (target === "background") return true;
  if (target === "hypothesis") return session.stageCompleted.background;
  if (target === "experiment")
    return (
      session.stageCompleted.background && session.stageCompleted.hypothesis
    );
  if (target === "analysis")
    return (
      session.stageCompleted.background &&
      session.stageCompleted.hypothesis &&
      session.stageCompleted.experiment
    );
  if (target === "discovery")
    return (
      session.stageCompleted.background &&
      session.stageCompleted.hypothesis &&
      session.stageCompleted.experiment &&
      session.stageCompleted.analysis
    );
  return false;
}

/**
 * Switches chapter session difficulty WITHOUT wiping failed attempts or hints (prevents rating-abuse resets).
 * Upgrading to advanced re-requires passing the stricter advanced experiment check.
 */
export function switchHistorySessionDifficulty(
  session: HistorySessionState,
  nextDifficulty: "simple" | "advanced",
  now = Date.now(),
): HistorySessionState {
  if (session.difficulty === nextDifficulty) return session;
  const stricter = nextDifficulty === "advanced";
  return {
    ...session,
    difficulty: nextDifficulty,
    stage:
      stricter &&
      (session.stage === "analysis" || session.stage === "discovery")
        ? "experiment"
        : session.stage,
    stageCompleted: stricter
      ? {
          ...session.stageCompleted,
          experiment: false,
          analysis: false,
        }
      : session.stageCompleted,
    feedback: stricter
      ? "已切换至进阶模式：实验与定量要求提高，原有尝试与提示记录保留不清空。"
      : "已切换至简单模式：原有尝试与提示记录保留不清空。",
    updatedAt: now,
  };
}

/* ==================== Multi-Factor Star Evaluation ==================== */

export interface HistoryRatingResult {
  stars: 1 | 2 | 3;
  evidenceCompleteness: number;
  conclusionAccuracy: number;
  breakdown: string[];
}

export function evaluateHistoryRating(params: {
  evidenceCompleteness: number;
  experimentAttempts: number;
  hypothesisWrongCount: number;
  analysisWrongCount: number;
  hintsShown: number;
  difficulty: "simple" | "advanced";
}): HistoryRatingResult {
  const ev = Math.max(0, Math.min(1, params.evidenceCompleteness));
  const totalConclusionWrongs =
    Math.max(0, params.hypothesisWrongCount) +
    Math.max(0, params.analysisWrongCount);
  const conclusionAccuracy =
    Math.round((1 / (1 + totalConclusionWrongs)) * 100) / 100;
  const expMistakes = Math.max(0, params.experimentAttempts - 1);
  const totalMistakes = expMistakes + totalConclusionWrongs;

  const breakdown: string[] = [
    `证据完整度：${Math.round(ev * 100)}%`,
    `结论正确率：${Math.round(conclusionAccuracy * 100)}%（假设/分析误判 ${totalConclusionWrongs} 次）`,
    `实验提交：${Math.max(1, params.experimentAttempts)} 次 · 独立研究提示使用：${params.hintsShown} 次`,
  ];

  const maxMistakesFor3 = params.difficulty === "advanced" ? 1 : 2;
  if (
    ev >= 1 &&
    totalMistakes <= maxMistakesFor3 &&
    params.hintsShown === 0 &&
    params.analysisWrongCount === 0
  ) {
    return {
      stars: 3,
      evidenceCompleteness: ev,
      conclusionAccuracy,
      breakdown,
    };
  }
  if (ev >= 0.85 && totalMistakes <= 4 && params.hintsShown <= 2) {
    return {
      stars: 2,
      evidenceCompleteness: ev,
      conclusionAccuracy,
      breakdown,
    };
  }
  return {
    stars: 1,
    evidenceCompleteness: ev,
    conclusionAccuracy,
    breakdown,
  };
}

export function rateHistoryChapter(
  attempts: number,
  hintsUsed: number,
  difficulty: "simple" | "advanced",
): number {
  return evaluateHistoryRating({
    evidenceCompleteness: 1,
    experimentAttempts: attempts,
    hypothesisWrongCount: 0,
    analysisWrongCount: 0,
    hintsShown: hintsUsed,
    difficulty,
  }).stars;
}

/* ==================== 5 Distinct History Puzzle Evaluators ==================== */

export function evaluateGasIdentification(
  chapter: HistoryChapterDef,
  testedKeys: string[],
  guesses: Record<string, string>,
  difficulty: "simple" | "advanced",
  options?: {
    advancedYieldAnswer?: number | null;
    rules?: Reaction[];
    db?: Record<string, Substance>;
  },
): {
  passed: boolean;
  evidenceCompleteness: number;
  message: string;
  evidence: string[];
} {
  const exp = chapter.stages?.experiment;
  const samples = exp?.gasSamples ?? [];
  const keySet = new Set(testedKeys);
  const minTests = difficulty === "advanced" ? 6 : 4;

  // Check each flask has at least 1 test AND both non-relighting flasks (sample_a, sample_c) have limewater tested
  const untestedFlasks = samples.filter(
    (s) =>
      !["glowingSplint", "burningSplint", "limewater"].some((k) =>
        keySet.has(`${s.id}:${k}`),
      ),
  );
  const missingLimewater = ["sample_a", "sample_c"].filter(
    (sid) => !keySet.has(`${sid}:limewater`),
  );

  const completeness = Math.min(1, testedKeys.length / minTests);

  if (untestedFlasks.length > 0) {
    return {
      passed: false,
      evidenceCompleteness: completeness * 0.6,
      message: `证据尚不充分：${untestedFlasks.map((f) => f.label).join("、")} 还未进行任何检验，请先观察现象再作判断。`,
      evidence: [],
    };
  }
  if (missingLimewater.length > 0) {
    const names = missingLimewater
      .map((sid) => samples.find((s) => s.id === sid)?.label ?? sid)
      .join("、");
    return {
      passed: false,
      evidenceCompleteness: completeness * 0.75,
      message: `证据存在缺口：仅凭木条熄灭无法区分二氧化碳与限定候选池内的氮气，请先对 ${names} 补做「澄清石灰水」对照检验。`,
      evidence: [],
    };
  }
  if (testedKeys.length < minTests) {
    return {
      passed: false,
      evidenceCompleteness: completeness,
      message: `${difficulty === "advanced" ? "进阶" : "简单"}模式至少需收集 ${minTests} 项交叉检验记录（当前 ${testedKeys.length} 项），请补做对照验证。`,
      evidence: [],
    };
  }

  const unanswered = samples.filter((s) => !guesses[s.id]);
  if (unanswered.length > 0) {
    return {
      passed: false,
      evidenceCompleteness: 1,
      message: `尚有 ${unanswered.map((u) => u.label).join("、")} 未选择指认身份。`,
      evidence: [],
    };
  }

  const wrong = samples.filter((s) => guesses[s.id] !== s.actualGasId);
  if (wrong.length > 0) {
    return {
      passed: false,
      evidenceCompleteness: 1,
      message: `有 ${wrong.length} 瓶气体的指认与你收集到的实验记录矛盾，请回到上方核对「复燃 / 石灰水浑浊 / 限定池排除」三项证据（未直接泄露答案）。`,
      evidence: [],
    };
  }

  const evidence = [
    "气瓶乙使带火星木条复燃 → 确认为助燃气体氧气（O₂）",
    "气瓶甲熄灭木条且令澄清石灰水浑浊 → 确认为二氧化碳（CO₂）",
    "在限定三气（O₂/CO₂/N₂）候选池内，气瓶丙熄灭木条且石灰水不变浑浊 → 排除后归属氮气（N₂）",
  ];

  if (difficulty === "advanced" && exp?.advancedYieldCheck) {
    const yc = exp.advancedYieldCheck;
    let expectedO2 = yc.expectedOxygenPortions;
    if (options?.rules && options?.db) {
      const rxn = options.rules.find((r) => r.id === yc.reactionId);
      if (rxn) {
        const stoich = executeIntegerStoichiometry(
          rxn,
          { peroxide: yc.peroxidePortions },
          options.db,
        );
        const o2Item = stoich.products.find((p) => p.substanceId === "oxygen");
        if (o2Item) expectedO2 = o2Item.produced;
      }
    }
    if (
      options?.advancedYieldAnswer === null ||
      options?.advancedYieldAnswer === undefined ||
      !Number.isFinite(options.advancedYieldAnswer) ||
      options.advancedYieldAnswer !== expectedO2
    ) {
      return {
        passed: false,
        evidenceCompleteness: 0.9,
        message: `气体鉴别已正确！但进阶定量核算未通过：请根据 2H₂O₂ → 2H₂O + O₂（共享规则 r026）重新计算 ${yc.peroxidePortions} 份过氧化氢分解得到的氧气整数份数。`,
        evidence: [],
      };
    }
    evidence.push(
      `进阶定量核验（复用共享计量引擎 r026）：${yc.peroxidePortions} 份 H₂O₂ 分解生成 ${expectedO2} 份 O₂`,
    );
  }

  return {
    passed: true,
    evidenceCompleteness: 1,
    message:
      difficulty === "advanced"
        ? "三瓶气体鉴别与进阶定量产物核算全部通过！"
        : "全部三瓶未知气体凭充分证据准确鉴别！",
    evidence,
  };
}

export function evaluateMassComparison(
  chapter: HistoryChapterDef,
  completedTrialIds: string[],
  selectedOptionIndex: number | null,
  advancedNumericAnswer: number | null,
  difficulty: "simple" | "advanced",
  unit: "g" | "kg" | "mg" = "g",
): {
  passed: boolean;
  evidenceCompleteness: number;
  message: string;
  evidence: string[];
} {
  const exp = chapter.stages?.experiment;
  const trials = exp?.massTrials ?? [];
  const measuredSet = new Set(completedTrialIds);
  const measuredCount = trials.filter((t) => measuredSet.has(t.id)).length;
  const completeness = trials.length ? measuredCount / trials.length : 1;

  const hasOpen = trials.some(
    (t) => t.vessel === "open" && measuredSet.has(t.id),
  );
  const hasClosed = trials.some(
    (t) => t.vessel === "closed" && measuredSet.has(t.id),
  );

  if (measuredCount < trials.length) {
    const missingHint = !hasClosed
      ? "尚未切换至「密闭系统」完成密封对照称量"
      : !hasOpen
        ? "尚未在「开放系统」完成敞口称量"
        : `还有 ${trials.length - measuredCount} 组称量对照未执行`;
    return {
      passed: false,
      evidenceCompleteness: completeness,
      message: `证据不足：${missingHint}（已完成 ${measuredCount}/${trials.length}）。请完整称量开放与密闭两组对照再下结论。`,
      evidence: [],
    };
  }

  const q = exp?.massQuestion;
  if (!q || selectedOptionIndex === null) {
    return {
      passed: false,
      evidenceCompleteness: 1,
      message: "请根据三组称量数据选择对质量变化的科学解释。",
      evidence: [],
    };
  }
  if (selectedOptionIndex !== q.correctIndex) {
    return {
      passed: false,
      evidenceCompleteness: 1,
      message:
        "解释不够准确：注意不要把气体离开开放容器误判为「质量不守恒」，请检查气体是穿过边界离开还是进入天平称量范围。",
      evidence: [],
    };
  }

  const evidence = [
    "开放系统 A（教学模拟数据）：100.0 g → 56.0 g，差值 44.0 g 为逸出边界的 CO₂",
    "开放系统 B（教学模拟数据）：63.5 g → 79.5 g，增重 16.0 g 来自进入边界的空气 O₂",
    "密闭系统 C（教学模拟数据）：反应前后始终 300.0 g，证实体系总质量守恒",
  ];

  if (difficulty === "advanced" && q.advancedNumericCheck) {
    const chk = q.advancedNumericCheck;
    if (
      advancedNumericAnswer === null ||
      !Number.isFinite(advancedNumericAnswer) ||
      advancedNumericAnswer <= 0
    ) {
      return {
        passed: false,
        evidenceCompleteness: 0.9,
        message:
          "进阶核算未填写：请计算开放系统 A 逸出容器边界的 CO₂ 质量并选择匹配单位。",
        evidence: [],
      };
    }
    const factor = unit === "kg" ? 1000 : unit === "mg" ? 0.001 : 1;
    const answerInGrams = advancedNumericAnswer * factor;
    if (Math.abs(answerInGrams - chk.expectedGrams) > chk.toleranceGrams) {
      return {
        passed: false,
        evidenceCompleteness: 0.9,
        message: `进阶核算数值或单位有误：你提交了 ${advancedNumericAnswer} ${unit}（折合 ${answerInGrams} g），请核对 100.0 g - 56.0 g 与所选单位（${unit}）的换算关系。`,
        evidence: [],
      };
    }
    evidence.push(
      `进阶核算与单位校验通过：逸出 CO₂ 质量 = ${advancedNumericAnswer} ${unit}（= 44.0 g）`,
    );
  }

  return {
    passed: true,
    evidenceCompleteness: 1,
    message:
      difficulty === "advanced"
        ? "开放/密闭称量对照、边界解释与单位核算全部通过！"
        : "三组开放/密闭称量对照与系统边界分析通过！",
    evidence,
  };
}

/**
 * Executes real shared reaction engine for Ch 03 water synthesis / electrolysis demonstrations.
 */
export function runHistoryWaterSharedReaction(
  kind: "synthesis" | "electrolysis",
  rules: Reaction[],
) {
  if (kind === "synthesis") {
    return execute(
      {
        substances: ["hydrogen", "oxygen"],
        conditions: ["ignite"],
        catalysts: [],
        mode: "simple",
      },
      rules,
      "preview",
    );
  }
  return execute(
    {
      substances: ["water"],
      conditions: ["electricity"],
      catalysts: [],
      mode: "simple",
    },
    rules,
    "preview",
  );
}

export function evaluateWaterComposition(
  chapter: HistoryChapterDef,
  selectedRatioIdx: number | null,
  reactantCoeffs: number[],
  productCoeffs: number[],
  difficulty: "simple" | "advanced",
  rules: Reaction[],
  db: Record<string, Substance>,
  options?: {
    synthObserved?: boolean;
    elecObserved?: boolean;
    subscriptChoiceIdx?: number | null;
  },
): {
  passed: boolean;
  evidenceCompleteness: number;
  message: string;
  evidence: string[];
} {
  const exp = chapter.stages?.experiment;
  const synthDone = options?.synthObserved ?? true;
  const elecDone = options?.elecObserved ?? true;

  if (!synthDone) {
    return {
      passed: false,
      evidenceCompleteness: 0.25,
      message:
        "请先在实验台执行「氢氧点燃合成水（共享反应引擎 r006）」，观察生成物证据后再提交判断。",
      evidence: [],
    };
  }
  if (difficulty === "advanced" && !elecDone) {
    return {
      passed: false,
      evidenceCompleteness: 0.5,
      message:
        "进阶模式请同时运行「现代水电解教学对照（r005）」，形成合成与分解双向证据链。",
      evidence: [],
    };
  }

  const ratioOpts = exp?.waterVolumeRatioOptions ?? [];
  if (selectedRatioIdx === null || !ratioOpts[selectedRatioIdx]?.correct) {
    return {
      passed: false,
      evidenceCompleteness: 0.75,
      message:
        "氢氧份数比例判断不准确，请结合共享反应产物证据重新比较氢气与氧气的比例。",
      evidence: [],
    };
  }

  const rxn = rules.find((r) => r.id === (exp?.waterReactionId ?? "r006"));
  if (!rxn) {
    return {
      passed: false,
      evidenceCompleteness: 0.5,
      message: "未找到共享氢氧合成反应规则。",
      evidence: [],
    };
  }

  const evidence = [
    "通过共享反应引擎（r006）实测氢气 + 氧气点燃化合生成纯水",
    "氢氧反应份数比例确认为 2 : 1",
  ];
  if (elecDone) {
    evidence.push(
      "现代教学对照（r005）：水通电分解产出氢气与氧气，与合成形成双向印证",
    );
  }

  if (difficulty === "advanced") {
    const balance = checkEquationBalance(
      rxn,
      reactantCoeffs,
      productCoeffs,
      db,
    );
    if (!balance.balanced) {
      return {
        passed: false,
        evidenceCompleteness: 0.85,
        message: `进阶配平尚未守恒：${balance.message}`,
        evidence: [],
      };
    }
    if (!balance.isSimplestRatio) {
      return {
        passed: false,
        evidenceCompleteness: 0.9,
        message: `等比例成立，但进阶模式要求最简整数比（当前公约数 ${balance.gcd}，请同除以 ${balance.gcd}）。`,
        evidence: [],
      };
    }
    const subQ = exp?.waterSubscriptQuestion;
    if (subQ && options?.subscriptChoiceIdx !== undefined) {
      if (
        options.subscriptChoiceIdx === null ||
        !subQ.options[options.subscriptChoiceIdx]?.correct
      ) {
        return {
          passed: false,
          evidenceCompleteness: 0.92,
          message:
            "请完成「系数与下标差异」概念检验：思考为何不能修改 H₂O 的下标。",
          evidence: [],
        };
      }
      evidence.push("明确区分化学计量系数（分子份数）与化学式下标（物质身份）");
    }
    evidence.push(
      `经共享配平引擎检验：${reactantCoeffs[0]} H₂ + ${reactantCoeffs[1]} O₂ → ${productCoeffs[0]} H₂O 最简整数比守恒`,
    );
  } else {
    // Simple mode also allows checking the equation if edited, or passes cleanly once synth + ratio are verified
    const balance = checkEquationBalance(
      rxn,
      reactantCoeffs,
      productCoeffs,
      db,
    );
    if (balance.balanced) {
      evidence.push(
        `方程式校验通过：${reactantCoeffs[0]} H₂ + ${reactantCoeffs[1]} O₂ → ${productCoeffs[0]} H₂O`,
      );
    }
  }

  return {
    passed: true,
    evidenceCompleteness: 1,
    message:
      difficulty === "advanced"
        ? "双向反应证据、最简整数比配平与系数/下标原理校验全部通过！"
        : "水的合成证据与氢氧组成判断通过！",
    evidence,
  };
}

export function evaluateVoltaicPile(
  chapter: HistoryChapterDef,
  stack: VoltaicDisc[],
  difficulty: "simple" | "advanced",
  metalPair: "zn_cu" | "zn_ag" | "cu_cu" = "zn_cu",
): {
  passed: boolean;
  validCells: number;
  reversedCells: number;
  netCells: number;
  voltageV: number;
  hasDryFault: boolean;
  hasSameMetalFault: boolean;
  evidenceCompleteness: number;
  message: string;
  evidence: string[];
} {
  const cfg = chapter.stages?.experiment.voltaicLayers;
  if (!cfg) {
    return {
      passed: false,
      validCells: 0,
      reversedCells: 0,
      netCells: 0,
      voltageV: 0,
      hasDryFault: false,
      hasSameMetalFault: false,
      evidenceCompleteness: 0,
      message: "缺少伏打电堆配置",
      evidence: [],
    };
  }

  const minCells =
    difficulty === "advanced" ? cfg.minCellsAdvanced : cfg.minCellsSimple;

  const hasSameMetalFault = metalPair === "cu_cu";
  const hasDryFault = stack.includes("dry_paper");
  const cathode: VoltaicDisc = metalPair === "zn_ag" ? "silver" : "copper";

  if (hasSameMetalFault) {
    return {
      passed: false,
      validCells: 0,
      reversedCells: 0,
      netCells: 0,
      voltageV: 0,
      hasDryFault,
      hasSameMetalFault: true,
      evidenceCompleteness: 0.2,
      message:
        "电流表读数 0.0 V：你选择了相同金属（铜 + 铜），对称电极之间无法产生化学电势差。请切换为异种金属（锌 + 铜 或 1800 原型 锌 + 银）。",
      evidence: [],
    };
  }

  if (hasDryFault) {
    return {
      passed: false,
      validCells: 0,
      reversedCells: 0,
      netCells: 0,
      voltageV: 0,
      hasDryFault: true,
      hasSameMetalFault: false,
      evidenceCompleteness: 0.3,
      message:
        "回路断开（0.0 V）：电堆中存在「干燥绝缘纸板」，阻断了盐水离子的迁移通路。请拆除干燥层并改用「盐水湿布/纸板」。",
      evidence: [],
    };
  }

  // Parse 3-layer cells from bottom to top: detect forward [zinc, brine, cathode] vs reversed [cathode, brine, zinc]
  let validCells = 0;
  let reversedCells = 0;
  let malformedCells = 0;

  for (let i = 0; i + 2 < stack.length; i += 3) {
    const [a, b, c] = [stack[i], stack[i + 1], stack[i + 2]];
    if (a === "zinc" && b === "brine_cloth" && c === cathode) {
      validCells++;
    } else if (a === cathode && b === "brine_cloth" && c === "zinc") {
      reversedCells++;
    } else {
      malformedCells++;
    }
  }
  const trailingLayers = stack.length % 3;
  const netCells = Math.max(0, validCells - reversedCells);
  const voltageV = Math.round(netCells * cfg.voltagePerCellV * 10) / 10;
  const completeness = Math.min(1, netCells / minCells);

  if (malformedCells > 0) {
    return {
      passed: false,
      validCells,
      reversedCells,
      netCells,
      voltageV,
      hasDryFault: false,
      hasSameMetalFault: false,
      evidenceCompleteness: completeness * 0.6,
      message: `存在 ${malformedCells} 组叠层结构异常（异种金属之间必须由盐水湿隔层隔开）。可使用每层旁的「↑ / ↓」重排或移除故障层。`,
      evidence: [],
    };
  }

  if (reversedCells > 0) {
    return {
      passed: false,
      validCells,
      reversedCells,
      netCells,
      voltageV,
      hasDryFault: false,
      hasSameMetalFault: false,
      evidenceCompleteness: completeness * 0.7,
      message: `检测到 ${reversedCells} 组极性反向单元！反向单元会与正向单元电势相互抵消（当前净串联 ${netCells} 组，${voltageV.toFixed(1)} V）。请调整顺序保持极性一致。`,
      evidence: [],
    };
  }

  if (trailingLayers !== 0) {
    return {
      passed: false,
      validCells,
      reversedCells,
      netCells,
      voltageV,
      hasDryFault: false,
      hasSameMetalFault: false,
      evidenceCompleteness: completeness * 0.85,
      message: `最上方一组尚未拼齐（每组需完整「锌片 → 盐水湿隔层 → ${cathode === "silver" ? "银片" : "铜片"}」3 层）。当前净串联 ${netCells} 组（${voltageV.toFixed(1)} V）。`,
      evidence: [],
    };
  }

  if (netCells < minCells) {
    return {
      passed: false,
      validCells,
      reversedCells,
      netCells,
      voltageV,
      hasDryFault: false,
      hasSameMetalFault: false,
      evidenceCompleteness: completeness,
      message: `当前已稳定串联 ${netCells} 组（教学示意 ${voltageV.toFixed(1)} V），${difficulty === "advanced" ? "进阶" : "简单"}目标至少需要 ${minCells} 组统一极性串联（≥ ${(minCells * cfg.voltagePerCellV).toFixed(1)} V）。`,
      evidence: [],
    };
  }

  const pairName =
    metalPair === "zn_ag" ? "锌-银（1800 历史原型）" : "锌-铜（教学标准）";
  return {
    passed: true,
    validCells,
    reversedCells: 0,
    netCells,
    voltageV,
    hasDryFault: false,
    hasSameMetalFault: false,
    evidenceCompleteness: 1,
    message: `伏打电堆装配成功！采用${pairName}统一极性串联 ${netCells} 组，教学电压表稳定输出 ${voltageV.toFixed(1)} V（简化模型示意值）。`,
    evidence: [
      `使用${pairName}异种金属与盐水湿润电解质隔层，无干燥断路与反向极性`,
      `统一极性串联 ${netCells} 组，输出教学示意电压 ${voltageV.toFixed(1)} V`,
    ],
  };
}

export function evaluatePeriodicPrediction(
  chapter: HistoryChapterDef,
  placements: Record<string, string>,
  selectedOptionIndex: number | null,
  advancedWeightGuess: number | null,
  difficulty: "simple" | "advanced",
  options?: {
    gapMarked?: boolean;
    oxideChoiceIdx?: number | null;
  },
): {
  passed: boolean;
  evidenceCompleteness: number;
  message: string;
  evidence: string[];
} {
  const exp = chapter.stages?.experiment;
  const cards = exp?.periodicCards ?? [];
  const gap = exp?.gapPrediction;
  const gapMarked = options?.gapMarked ?? true;

  const placedCorrect = cards.filter(
    (c) => placements[`${c.periodSlot}-${c.groupSlot}`] === c.symbol,
  ).length;
  const completeness =
    (placedCorrect + (gapMarked ? 1 : 0)) / (cards.length + 1);

  if (placedCorrect < cards.length) {
    return {
      passed: false,
      evidenceCompleteness: completeness,
      message: `尚有 ${cards.length - placedCorrect} 张 1869 元素卡片未归入正确周期/族格，请依据相对原子质量递增与同列氧化物通式（R₂O / R₂O₃ / RO₂）排列。`,
      evidence: [],
    };
  }

  if (!gapMarked) {
    return {
      passed: false,
      evidenceCompleteness: completeness,
      message:
        "4 张卡片均已归位！请先点击铝（Al）下方空位完成「主动标记未知空位」，再提交空位预言。",
      evidence: [],
    };
  }

  if (
    !gap ||
    selectedOptionIndex === null ||
    !gap.options[selectedOptionIndex]?.correct
  ) {
    return {
      passed: false,
      evidenceCompleteness: 0.85,
      message:
        "对铝下方「类铝」空位的性质预言不准确，请依据同族 Al₂O₃ 与第 4 周期左右邻原子量规律重新推断。",
      evidence: [],
    };
  }

  const evidence = [
    "依据 1869 年相对原子质量与氧化物通式，完成 Na/K（R₂O）、Al（R₂O₃）、Si（RO₂）卡片排布",
    "在铝下方主动预留未知空位并预言「类铝」性质（E₂O₃、原子量 ≈ 68–70）",
  ];

  if (difficulty === "advanced") {
    if (gap.advancedOxideOptions && options?.oxideChoiceIdx !== undefined) {
      if (
        options.oxideChoiceIdx === null ||
        !gap.advancedOxideOptions[options.oxideChoiceIdx]?.correct
      ) {
        return {
          passed: false,
          evidenceCompleteness: 0.9,
          message:
            "进阶预言未通过：请独立选定「类铝」应遵循的最高价氧化物通式（提示：参考同族 B₂O₃ 与 Al₂O₃）。",
          evidence: [],
        };
      }
    }
    if (gap.advancedWeightRange) {
      const [lo, hi] = gap.advancedWeightRange;
      if (
        advancedWeightGuess === null ||
        !Number.isFinite(advancedWeightGuess) ||
        advancedWeightGuess < lo ||
        advancedWeightGuess > hi
      ) {
        return {
          passed: false,
          evidenceCompleteness: 0.92,
          message: `进阶定量预言未通过：请根据第 4 周期邻近元素（Zn ≈ 65，As ≈ 75）估算「类铝」相对原子质量（合理区间 ${lo}–${hi}）。`,
          evidence: [],
        };
      }
      evidence.push(
        `进阶定量预言通过：估算「类铝」相对原子质量 ${advancedWeightGuess}、氧化物通式 E₂O₃`,
      );
    }
  }

  return {
    passed: true,
    evidenceCompleteness: 1,
    message:
      difficulty === "advanced"
        ? "1869 卡片排布、空位留白与进阶定量预言全部通过！"
        : "1869 元素卡片排布与空位预言通过！",
    evidence,
  };
}

/* ==================== Completion, Archive Unlocks & Anti-Farm Settlement ==================== */

export function recordHistoryCompletion(
  save: Save,
  chapter: HistoryChapterDef,
  stars: number,
  difficulty: "simple" | "advanced",
  attempts: number,
  hintsUsed: number,
  evidenceLog: string[],
  now = Date.now(),
  metrics?: {
    evidenceCompleteness?: number;
    conclusionAccuracy?: number;
  },
): {
  save: Save;
  isFirstCompletion: boolean;
  advancedBonusGranted: boolean;
  repeatCapReached: boolean;
  reward: { coins: number; researchPoints: number; experience: number };
  unlockedArchiveLabels: string[];
} {
  const prev = save.historyProgress[chapter.id];
  const firstEventId = `history_first:${chapter.id}`;
  const advEventId = `history_adv_bonus:${chapter.id}`;
  const isFirst = !save.claimedRewardIds.includes(firstEventId);
  const maxRepeats =
    chapter.maxRepeatRewardClaims ?? DEFAULT_MAX_HISTORY_REPEAT_REWARDS;

  let nextSave = save;
  let totalCoins = 0;
  let totalRP = 0;
  let totalXP = 0;
  let advancedBonusGranted = false;
  let repeatCapReached = false;
  let nextRepeatClaimed = prev?.repeatRewardsClaimed ?? 0;

  if (isFirst) {
    const c1 = claimRewardOnce(nextSave, firstEventId, chapter.firstReward);
    if (c1.claimed) {
      nextSave = c1.save;
      totalCoins += chapter.firstReward.coins;
      totalRP += chapter.firstReward.researchPoints;
      totalXP += chapter.firstReward.experience;
    }
  } else if (nextRepeatClaimed < maxRepeats) {
    const slot = nextRepeatClaimed + 1;
    const repEventId = `history_repeat:${chapter.id}:${slot}`;
    const cRep = claimRewardOnce(nextSave, repEventId, chapter.repeatReward);
    if (cRep.claimed) {
      nextSave = cRep.save;
      nextRepeatClaimed = slot;
      totalCoins += chapter.repeatReward.coins;
      totalRP += chapter.repeatReward.researchPoints;
      totalXP += chapter.repeatReward.experience;
    }
  } else {
    repeatCapReached = true;
  }

  // One-time Advanced Mastery Bonus (idempotent via claimedRewardIds)
  if (difficulty === "advanced" && chapter.advancedFirstBonus) {
    const cAdv = claimRewardOnce(
      nextSave,
      advEventId,
      chapter.advancedFirstBonus,
    );
    if (cAdv.claimed) {
      nextSave = cAdv.save;
      advancedBonusGranted = true;
      totalCoins += chapter.advancedFirstBonus.coins;
      totalRP += chapter.advancedFirstBonus.researchPoints;
      totalXP += chapter.advancedFirstBonus.experience;
    }
  }

  const bestStars = Math.max(prev?.bestStars ?? 0, stars);
  const bestDifficulty =
    prev?.bestDifficulty === "advanced" || difficulty === "advanced"
      ? "advanced"
      : "simple";

  const prevDiff = prev?.difficultyRecords?.[difficulty];
  const nextDiffRecord = {
    completed: true,
    bestStars: Math.max(prevDiff?.bestStars ?? 0, stars),
    attempts: (prevDiff?.attempts ?? 0) + Math.max(1, attempts),
    hintsUsed:
      prevDiff !== undefined
        ? Math.min(prevDiff.hintsUsed, hintsUsed)
        : hintsUsed,
    evidenceCompleteness: Math.max(
      prevDiff?.evidenceCompleteness ?? 0,
      metrics?.evidenceCompleteness ?? 1,
    ),
    conclusionAccuracy: Math.max(
      prevDiff?.conclusionAccuracy ?? 0,
      metrics?.conclusionAccuracy ?? 1,
    ),
    bestAt:
      !prevDiff || stars >= prevDiff.bestStars ? now : (prevDiff.bestAt ?? now),
  };

  const archiveRewards: string[] = [...(prev?.unlockedArchiveRewards ?? [])];
  const newlyUnlockedLabels: string[] = [];
  if (chapter.archiveRewards) {
    const ar = chapter.archiveRewards;
    const items = [
      `手稿：${ar.manuscriptTitle}`,
      `理论：${ar.theoryTitle}`,
      `勋章：${ar.medalName}`,
      `纪念仪：${ar.commemorativeInstrument}`,
    ];
    for (const label of items) {
      if (!archiveRewards.includes(label)) {
        archiveRewards.push(label);
        newlyUnlockedLabels.push(label);
      }
    }
  }

  const nextMuseum = { ...nextSave.museumUnlocked };
  if (chapter.museumUnlockId && !(chapter.museumUnlockId in nextMuseum)) {
    nextMuseum[chapter.museumUnlockId] = now;
  }

  const updatedSession = prev?.session
    ? {
        ...prev.session,
        stage: "discovery" as HistoryStageId,
        stageCompleted: {
          background: true,
          hypothesis: true,
          experiment: true,
          analysis: true,
        },
        updatedAt: now,
      }
    : undefined;

  nextSave = {
    ...nextSave,
    museumUnlocked: nextMuseum,
    historyProgress: {
      ...nextSave.historyProgress,
      [chapter.id]: {
        unlocked: true,
        currentStage: "discovery",
        completed: true,
        bestStars,
        bestDifficulty,
        attempts: (prev?.attempts ?? 0) + Math.max(1, attempts),
        hintsUsed:
          prev !== undefined ? Math.min(prev.hintsUsed, hintsUsed) : hintsUsed,
        evidenceLog: [
          ...new Set([...(prev?.evidenceLog ?? []), ...evidenceLog]),
        ].slice(0, 60),
        firstCompletedAt: prev?.firstCompletedAt ?? now,
        difficultyRecords: {
          ...(prev?.difficultyRecords ?? {}),
          [difficulty]: nextDiffRecord,
        },
        repeatRewardsClaimed: nextRepeatClaimed,
        unlockedArchiveRewards: archiveRewards,
        session: updatedSession ?? null,
      },
    },
  };

  return {
    save: nextSave,
    isFirstCompletion: isFirst,
    advancedBonusGranted,
    repeatCapReached,
    reward: { coins: totalCoins, researchPoints: totalRP, experience: totalXP },
    unlockedArchiveLabels: newlyUnlockedLabels,
  };
}
