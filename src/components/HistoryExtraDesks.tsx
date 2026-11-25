import { useState } from "react";
import {
  Activity,
  Atom,
  CheckCircle2,
  Flame,
  FlaskConical,
  RefreshCw,
  Zap,
} from "lucide-react";
import type { HistoryChapterDef, HistorySessionState } from "../types";
import {
  computeFaradayTrial,
  simulateHaberProcess,
} from "../engine/historyEngine";

export function HistoryExtraDesks({
  chapter,
  session,
  patchSession,
  isMobilePortrait,
}: {
  chapter: HistoryChapterDef;
  session: HistorySessionState;
  patchSession: (
    updater: (cur: HistorySessionState) => HistorySessionState,
  ) => void;
  isMobilePortrait: boolean;
}) {
  const exp = chapter.stages?.experiment;
  const pz = session.puzzle;
  const [selectedAngle, setSelectedAngle] = useState<
    "forward" | "side" | "backscatter"
  >("forward");
  const [mobileSubTab, setMobileSubTab] = useState<"lab" | "conclude">("lab");

  if (!exp) return null;

  /* ==================== CH.05: UREA SYNTHESIS & ISOMER ANALYSIS ==================== */
  if (exp.puzzleType === "urea_isomer_analysis" && exp.ureaConfig) {
    const cfg = exp.ureaConfig;
    const testedIds = pz.ureaTestedIds ?? [];
    const canTest = Boolean(pz.ureaReacted && pz.ureaEvaporated);

    return (
      <div className="extra-desk puzzle-urea-box">
        {isMobilePortrait && (
          <div
            className="mobile-seg-tabs puzzle-sub-tabs"
            role="tablist"
            aria-label="尿素合成步骤"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileSubTab === "lab"}
              className={mobileSubTab === "lab" ? "active" : ""}
              onClick={() => setMobileSubTab("lab")}
            >
              1. 结晶与对照 ({testedIds.length}/{cfg.tests.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileSubTab === "conclude"}
              className={mobileSubTab === "conclude" ? "active" : ""}
              onClick={() => setMobileSubTab("conclude")}
            >
              2. 身份与结构判断
              {pz.ureaConclusionChoice !== null &&
              pz.ureaConclusionChoice !== undefined
                ? " ✓"
                : ""}
            </button>
          </div>
        )}

        {(!isMobilePortrait || mobileSubTab === "lab") && (
          <div className="extra-desk-section">
            <h4>无机盐制备与蒸发结晶</h4>
            <div className="urea-steps-row">
              <button
                type="button"
                className={`step-action-card ${pz.ureaReacted ? "done" : ""}`}
                onClick={() =>
                  patchSession((cur) => ({
                    ...cur,
                    puzzle: { ...cur.puzzle, ureaReacted: true },
                  }))
                }
              >
                <div className="step-action-head">
                  <FlaskConical size={15} />
                  <strong>{cfg.reactionStepLabel}</strong>
                  {pz.ureaReacted && <CheckCircle2 size={15} />}
                </div>
                {pz.ureaReacted && <p>{cfg.reactionResultNote}</p>}
              </button>

              <button
                type="button"
                disabled={!pz.ureaReacted}
                className={`step-action-card ${pz.ureaEvaporated ? "done" : ""}`}
                onClick={() =>
                  patchSession((cur) => ({
                    ...cur,
                    puzzle: { ...cur.puzzle, ureaEvaporated: true },
                  }))
                }
              >
                <div className="step-action-head">
                  <Flame size={15} />
                  <strong>{cfg.evaporationStepLabel}</strong>
                  {pz.ureaEvaporated && <CheckCircle2 size={15} />}
                </div>
                {pz.ureaEvaporated && <p>{cfg.evaporationResultNote}</p>}
              </button>
            </div>

            <h4>
              产物 X 对照检验（已测 {testedIds.length}/{cfg.tests.length}）
            </h4>
            <div className="urea-tests-grid">
              {cfg.tests.map((t) => {
                const done = testedIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className={`extra-test-card ${done ? "done" : ""}`}
                  >
                    <button
                      type="button"
                      className={`secondary small ${done ? "active-cond" : ""}`}
                      disabled={!canTest}
                      onClick={() =>
                        patchSession((cur) => ({
                          ...cur,
                          puzzle: {
                            ...cur.puzzle,
                            ureaTestedIds: [
                              ...new Set([
                                ...(cur.puzzle.ureaTestedIds ?? []),
                                t.id,
                              ]),
                            ],
                          },
                        }))
                      }
                    >
                      {done ? `✓ ${t.label}` : t.label}
                    </button>
                    {done ? (
                      <p className="obs-text">{t.observation}</p>
                    ) : (
                      <small className="muted">
                        {canTest ? "点击执行对照检验" : "完成蒸发结晶后可测"}
                      </small>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(!isMobilePortrait || mobileSubTab === "conclude") && (
          <div className="extra-desk-section">
            <h4>{cfg.conclusionPrompt}</h4>
            <div className="choice-list">
              {cfg.conclusionOptions.map((opt, idx) => (
                <button
                  type="button"
                  key={opt.label}
                  className={`choice-card ${pz.ureaConclusionChoice === idx ? "selected" : ""}`}
                  onClick={() =>
                    patchSession((cur) => ({
                      ...cur,
                      puzzle: { ...cur.puzzle, ureaConclusionChoice: idx },
                    }))
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {session.difficulty === "advanced" && (
              <div className="advanced-addon-box">
                <h4>{cfg.advancedIsomerPrompt}</h4>
                <div className="choice-list">
                  {cfg.advancedIsomerOptions.map((opt, idx) => (
                    <button
                      type="button"
                      key={opt.label}
                      className={`choice-card ${pz.ureaIsomerChoice === idx ? "selected" : ""}`}
                      onClick={() =>
                        patchSession((cur) => ({
                          ...cur,
                          puzzle: { ...cur.puzzle, ureaIsomerChoice: idx },
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
      </div>
    );
  }

  /* ==================== CH.06: FARADAY LAWS OF ELECTROLYSIS ==================== */
  if (exp.puzzleType === "faraday_electrolysis_lab" && exp.faradayConfig) {
    const cfg = exp.faradayConfig;
    const activeEl = pz.faradayElectrolyte ?? "agno3_ag";
    const activeCurrent = pz.faradayCurrent ?? 1;
    const activeDuration = pz.faradayDuration ?? 1;
    const logs = pz.faradayLogs ?? [];
    const elObj =
      cfg.electrolytes.find((e) => e.id === activeEl) ?? cfg.electrolytes[0];
    const preview = computeFaradayTrial(
      chapter,
      activeEl,
      activeCurrent,
      activeDuration,
    );

    const recordTrial = () => {
      patchSession((cur) => {
        const prev = cur.puzzle.faradayLogs ?? [];
        const dup = prev.some(
          (r) =>
            r.electrolyteId === preview.electrolyteId &&
            r.currentA === preview.currentA &&
            r.duration === preview.duration,
        );
        return {
          ...cur,
          puzzle: {
            ...cur.puzzle,
            faradayLogs: dup ? prev : [...prev, preview].slice(-10),
          },
          feedback: dup
            ? `该参数组合已记录（${elObj.productName} ${preview.yieldMol.toFixed(2)} 份）。可调整电量或更换电解液继续对照。`
            : `已记录：${elObj.name} · Q = ${preview.chargeQ} 单位 → 析出 ${preview.yieldMol.toFixed(2)} 份 ${elObj.productName}`,
        };
      });
    };

    return (
      <div className="extra-desk puzzle-faraday-box">
        <p className="scope-note">{cfg.modelNote}</p>

        {isMobilePortrait && (
          <div
            className="mobile-seg-tabs puzzle-sub-tabs"
            role="tablist"
            aria-label="电解实验步骤"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileSubTab === "lab"}
              className={mobileSubTab === "lab" ? "active" : ""}
              onClick={() => setMobileSubTab("lab")}
            >
              1. 通电对照 ({logs.length} 组)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileSubTab === "conclude"}
              className={mobileSubTab === "conclude" ? "active" : ""}
              onClick={() => setMobileSubTab("conclude")}
            >
              2. 定律归纳
              {pz.faradayLawChoice !== null && pz.faradayLawChoice !== undefined
                ? " ✓"
                : ""}
            </button>
          </div>
        )}

        {(!isMobilePortrait || mobileSubTab === "lab") && (
          <div className="extra-desk-section">
            <div className="param-control-group">
              <span className="param-label">选择电解液</span>
              <div
                className="param-pill-row"
                role="radiogroup"
                aria-label="电解液选择"
              >
                {cfg.electrolytes.map((el) => (
                  <button
                    type="button"
                    key={el.id}
                    role="radio"
                    aria-checked={activeEl === el.id}
                    className={`param-pill ${activeEl === el.id ? "active" : ""}`}
                    onClick={() =>
                      patchSession((cur) => ({
                        ...cur,
                        puzzle: { ...cur.puzzle, faradayElectrolyte: el.id },
                      }))
                    }
                  >
                    <strong>{el.name}</strong>
                    <small>{el.halfReaction}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="param-dual-row">
              <div className="param-control-group">
                <span className="param-label">电流强度 I</span>
                <div
                  className="param-seg-bar"
                  role="radiogroup"
                  aria-label="电流强度"
                >
                  {cfg.currentsA.map((curA) => (
                    <button
                      type="button"
                      key={curA}
                      role="radio"
                      aria-checked={activeCurrent === curA}
                      className={activeCurrent === curA ? "active" : ""}
                      onClick={() =>
                        patchSession((cur) => ({
                          ...cur,
                          puzzle: { ...cur.puzzle, faradayCurrent: curA },
                        }))
                      }
                    >
                      {curA} A
                    </button>
                  ))}
                </div>
              </div>
              <div className="param-control-group">
                <span className="param-label">通电时长 t</span>
                <div
                  className="param-seg-bar"
                  role="radiogroup"
                  aria-label="通电时长"
                >
                  {cfg.durationsUnit.map((dur) => (
                    <button
                      type="button"
                      key={dur}
                      role="radio"
                      aria-checked={activeDuration === dur}
                      className={activeDuration === dur ? "active" : ""}
                      onClick={() =>
                        patchSession((cur) => ({
                          ...cur,
                          puzzle: { ...cur.puzzle, faradayDuration: dur },
                        }))
                      }
                    >
                      {dur} 单位
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="faraday-readout-bar">
              <div>
                <small>当前电量 Q = I × t</small>
                <strong>{preview.chargeQ} 电量单位</strong>
              </div>
              <div>
                <small>预计析出 {elObj.productName}</small>
                <strong>{preview.yieldMol.toFixed(2)} 份</strong>
              </div>
              <button
                type="button"
                className="primary small"
                onClick={recordTrial}
              >
                <Zap size={14} /> 通电并记录数据
              </button>
            </div>

            {logs.length > 0 && (
              <div className="faraday-log-table">
                <div className="faraday-log-head">
                  <span>电解液</span>
                  <span>电量 Q</span>
                  <span>析出量</span>
                </div>
                {logs.map((row, idx) => {
                  const rowEl = cfg.electrolytes.find(
                    (e) => e.id === row.electrolyteId,
                  );
                  return (
                    <div
                      key={`${row.electrolyteId}-${row.currentA}-${row.duration}-${idx}`}
                      className="faraday-log-row"
                    >
                      <span>{rowEl?.productName ?? row.electrolyteId}</span>
                      <span>
                        {row.currentA}A×{row.duration} = {row.chargeQ}
                      </span>
                      <strong>{row.yieldMol.toFixed(2)} 份</strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(!isMobilePortrait || mobileSubTab === "conclude") && (
          <div className="extra-desk-section">
            <h4>{cfg.lawPrompt}</h4>
            <div className="choice-list">
              {cfg.lawOptions.map((opt, idx) => (
                <button
                  type="button"
                  key={opt.label}
                  className={`choice-card ${pz.faradayLawChoice === idx ? "selected" : ""}`}
                  onClick={() =>
                    patchSession((cur) => ({
                      ...cur,
                      puzzle: { ...cur.puzzle, faradayLawChoice: idx },
                    }))
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {session.difficulty === "advanced" && (
              <div className="advanced-addon-box">
                <label className="numeric-check-row">
                  <span>{cfg.advancedSeriesPrompt}</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    aria-label="串联析出铜份数"
                    placeholder="输入份数（例如 2）"
                    value={pz.faradaySeriesAnswer ?? ""}
                    onChange={(e) =>
                      patchSession((cur) => ({
                        ...cur,
                        puzzle: {
                          ...cur.puzzle,
                          faradaySeriesAnswer: e.target.value,
                        },
                      }))
                    }
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ==================== CH.08: CURIE RADIOACTIVITY VIRTUAL DATA ANALYSIS ==================== */
  if (
    exp.puzzleType === "radioactivity_data_analysis" &&
    exp.radioactivityConfig
  ) {
    const cfg = exp.radioactivityConfig;
    const measuredIds = pz.radioMeasuredIds ?? [];
    const maxLog = Math.log10(1000);

    return (
      <div className="extra-desk puzzle-radio-box">
        <p className="scope-note">{cfg.safetyAndModelNote}</p>

        {isMobilePortrait && (
          <div
            className="mobile-seg-tabs puzzle-sub-tabs"
            role="tablist"
            aria-label="电离数据分析步骤"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileSubTab === "lab"}
              className={mobileSubTab === "lab" ? "active" : ""}
              onClick={() => setMobileSubTab("lab")}
            >
              1. 电离测定 ({measuredIds.length}/{cfg.samples.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileSubTab === "conclude"}
              className={mobileSubTab === "conclude" ? "active" : ""}
              onClick={() => setMobileSubTab("conclude")}
            >
              2. 信号推断
              {pz.radioAnomalyChoice !== null &&
              pz.radioAnomalyChoice !== undefined
                ? " ✓"
                : ""}
            </button>
          </div>
        )}

        {(!isMobilePortrait || mobileSubTab === "lab") && (
          <div className="extra-desk-section">
            <h4>压电石英验电器虚拟读数（对数示意条）</h4>
            <div className="radio-sample-list">
              {cfg.samples.map((s) => {
                const done = measuredIds.includes(s.id);
                const pct = done
                  ? Math.max(
                      12,
                      Math.min(
                        100,
                        Math.round(
                          (Math.log10(s.relativeIntensity + 1) / maxLog) * 100,
                        ),
                      ),
                    )
                  : 0;
                return (
                  <div
                    key={s.id}
                    className={`radio-sample-card ${done ? "done" : ""}`}
                  >
                    <div className="radio-sample-head">
                      <div>
                        <strong>{s.label}</strong>
                        <small>{s.compositionNote}</small>
                      </div>
                      <button
                        type="button"
                        className={`secondary small ${done ? "active-cond" : ""}`}
                        onClick={() =>
                          patchSession((cur) => ({
                            ...cur,
                            puzzle: {
                              ...cur.puzzle,
                              radioMeasuredIds: [
                                ...new Set([
                                  ...(cur.puzzle.radioMeasuredIds ?? []),
                                  s.id,
                                ]),
                              ],
                            },
                          }))
                        }
                      >
                        <Activity size={13} />
                        {done ? "已测定" : "测定电离信号"}
                      </button>
                    </div>
                    {done && (
                      <div className="radio-reading-block">
                        <div className="radio-bar-track">
                          <i style={{ width: `${pct}%` }} />
                        </div>
                        <strong className="radio-reading-val">
                          {s.readingDisplay}
                        </strong>
                        <p className="obs-text">{s.spectrumNote}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(!isMobilePortrait || mobileSubTab === "conclude") && (
          <div className="extra-desk-section">
            <h4>{cfg.anomalyPrompt}</h4>
            <div className="choice-list">
              {cfg.anomalyOptions.map((opt, idx) => (
                <button
                  type="button"
                  key={opt.label}
                  className={`choice-card ${pz.radioAnomalyChoice === idx ? "selected" : ""}`}
                  onClick={() =>
                    patchSession((cur) => ({
                      ...cur,
                      puzzle: { ...cur.puzzle, radioAnomalyChoice: idx },
                    }))
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {session.difficulty === "advanced" && (
              <div className="advanced-addon-box">
                <h4>{cfg.advancedModelPrompt}</h4>
                <div className="choice-list">
                  {cfg.advancedModelOptions.map((opt, idx) => (
                    <button
                      type="button"
                      key={opt.label}
                      className={`choice-card ${pz.radioModelChoice === idx ? "selected" : ""}`}
                      onClick={() =>
                        patchSession((cur) => ({
                          ...cur,
                          puzzle: { ...cur.puzzle, radioModelChoice: idx },
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
      </div>
    );
  }

  /* ==================== CH.09: RUTHERFORD GOLD-FOIL SCATTERING ==================== */
  if (
    exp.puzzleType === "rutherford_scattering_model" &&
    exp.scatteringConfig
  ) {
    const cfg = exp.scatteringConfig;
    const modelView = pz.scatterModelView ?? "plum_pudding";
    const observed = pz.scatterObservedAngles ?? [];
    const activeAngleObj =
      cfg.angles.find((a) => a.id === selectedAngle) ?? cfg.angles[0];

    const switchModel = (next: "plum_pudding" | "nuclear") => {
      patchSession((cur) => ({
        ...cur,
        puzzle: {
          ...cur.puzzle,
          scatterModelView: next,
          scatterComparedBoth:
            cur.puzzle.scatterComparedBoth ||
            (cur.puzzle.scatterModelView ?? "plum_pudding") !== next,
        },
      }));
    };

    const fireBeam = () => {
      patchSession((cur) => ({
        ...cur,
        puzzle: {
          ...cur.puzzle,
          scatterObservedAngles: [
            ...new Set([
              ...(cur.puzzle.scatterObservedAngles ?? []),
              selectedAngle,
            ]),
          ],
        },
        feedback: `已观测 ${activeAngleObj.label}（${activeAngleObj.rangeLabel}）：${activeAngleObj.fractionDisplay}`,
      }));
    };

    return (
      <div className="extra-desk puzzle-scatter-box">
        <p className="scope-note">{cfg.nuclearModelNote}</p>

        {isMobilePortrait && (
          <div
            className="mobile-seg-tabs puzzle-sub-tabs"
            role="tablist"
            aria-label="粒子散射实验步骤"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileSubTab === "lab"}
              className={mobileSubTab === "lab" ? "active" : ""}
              onClick={() => setMobileSubTab("lab")}
            >
              1. 散射观测 ({observed.length}/{cfg.angles.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileSubTab === "conclude"}
              className={mobileSubTab === "conclude" ? "active" : ""}
              onClick={() => setMobileSubTab("conclude")}
            >
              2. 模型推断
              {pz.scatterModelChoice !== null &&
              pz.scatterModelChoice !== undefined
                ? " ✓"
                : ""}
            </button>
          </div>
        )}

        {(!isMobilePortrait || mobileSubTab === "lab") && (
          <div className="extra-desk-section">
            <div className="scatter-model-bar">
              <span>对比假设模型：</span>
              <div
                className="param-seg-bar"
                role="radiogroup"
                aria-label="散射模型示意切换"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={modelView === "plum_pudding"}
                  className={modelView === "plum_pudding" ? "active" : ""}
                  onClick={() => switchModel("plum_pudding")}
                >
                  葡萄干布丁模型
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={modelView === "nuclear"}
                  className={modelView === "nuclear" ? "active" : ""}
                  onClick={() => switchModel("nuclear")}
                >
                  中心原子核模型
                </button>
              </div>
            </div>

            <div className="scatter-svg-wrap">
              <svg
                viewBox="0 0 360 128"
                className="scatter-svg"
                role="img"
                aria-label={
                  modelView === "nuclear"
                    ? "原子核模型 α 粒子散射示意图"
                    : "葡萄干布丁模型 α 粒子散射示意图"
                }
              >
                <rect width="360" height="128" rx="10" fill="#0d1a26" />
                <line
                  x1="184"
                  y1="14"
                  x2="184"
                  y2="114"
                  stroke="#f4d58d"
                  strokeWidth="3"
                  strokeOpacity="0.6"
                />
                {modelView === "plum_pudding" ? (
                  <>
                    <circle
                      cx="184"
                      cy="64"
                      r="34"
                      fill="rgba(234,196,119,0.16)"
                      stroke="#eac477"
                      strokeDasharray="3 3"
                    />
                    {[28, 46, 64, 82, 100].map((y) => (
                      <line
                        key={y}
                        x1="28"
                        y1={y}
                        x2="330"
                        y2={y + (y === 64 ? 2 : 0)}
                        stroke="#7ec8e8"
                        strokeWidth="1.8"
                      />
                    ))}
                    <text x="16" y="18" fill="#eac477" fontSize="9.5">
                      布丁模型预测：几乎全部直穿，无大角度反弹
                    </text>
                  </>
                ) : (
                  <>
                    <circle
                      cx="184"
                      cy="64"
                      r="34"
                      fill="none"
                      stroke="rgba(131,205,233,0.28)"
                      strokeDasharray="3 3"
                    />
                    <circle cx="184" cy="64" r="6" fill="#ff7f5c" />
                    <line
                      x1="28"
                      y1="26"
                      x2="332"
                      y2="26"
                      stroke="#7ec8e8"
                      strokeWidth="1.8"
                    />
                    <line
                      x1="28"
                      y1="102"
                      x2="332"
                      y2="102"
                      stroke="#7ec8e8"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M28,48 L172,48 Q186,48 208,34 L320,16"
                      fill="none"
                      stroke="#f4d58d"
                      strokeWidth="1.9"
                    />
                    <path
                      d="M28,64 L170,64 Q177,64 169,56 L66,22"
                      fill="none"
                      stroke="#ff8a65"
                      strokeWidth="2.2"
                      strokeDasharray="4 3"
                    />
                    <text x="16" y="18" fill="#8fd6f2" fontSize="9.5">
                      核模型预测：绝大多数直穿 + 极少数正碰核心大角度反弹
                    </text>
                  </>
                )}
              </svg>
            </div>

            <div className="param-control-group">
              <span className="param-label">选择荧光屏观测角并采集计数</span>
              <div
                className="param-pill-row"
                role="radiogroup"
                aria-label="荧光屏观测角"
              >
                {cfg.angles.map((ang) => {
                  const done = observed.includes(ang.id);
                  return (
                    <button
                      type="button"
                      key={ang.id}
                      role="radio"
                      aria-checked={selectedAngle === ang.id}
                      className={`param-pill ${selectedAngle === ang.id ? "active" : ""} ${done ? "recorded" : ""}`}
                      onClick={() => setSelectedAngle(ang.id)}
                    >
                      <strong>{done ? `✓ ${ang.label}` : ang.label}</strong>
                      <small>{ang.rangeLabel}</small>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="primary small"
                style={{ alignSelf: "flex-start", marginTop: 4 }}
                onClick={fireBeam}
              >
                <Atom size={14} /> 发射模拟 α 粒子束
              </button>
            </div>

            {observed.length > 0 && (
              <div className="scatter-obs-list">
                {cfg.angles
                  .filter((a) => observed.includes(a.id))
                  .map((a) => (
                    <div key={a.id} className="scatter-obs-item">
                      <strong>
                        {a.label}（{a.rangeLabel}）：{a.fractionDisplay}
                      </strong>
                      <p>{a.observation}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {(!isMobilePortrait || mobileSubTab === "conclude") && (
          <div className="extra-desk-section">
            <h4>{cfg.modelPrompt}</h4>
            <div className="choice-list">
              {cfg.modelOptions.map((opt, idx) => (
                <button
                  type="button"
                  key={opt.label}
                  className={`choice-card ${pz.scatterModelChoice === idx ? "selected" : ""}`}
                  onClick={() =>
                    patchSession((cur) => ({
                      ...cur,
                      puzzle: { ...cur.puzzle, scatterModelChoice: idx },
                    }))
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {session.difficulty === "advanced" && (
              <div className="advanced-addon-box">
                <h4>{cfg.advancedMechanismPrompt}</h4>
                <div className="choice-list">
                  {cfg.advancedMechanismOptions.map((opt, idx) => (
                    <button
                      type="button"
                      key={opt.label}
                      className={`choice-card ${pz.scatterMechanismChoice === idx ? "selected" : ""}`}
                      onClick={() =>
                        patchSession((cur) => ({
                          ...cur,
                          puzzle: {
                            ...cur.puzzle,
                            scatterMechanismChoice: idx,
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
      </div>
    );
  }

  /* ==================== CH.10: HABER-BOSCH AMMONIA INDUSTRIAL PROCESS ==================== */
  if (exp.puzzleType === "haber_bosch_process" && exp.haberConfig) {
    const cfg = exp.haberConfig;
    const temp = pz.haberTemp ?? "low";
    const pressure = pz.haberPressure ?? "low";
    const catalyst = pz.haberCatalyst ?? "none";
    const recycle = Boolean(pz.haberRecycle);
    const trialCount = pz.haberTrialCount ?? 0;
    const live = simulateHaberProcess({ temp, pressure, catalyst, recycle });

    const runTrial = () => {
      patchSession((cur) => {
        const nextCount = (cur.puzzle.haberTrialCount ?? 0) + 1;
        const entry = {
          temp,
          pressure,
          catalyst,
          recycle,
          rateScore: live.rateScore,
          eqYieldPct: live.eqYieldPct,
          outputScore: live.outputScore,
          feasible: live.feasible,
        };
        return {
          ...cur,
          puzzle: {
            ...cur.puzzle,
            haberTrialCount: nextCount,
            haberTrialHistory: [
              ...(cur.puzzle.haberTrialHistory ?? []),
              entry,
            ].slice(-6),
          },
          feedback: `试车 #${nextCount}：综合产率 ${live.outputScore}（速率 ${live.rateScore} · 单程平衡 ${live.eqYieldPct}%）— ${live.diagnosis}`,
        };
      });
    };

    return (
      <div className="extra-desk puzzle-haber-box">
        <p className="scope-note">{cfg.modelBoundaryNote}</p>

        {isMobilePortrait && (
          <div
            className="mobile-seg-tabs puzzle-sub-tabs"
            role="tablist"
            aria-label="合成氨工艺调试步骤"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobileSubTab === "lab"}
              className={mobileSubTab === "lab" ? "active" : ""}
              onClick={() => setMobileSubTab("lab")}
            >
              1. 工艺试车 ({trialCount} 次)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileSubTab === "conclude"}
              className={mobileSubTab === "conclude" ? "active" : ""}
              onClick={() => setMobileSubTab("conclude")}
            >
              2. 工况诊断
              {session.difficulty === "advanced" ? "与校验" : ""}
            </button>
          </div>
        )}

        {(!isMobilePortrait || mobileSubTab === "lab") && (
          <div className="extra-desk-section">
            <div className="param-control-group">
              <span className="param-label">
                反应温度（N₂ + 3H₂ ⇌ 2NH₃ 放热）
              </span>
              <div
                className="param-pill-row"
                role="radiogroup"
                aria-label="合成氨温度"
              >
                {cfg.tempOptions.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    role="radio"
                    aria-checked={temp === o.id}
                    className={`param-pill ${temp === o.id ? "active" : ""}`}
                    onClick={() =>
                      patchSession((cur) => ({
                        ...cur,
                        puzzle: { ...cur.puzzle, haberTemp: o.id },
                      }))
                    }
                  >
                    <strong>{o.label}</strong>
                    <small>{o.detail}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="param-control-group">
              <span className="param-label">
                反应压强（4 份气体 → 2 份气体）
              </span>
              <div
                className="param-pill-row"
                role="radiogroup"
                aria-label="合成氨压强"
              >
                {cfg.pressureOptions.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    role="radio"
                    aria-checked={pressure === o.id}
                    className={`param-pill ${pressure === o.id ? "active" : ""}`}
                    onClick={() =>
                      patchSession((cur) => ({
                        ...cur,
                        puzzle: { ...cur.puzzle, haberPressure: o.id },
                      }))
                    }
                  >
                    <strong>{o.label}</strong>
                    <small>{o.detail}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="param-control-group">
              <span className="param-label">催化剂选型</span>
              <div
                className="param-pill-row"
                role="radiogroup"
                aria-label="合成氨催化剂"
              >
                {cfg.catalystOptions.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    role="radio"
                    aria-checked={catalyst === o.id}
                    className={`param-pill ${catalyst === o.id ? "active" : ""}`}
                    onClick={() =>
                      patchSession((cur) => ({
                        ...cur,
                        puzzle: { ...cur.puzzle, haberCatalyst: o.id },
                      }))
                    }
                  >
                    <strong>{o.label}</strong>
                    <small>{o.detail}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="haber-recycle-row">
              <button
                type="button"
                role="switch"
                aria-checked={recycle}
                className={`secondary small ${recycle ? "active-cond" : ""}`}
                onClick={() =>
                  patchSession((cur) => ({
                    ...cur,
                    puzzle: { ...cur.puzzle, haberRecycle: !recycle },
                  }))
                }
              >
                <RefreshCw size={13} />
                未反应原料气循环：{recycle ? "已开启" : "未开启"}
              </button>
              <button
                type="button"
                className="primary small"
                onClick={runTrial}
              >
                运行工艺试车（第 {trialCount + 1} 次）
              </button>
            </div>
          </div>
        )}

        {(!isMobilePortrait || mobileSubTab === "conclude") && (
          <div className="extra-desk-section">
            <div className="haber-kpi-grid">
              <div className="haber-kpi-card">
                <small>反应速率</small>
                <strong>{live.rateScore} / 100</strong>
              </div>
              <div className="haber-kpi-card">
                <small>单程平衡收率</small>
                <strong>{live.eqYieldPct}%</strong>
              </div>
              <div className="haber-kpi-card">
                <small>综合氨产出</small>
                <strong>{live.outputScore} / 100</strong>
              </div>
              <div className="haber-kpi-card">
                <small>工程经济性</small>
                <strong className={live.feasible ? "ok-text" : "warn-text"}>
                  {live.costLabel}
                </strong>
              </div>
            </div>
            <p className="haber-diag-note">{live.diagnosis}</p>

            {session.difficulty === "advanced" && (
              <div className="advanced-addon-box">
                <h4>{cfg.advancedRatioPrompt}</h4>
                <div className="choice-list">
                  {cfg.advancedRatioOptions.map((opt, idx) => (
                    <button
                      type="button"
                      key={opt.label}
                      className={`choice-card ${pz.haberRatioChoice === idx ? "selected" : ""}`}
                      onClick={() =>
                        patchSession((cur) => ({
                          ...cur,
                          puzzle: { ...cur.puzzle, haberRatioChoice: idx },
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
      </div>
    );
  }

  return null;
}
