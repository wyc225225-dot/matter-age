import { useState, useEffect } from "react";
import { Check, AlertTriangle, RotateCcw, Scale, Sparkles } from "lucide-react";
import type { Reaction } from "../types";
import { byId } from "../data";
import {
  checkEquationBalance,
  type BalanceCheckResult,
} from "../engine/balancingEngine";
import { Formula } from "./Shared";
import { SubstanceUnitGlyph } from "./AtomVisualizer";

export function EquationStudio({
  reaction,
  onSubmit,
}: {
  reaction: Reaction;
  onSubmit?: (
    rCoeffs: number[],
    pCoeffs: number[],
    result: BalanceCheckResult,
  ) => void;
}) {
  const [rCoeffs, setRCoeffs] = useState<number[]>(() =>
    reaction.reactants.map(() => 1),
  );
  const [pCoeffs, setPCoeffs] = useState<number[]>(() =>
    reaction.products.map(() => 1),
  );
  const [feedback, setFeedback] = useState<BalanceCheckResult | null>(null);

  useEffect(() => {
    setRCoeffs(reaction.reactants.map(() => 1));
    setPCoeffs(reaction.products.map(() => 1));
    setFeedback(null);
  }, [reaction.id]);

  const safeR = reaction.reactants.map((_, i) => rCoeffs[i] ?? 1);
  const safeP = reaction.products.map((_, i) => pCoeffs[i] ?? 1);
  const liveCheck = checkEquationBalance(reaction, safeR, safeP, byId);
  const allElements = [
    ...new Set([
      ...Object.keys(liveCheck.leftAtoms),
      ...Object.keys(liveCheck.rightAtoms),
    ]),
  ];

  const updateCoeff = (side: "r" | "p", index: number, nextVal: number) => {
    const clamped = Math.max(1, Math.min(99, Math.trunc(nextVal) || 1));
    if (side === "r") {
      setRCoeffs((prev) => prev.map((v, i) => (i === index ? clamped : v)));
    } else {
      setPCoeffs((prev) => prev.map((v, i) => (i === index ? clamped : v)));
    }
    setFeedback(null);
  };

  return (
    <section className="equation-studio panel">
      <div className="panel-title">
        <h2>
          <Scale size={16} />
          方程式系数配平 · {reaction.name}
        </h2>
        <button
          type="button"
          className="text-button muted"
          onClick={() => {
            setRCoeffs(reaction.reactants.map(() => 1));
            setPCoeffs(reaction.products.map(() => 1));
            setFeedback(null);
          }}
        >
          <RotateCcw size={13} />
          重置系数
        </button>
      </div>

      <div className="studio-body">
        <p className="studio-hint">
          只能修改化学式<strong>前方</strong>
          的整数系数（1–99），化学式内部下标不可修改。支持任意等比例守恒配平，并会自动判断是否已化为最简整数比。
        </p>

        <div className="equation-builder">
          {reaction.reactants.map((item, idx) => {
            const sub = byId[item.substanceId];
            return (
              <div className="eq-term-group" key={`r-${item.substanceId}`}>
                {idx > 0 && <span className="eq-op">+</span>}
                <div className="eq-term-card">
                  <div className="coeff-stepper">
                    <button
                      type="button"
                      aria-label={`减少${sub.name}反应物系数`}
                      onClick={() => updateCoeff("r", idx, safeR[idx] - 1)}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      aria-label={`${sub.name}反应物系数`}
                      value={safeR[idx]}
                      onChange={(e) =>
                        updateCoeff("r", idx, Number(e.target.value))
                      }
                    />
                    <button
                      type="button"
                      aria-label={`增加${sub.name}反应物系数`}
                      onClick={() => updateCoeff("r", idx, safeR[idx] + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div
                    className="eq-formula-readonly"
                    title="化学式下标不可修改"
                  >
                    <Formula value={sub.formula} />
                    <small>{sub.name}</small>
                  </div>
                  <SubstanceUnitGlyph s={sub} count={safeR[idx]} compact />
                </div>
              </div>
            );
          })}

          <span className="eq-op eq-arrow">→</span>

          {reaction.products.map((item, idx) => {
            const sub = byId[item.substanceId];
            return (
              <div className="eq-term-group" key={`p-${item.substanceId}`}>
                {idx > 0 && <span className="eq-op">+</span>}
                <div className="eq-term-card">
                  <div className="coeff-stepper">
                    <button
                      type="button"
                      aria-label={`减少${sub.name}产物系数`}
                      onClick={() => updateCoeff("p", idx, safeP[idx] - 1)}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      aria-label={`${sub.name}产物系数`}
                      value={safeP[idx]}
                      onChange={(e) =>
                        updateCoeff("p", idx, Number(e.target.value))
                      }
                    />
                    <button
                      type="button"
                      aria-label={`增加${sub.name}产物系数`}
                      onClick={() => updateCoeff("p", idx, safeP[idx] + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div
                    className="eq-formula-readonly"
                    title="化学式下标不可修改"
                  >
                    <Formula value={sub.formula} />
                    <small>{sub.name}</small>
                  </div>
                  <SubstanceUnitGlyph s={sub} count={safeP[idx]} compact />
                </div>
              </div>
            );
          })}
        </div>

        <div className="studio-tally">
          {allElements.map((el) => {
            const l = liveCheck.leftAtoms[el] || 0;
            const r = liveCheck.rightAtoms[el] || 0;
            const eq = l === r;
            return (
              <div
                key={el}
                className={`studio-el-chip ${eq ? "balanced" : "unbalanced"}`}
              >
                <strong>{el}</strong>
                <span>
                  左 {l} {eq ? "=" : "≠"} 右 {r}
                </span>
              </div>
            );
          })}
        </div>

        <div className="studio-actions">
          <button
            type="button"
            className="primary"
            onClick={() => {
              const res = checkEquationBalance(reaction, safeR, safeP, byId);
              setFeedback(res);
              onSubmit?.(safeR, safeP, res);
            }}
          >
            <Check size={16} />
            检验配平
          </button>
        </div>

        {feedback && (
          <div
            className={`studio-feedback ${feedback.balanced ? (feedback.isSimplestRatio ? "simplest" : "proportional") : "error"}`}
            role="status"
          >
            {feedback.balanced ? (
              feedback.isSimplestRatio ? (
                <Sparkles size={16} />
              ) : (
                <Check size={16} />
              )
            ) : (
              <AlertTriangle size={16} />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </section>
  );
}
