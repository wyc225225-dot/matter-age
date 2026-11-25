import { Check, AlertTriangle, Scale, Sparkles } from "lucide-react";
import type { IntegerStoichiometryResult } from "../types";
import { byId } from "../data";
import { fmt } from "./Shared";
import { ReactionAtomPanel } from "./AtomVisualizer";

export function StoichiometryReport({
  stoich,
}: {
  stoich: IntegerStoichiometryResult;
}) {
  const { reaction, conservation } = stoich;
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

  const outcomeLabel =
    reaction.calculationStrategy === "phase_change"
      ? "物态变化（1:1 守恒）"
      : stoich.outcome === "complete"
        ? "完全反应"
        : stoich.outcome === "partial"
          ? "部分反应（含剩余物）"
          : "份数不足";

  return (
    <div className={`stoich-report outcome-${stoich.outcome}`}>
      <div className="stoich-header">
        <div>
          <span className="stoich-badge">{outcomeLabel}</span>
          {reaction.isTestFixture && (
            <span className="fixture-tag">开发数学演示样例</span>
          )}
          <h3>{reaction.name}</h3>
          <p className="stoich-eq">{fmt(reaction.equation)}</p>
        </div>
        <div className="stoich-extent">
          <small>整数反应次数</small>
          <strong>{stoich.extent}</strong>
        </div>
      </div>

      <div className="stoich-metrics">
        <div>
          <small>限制反应物</small>
          <strong>
            {stoich.limitingReactants
              .map((id) => byId[id]?.name || id)
              .join("、") || "无"}
          </strong>
        </div>
        <div>
          <small>整数份数利用率</small>
          <strong>{pct(stoich.portionUtilization)}</strong>
        </div>
        <div>
          <small>理论质量利用率</small>
          <strong>
            {stoich.massUtilization !== null
              ? pct(stoich.massUtilization)
              : "不适用"}
          </strong>
        </div>
        <div>
          <small>独立催化剂</small>
          <strong>
            {stoich.catalysts.length
              ? `${stoich.catalysts.map((id) => byId[id]?.name || id).join("、")}（未消耗）`
              : "未使用"}
          </strong>
        </div>
      </div>

      <div className="stoich-tables">
        <div className="stoich-table-block">
          <h4>反应物消耗与剩余</h4>
          <table>
            <thead>
              <tr>
                <th>物质</th>
                <th>系数</th>
                <th>投入</th>
                <th>消耗</th>
                <th>剩余</th>
                <th>投入质量</th>
              </tr>
            </thead>
            <tbody>
              {stoich.reactants.map((r) => (
                <tr
                  key={r.substanceId}
                  className={
                    stoich.limitingReactants.includes(r.substanceId)
                      ? "limiting-row"
                      : ""
                  }
                >
                  <td>
                    {byId[r.substanceId]?.name}
                    {stoich.limitingReactants.includes(r.substanceId) && (
                      <span className="lim-pill">限制</span>
                    )}
                  </td>
                  <td>{r.coefficient}</td>
                  <td>{r.input} 份</td>
                  <td>{r.consumed} 份</td>
                  <td className={r.remaining > 0 ? "rem-highlight" : ""}>
                    {r.remaining} 份
                  </td>
                  <td>
                    {r.inputMassG !== null ? `${r.inputMassG} g` : "不适用"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stoich-table-block">
          <h4>产物生成统计</h4>
          <table>
            <thead>
              <tr>
                <th>产物</th>
                <th>系数</th>
                <th>生成</th>
                <th>理论质量</th>
              </tr>
            </thead>
            <tbody>
              {stoich.products.map((p) => (
                <tr key={p.substanceId}>
                  <td>{byId[p.substanceId]?.name}</td>
                  <td>{p.coefficient}</td>
                  <td className="prod-highlight">{p.produced} 份</td>
                  <td>
                    {p.producedMassG !== null
                      ? `${p.producedMassG} g`
                      : "不适用"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mass-conservation-bar">
        <Scale size={15} />
        <div>
          <strong>{conservation.massBasisLabel}</strong>
          {conservation.totalInputMassG !== null ? (
            <p>
              投入总质量 {conservation.totalInputMassG} g = 生成物{" "}
              {conservation.totalProducedMassG} g + 剩余反应物{" "}
              {conservation.totalRemainingMassG} g（合计{" "}
              {conservation.totalOutputMassG} g）
              {conservation.massConserved ? (
                <span className="ok-inline">
                  <Check size={12} /> 质量守恒
                </span>
              ) : (
                <span className="bad-inline">
                  <AlertTriangle size={12} /> 待核对
                </span>
              )}
            </p>
          ) : (
            <p>当前含无固定摩尔质量物质，不显示理论质量。</p>
          )}
        </div>
      </div>

      {stoich.outcome !== "insufficient" && (
        <ReactionAtomPanel stoich={stoich} />
      )}

      {reaction.fixtureNote && (
        <p className="fixture-footnote">
          <Sparkles size={13} />
          {reaction.fixtureNote}
        </p>
      )}
    </div>
  );
}
