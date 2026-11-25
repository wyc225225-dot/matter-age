import { useEffect } from "react";
import { X, Star, Lock, Check, Scale, ChevronLeft } from "lucide-react";
import type { Substance } from "../types";
import { substances, reactions } from "../data";
import { useGame } from "../stores/game";
import { SubstanceIcon } from "../components/SubstanceIcon";
import { Formula, fmt } from "../components/Shared";
import { playerCopy } from "../utils/playerCopy";
import {
  SubstanceUnitGlyph,
  modelKindLabel,
} from "../components/AtomVisualizer";

export default function Detail({
  s,
  close,
  onSelect,
  parentLabel = "图鉴",
}: {
  s: Substance;
  close: () => void;
  onSelect?: (next: Substance) => void;
  parentLabel?: string;
}) {
  const game = useGame();
  const fav = game.save.favorites.includes(s.id);
  const research = game.save.research[s.id];
  const discovered = s.id in game.save.discovered;

  const siblings = substances.filter(
    (other) =>
      other.id !== s.id &&
      other.chemicalEntityId === s.chemicalEntityId &&
      other.id in game.save.discovered,
  );
  const densityFallback = ["mixture", "material", "solution"].includes(
    s.category,
  )
    ? "随组成/浓度变化"
    : "待核验";

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", fn);
    const before = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = old;
      before?.focus();
    };
  }, [close]);

  const relatedSimple = reactions.filter(
    (r) =>
      game.save.completed.includes(r.id) &&
      ([...r.reactants, ...r.products].some((p) => p.substanceId === s.id) ||
        r.catalysts.includes(s.id)),
  );

  const relatedQuant = (research?.completedReactionIds || [])
    .map((id) => reactions.find((r) => r.id === id))
    .filter(
      (r): r is NonNullable<typeof r> =>
        !!r &&
        r.stoichiometrySupported &&
        game.save.quantitativeHistory.some(
          (qh) =>
            qh.reactionId === r.id &&
            (qh.outcome === "complete" || qh.outcome === "partial"),
        ),
    );

  const bestExp = research?.bestExperimentRecord;
  const bestReactionName = bestExp
    ? reactions.find((r) => r.id === bestExp.reactionId)?.name ||
      bestExp.reactionId
    : null;

  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="modal detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${s.name}物质详情`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-sticky-head">
          <button
            type="button"
            className="mobile-parent-back modal-back-btn"
            onClick={close}
          >
            <ChevronLeft size={16} />
            <span>返回{parentLabel}</span>
          </button>
          <div className="modal-head-title">
            <span className="eyebrow">
              SUBSTANCE {String(substances.indexOf(s) + 1).padStart(3, "0")}
            </span>
            <strong>{s.name}</strong>
          </div>
          <button
            autoFocus
            className="close icon-button"
            onClick={close}
            aria-label="关闭详情"
          >
            <X />
          </button>
        </div>
        <div className="modal-scroll-body">
          <div className="detail-top">
            <SubstanceIcon s={s} size={108} />
            <div>
              <p className="eyebrow">
                SUBSTANCE {String(substances.indexOf(s) + 1).padStart(3, "0")}
              </p>
              <h2>{s.name}</h2>
              <p>{s.nameEn}</p>
              <Formula value={s.formula} />
            </div>
          </div>
          <div className="detail-chips">
            <span>{s.group}</span>
            <span>
              {
                {
                  element: "单质",
                  compound: "化合物",
                  mixture: "混合物",
                  solution: "溶液",
                  material: "加工材料",
                  state: "物质状态",
                }[s.category]
              }
            </span>
            <span>{modelKindLabel(s.modelKind)}</span>
            <button
              className={fav ? "gold" : ""}
              onClick={() =>
                game.update((v) => ({
                  ...v,
                  favorites: fav
                    ? v.favorites.filter((id) => id !== s.id)
                    : [...v.favorites, s.id],
                }))
              }
            >
              <Star size={14} fill={fav ? "currentColor" : "none"} />
              {fav ? "已收藏" : "收藏物质"}
            </button>
          </div>

          <h3 className="detail-section-title">研究等级 · 分难度档案</h3>
          <div className="research-levels">
            <div className={`research-card ${discovered ? "done" : ""}`}>
              <span className="res-badge">
                {discovered ? <Check size={12} /> : <Lock size={12} />} Lv.1
              </span>
              <strong>物质发现</strong>
              <small>{discovered ? "已通过简单模式/补给解锁" : "未发现"}</small>
            </div>
            <div
              className={`research-card ${
                research?.quantitativeResearchCompleted
                  ? "done-quant"
                  : !s.quantitativeResearchEligible
                    ? "na"
                    : ""
              }`}
            >
              <span className="res-badge">
                {research?.quantitativeResearchCompleted ? (
                  <Scale size={12} />
                ) : (
                  <Lock size={12} />
                )}{" "}
                Lv.2
              </span>
              <strong>定量研究</strong>
              <small>
                {!s.quantitativeResearchEligible
                  ? "不适用纯物质计量（混合物/材料独立观察项）"
                  : research?.quantitativeResearchCompleted
                    ? "已完成定量实验或配平研究"
                    : "待通过进阶定量实验或方程式配平解锁"}
              </small>
            </div>
            <div className="research-card locked">
              <span className="res-badge">
                <Lock size={12} /> Lv.3
              </span>
              <strong>实验验证</strong>
              <small>V2.0 困难虚拟实验室锁定预告</small>
            </div>
          </div>

          {bestExp && (
            <div className="best-exp-box">
              <strong>最佳定量实验记录：</strong>
              <span>
                {bestReactionName} · 份数利用率{" "}
                {Math.round(bestExp.portionUtilization * 1000) / 10}%
                {bestExp.massUtilization !== null
                  ? ` · 理论质量利用率 ${Math.round(bestExp.massUtilization * 1000) / 10}%`
                  : ""}
                {bestExp.completeReaction ? "（完全反应）" : "（部分反应）"}
              </span>
            </div>
          )}

          <div className="detail-facts">
            <div>
              <small>收集项状态</small>
              <strong>
                {{ solid: "固态", liquid: "液态", gas: "气态" }[s.state]}
              </strong>
            </div>
            <div>
              <small>
                摩尔质量{s.category === "solution" ? "（溶质）" : ""}
              </small>
              <strong>{s.molarMass ? `${s.molarMass} g/mol` : "不适用"}</strong>
            </div>
            <div>
              <small>密度</small>
              <strong>
                {s.density
                  ? `${s.density.value} ${s.density.unit} · ${s.density.temperatureC}℃`
                  : densityFallback}
              </strong>
            </div>
            <div>
              <small>化学实体 / 电荷</small>
              <strong>
                {s.chemicalEntityId}
                {s.charge !== null ? ` (净电荷 ${s.charge})` : ""}
              </strong>
            </div>
          </div>

          {s.elementComposition && (
            <div className="detail-unit-wrap">
              <SubstanceUnitGlyph s={s} />
            </div>
          )}

          {siblings.length > 0 && (
            <div className="entity-siblings">
              <small>同化学实体已收集形态：</small>
              {siblings.map((sib) => (
                <button
                  key={sib.id}
                  type="button"
                  className="entity-chip"
                  onClick={() => onSelect?.(sib)}
                >
                  {sib.name}
                </button>
              ))}
            </div>
          )}

          <DetailSection
            title="物理性质与外观"
            items={[s.appearance, ...s.properties]}
          />
          <DetailSection title="主要用途" items={s.uses} />
          <DetailSection
            title="自然分布与发现"
            items={[
              ...s.sources.filter(
                (text) =>
                  !/GitHub|PubChem|OpenStax|来源目录|结构化化学事实/.test(text),
              ),
              discovered
                ? `首次收集：${new Date(game.save.discovered[s.id]).toLocaleString("zh-CN")}`
                : "尚未发现",
            ]}
          />
          {s.aliases.length > 0 && (
            <DetailSection title="别名" items={[s.aliases.join(" / ")]} />
          )}

          <h3 className="detail-section-title">简单模式 · 已知反应路径</h3>
          <div className="detail-reactions">
            {relatedSimple.map((r) => (
              <p key={r.id}>
                <span>
                  {r.name}
                  {r.catalysts.includes(s.id) ? "（催化剂）" : ""}
                </span>
                <span>{fmt(r.equation)}</span>
              </p>
            ))}
            {!relatedSimple.length && (
              <p className="muted">
                完成简单模式相关实验后，路径会记录在这里。
              </p>
            )}
          </div>

          <h3 className="detail-section-title">进阶模式 · 已研究定量反应</h3>
          <div className="detail-reactions">
            {relatedQuant.map((r) => (
              <p key={r.id}>
                <span>
                  {r.name}
                  {r.isTestFixture ? "（演示样例）" : ""}
                </span>
                <span>{fmt(r.equation)}</span>
              </p>
            ))}
            {!relatedQuant.length && (
              <p className="muted">
                {s.quantitativeResearchEligible
                  ? "完成适用定量实验后，定量研究记录会展示在此。"
                  : "该物质不适用纯物质整数化学计量。"}
              </p>
            )}
          </div>

          <DetailSection title="安全知识" items={s.hazards} />
        </div>
      </section>
    </div>
  );
}

function DetailSection({ title, items }: { title: string; items: string[] }) {
  return (
    <>
      <h3 className="detail-section-title">{title}</h3>
      {items.map((item, i) => (
        <p className="detail-paragraph" key={i}>
          {playerCopy(item)}
        </p>
      ))}
    </>
  );
}
