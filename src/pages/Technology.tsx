import { useState } from "react";
import { CheckCircle2, Coins, Cpu, Lock, Sparkles } from "lucide-react";
import type { TechCategory } from "../types";
import { techById, technologies } from "../data";
import { useGame } from "../stores/game";
import { useViewport } from "../hooks/useViewport";
import { getTechUnlockStatus } from "../engine/technologyEngine";

const categoryMeta: Record<TechCategory, { label: string; color: string }> = {
  basic_chemistry: { label: "基础化学", color: "#53d89f" },
  thermal_process: { label: "热学与高温", color: "#ff9854" },
  metal_materials: { label: "金属与矿物", color: "#e09b52" },
  acid_base_salt: { label: "酸碱盐化工", color: "#53b8f3" },
  electrochemistry: { label: "电化学能源", color: "#a892ff" },
  laboratory_engineering: { label: "实验室工程", color: "#f4c85a" },
};

const categoryOrder: TechCategory[] = [
  "basic_chemistry",
  "thermal_process",
  "metal_materials",
  "acid_base_salt",
  "electrochemistry",
  "laboratory_engineering",
];

export default function Technology({ toast }: { toast: (s: string) => void }) {
  const game = useGame();
  const vp = useViewport();
  const save = game.save;
  const [filter, setFilter] = useState<TechCategory | "all" | "available">(
    "all",
  );

  const availableTechs = technologies.filter(
    (t) => getTechUnlockStatus(save, t, techById).status === "available",
  );

  const visibleCats =
    filter === "all" || filter === "available" ? categoryOrder : [filter];

  return (
    <div
      className={`page-width standard-page tech-page ${vp.isMobileLandscape ? "tech-landscape-split" : ""}`}
    >
      <div className="page-heading">
        <div>
          <p className="eyebrow">TECHNOLOGY RESEARCH TREE · DAG</p>
          <h1>科技研究树</h1>
          <p>
            独立于「科学发现网络」的 6 大研究分支（共 {technologies.length}{" "}
            项无环可达科技）。消耗研究点（RP）与金币解锁经营设备、探索区域与实验室升级资格（不影响累计研究经验与等级）。
          </p>
        </div>
        <div className="mgmt-quick-stats">
          <div className="stat-chip cyan">
            <Sparkles size={15} />
            <strong>{save.researchPoints}</strong>
            <span>可用 RP</span>
          </div>
          <div className="stat-chip gold">
            <Coins size={15} />
            <strong>{save.coins}</strong>
            <span>金币</span>
          </div>
          <div className="stat-chip green">
            <Cpu size={15} />
            <strong>
              {save.unlockedTechIds.length}/{technologies.length}
            </strong>
            <span>已研究</span>
          </div>
        </div>
      </div>

      <div className="tech-workspace">
        <div className="mobile-sticky-bar tech-filter-rail">
          {vp.isMobile && (
            <div className="compact-hud-row">
              <span className="tag-pill">
                <Sparkles size={12} /> {save.researchPoints} RP
              </span>
              <span className="tag-pill">
                <Coins size={12} /> {save.coins} 金币
              </span>
              <span className="tag-pill free">
                已研究 {save.unlockedTechIds.length}/{technologies.length}
              </span>
            </div>
          )}
          <div className="filter-pills mobile-scroll-strip">
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              全部分支（{technologies.length}）
            </button>
            <button
              className={filter === "available" ? "active" : ""}
              onClick={() => setFilter("available")}
            >
              可研究（{availableTechs.length}）
            </button>
            {categoryOrder.map((cat) => (
              <button
                key={cat}
                className={filter === cat ? "active" : ""}
                onClick={() => setFilter(cat)}
              >
                {categoryMeta[cat].label}
              </button>
            ))}
          </div>
        </div>

        <div className="tech-branches">
          {visibleCats.map((cat) => {
            const items = technologies
              .filter(
                (t) =>
                  t.category === cat &&
                  (filter !== "available" ||
                    getTechUnlockStatus(save, t, techById).status ===
                      "available"),
              )
              .sort((a, b) => a.tier - b.tier);
            if (filter === "available" && items.length === 0) return null;
            const meta = categoryMeta[cat];
            const allInCat = technologies.filter((t) => t.category === cat);
            const doneCount = allInCat.filter((t) =>
              save.unlockedTechIds.includes(t.id),
            ).length;

            return (
              <section
                key={cat}
                className="panel tech-branch"
                style={{ borderTopColor: meta.color }}
              >
                <div className="tech-branch-head">
                  <h2>
                    <span
                      className="branch-dot"
                      style={{ background: meta.color }}
                    />
                    {meta.label}
                  </h2>
                  <span className="muted">
                    已完成 {doneCount}/{allInCat.length}
                  </span>
                </div>
                <div className="tech-tier-grid">
                  {items.map((tech) => {
                    const status = getTechUnlockStatus(save, tech, techById);
                    return (
                      <article
                        key={tech.id}
                        className={`tech-node ${status.status}`}
                      >
                        <div className="tech-node-top">
                          <span className="tag-pill">
                            T{tech.tier} · Lv.{tech.requiredLabLevel}
                          </span>
                          {status.status === "unlocked" ? (
                            <span className="done-badge">
                              <CheckCircle2 size={13} /> 已研究
                            </span>
                          ) : status.status === "available" ? (
                            <span className="ready-badge">可研究</span>
                          ) : (
                            <span className="lock-badge">
                              <Lock size={12} /> 锁定
                            </span>
                          )}
                        </div>
                        <h3>{tech.name}</h3>
                        <p className="muted">{tech.description}</p>
                        {tech.prereqTechIds.length > 0 && (
                          <p className="tech-prereqs">
                            前置：
                            {tech.prereqTechIds
                              .map((pid) => techById[pid]?.name ?? pid)
                              .join(" + ")}
                          </p>
                        )}
                        {tech.unlocks.bonusNote && (
                          <p className="tech-unlock-note">
                            解锁效果：{tech.unlocks.bonusNote}
                          </p>
                        )}
                        {status.status === "unlocked" ? (
                          <button className="secondary small" disabled>
                            研究已完成
                          </button>
                        ) : (
                          <button
                            className={
                              status.status === "available"
                                ? "primary small"
                                : "secondary small"
                            }
                            disabled={status.status !== "available"}
                            onClick={() =>
                              toast(game.unlockTechAction(tech.id).message)
                            }
                          >
                            研究（{tech.costRP} RP · {tech.costCoins} 金币）
                          </button>
                        )}
                        {status.status === "locked" &&
                          status.reasons.length > 0 && (
                            <small className="tech-lock-reason">
                              {status.reasons[0]}
                            </small>
                          )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {filter === "available" && availableTechs.length === 0 && (
            <div className="panel empty-box">
              <p>
                当前暂无立即可研究的科技，完成实验、订单或挑战历史以获取更多 RP
                与金币。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
