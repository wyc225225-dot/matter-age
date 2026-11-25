import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  Atom,
  Check,
  BookOpen,
} from "lucide-react";
import type { MobileDetailBar } from "../types/navigation";
import elements from "../data/elements.json";
import rawSpecies from "../data/knowledgeSubstances.json";
import rawTransformations from "../data/knowledgeTransformations.json";
import { conditionName, reactions, substances } from "../data";
import { summarizeKnowledgeCoverage } from "../engine/knowledgeCoverage";
import { useViewport } from "../hooks/useViewport";
import { Formula } from "./Shared";
import { CompactSelect } from "./CompactSelect";
import { ArchiveTabs, type ArchiveView } from "./ArchiveTabs";
import {
  formatKnowledgeActivation,
  formatKnowledgeAtmosphere,
  formatKnowledgeKind,
  formatKnowledgeOutcome,
  formatKnowledgeState,
  formatTransformationChinese,
  resolveSpeciesDisplayName,
  speciesSearchText,
  type KnowledgeSpeciesRecord,
  type KnowledgeTransformationRecord,
} from "../utils/knowledgeNames";
import "./knowledge.css";

const species = rawSpecies as unknown as KnowledgeSpeciesRecord[];
const transformations =
  rawTransformations as unknown as KnowledgeTransformationRecord[];
const speciesById: Record<string, KnowledgeSpeciesRecord> = Object.fromEntries(
  species.map((s) => [s.id, s]),
);
const coverageReport = summarizeKnowledgeCoverage(
  transformations,
  speciesById,
  substances,
  reactions,
  conditionName,
);

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
  onMobileDetailBar,
}: {
  view: Exclude<ArchiveView, "collection">;
  onChange: (v: ArchiveView) => void;
  onMobileDetailBar?: (bar: MobileDetailBar | null) => void;
}) {
  const vp = useViewport();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const savedScrollY = useRef(0);
  const q = query.trim().toLowerCase();
  const title = {
    elements: "元素资料库",
    species: "物质资料库",
    transformations: "物质转化路径",
    lessons: "知识学习任务",
  }[view];

  const openDetail = useCallback((id: string) => {
    savedScrollY.current = window.scrollY;
    setSelected(id);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const closeDetail = useCallback(() => {
    setSelected(null);
    requestAnimationFrame(() => {
      window.scrollTo({
        top: savedScrollY.current,
        behavior: "instant" as ScrollBehavior,
      });
    });
  }, []);

  useEffect(() => {
    if (!onMobileDetailBar) return;
    if (selected) {
      onMobileDetailBar({
        parentLabel: "知识库",
        title,
        onBack: closeDetail,
      });
    } else {
      onMobileDetailBar(null);
    }
    return () => onMobileDetailBar(null);
  }, [selected, title, closeDetail, onMobileDetailBar]);

  const elementRows = elements.filter(
    (e) =>
      (category === "全部" || e.groupName === category) &&
      `${e.name} ${e.nameEn} ${e.symbol} ${e.atomicNumber}`
        .toLowerCase()
        .includes(q),
  );
  const speciesRows = species.filter((s) => speciesSearchText(s).includes(q));
  const reactionRows = transformations.filter((r) => {
    const cov = coverageReport.byTransformationId[r.id];
    const matchCategory =
      category === "全部" ||
      (category === "已开放实验台"
        ? cov?.playable
        : category === "资料路径（未开放模拟）"
          ? !cov?.playable
          : category === "仅方程式资料"
            ? r.sourceExecution === "equation-only"
            : r.sourceExecution !== "equation-only");
    return (
      matchCategory &&
      `${r.equation} ${formatTransformationChinese(r, speciesById)} ${r.reactants
        .concat(r.products)
        .map((p) =>
          speciesById[p.id] ? speciesSearchText(speciesById[p.id]) : p.id,
        )
        .join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  });

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

  const hideListChrome = vp.isMobile && Boolean(selected);
  const knowledgeSubTabs: [Exclude<ArchiveView, "collection">, string][] = [
    ["species", "物质资料"],
    ["transformations", "转化路径"],
    ["elements", "118 种元素"],
    ["lessons", "学习任务"],
  ];

  return (
    <div className="page-width standard-page">
      {!hideListChrome && (
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
      )}

      {!hideListChrome && (
        <div className="mobile-sticky-bar archive-sticky-bar">
          {vp.isMobile ? (
            <nav
              className="archive-tabs knowledge-subtabs"
              aria-label="知识库分类"
            >
              {knowledgeSubTabs.map(([id, label]) => (
                <button
                  key={id}
                  className={view === id ? "active" : ""}
                  onClick={() => onChange(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
          ) : (
            <ArchiveTabs view={view} onChange={onChange} />
          )}
          {view !== "lessons" && (
            <div className="archive-toolbar">
              <label className="search-box">
                <Search size={16} />
                <input
                  aria-label="知识库搜索"
                  placeholder={
                    view === "elements"
                      ? "搜索中文名、英文名、元素符号或原子序数"
                      : "搜索中文名称、别名、化学式或英文名"
                  }
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                    setSelected(null);
                  }}
                />
                <span className="archive-inline-count">{total} 条</span>
              </label>
              {view === "elements" && (
                <CompactSelect
                  ariaLabel="知识库筛选"
                  value={category}
                  layout="grid"
                  options={[
                    "全部",
                    ...new Set(elements.map((e) => e.groupName)),
                  ].map((c) => ({ value: c, label: c }))}
                  onChange={(next) => {
                    setCategory(next);
                    setPage(0);
                    setSelected(null);
                  }}
                />
              )}
              {view === "transformations" && (
                <div
                  className="kb-filter-pills mobile-scroll-strip"
                  role="group"
                  aria-label="知识库筛选"
                >
                  {[
                    "全部",
                    "已开放实验台",
                    "资料路径（未开放模拟）",
                    "含变化情境",
                    "仅方程式资料",
                  ].map((c) => (
                    <button
                      type="button"
                      key={c}
                      aria-pressed={category === c}
                      className={category === c ? "active" : ""}
                      onClick={() => {
                        setCategory(c);
                        setPage(0);
                        setSelected(null);
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === "lessons" ? (
        <KnowledgeLessons />
      ) : (
        <>
          {!hideListChrome && (
            <div className="archive-note">
              <BookOpen size={17} />
              <p>
                {view === "elements"
                  ? "元素是原子核电荷相同的一类原子；氢元素 H、氢气 H₂ 和水中的氢不能视作同一个游戏物品。"
                  : view === "species"
                    ? "按化学实体与物态独立命名（如氯化氢气体与盐酸、水与水蒸气）；支持中文、别名、化学式检索。"
                    : `共收录 ${coverageReport.summary.total} 条转化资料：当前实验台已开放 ${coverageReport.summary.playable} 条模拟，其余 ${coverageReport.summary.notOpen} 条为资料路径（尚未开放实验台模拟），点击条目可查看原因与条件要求。`}
              </p>
            </div>
          )}
          {selected && (
            <section className="archive-detail panel">
              <button className="text-button" onClick={closeDetail}>
                <ArrowLeft size={14} />
                {vp.isMobile ? "返回知识库" : "返回列表"}
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
                      ["常规相态", formatKnowledgeState(element.standardState)],
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
                    {element.relatedSpeciesIds.slice(0, 18).map((id) => {
                      const sp = speciesById[id];
                      return (
                        <span key={id}>
                          {sp ? `${sp.nameZh}（${sp.displayFormula}）` : id}
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
              {view === "species" && material && (
                <>
                  <h2>{material.nameZh}</h2>
                  <h3>
                    <Formula value={material.formula} /> ·{" "}
                    {formatKnowledgeState(material.state)}
                  </h3>
                  <p className="archive-sub-en">英文名：{material.nameEn}</p>
                  {material.aliasesZh && material.aliasesZh.length > 0 && (
                    <p className="archive-aliases">
                      常见别称：{material.aliasesZh.join(" / ")}
                    </p>
                  )}
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
                      <dt>物态</dt>
                      <dd>{formatKnowledgeState(material.state)}</dd>
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
                    .map((r) => {
                      const cov = coverageReport.byTransformationId[r.id];
                      return (
                        <div className="archive-equation" key={r.id}>
                          <div className="archive-eq-head">
                            <strong className="archive-eq-zh">
                              {formatTransformationChinese(r, speciesById)}
                            </strong>
                            <span
                              className={`coverage-badge ${cov?.playable ? "playable" : "not-open"}`}
                            >
                              {cov?.playable
                                ? cov.statusBadge
                                : "资料路径·未开放模拟"}
                            </span>
                          </div>
                          <Formula value={r.equation} />
                        </div>
                      );
                    })}
                </>
              )}
              {view === "transformations" &&
                reaction &&
                (() => {
                  const cov = coverageReport.byTransformationId[reaction.id];
                  return (
                    <>
                      <h2>
                        {formatTransformationChinese(reaction, speciesById)}
                      </h2>
                      <p className="archive-detail-formula">
                        <Formula value={reaction.equation} />
                      </p>
                      <div
                        className={`knowledge-coverage-box ${cov?.playable ? "playable" : "not-open"}`}
                      >
                        <span
                          className={`coverage-badge ${cov?.playable ? "playable" : "not-open"}`}
                        >
                          {cov?.playable
                            ? "实验台已开放模拟"
                            : "资料路径 · 尚未开放实验台模拟"}
                        </span>
                        <p>{cov?.detail}</p>
                        {cov?.stateSimplificationNote && (
                          <p className="coverage-subnote">
                            {cov.stateSimplificationNote}
                          </p>
                        )}
                      </div>
                      <p>
                        {formatKnowledgeKind(reaction.kind)} ·{" "}
                        {formatKnowledgeOutcome(reaction.outcome)} ·{" "}
                        {reaction.sourceExecution === "equation-only"
                          ? "仅方程式资料"
                          : "含变化情境"}{" "}
                        · 原子与电荷数量
                        {reaction.atomBalanced ? "守恒" : "待核对"}
                      </p>
                      <div className="archive-chips">
                        {reaction.activation.map((a) => (
                          <span key={a}>{formatKnowledgeActivation(a)}</span>
                        ))}
                        {reaction.atmosphere && (
                          <span>
                            气氛：
                            {formatKnowledgeAtmosphere(reaction.atmosphere)}
                          </span>
                        )}
                      </div>
                      <h3>参与物质（按物态区分）</h3>
                      <div className="archive-chips">
                        {[...reaction.reactants, ...reaction.products].map(
                          (p, idx) => {
                            const sp = speciesById[p.id];
                            return (
                              <span key={`${p.id}-${idx}`}>
                                {resolveSpeciesDisplayName(sp, p.id)}（
                                {sp?.displayFormula ?? p.id} ·{" "}
                                {sp ? formatKnowledgeState(sp.state) : ""}）
                              </span>
                            );
                          },
                        )}
                      </div>
                    </>
                  );
                })()}
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
                        onClick={() => openDetail(e.symbol)}
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
                      <button key={s.id} onClick={() => openDetail(s.id)}>
                        <Atom size={22} />
                        <strong>{s.nameZh}</strong>
                        <Formula value={s.formula} />
                        <small>
                          {formatKnowledgeState(s.state)}
                          {!vp.isMobile &&
                            ` · ${s.referenceRecordIds.length} 条路径`}
                        </small>
                      </button>
                    ))}
                </div>
              ) : (
                <div className="knowledge-reaction-list">
                  {reactionRows
                    .slice(page * size, (page + 1) * size)
                    .map((r) => {
                      const cov = coverageReport.byTransformationId[r.id];
                      return (
                        <button key={r.id} onClick={() => openDetail(r.id)}>
                          <div className="reaction-row-main">
                            <strong className="reaction-zh-line">
                              {formatTransformationChinese(r, speciesById)}
                            </strong>
                            <Formula value={r.equation} />
                          </div>
                          <span
                            className={`coverage-badge ${cov?.playable ? "playable" : "not-open"}`}
                          >
                            {cov?.statusBadge ?? "资料路径·未开放模拟"}
                          </span>
                          <ArrowRight size={15} />
                        </button>
                      );
                    })}
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
          <span key={p.id} className="lesson-term">
            <span>
              {p.coefficient > 1 ? p.coefficient : ""}
              <Formula value={speciesById[p.id].formula} />
            </span>
            <small>{resolveSpeciesDisplayName(speciesById[p.id], p.id)}</small>
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
            <strong>{resolveSpeciesDisplayName(speciesById[id], id)}</strong>
            <Formula value={speciesById[id].formula} />
            <small>{formatKnowledgeState(speciesById[id].state)}</small>
          </button>
        ))}
      </div>
      {submitted && (
        <p className="lesson-feedback">
          {answer === correct ? (
            <>
              <Check size={16} />
              回答正确。
            </>
          ) : (
            "还可以再试。"
          )}{" "}
          {formatTransformationChinese(r, speciesById)}（
          <Formula value={r.equation} />）
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
