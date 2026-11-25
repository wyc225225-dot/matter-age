import { useState, lazy, Suspense } from "react";
import { Search, Star, Scale } from "lucide-react";
import type { Substance } from "../types";
import { substances } from "../data";
import { useGame } from "../stores/game";
import { SubstanceIcon } from "../components/SubstanceIcon";
import { Formula } from "../components/Shared";
import { ArchiveTabs, type ArchiveView } from "../components/ArchiveTabs";
import "../components/knowledge.css";
const KnowledgeLibrary = lazy(() =>
  import("../components/KnowledgeLibrary").then((module) => ({
    default: module.KnowledgeLibrary,
  })),
);

export default function Encyclopedia({
  setDetail,
}: {
  setDetail: (s: Substance) => void;
}) {
  const save = useGame((s) => s.save);
  const [archiveView, setArchiveView] = useState<ArchiveView>("collection");
  const [filter, setFilter] = useState("全部物质");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("全部类别");
  const [sort, setSort] = useState("number");
  const discoveredCount = Object.keys(save.discovered).length;
  const quantResearchedCount = Object.values(save.research).filter(
    (r) => r.quantitativeResearchCompleted,
  ).length;
  const quantEligibleCount = substances.filter(
    (s) => s.quantitativeResearchEligible,
  ).length;

  const list = substances
    .filter(
      (s) =>
        (group === "全部类别" || s.group === group) &&
        (filter === "全部物质" ||
          (filter === "已发现" && s.id in save.discovered) ||
          (filter === "已定量研究" &&
            save.research[s.id]?.quantitativeResearchCompleted) ||
          (filter === "未发现" && !(s.id in save.discovered)) ||
          (filter === "收藏" && save.favorites.includes(s.id))) &&
        (!(s.id in save.discovered)
          ? !search
          : `${s.name}${s.formula || ""}${s.nameEn}${s.aliases.join("")}`
              .toLowerCase()
              .includes(search.toLowerCase())),
    )
    .sort((a, b) =>
      sort === "recent"
        ? (save.discovered[b.id] || 0) - (save.discovered[a.id] || 0)
        : substances.indexOf(a) - substances.indexOf(b),
    );

  if (archiveView !== "collection")
    return (
      <Suspense fallback={<p className="empty">正在打开本地化学资料库…</p>}>
        <KnowledgeLibrary
          key={archiveView}
          view={archiveView}
          onChange={setArchiveView}
        />
      </Suspense>
    );
  return (
    <div className="page-width standard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE ENCYCLOPEDIA · RESEARCH ARCHIVE</p>
          <h1>物质图鉴</h1>
          <p>
            Lv.1 物质发现 {discoveredCount}/{substances.length} · Lv.2 定量研究{" "}
            {quantResearchedCount}/{quantEligibleCount} · Lv.3 实验验证（V2.0
            锁定）。
          </p>
        </div>
        <div className="lab-progress">
          <span>
            <strong>{discoveredCount}</strong> / {substances.length} 已发现
          </span>
          <div className="progress-track">
            <i
              style={{
                width: `${(discoveredCount / substances.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <ArchiveTabs view={archiveView} onChange={setArchiveView} />
      <div className="book-toolbar">
        <div className="segmented">
          {["全部物质", "已发现", "已定量研究", "未发现", "收藏"].map((f) => (
            <button
              key={f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={16} />
          <input
            aria-label="图鉴搜索"
            placeholder="搜索已发现的名称 / 俗名 / 化学式"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="图鉴分类"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          {["全部类别", ...new Set(substances.map((s) => s.group))].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select
          aria-label="图鉴排序"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="number">编号排序</option>
          <option value="recent">发现时间排序</option>
        </select>
      </div>

      <div className="encyclopedia-grid">
        {list.map((s) => {
          const known = s.id in save.discovered;
          const quantDone =
            !!save.research[s.id]?.quantitativeResearchCompleted;
          return (
            <button
              disabled={!known}
              className={`encyclopedia-card ${known ? "" : "unknown"} ${quantDone ? "quant-researched" : ""}`}
              key={s.id}
              onClick={() => setDetail(s)}
            >
              <span className="material-number">
                NO. {String(substances.indexOf(s) + 1).padStart(3, "0")}
              </span>
              {known ? (
                <SubstanceIcon s={s} size={86} />
              ) : (
                <span className="unknown-icon">?</span>
              )}
              <h3>{known ? s.name : "未知物质"}</h3>
              {known ? (
                <Formula value={s.formula} />
              ) : (
                <small>等待你的发现</small>
              )}
              <span className="book-category">
                {known
                  ? quantDone
                    ? "Lv.2 已定量研究"
                    : s.quantitativeResearchEligible
                      ? `Lv.1 · ${s.group}`
                      : `观察项 · ${s.group}`
                  : "尚未收录"}
              </span>
              {known && quantDone && (
                <span className="quant-badge-icon" title="已完成定量研究">
                  <Scale size={12} />
                </span>
              )}
              {known && save.favorites.includes(s.id) && (
                <Star className="favorite-icon" size={15} fill="currentColor" />
              )}
            </button>
          );
        })}
      </div>
      {!list.length && <p className="empty">没有匹配的物质。</p>}
    </div>
  );
}
