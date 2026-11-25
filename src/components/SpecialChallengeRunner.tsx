import { useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  FlaskConical,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Condition, SpecialChallengeDef } from "../types";
import { byId, conditionName, reactions } from "../data";
import { useGame } from "../stores/game";
import {
  evaluateReverseInference,
  evaluateUnknownIdentification,
  runFiniteSpecialStep,
  runShortestPathStep,
} from "../engine/specialChallengeEngine";
import { SubstanceIcon } from "./SubstanceIcon";

export function SpecialChallengeRunner({
  challenge,
  onClose,
  toast,
}: {
  challenge: SpecialChallengeDef;
  onClose: () => void;
  toast: (s: string) => void;
}) {
  const game = useGame();
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState("");

  // Finite (extreme_experiment / zero_waste) state
  const [inv, setInv] = useState<Record<string, number>>(() => ({
    ...(challenge.finiteInventory ?? {}),
  }));
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [selConds, setSelConds] = useState<Condition[]>([]);
  const [selCat, setSelCat] = useState<string>("");

  // Shortest path state
  const [owned, setOwned] = useState<string[]>(() => [
    ...(challenge.initialSubstances ?? []),
  ]);
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);

  // Unknown identification state
  const [testedReagents, setTestedReagents] = useState<string[]>([]);
  const [guessId, setGuessId] = useState<string>("");

  function resetAll() {
    setAttempts(0);
    setSolved(false);
    setMessage("");
    setInv({ ...(challenge.finiteInventory ?? {}) });
    setInputs({});
    setSelConds([]);
    setSelCat("");
    setOwned([...(challenge.initialSubstances ?? [])]);
    setSelectedSubs([]);
    setTestedReagents([]);
    setGuessId("");
  }

  function recordWin(usedAttempts: number, metric?: string) {
    setSolved(true);
    const stars =
      usedAttempts <= challenge.limit
        ? 3
        : usedAttempts <= challenge.limit + 1
          ? 2
          : 1;
    const res = game.recordSpecialChallengeResult(
      challenge.id,
      stars,
      usedAttempts,
      metric,
    );
    toast(res.message);
  }

  function toggleCond(c: Condition) {
    setSelConds((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  const selectedSummary =
    challenge.type === "extreme_experiment" || challenge.type === "zero_waste"
      ? Object.entries(inputs)
          .map(([id, n]) => `${byId[id].name}×${n}`)
          .join(" + ") || "尚未投料"
      : challenge.type === "shortest_path" ||
          challenge.type === "reverse_inference"
        ? selectedSubs.map((id) => byId[id].name).join(" + ") || "尚未选物质"
        : guessId
          ? `已指认：${byId[guessId].name}`
          : `已检验 ${testedReagents.length} 项试剂`;

  return (
    <section className="panel special-runner">
      <div className="runner-sticky-top">
        <div className="runner-head">
          <button className="secondary small" onClick={onClose}>
            <ChevronLeft size={15} /> 返回挑战列表
          </button>
          <span className="tag-pill">
            {challenge.typeName} · {challenge.difficulty}
          </span>
          <button className="secondary small" onClick={resetAll}>
            <RotateCcw size={14} /> 重置本关
          </button>
        </div>

        <div className="runner-title-strip">
          <h2>{challenge.name}</h2>
          <p className="runner-meta">
            已操作 {attempts} / {challenge.limit} 次 · 奖励 +
            {challenge.reward.coins} 金币 / +{challenge.reward.researchPoints}{" "}
            RP
          </p>
        </div>
        <p className="muted runner-desc">{challenge.description}</p>
      </div>

      {/* TYPE 1 & 3: EXTREME EXPERIMENT & ZERO WASTE */}
      {(challenge.type === "extreme_experiment" ||
        challenge.type === "zero_waste") && (
        <div className="runner-body">
          <div className="runner-grid-two">
            <div>
              <h4>有限份数库存（点击投入或调整份数）</h4>
              <div className="special-inv-grid">
                {Object.entries(inv)
                  .filter(([, n]) => n > 0)
                  .map(([id, count]) => {
                    const amt = inputs[id] ?? 0;
                    return (
                      <div key={id} className="special-inv-item">
                        <SubstanceIcon s={byId[id]} size={24} />
                        <div>
                          <strong>{byId[id].name}</strong>
                          <small>库存 {count} 份</small>
                        </div>
                        <div className="qty-stepper">
                          <button
                            className="secondary small"
                            onClick={() =>
                              setInputs((prev) => {
                                const next = Math.max(0, (prev[id] ?? 0) - 1);
                                const out = { ...prev };
                                if (next === 0) delete out[id];
                                else out[id] = next;
                                return out;
                              })
                            }
                          >
                            -
                          </button>
                          <span>{amt}</span>
                          <button
                            className="secondary small"
                            onClick={() =>
                              setInputs((prev) => ({
                                ...prev,
                                [id]: Math.min(count, (prev[id] ?? 0) + 1),
                              }))
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
              {challenge.catalysts && challenge.catalysts.length > 0 && (
                <label className="cat-row">
                  <span>可用催化剂（不消耗）：</span>
                  <select
                    aria-label="特殊挑战催化剂"
                    value={selCat}
                    onChange={(e) => setSelCat(e.target.value)}
                  >
                    <option value="">不使用</option>
                    {challenge.catalysts.map((cid) => (
                      <option key={cid} value={cid}>
                        {byId[cid].name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div>
              <h4>允许条件</h4>
              <div className="cond-btn-row">
                {(challenge.allowedConditions ?? []).map((c) => (
                  <button
                    key={c}
                    className={`secondary small ${selConds.includes(c) ? "active-cond" : ""}`}
                    onClick={() => toggleCond(c)}
                  >
                    {conditionName(c)}
                  </button>
                ))}
              </div>
              {challenge.targetAmount && (
                <div className="target-callout">
                  目标：制得{" "}
                  <strong>
                    {byId[challenge.targetAmount.substanceId].name} ×
                    {challenge.targetAmount.minAmount}
                  </strong>
                  {challenge.targetAmount.exactZeroLeftover
                    ? "（当步要求 100% 份数利用率，零剩余！）"
                    : ""}
                </div>
              )}
              <div className="runner-sticky-footer">
                <div className="runner-selection-summary">
                  <small>当前配置</small>
                  <strong>
                    {selectedSummary}
                    {selConds.length > 0
                      ? ` · ${selConds.map(conditionName).join("+")}`
                      : ""}
                  </strong>
                </div>
                <button
                  className="primary"
                  disabled={solved || Object.keys(inputs).length === 0}
                  onClick={() => {
                    const nextAttempts = attempts + 1;
                    setAttempts(nextAttempts);
                    const out = runFiniteSpecialStep(
                      challenge,
                      inv,
                      inputs,
                      selConds,
                      selCat ? [selCat] : [],
                      reactions,
                      byId,
                    );
                    setMessage(out.message);
                    if (out.inventory) {
                      setInv(out.inventory);
                      setInputs({});
                    }
                    if (out.solved) {
                      recordWin(
                        nextAttempts,
                        out.utilization !== undefined
                          ? `利用率 ${Math.round(out.utilization * 100)}%`
                          : undefined,
                      );
                    }
                  }}
                >
                  <FlaskConical size={15} /> 执行定量步骤
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TYPE 2: SHORTEST PATH */}
      {challenge.type === "shortest_path" && (
        <div className="runner-body">
          <h4>
            当前关卡已拥有物质（目标：
            {challenge.targetSubstanceId
              ? byId[challenge.targetSubstanceId].name
              : ""}
            ，最多 {challenge.maxOptimalSteps} 步）
          </h4>
          <div className="pool-chips">
            {owned.map((id) => {
              const active = selectedSubs.includes(id);
              return (
                <button
                  key={id}
                  className={`choice-chip ${active ? "selected" : ""}`}
                  onClick={() =>
                    setSelectedSubs((s) =>
                      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
                    )
                  }
                >
                  <SubstanceIcon s={byId[id]} size={20} />
                  {byId[id].name}
                </button>
              );
            })}
          </div>
          <h4>选择条件</h4>
          <div className="cond-btn-row">
            {(challenge.allowedConditions ?? []).map((c) => (
              <button
                key={c}
                className={`secondary small ${selConds.includes(c) ? "active-cond" : ""}`}
                onClick={() => toggleCond(c)}
              >
                {conditionName(c)}
              </button>
            ))}
          </div>
          <div className="runner-sticky-footer">
            <div className="runner-selection-summary">
              <small>已选材料</small>
              <strong>
                {selectedSummary}
                {selConds.length > 0
                  ? ` · ${selConds.map(conditionName).join("+")}`
                  : ""}
              </strong>
            </div>
            <button
              className="primary"
              disabled={solved || selectedSubs.length === 0}
              onClick={() => {
                const nextAttempts = attempts + 1;
                setAttempts(nextAttempts);
                const out = runShortestPathStep(
                  challenge,
                  owned,
                  selectedSubs,
                  selConds,
                  attempts,
                  reactions,
                );
                setMessage(out.message);
                if (out.discoveredInRun) {
                  setOwned(out.discoveredInRun);
                  setSelectedSubs([]);
                }
                if (out.solved) {
                  recordWin(nextAttempts, `${nextAttempts} 步达成`);
                }
              }}
            >
              执行路径步骤
            </button>
          </div>
        </div>
      )}

      {/* TYPE 4: UNKNOWN IDENTIFICATION */}
      {challenge.type === "unknown_identification" && (
        <div className="runner-body">
          <p className="muted">线索：{challenge.identificationClue}</p>
          <h4>试剂检验台（点击运行检验并记录化学现象）</h4>
          <div className="reagent-tests-grid">
            {(challenge.reagentTests ?? []).map((t) => {
              const done = testedReagents.includes(t.reagentId);
              return (
                <div key={t.reagentId} className="reagent-test-card">
                  <strong>{t.reagentName}</strong>
                  {done ? (
                    <>
                      <p className="obs-text">{t.observation}</p>
                      <small className="muted">{t.scientificBasis}</small>
                    </>
                  ) : (
                    <button
                      className="secondary small"
                      onClick={() =>
                        setTestedReagents((prev) => [...prev, t.reagentId])
                      }
                    >
                      {t.actionLabel}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <h4>提交未知样品身份鉴定</h4>
          <div className="pool-chips">
            {(challenge.candidateIds ?? []).map((cid) => (
              <button
                key={cid}
                className={`choice-chip ${guessId === cid ? "selected" : ""}`}
                onClick={() => setGuessId(cid)}
              >
                <SubstanceIcon s={byId[cid]} size={20} />
                {byId[cid].name}
              </button>
            ))}
          </div>
          <div className="runner-sticky-footer">
            <div className="runner-selection-summary">
              <small>鉴定上下文</small>
              <strong>{selectedSummary}</strong>
            </div>
            <button
              className="primary"
              disabled={solved || !guessId}
              onClick={() => {
                const nextAttempts = attempts + 1;
                setAttempts(nextAttempts);
                const res = evaluateUnknownIdentification(
                  challenge,
                  testedReagents,
                  guessId,
                  byId,
                );
                setMessage(res.message);
                if (res.solved) {
                  recordWin(
                    nextAttempts,
                    `${testedReagents.length} 项试剂确诊`,
                  );
                }
              }}
            >
              确认鉴定结果
            </button>
          </div>
        </div>
      )}

      {/* TYPE 5: REVERSE INFERENCE */}
      {challenge.type === "reverse_inference" && (
        <div className="runner-body">
          <div className="target-callout">
            <strong>已知产物：</strong>
            {(challenge.givenProductIds ?? [])
              .map((id) => byId[id]?.name ?? id)
              .join(" + ")}
            <ul>
              {(challenge.givenObservations ?? []).map((obs) => (
                <li key={obs}>{obs}</li>
              ))}
            </ul>
          </div>
          <h4>从候选原料池反推反应物（可多选）</h4>
          <div className="pool-chips">
            {(challenge.reactantPoolIds ?? []).map((id) => {
              const active = selectedSubs.includes(id);
              return (
                <button
                  key={id}
                  className={`choice-chip ${active ? "selected" : ""}`}
                  onClick={() =>
                    setSelectedSubs((s) =>
                      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
                    )
                  }
                >
                  <SubstanceIcon s={byId[id]} size={20} />
                  {byId[id].name}
                </button>
              );
            })}
          </div>
          <h4>选择推断的反应条件</h4>
          <div className="cond-btn-row">
            {(challenge.conditionPool ?? []).map((c) => (
              <button
                key={c}
                className={`secondary small ${selConds.includes(c) ? "active-cond" : ""}`}
                onClick={() => toggleCond(c)}
              >
                {conditionName(c)}
              </button>
            ))}
          </div>
          <div className="runner-sticky-footer">
            <div className="runner-selection-summary">
              <small>反推配置</small>
              <strong>
                {selectedSummary}
                {selConds.length > 0
                  ? ` · ${selConds.map(conditionName).join("+")}`
                  : ""}
              </strong>
            </div>
            <button
              className="primary"
              disabled={solved || selectedSubs.length === 0}
              onClick={() => {
                const nextAttempts = attempts + 1;
                setAttempts(nextAttempts);
                const res = evaluateReverseInference(
                  challenge,
                  selectedSubs,
                  selConds,
                  reactions,
                );
                setMessage(res.message);
                if (res.solved) {
                  recordWin(nextAttempts, "逆推成功");
                }
              }}
            >
              <Sparkles size={15} /> 验证逆向推理
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className={`runner-feedback ${solved ? "win" : ""}`}>
          {solved && <CheckCircle2 size={16} />}
          <span>{message}</span>
        </div>
      )}
    </section>
  );
}
