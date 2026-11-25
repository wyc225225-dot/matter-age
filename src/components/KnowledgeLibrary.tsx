import { useState } from "react";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Atom,
  Check,
  BookOpen,
} from "lucide-react";
import elements from "../data/elements.json";
import rawSpecies from "../data/knowledgeSubstances.json";
import transformations from "../data/knowledgeTransformations.json";
import { substances } from "../data";
import { Formula } from "./Shared";
import "./knowledge.css";
interface KnowledgeSpecies {
  id: string;
  nameEn: string;
  formula: string;
  displayFormula: string;
  state: string;
  elementComposition: Record<string, number>;
  charge: number;
  atomicNumber: number | null;
  referenceRecordIds: string[];
}
const species = rawSpecies as unknown as KnowledgeSpecies[];

import { ArchiveTabs, type ArchiveView } from "./ArchiveTabs";
const stateName: Record<string, string> = {
  s: "固态",
  l: "液态",
  g: "气态",
  aq: "水溶液",
  Gas: "气态",
  Solid: "固态",
  Liquid: "液态",
};
const activationName: Record<string, string> = {
  none: "常温情境",
  heat: "加热",
  ignition: "点燃",
  electricity: "通电",
  cooling: "冷却",
  light: "光照",
};
const substanceName = (s: (typeof species)[number]) =>
  substances.find(
    (x) =>
      x.formula === s.formula &&
      x.state === { g: "gas", l: "liquid", s: "solid" }[s.state],
  )?.name || s.nameEn;
const speciesById = Object.fromEntries(species.map((s) => [s.id, s]));
const questions = transformations
  .filter(
    (r) =>
      r.atomBalanced &&
      r.outcome === "reaction" &&
      r.reactants.length > 0 &&
      r.products.length > 0 &&
      r.reactants.every((p) => p.coefficient <= 4) &&
      r.products.every((p) => p.coefficient <= 4),
  )
  .slice(0, 24);

export function KnowledgeLibrary({
  view,
  onChange,
}: {
  view: Exclude<ArchiveView, "collection">;
  onChange: (v: ArchiveView) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const title = {
    elements: "元素资料库",
    species: "物质资料库",
    transformations: "物质转化路径",
    lessons: "知识学习任务",
  }[view];
  const elementRows = elements.filter(
    (e) =>
      (category === "全部" || e.groupName === category) &&
      `${e.name} ${e.nameEn} ${e.symbol} ${e.atomicNumber}`
        .toLowerCase()
        .includes(q),
  );
  const speciesRows = species.filter((s) =>
    `${substanceName(s)} ${s.nameEn} ${s.formula} ${s.id}`
      .toLowerCase()
      .includes(q),
  );
  const reactionRows = transformations.filter(
    (r) =>
      (category === "全部" ||
        (category === "仅方程式资料"
          ? r.sourceExecution === "equation-only"
          : r.sourceExecution !== "equation-only")) &&
      `${r.equation} ${r.reactants
        .concat(r.products)
        .map((p) => substanceName(speciesById[p.id]))
        .join(" ")}`
        .toLowerCase()
        .includes(q),
  );
  const size = 24;
  const total =
    view === "elements"
      ? elementRows.length
      : view === "species"
        ? speciesRows.length
        : reactionRows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const element = elements.find((e) => e.symbol === selected);
  const material = species.find((s) => s.id === selected);
  const reaction = transformations.find((r) => r.id === selected);
  return (
    <div className="page-width standard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OPEN CHEMISTRY · LOCAL KNOWLEDGE ARCHIVE</p>
          <h1>{title}</h1>
          <p>
            {elements.length} 种元素 · {species.length} 个物质资料记录 ·{" "}
            {transformations.length} 条转化资料
          </p>
        </div>
      </div>
      <ArchiveTabs view={view} onChange={onChange} />
      {view === "lessons" ? (
        <KnowledgeLessons />
      ) : (
        <>
          <div className="archive-toolbar">
            <label className="search-box">
              <Search size={16} />
              <input
                aria-label="知识库搜索"
                placeholder={
                  view === "elements"
                    ? "搜索中文名、英文名、元素符号或原子序数"
                    : "搜索名称、化学式或反应物"
                }
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                  setSelected(null);
                }}
              />
            </label>
            {view !== "species" && (
              <select
                aria-label="知识库筛选"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(0);
                  setSelected(null);
                }}
              >
                {(view === "elements"
                  ? ["全部", ...new Set(elements.map((e) => e.groupName))]
                  : ["全部", "含上游模拟情境", "仅方程式资料"]
                ).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
            <span>{total} 条结果</span>
          </div>
          <div className="archive-note">
            <BookOpen size={17} />
            <p>
              {view === "elements"
                ? "元素是原子核电荷相同的一类原子；氢元素 H、氢气 H₂ 和水中的氢不能视作同一个游戏物品。"
                : view === "species"
                  ? "资料条目区分相态与化学组成；这里的资料数量与实验台已接入的物质数量分别统计。"
                  : "路径记录展示物质相态、配平系数与变化条件；仅方程式条目用于知识学习。"}
            </p>
          </div>
          {selected && (
            <section className="archive-detail panel">
              <button className="text-button" onClick={() => setSelected(null)}>
                <ArrowLeft size={14} />
                返回列表
              </button>
              {view === "elements" && element && (
                <>
                  <div className="element-summary">
                    <span className="element-large">
                      {element.symbol}
                      <small>Z = {element.atomicNumber}</small>
                    </span>
                    <div>
                      <h2>{element.name}</h2>
                      <p>
                        {element.nameEn} · {element.groupName}
                      </p>
                      <p>
                        相对原子质量：
                        {element.bodr?.atomicMass ?? "暂无数据"}
                      </p>
                    </div>
                  </div>
                  <dl className="archive-facts">
                    {[
                      ["电子排布", element.electronConfiguration],
                      ["常见氧化态", element.oxidationStates],
                      [
                        "周期 / 族 / 区",
                        `${element.bodr?.period ?? "—"} / ${element.bodr?.group ?? "—"} / ${element.bodr?.block ?? "—"}`,
                      ],
                      [
                        "常规相态",
                        stateName[element.standardState] ||
                          element.standardState,
                      ],
                      ["熔点 K", element.meltingPointK],
                      ["沸点 K", element.boilingPointK],
                      ["电负性", element.electronegativity],
                      ["第一电离能 eV", element.ionizationEnergyEV],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value || "暂无数据"}</dd>
                      </div>
                    ))}
                  </dl>
                  {element.stateNote && (
                    <p className="muted">{element.stateNote}</p>
                  )}
                  <p className="muted small">
                    放射性和人工合成元素的同位素质量不等同于稳定元素的标准原子量。
                  </p>
                  <h3>包含此元素的物质 · {element.relatedSpeciesIds.length}</h3>
                  <div className="archive-chips">
                    {element.relatedSpeciesIds.slice(0, 18).map((id) => (
                      <span key={id}>
                        {speciesById[id]?.displayFormula || id}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {view === "species" && material && (
                <>
                  <h2>{substanceName(material)}</h2>
                  <h3>
                    <Formula value={material.formula} /> ·{" "}
                    {stateName[material.state] || material.state}
                  </h3>
                  <p>{material.nameEn}</p>
                  <dl className="archive-facts">
                    <div>
                      <dt>元素组成 / 化学式单位</dt>
                      <dd>
                        {Object.entries(material.elementComposition)
                          .map(([e, n]) => `${e} × ${n}`)
                          .join("，")}
                      </dd>
                    </div>
                    <div>
                      <dt>净电荷</dt>
                      <dd>{material.charge}</dd>
                    </div>
                  </dl>
                  <h3>相关转化 · {material.referenceRecordIds.length}</h3>
                  {transformations
                    .filter((r) => material.referenceRecordIds.includes(r.id))
                    .slice(0, 10)
                    .map((r) => (
                      <div className="archive-equation" key={r.id}>
                        <Formula value={r.equation} />
                      </div>
                    ))}
                </>
              )}
              {view === "transformations" && reaction && (
                <>
                  <h2>
                    <Formula value={reaction.equation} />
                  </h2>
                  <p>
                    {reaction.sourceExecution === "equation-only"
                      ? "仅方程式资料"
                      : "变化情境"}{" "}
                    · 原子与电荷数量{reaction.atomBalanced ? "守恒" : "待核对"}
                  </p>
                  <div className="archive-chips">
                    {reaction.activation.map((a) => (
                      <span key={a}>{activationName[a] || a}</span>
                    ))}
                    {reaction.atmosphere && (
                      <span>气氛：{reaction.atmosphere}</span>
                    )}
                  </div>
                  <p>
                    {reaction.sourceExecution === "equation-only"
                      ? "此条目用于方程式学习，暂未接入实验台。"
                      : "比较反应物、生成物和条件，理解物质之间的转化。"}
                  </p>
                </>
              )}
            </section>
          )}
          {!selected && (
            <>
              {view === "elements" ? (
                <div className="element-library-grid">
                  {elementRows
                    .slice(page * size, (page + 1) * size)
                    .map((e) => (
                      <button
                        key={e.symbol}
                        className="element-library-card"
                        onClick={() => setSelected(e.symbol)}
                      >
                        <small>{e.atomicNumber}</small>
                        <strong>{e.symbol}</strong>
                        <span>{e.name}</span>
                        <small>
                          {e.bodr?.atomicMass ?? e.atomicWeightText}
                        </small>
                      </button>
                    ))}
                </div>
              ) : view === "species" ? (
                <div className="knowledge-species-grid">
                  {speciesRows
                    .slice(page * size, (page + 1) * size)
                    .map((s) => (
                      <button key={s.id} onClick={() => setSelected(s.id)}>
                        <Atom size={22} />
                        <Formula value={s.formula} />
                        <strong>{substanceName(s)}</strong>
                        <small>
                          {stateName[s.state] || s.state} ·{" "}
                          {s.referenceRecordIds.length} 条路径
                        </small>
                      </button>
                    ))}
                </div>
              ) : (
                <div className="knowledge-reaction-list">
                  {reactionRows
                    .slice(page * size, (page + 1) * size)
                    .map((r) => (
                      <button key={r.id} onClick={() => setSelected(r.id)}>
                        <Formula value={r.equation} />
                        <small>
                          {r.sourceExecution === "equation-only"
                            ? "仅方程式"
                            : "变化情境"}{" "}
                        </small>
                        <ArrowRight size={15} />
                      </button>
                    ))}
                </div>
              )}
              {!total && <p className="empty">没有找到匹配资料。</p>}
              <div className="archive-pagination">
                <button
                  className="secondary"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  上一页
                </button>
                <span>
                  {page + 1} / {pages}
                </span>
                <button
                  className="secondary"
                  disabled={page + 1 >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function KnowledgeLessons() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState<string[]>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("matter-age-knowledge-lessons") || "[]",
      );
    } catch {
      return [];
    }
  });
  const r = questions[index];
  const correct = r.products[0].id;
  const choices = [
    correct,
    ...species
      .filter(
        (s) =>
          s.id !== correct &&
          s.elementComposition &&
          Object.keys(s.elementComposition).some((e) =>
            r.reactants.some((p) => speciesById[p.id].elementComposition[e]),
          ),
      )
      .slice(index, index + 3)
      .map((s) => s.id),
  ].sort((a, b) => a.localeCompare(b));
  function check() {
    setSubmitted(true);
    if (answer === correct && !done.includes(r.id)) {
      const next = [...done, r.id];
      setDone(next);
      try {
        localStorage.setItem(
          "matter-age-knowledge-lessons",
          JSON.stringify(next),
        );
      } catch {
        /* Knowledge quiz progress is optional. */
      }
    }
  }
  return (
    <section className="knowledge-lessons panel">
      <p className="eyebrow">PRACTICE THROUGH TRANSFORMATIONS</p>
      <h2>从反应物推认生成物</h2>
      <p>
        已完成 {done.length} / {questions.length} 个学习任务 · 当前第{" "}
        {index + 1} 题
      </p>
      <div className="lesson-prompt">
        {r.reactants.map((p) => (
          <span key={p.id}>
            {p.coefficient > 1 ? p.coefficient : ""}
            <Formula value={speciesById[p.id].formula} />
          </span>
        ))}
        <ArrowRight size={21} />
        <strong>?</strong>
      </div>
      <p>根据资料记录，这个变化的生成物包括哪一种？</p>
      <div className="lesson-choices">
        {choices.map((id) => (
          <button
            key={id}
            className={answer === id ? "selected" : ""}
            aria-pressed={answer === id}
            onClick={() => {
              setAnswer(id);
              setSubmitted(false);
            }}
          >
            <Formula value={speciesById[id].formula} />
            <small>{substanceName(speciesById[id])}</small>
          </button>
        ))}
      </div>
      {submitted && (
        <p className="lesson-feedback">
          {answer === correct ? (
            <>
              <Check size={16} />
              回答正确。完整方程式：
            </>
          ) : (
            "还可以再试。资料中的完整方程式："
          )}{" "}
          <Formula value={r.equation} />
        </p>
      )}
      <div className="save-actions">
        <button className="primary" disabled={!answer} onClick={check}>
          检查答案
        </button>
        <button
          className="secondary"
          onClick={() => {
            setIndex((index + 1) % questions.length);
            setAnswer("");
            setSubmitted(false);
          }}
        >
          下一题
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
