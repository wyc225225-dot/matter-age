import { useState, useEffect, useRef } from "react";
import { playerCopy } from "../utils/playerCopy";
import {
  LayoutGrid,
  Search,
  Check,
  ChevronRight,
  Plus,
  PackagePlus,
  FlaskConical,
  Trash2,
  Atom,
  X,
  Star,
  Beaker,
  Lightbulb,
  Play,
  ArrowRight,
  History,
  BookOpen,
  ShieldCheck,
  Target,
  RotateCcw,
  Scale,
  Lock,
} from "lucide-react";
import type {
  Substance,
  Condition,
  Reaction,
  IntegerStoichiometryResult,
  QuantitativeChallenge,
} from "../types";
import { execute, executeAdvanced } from "../engine/reactionEngine";
import { getHint } from "../engine/hintEngine";
import { rateChallenge } from "../engine/challengeEngine";
import { ADVANCED_LIMITS } from "../config/modes";
import { ReactionAnimation } from "../components/ReactionAnimation";
import { StoichiometryReport } from "../components/StoichiometryReport";
import { SubstanceUnitGlyph } from "../components/AtomVisualizer";
import { EquationStudio } from "../components/EquationStudio";
import {
  substances,
  byId,
  reactions,
  conditions,
  conditionName,
  challenges,
  quantitativeChallenges,
} from "../data";
import { useGame } from "../stores/game";
import { SubstanceIcon } from "../components/SubstanceIcon";
import { Formula, fmt } from "../components/Shared";

function playDiscovery() {
  try {
    const audio = new AudioContext();
    const gain = audio.createGain();
    gain.connect(audio.destination);
    gain.gain.setValueAtTime(0.045, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.7);
    [523, 659, 784].forEach((f, i) => {
      const o = audio.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(gain);
      o.start(audio.currentTime + i * 0.1);
      o.stop(audio.currentTime + 0.7);
    });
    setTimeout(() => void audio.close(), 850);
  } catch {
    /* Sound is optional. */
  }
}

export default function Laboratory({
  setDetail,
  setSupply,
  toast,
}: {
  setDetail: (s: Substance) => void;
  setSupply: (b: boolean) => void;
  toast: (s: string) => void;
}) {
  const game = useGame();
  const mode = game.save.currentMode;
  const run = game.save.challengeRun;
  const qRun = game.save.quantitativeChallengeRun;
  const isAdvanced = mode === "advanced" || !!qRun;

  const [advancedView, setAdvancedView] = useState<"bench" | "balancing">(
    "bench",
  );
  const [selectedBalanceId, setSelectedBalanceId] = useState<string>("r006");

  const [slots, setSlots] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Condition[]>([]);
  const [catalyst, setCatalyst] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [sort, setSort] = useState("recent");
  const [tab, setTab] = useState("所有物质");
  const [notebookTab, setNotebookTab] = useState<
    "history" | "completed" | "quantitative"
  >("history");
  const [result, setResult] = useState<Reaction | null>(null);
  const [advStoich, setAdvStoich] = useState<IntegerStoichiometryResult | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [fresh, setFresh] = useState<string[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [hint, setHint] = useState("");
  const [animating, setAnimating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const clearBench = () => {
    setSlots([]);
    setAmounts({});
    setSelected([]);
    setCatalyst([]);
    setResult(null);
    setAdvStoich(null);
    setMessage("");
    setFresh([]);
    setHint("");
    setAnimating(false);
  };

  useEffect(() => {
    clearBench();
    setHintLevel(0);
  }, [run?.id, qRun?.id, mode]);

  const challenge = run ? challenges.find((c) => c.id === run.id) : null;
  const qChallenge: QuantitativeChallenge | null = qRun
    ? quantitativeChallenges.find((c) => c.id === qRun.id) || null
    : null;

  const challengeIndex = challenge ? challenges.indexOf(challenge) : -1;
  const nextChallenge =
    challengeIndex >= 0 && challengeIndex < challenges.length - 1
      ? challenges[challengeIndex + 1]
      : null;

  const qChallengeIndex = qChallenge
    ? quantitativeChallenges.indexOf(qChallenge)
    : -1;
  const nextQChallenge =
    qChallengeIndex >= 0 && qChallengeIndex < quantitativeChallenges.length - 1
      ? quantitativeChallenges[qChallengeIndex + 1]
      : null;

  const inventory: string[] = qRun
    ? Object.keys(qRun.inventory).filter((id) => qRun.inventory[id] > 0)
    : run
      ? run.inventory
      : Object.keys(game.save.discovered);

  const availableCatalysts: string[] = qRun
    ? qRun.catalysts
    : inventory.filter((id) => reactions.some((r) => r.catalysts.includes(id)));

  const allowedSimpleRules = challenge
    ? reactions.filter((r) =>
        r.conditions.every((c) => challenge.conditions.includes(c)),
      )
    : reactions;

  const allowedAdvancedRules = qChallenge
    ? reactions.filter((r) =>
        r.conditions.every((c) => qChallenge.conditions.includes(c)),
      )
    : reactions;

  const balancingPool = reactions.filter(
    (r) => r.stoichiometrySupported && r.calculationStrategy !== "phase_change",
  );

  const activeBalancingReaction: Reaction | null =
    qChallenge?.kind === "balancing" && qChallenge.balancingReactionId
      ? reactions.find((r) => r.id === qChallenge.balancingReactionId) || null
      : balancingPool.find((r) => r.id === selectedBalanceId) ||
        balancingPool[0] ||
        null;

  const owned = substances
    .filter((s) => inventory.includes(s.id))
    .filter(
      (s) =>
        (category === "全部" || s.group === category) &&
        (tab !== "我的收藏" || game.save.favorites.includes(s.id)) &&
        `${s.name}${s.nameEn}${s.formula || ""}${s.aliases.join("")}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "zh-CN");
      if (run) return run.inventory.indexOf(b.id) - run.inventory.indexOf(a.id);
      if (qRun)
        return (qRun.inventory[b.id] || 0) - (qRun.inventory[a.id] || 0);
      return (
        (game.save.discovered[b.id] || 0) - (game.save.discovered[a.id] || 0)
      );
    });

  const maxCapFor = (id: string) =>
    qRun
      ? Math.min(ADVANCED_LIMITS.maxPortions, qRun.inventory[id] || 0)
      : ADVANCED_LIMITS.maxPortions;

  const setPortion = (id: string, nextVal: number) => {
    const cap = maxCapFor(id);
    if (cap <= 0) return;
    const clamped = Math.max(
      ADVANCED_LIMITS.minPortions,
      Math.min(cap, Math.trunc(nextVal) || ADVANCED_LIMITS.minPortions),
    );
    setAmounts((prev) => ({ ...prev, [id]: clamped }));
  };

  const add = (id: string) => {
    if (!inventory.includes(id) || animating || run?.complete || qRun?.complete)
      return;
    if (slots.includes(id)) {
      if (isAdvanced) {
        const cap = maxCapFor(id);
        const cur = amounts[id] || 1;
        if (cur >= cap) {
          toast(
            qRun
              ? `${byId[id].name}在当前有限库存中仅剩 ${cap} 份。`
              : `单次投入上限为 ${ADVANCED_LIMITS.maxPortions} 份。`,
          );
          return;
        }
        setAmounts((prev) => ({ ...prev, [id]: cur + 1 }));
        setMessage("");
        setResult(null);
        setAdvStoich(null);
        return;
      }
      toast("简单模式不需要重复添加同一种物质。");
      return;
    }
    if (slots.length === 4) {
      toast("实验台已满，请先移除一种物质。");
      return;
    }
    setSlots([...slots, id]);
    if (isAdvanced) {
      setAmounts((prev) => ({ ...prev, [id]: 1 }));
    }
    setMessage("");
    setResult(null);
    setAdvStoich(null);
    setFresh([]);
  };

  const removeSlot = (index: number) => {
    const removedId = slots[index];
    setSlots(slots.filter((_, j) => index !== j));
    if (removedId) {
      setAmounts((prev) => {
        const next = { ...prev };
        delete next[removedId];
        return next;
      });
    }
  };

  function startChallengeRun(targetChallenge: (typeof challenges)[number]) {
    game.update((s) => ({
      ...s,
      currentMode: "simple",
      quantitativeChallengeRun: null,
      challengeRun: {
        id: targetChallenge.id,
        inventory: [...targetChallenge.initial],
        attempts: 0,
        hints: 0,
        complete: false,
      },
    }));
    clearBench();
    setHintLevel(0);
  }

  function experiment() {
    if (animating || run?.complete || qRun?.complete) return;
    setHint("");

    if (isAdvanced) {
      const inputAmounts: Record<string, number> = {};
      for (const id of slots) {
        inputAmounts[id] = amounts[id] || 1;
      }
      const res = executeAdvanced(
        {
          amounts: inputAmounts,
          conditions: selected,
          catalysts: catalyst,
          mode: "advanced",
        },
        allowedAdvancedRules,
        byId,
        { channel: "preview" },
      );

      if (res.status === "complete" || res.status === "partial") {
        const rec = game.recordAdvanced(
          res.stoichiometry,
          res.status,
          inputAmounts,
          res.reaction,
        );
        setResult(res.reaction);
        setAdvStoich(res.stoichiometry);
        setFresh(rec.newProducts);
        setMessage(res.message);
        if (qRun) {
          setSlots([]);
          setAmounts({});
        }
        setAnimating(game.save.settings.motion);
        if (rec.newProducts.length && game.save.settings.sound) playDiscovery();
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setAnimating(false), 2400);
      } else if (res.status === "insufficient") {
        game.recordAdvanced(
          res.stoichiometry,
          "insufficient",
          inputAmounts,
          res.reaction,
        );
        setResult(null);
        setAdvStoich(res.stoichiometry);
        setFresh([]);
        setMessage(res.message);
      } else {
        const msg =
          res.status === "missing"
            ? `${res.message}${res.conditions.length ? " 缺少：" + res.conditions.map(conditionName).join("、") : ""}${res.catalysts.length ? " 催化剂：" + res.catalysts.map(conditionName).join("、") : ""}${res.extraCatalysts.length ? " 多余催化剂：" + res.extraCatalysts.map(conditionName).join("、") : ""}`
            : res.message;
        const mappedOutcome =
          res.status === "missing" ||
          res.status === "unmatched" ||
          res.status === "unsupported_strategy" ||
          res.status === "pending_review"
            ? res.status
            : "unmatched";
        game.recordAdvanced(
          null,
          mappedOutcome,
          inputAmounts,
          "reaction" in res ? (res.reaction ?? null) : null,
        );
        setResult(null);
        setAdvStoich(null);
        setFresh([]);
        setMessage(msg);
      }
      return;
    }

    const res = execute(
      { substances: slots, conditions: selected, catalysts: catalyst },
      allowedSimpleRules,
    );
    if (res.status === "success") {
      const r = res.reaction;
      const found = game.record(r, r.name);
      setFresh(found);
      setResult(r);
      setAdvStoich(null);
      setMessage("");
      if (found.length) setHintLevel(0);
      setAnimating(game.save.settings.motion);
      if (found.length && game.save.settings.sound) playDiscovery();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setAnimating(false), 2400);
    } else {
      const msg =
        res.status === "missing"
          ? `${res.message}${res.conditions.length ? " 缺少：" + res.conditions.map(conditionName).join("、") : ""}${res.catalysts.length ? " 催化剂：" + res.catalysts.map(conditionName).join("、") : ""}${res.extraCatalysts.length ? " 多余催化剂：" + res.extraCatalysts.map(conditionName).join("、") : ""}`
          : res.message;
      game.record(null, msg);
      setResult(null);
      setAdvStoich(null);
      setFresh([]);
      setMessage(msg);
    }
  }

  function requestHint() {
    const next = (hintLevel % 3) + 1;
    const h = getHint(
      inventory,
      run || qRun ? [] : game.save.completed,
      isAdvanced
        ? allowedAdvancedRules.filter((r) => r.stoichiometrySupported)
        : allowedSimpleRules,
      byId,
      next,
      {
        target: challenge?.target || qChallenge?.target.substanceId,
        labelCondition: conditionName,
      },
    );
    setHintLevel(next);
    if (run && h.rule) {
      game.update((s) => {
        if (s.challengeRun) s.challengeRun.hints++;
        return s;
      });
    } else if (qRun && h.rule) {
      game.update((s) => {
        if (s.quantitativeChallengeRun) s.quantitativeChallengeRun.hints++;
        return s;
      });
    }
    setHint(h.message);
  }

  const runScore =
    run && challenge && run.complete
      ? rateChallenge(true, run.attempts, run.hints, challenge.limit)
      : null;

  const qRunScore =
    qRun && qChallenge && qRun.complete
      ? rateChallenge(true, qRun.attempts, qRun.hints, qChallenge.limit)
      : null;

  const completedList = [...game.save.completed]
    .reverse()
    .map((id) => reactions.find((r) => r.id === id))
    .filter((r): r is Reaction => !!r);

  const visibleConditions = conditions.filter((c) =>
    qChallenge
      ? qChallenge.conditions.includes(c.id)
      : challenge
        ? challenge.conditions.includes(c.id)
        : true,
  );

  return (
    <div className="lab page-width">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {isAdvanced
              ? "THE QUANTITATIVE LABORATORY · V1.5"
              : "THE LABORATORY"}
          </p>
          <h1>
            {qChallenge
              ? qChallenge.name
              : challenge
                ? challenge.name
                : isAdvanced
                  ? "进阶定量实验室"
                  : "自由探索实验室"}
            <span className="pill">
              {qChallenge
                ? qChallenge.group
                : challenge
                  ? challenge.group
                  : isAdvanced
                    ? "进阶模式"
                    : "简单模式"}
            </span>
          </h1>
          <p>
            {qChallenge
              ? `目标：${qChallenge.kind === "balancing" ? "完成方程式配平" : `${byId[qChallenge.target.substanceId].name} ×${qChallenge.target.minAmount}`} · 已尝试 ${qRun!.attempts} / ${qChallenge.limit} 次 — ${qChallenge.description}`
              : challenge
                ? `目标：${byId[challenge.target].name} · 已尝试 ${run!.attempts} / ${challenge.limit} 次 · 提示 ${run!.hints} 次 — ${challenge.description}`
                : isAdvanced
                  ? "配置整数份数（1–99），验证限制反应物、消耗/剩余、元素守恒与方程式系数配平。"
                  : "放入材料，选择条件。让好奇心来决定下一步。"}
          </p>
        </div>
        <div className="lab-progress">
          <span>
            <strong>{Object.keys(game.save.discovered).length}</strong> /{" "}
            {substances.length} 种物质
          </span>
          <div className="progress-track">
            <i
              style={{
                width: `${(Object.keys(game.save.discovered).length / substances.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {!run && !qRun && (
        <div className="lab-mode-bar" role="group" aria-label="实验台难度切换">
          <button
            type="button"
            className={mode === "simple" ? "active" : ""}
            onClick={() => game.setMode("simple")}
          >
            <FlaskConical size={14} />
            简单模式
          </button>
          <button
            type="button"
            className={mode === "advanced" ? "active" : ""}
            onClick={() => game.setMode("advanced")}
          >
            <Scale size={14} />
            进阶模式（V1.5 定量）
          </button>
          <button type="button" disabled className="locked-mode">
            <Lock size={13} />
            困难模式（V2.0 锁定）
          </button>

          {isAdvanced && (
            <div className="advanced-subtabs">
              <button
                type="button"
                className={advancedView === "bench" ? "active" : ""}
                onClick={() => setAdvancedView("bench")}
              >
                定量实验台
              </button>
              <button
                type="button"
                className={advancedView === "balancing" ? "active" : ""}
                onClick={() => setAdvancedView("balancing")}
              >
                方程式配平研究
              </button>
            </div>
          )}
        </div>
      )}

      {run && challenge && (
        <div className={`challenge-banner ${run.complete ? "complete" : ""}`}>
          <Target size={18} />
          <span>
            {run.complete
              ? `目标达成！成绩已保存。本次获得 ${runScore?.stars ?? 1} 颗星（${run.attempts} 次实验，${run.hints} 次提示）。`
              : `挑战库存独立于自由探索；尝试在 ${challenge.limit} 次实验内合成「${byId[challenge.target].name}」，且不使用提示即可点亮三星。`}
          </span>
          <div className="challenge-banner-actions">
            {run.complete && (
              <button
                type="button"
                onClick={() => startChallengeRun(challenge)}
              >
                <RotateCcw size={13} />
                再试一次
              </button>
            )}
            {run.complete && nextChallenge && (
              <button
                type="button"
                className="next-challenge-btn"
                onClick={() => startChallengeRun(nextChallenge)}
              >
                下一关 <ArrowRight size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => game.update((s) => ({ ...s, challengeRun: null }))}
            >
              返回自由探索 <X size={14} />
            </button>
          </div>
        </div>
      )}

      {qRun && qChallenge && (
        <div
          className={`challenge-banner quant-banner ${qRun.complete ? "complete" : ""}`}
        >
          <Scale size={18} />
          <span>
            {qRun.complete
              ? `定量挑战达成！本次获得 ${qRunScore?.stars ?? 1} 颗星（${qRun.attempts} 次操作）。`
              : `有限份数库存：反应物消耗将实际扣减，剩余返回库存，生成物入库，催化剂完整保留。`}
          </span>
          <div className="challenge-banner-actions">
            <button
              type="button"
              onClick={() => {
                game.resetQuantitativeChallenge();
                clearBench();
              }}
            >
              <RotateCcw size={13} />
              重置关卡库存
            </button>
            {qRun.complete && nextQChallenge && (
              <button
                type="button"
                className="next-challenge-btn"
                onClick={() => {
                  game.startQuantitativeChallenge(nextQChallenge);
                  clearBench();
                }}
              >
                下一关 <ArrowRight size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                game.exitQuantitativeChallenge();
                clearBench();
              }}
            >
              返回自由探索 <X size={14} />
            </button>
          </div>
        </div>
      )}

      {isAdvanced &&
      (advancedView === "balancing" || qChallenge?.kind === "balancing") ? (
        <div className="balancing-workspace">
          {!qChallenge && balancingPool.length > 0 && (
            <div className="balancing-picker panel">
              <label>
                选择研究方程式：
                <select
                  aria-label="选择配平方程式"
                  value={activeBalancingReaction?.id || ""}
                  onChange={(e) => setSelectedBalanceId(e.target.value)}
                >
                  {balancingPool.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id.toUpperCase()} · {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {activeBalancingReaction && (
            <EquationStudio
              key={activeBalancingReaction.id}
              reaction={activeBalancingReaction}
              onSubmit={(rc, pc, res) => {
                game.recordBalancing(
                  activeBalancingReaction,
                  rc,
                  pc,
                  res.balanced,
                  res.isSimplestRatio,
                );
              }}
            />
          )}
        </div>
      ) : (
        <div className="lab-columns">
          <section className="panel warehouse">
            <div className="panel-title">
              <h2>
                <LayoutGrid size={16} />
                {qRun ? "有限份数库存" : run ? "挑战材料库" : "物质仓库"}
              </h2>
              <span>{inventory.length} 种可用</span>
            </div>
            {qRun && qRun.catalysts.length > 0 && (
              <div className="finite-catalyst-note">
                独立保留催化剂：
                {qRun.catalysts.map((id) => byId[id].name).join("、")}
              </div>
            )}
            <div className="warehouse-tabs">
              {["所有物质", "我的收藏"].map((t) => (
                <button
                  key={t}
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <label className="search-box">
              <Search size={16} />
              <input
                placeholder="搜索物质名称 / 俗名 / 化学式"
                aria-label="搜索物质"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="warehouse-selects">
              <select
                aria-label="物质类别"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {["全部", ...new Set(substances.map((s) => s.group))].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
              <select
                aria-label="物质排序"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recent">
                  {qRun ? "份数最多" : run ? "最新合成" : "最近发现"}
                </option>
                <option value="name">名称排序</option>
              </select>
            </div>
            <div className="warehouse-grid">
              {owned.map((s) => (
                <div
                  className={`material-card ${slots.includes(s.id) ? "selected" : ""}`}
                  key={s.id}
                >
                  <button
                    className="material-add"
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", s.id)
                    }
                    onClick={() => add(s.id)}
                    aria-label={`添加${s.name}`}
                  >
                    <span className="material-number">
                      {qRun
                        ? `剩 ${qRun.inventory[s.id]} 份`
                        : String(substances.indexOf(s) + 1).padStart(2, "0")}
                    </span>
                    <SubstanceIcon s={s} size={56} />
                    <strong>{s.name}</strong>
                    <Formula value={s.formula} />
                  </button>
                  <button
                    className="material-info"
                    onClick={() => setDetail(s)}
                    aria-label={`查看${s.name}详情`}
                  >
                    i
                  </button>
                  {slots.includes(s.id) && (
                    <span className="selected-check">
                      {isAdvanced ? (
                        `×${amounts[s.id] || 1}`
                      ) : (
                        <Check size={12} />
                      )}
                    </span>
                  )}
                </div>
              ))}
              {!owned.length && <p className="empty small">没有匹配的物质。</p>}
            </div>
            {!run && !qRun && (
              <button className="supply-button" onClick={() => setSupply(true)}>
                <PackagePlus size={16} />
                <span>
                  领取实验室标本<small>补充探索所需的基础原料</small>
                </span>
                <ChevronRight size={16} />
              </button>
            )}
          </section>

          <section className="panel workbench">
            <div className="panel-title">
              <h2>
                <FlaskConical size={16} />
                {isAdvanced ? "定量实验台" : "实验台"}{" "}
                <span className="tiny-label">
                  {isAdvanced ? "STOICHIOMETRY 1.5" : "WORKSPACE 01"}
                </span>
              </h2>
              <button className="text-button muted" onClick={clearBench}>
                <Trash2 size={14} />
                清空台面
              </button>
            </div>
            <div className="workspace">
              <div className="workspace-grid" />
              <div className="workbench-instruction">
                <span className="status-dot" />
                {isAdvanced
                  ? "添加材料默认 1 份，重复点击或使用 +/- / 数字输入调整投入份数（自由探索不扣全局库存）"
                  : "点击或拖入物质到槽位，再选定条件开始实验"}
              </div>
              <div className={`slots ${isAdvanced ? "advanced-slots" : ""}`}>
                {Array.from({ length: 4 }, (_, i) => {
                  const id = slots[i];
                  if (id && isAdvanced) {
                    const sub = byId[id];
                    const amt = amounts[id] || 1;
                    const cap = maxCapFor(id);
                    return (
                      <div
                        key={i}
                        className="slot filled advanced-slot"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          add(e.dataTransfer.getData("text/plain"));
                        }}
                      >
                        <button
                          type="button"
                          className="slot-remove-btn"
                          aria-label={`移除${sub.name}`}
                          onClick={() => removeSlot(i)}
                        >
                          <X size={13} />
                        </button>
                        <SubstanceIcon s={sub} size={46} />
                        <strong>{sub.name}</strong>
                        <Formula value={sub.formula} />
                        <div className="portion-controls">
                          <button
                            type="button"
                            aria-label={`减少${sub.name}份数`}
                            disabled={amt <= ADVANCED_LIMITS.minPortions}
                            onClick={() => setPortion(id, amt - 1)}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={ADVANCED_LIMITS.minPortions}
                            max={cap}
                            aria-label={`${sub.name}投入份数`}
                            value={amt}
                            onChange={(e) =>
                              setPortion(id, Number(e.target.value))
                            }
                          />
                          <button
                            type="button"
                            aria-label={`增加${sub.name}份数`}
                            disabled={amt >= cap}
                            onClick={() => setPortion(id, amt + 1)}
                          >
                            +
                          </button>
                        </div>
                        <SubstanceUnitGlyph s={sub} count={amt} compact />
                      </div>
                    );
                  }
                  return (
                    <button
                      key={i}
                      aria-label={
                        id ? `移除${byId[id].name}` : `物质槽位 ${i + 1}`
                      }
                      className={`slot ${id ? "filled" : ""}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        add(e.dataTransfer.getData("text/plain"));
                      }}
                      onClick={() => id && removeSlot(i)}
                    >
                      {id ? (
                        <>
                          <span className="slot-remove">
                            <X size={12} />
                          </span>
                          <SubstanceIcon s={byId[id]} size={68} />
                          <strong>{byId[id].name}</strong>
                          <Formula value={byId[id].formula} />
                        </>
                      ) : (
                        <>
                          <span className="slot-plus">
                            <Plus size={23} />
                          </span>
                          <small>物质 {String(i + 1).padStart(2, "0")}</small>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="workspace-dashes">
                <span />
                <Atom size={18} />
                <span />
              </div>

              <div
                className={`result-area ${fresh.length ? "new-discovery" : ""}`}
                aria-live="polite"
              >
                {isAdvanced && advStoich ? (
                  <StoichiometryReport stoich={advStoich} />
                ) : result ? (
                  <>
                    <div className="result-kicker">
                      {fresh.length ? (
                        <>
                          <Star size={13} />
                          发现新物质
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          实验成功
                        </>
                      )}
                    </div>
                    <div className="result-products">
                      {result.products.map((p) => (
                        <div
                          className="result-product-wrap"
                          key={p.substanceId}
                        >
                          <button
                            type="button"
                            className="result-product-card"
                            onClick={() => setDetail(byId[p.substanceId])}
                          >
                            <SubstanceIcon s={byId[p.substanceId]} size={48} />
                            <div>
                              <strong>{byId[p.substanceId].name}</strong>
                              <Formula value={byId[p.substanceId].formula} />
                            </div>
                            {fresh.includes(p.substanceId) && (
                              <span className="new-label">NEW</span>
                            )}
                          </button>
                          {!run?.complete && (
                            <button
                              type="button"
                              className="result-quick-use"
                              title={`将${byId[p.substanceId].name}直接放入实验台`}
                              aria-label={`快速使用${byId[p.substanceId].name}`}
                              onClick={() => {
                                setSlots([p.substanceId]);
                                setSelected([]);
                                setCatalyst([]);
                                setResult(null);
                                setFresh([]);
                                setMessage("");
                                setAnimating(false);
                              }}
                            >
                              <Plus size={12} />
                              放入台面
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="equation">{fmt(result.equation)}</p>
                    <small>
                      {result.changeType === "physical"
                        ? "物理变化"
                        : "化学变化"}{" "}
                      · {result.name}
                      {result.reversible ? " · 可逆过程" : ""}
                    </small>
                  </>
                ) : message ? (
                  <div className="experiment-message">
                    <Beaker size={27} />
                    <p>{message}</p>
                  </div>
                ) : (
                  <>
                    <div className="result-orbit">
                      <Atom size={27} />
                    </div>
                    <p>
                      {isAdvanced
                        ? "配置反应物份数与条件，验证化学计量与守恒"
                        : "每一个发现，都始于一次尝试"}
                    </p>
                    <small>实验结果将在这里出现</small>
                  </>
                )}
                {animating && result && (
                  <>
                    <ReactionAnimation
                      key={`${result.id}-${game.save.totalExperiments}-${run?.attempts}-${qRun?.attempts}`}
                      type={result.animation}
                      reduced={!game.save.settings.motion}
                      accentColor={byId[result.products[0]?.substanceId]?.color}
                    />
                    <button
                      className="skip-animation"
                      onClick={() => setAnimating(false)}
                    >
                      跳过动画
                    </button>
                  </>
                )}
              </div>
              <span className="workspace-coordinate">
                MATTER AGE · VIRTUAL REACTION CHAMBER
              </span>
            </div>

            <div className="conditions-panel">
              <div className="conditions-title">
                <h3>实验条件</h3>
                <span>
                  {qRun
                    ? "有限库存挑战 · 仅消耗反应份数"
                    : "可多选 · 不消耗全局解锁库存"}
                </span>
              </div>
              <div className="conditions-grid">
                {visibleConditions.map((c) => (
                  <button
                    className={selected.includes(c.id) ? "active" : ""}
                    aria-pressed={selected.includes(c.id)}
                    aria-label={c.name}
                    key={c.id}
                    onClick={() =>
                      setSelected(
                        selected.includes(c.id)
                          ? selected.filter((x) => x !== c.id)
                          : [...selected, c.id],
                      )
                    }
                  >
                    <span aria-hidden="true">{c.symbol}</span>
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="catalyst-row">
                <span>
                  催化剂 <small>独立角色，不参与消耗计算</small>
                </span>
                <select
                  aria-label="选择催化剂"
                  value={catalyst[0] || ""}
                  onChange={(e) =>
                    setCatalyst(e.target.value ? [e.target.value] : [])
                  }
                >
                  <option value="">不使用催化剂</option>
                  {availableCatalysts.map((id) => (
                    <option value={id} key={id}>
                      {byId[id].name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="experiment-actions">
                <button
                  className="hint-button"
                  onClick={requestHint}
                  disabled={!!run?.complete || !!qRun?.complete}
                >
                  <Lightbulb size={17} />
                  实验提示 <small>{hintLevel ? `${hintLevel}/3` : ""}</small>
                </button>
                <button
                  className="primary run-button"
                  disabled={
                    slots.length === 0 ||
                    animating ||
                    !!run?.complete ||
                    !!qRun?.complete
                  }
                  onClick={experiment}
                >
                  <Play size={17} fill="currentColor" />
                  {animating
                    ? "反应进行中"
                    : isAdvanced
                      ? "执行定量实验"
                      : "开始实验"}
                  <ArrowRight size={16} />
                </button>
              </div>
              {hint && (
                <p className="hint-message">
                  <Lightbulb size={16} />
                  {hint}
                </p>
              )}
            </div>
          </section>

          <aside className="lab-sidebar">
            <section className="panel notebook">
              <div className="panel-title">
                <h2>
                  <History size={16} />
                  实验记录
                </h2>
                <span>
                  {notebookTab === "quantitative"
                    ? game.save.quantitativeHistory.length
                    : notebookTab === "completed"
                      ? completedList.length
                      : game.save.history.length}
                </span>
              </div>
              <div className="notebook-tabs">
                <button
                  type="button"
                  className={notebookTab === "history" ? "active" : ""}
                  onClick={() => setNotebookTab("history")}
                >
                  最近实验
                </button>
                <button
                  type="button"
                  className={notebookTab === "completed" ? "active" : ""}
                  onClick={() => setNotebookTab("completed")}
                >
                  已成反应 ({completedList.length})
                </button>
                <button
                  type="button"
                  className={notebookTab === "quantitative" ? "active" : ""}
                  onClick={() => setNotebookTab("quantitative")}
                >
                  定量 ({game.save.quantitativeHistory.length})
                </button>
              </div>
              {notebookTab === "quantitative" ? (
                game.save.quantitativeHistory.length ? (
                  <div className="history-list">
                    {game.save.quantitativeHistory.slice(0, 8).map((qh) => (
                      <div key={qh.id} className="quant-history-item">
                        <small>
                          {qh.outcome} · ×{qh.extent}
                        </small>
                        <strong>{qh.reactionName}</strong>
                        <p>
                          份数利用率{" "}
                          {Math.round(qh.portionUtilization * 1000) / 10}%
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-history">
                    <Scale size={32} />
                    <h3>尚无定量实验记录</h3>
                    <p>
                      在进阶模式执行定量计算后，投入、消耗与利用率会记录在此。
                    </p>
                  </div>
                )
              ) : notebookTab === "history" ? (
                game.save.history.length ? (
                  <div className="history-list">
                    {game.save.history.slice(0, 8).map((h, i) => (
                      <button
                        key={h.id}
                        className={h.reactionId ? "successful" : ""}
                        onClick={() =>
                          h.products[0] && setDetail(byId[h.products[0]])
                        }
                      >
                        <span className="history-dot" />
                        <small>
                          EXPERIMENT{" "}
                          {String(game.save.history.length - i).padStart(
                            3,
                            "0",
                          )}
                          <time>
                            {new Date(h.time).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                        </small>
                        <strong>
                          {h.reactionId
                            ? reactions.find((r) => r.id === h.reactionId)?.name
                            : "未匹配规则"}
                        </strong>
                        <p>
                          {h.products.length
                            ? h.products.map((id) => byId[id].name).join(" + ")
                            : "调整材料与条件，再试一次"}
                        </p>
                        {h.newProducts.length > 0 && (
                          <span className="history-new">
                            + {h.newProducts.length} 个新发现
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="empty-history">
                    <BookOpen size={35} />
                    <h3>你的实验手记</h3>
                    <p>
                      这里会记录每一次尝试。
                      <br />
                      从水与温度开始吧。
                    </p>
                    <span>01 ─── 未知的可能</span>
                  </div>
                )
              ) : completedList.length ? (
                <div className="history-list">
                  {completedList.slice(0, 10).map((r) => (
                    <button
                      key={r.id}
                      className="successful"
                      onClick={() =>
                        r.products[0] &&
                        setDetail(byId[r.products[0].substanceId])
                      }
                    >
                      <span className="history-dot" />
                      <small>
                        {r.changeType === "physical" ? "物理变化" : "化学变化"}
                      </small>
                      <strong>{r.name}</strong>
                      <p>{fmt(r.equation)}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-history">
                  <BookOpen size={35} />
                  <h3>尚未记录反应</h3>
                  <p>完成自由实验后，已验证的反应路径会收录在此。</p>
                </div>
              )}
            </section>

            <section className="knowledge-card">
              <div>
                <Lightbulb size={17} />
                <span>{result ? "实验背后的科学" : "实验室小知识"}</span>
              </div>
              <h3>
                {result
                  ? result.name
                  : isAdvanced
                    ? "系数 vs 下标"
                    : "同一种物质，不同的样子"}
              </h3>
              <p>
                {result
                  ? playerCopy(result.explanation)
                  : isAdvanced
                    ? "化学式前的系数表示参与反应的份数比例，化学式内的下标决定物质的原子构成。配平时只能调整系数，绝不能修改下标。"
                    : "冰、水和水蒸气看起来不同，但它们都由 H₂O 分子构成。改变温度，会发生什么？"}
              </p>
              {result?.expectedObservations.length ? (
                <p className="observation-note">
                  <strong>可观察现象：</strong>
                  {result.expectedObservations.join(" ")}
                </p>
              ) : null}
              {result?.simplificationNotes.length ? (
                <details>
                  <summary>查看模拟简化说明</summary>
                  {result.simplificationNotes.map((s, i) => (
                    <p key={i}>{playerCopy(s)}</p>
                  ))}
                </details>
              ) : (
                <span>
                  {isAdvanced ? "定量化学 / 化学计量" : "物理变化 / 物质状态"}
                </span>
              )}
            </section>

            <div className="lab-note">
              <ShieldCheck size={16} />
              <p>
                这里是虚拟实验室。
                <br />
                用探索认识科学，用知识保护好奇心。
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
