import { useEffect, useState } from "react";
import {
  Star,
  ChevronRight,
  Target,
  Scale,
  FlaskConical,
  Sparkles,
} from "lucide-react";
import type { MobileDetailBar, Page } from "../types/navigation";
import type { SpecialChallengeDef } from "../types";
import {
  byId,
  challenges,
  quantitativeChallenges,
  specialChallenges,
} from "../data";
import { useGame } from "../stores/game";
import { useViewport } from "../hooks/useViewport";
import { SubstanceIcon } from "../components/SubstanceIcon";
import { SpecialChallengeRunner } from "../components/SpecialChallengeRunner";

const simpleGroupMeta: Record<string, { badge: string; hint: string }> = {
  基础探索: { badge: "单步核心", hint: "掌握相变、电解、燃烧、中和与催化基础" },
  组合实验: { badge: "双步串联", hint: "通过中间产物串联两步反应与物理分离" },
  科学推演: {
    badge: "三至四步",
    hint: "规划完整合成路径，还原真实化工与冶金逻辑",
  },
};

const quantGroupMeta: Record<string, { badge: string; hint: string }> = {
  基础份数: {
    badge: "整数比例",
    hint: "掌握反应物系数、产物倍比、相变与独立催化",
  },
  剩余物质: {
    badge: "限制反应物",
    hint: "识别反应瓶颈、计算剩余份数与零浪费配比",
  },
  定量推演: {
    badge: "有限库存 + 配平",
    hint: "有限份数多步合成、资源分配与化学方程式配平",
  },
};

const specialTypeMeta: Record<string, { badge: string; hint: string }> = {
  极限实验: {
    badge: "极紧资源",
    hint: "极有限份数与严格步数上限的多步定量实验",
  },
  最短路径: { badge: "最优步数", hint: "剔除冗余反应，以最少步骤直达目标物质" },
  零浪费挑战: {
    badge: "100% 利用率",
    hint: "精确配比投料，实现当步反应零剩余物",
  },
  未知物质鉴定: {
    badge: "试剂排查",
    hint: "运行多项特征试剂检验，凭证据锁定未知样品",
  },
  逆向推理: {
    badge: "以果推因",
    hint: "根据产物与日志线索反推反应物与反应条件",
  },
};

export default function Challenges({
  go,
  toast,
  onMobileDetailBar,
}: {
  go: (p: Page) => void;
  toast?: (s: string) => void;
  onMobileDetailBar?: (bar: MobileDetailBar | null) => void;
}) {
  const game = useGame();
  const vp = useViewport();
  const [modeTab, setModeTab] = useState<"simple" | "advanced" | "special">(
    () => (game.save.currentMode === "advanced" ? "advanced" : "simple"),
  );
  const [groupFilter, setGroupFilter] = useState<string>("auto");
  const [activeSpecial, setActiveSpecial] =
    useState<SpecialChallengeDef | null>(null);

  useEffect(() => {
    if (!onMobileDetailBar) return;
    if (activeSpecial) {
      onMobileDetailBar({
        parentLabel: "关卡挑战",
        title: activeSpecial.name,
        onBack: () => setActiveSpecial(null),
      });
    } else {
      onMobileDetailBar(null);
    }
    return () => onMobileDetailBar(null);
  }, [activeSpecial, onMobileDetailBar]);

  const simpleGroups = ["基础探索", "组合实验", "科学推演"] as const;
  const quantGroups = ["基础份数", "剩余物质", "定量推演"] as const;
  const specialGroups = [
    "极限实验",
    "最短路径",
    "零浪费挑战",
    "未知物质鉴定",
    "逆向推理",
  ] as const;

  const currentGroups: readonly string[] =
    modeTab === "simple"
      ? simpleGroups
      : modeTab === "advanced"
        ? quantGroups
        : specialGroups;

  const activeGroupFilter =
    groupFilter === "auto"
      ? vp.isMobile
        ? currentGroups[0]
        : "all"
      : groupFilter;

  const simpleBest = Object.values(game.save.challengeBest);
  const simpleStars = simpleBest.reduce((sum, b) => sum + b.stars, 0);
  const quantBest = Object.values(game.save.quantitativeChallengeBest);
  const quantStars = quantBest.reduce((sum, b) => sum + b.stars, 0);
  const specialBest = Object.values(game.save.specialChallengeBest);
  const specialStars = specialBest.reduce((sum, b) => sum + b.stars, 0);

  const curStars =
    modeTab === "simple"
      ? simpleStars
      : modeTab === "advanced"
        ? quantStars
        : specialStars;
  const curSolved =
    modeTab === "simple"
      ? simpleBest.length
      : modeTab === "advanced"
        ? quantBest.length
        : specialBest.length;
  const curTotal =
    modeTab === "simple"
      ? challenges.length
      : modeTab === "advanced"
        ? quantitativeChallenges.length
        : specialChallenges.length;

  return (
    <div
      className={`page-width standard-page ${activeSpecial ? "special-active-page" : ""}`}
    >
      {!activeSpecial && (
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              MISSION CONTROL · SIMPLE, QUANTITATIVE & SPECIAL
            </p>
            <h1>目标挑战</h1>
            <p>
              包含 {challenges.length} 道简单探索关、
              {quantitativeChallenges.length} 道进阶定量关与{" "}
              {specialChallenges.length} 道 V1.6
              特殊推理挑战（极限实验、最短路径、零浪费、未知鉴定与逆向推理）。
            </p>
          </div>
          <div className="lab-progress">
            <span>
              <strong>{curStars}</strong> / {curTotal * 3} 星 · {curSolved} /{" "}
              {curTotal} 关
            </span>
            <div className="progress-track">
              <i
                style={{
                  width: `${(curStars / Math.max(1, curTotal * 3)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {!activeSpecial && (
        <div className="mobile-sticky-bar challenges-sticky-bar">
          <div className="challenge-mode-tabs">
            <button
              type="button"
              className={modeTab === "simple" ? "active" : ""}
              onClick={() => {
                setActiveSpecial(null);
                setGroupFilter("auto");
                setModeTab("simple");
              }}
            >
              <FlaskConical size={15} />
              {vp.isMobile
                ? `简单 (${challenges.length})`
                : `简单模式挑战（${challenges.length} 关）`}
            </button>
            <button
              type="button"
              className={modeTab === "advanced" ? "active" : ""}
              onClick={() => {
                setActiveSpecial(null);
                setGroupFilter("auto");
                setModeTab("advanced");
              }}
            >
              <Scale size={15} />
              {vp.isMobile
                ? `进阶定量 (${quantitativeChallenges.length})`
                : `进阶定量挑战（${quantitativeChallenges.length} 关）`}
            </button>
            <button
              type="button"
              className={modeTab === "special" ? "active" : ""}
              onClick={() => {
                setGroupFilter("auto");
                setModeTab("special");
              }}
            >
              <Sparkles size={15} />
              {vp.isMobile
                ? `特殊挑战 (${specialChallenges.length})`
                : `特殊挑战（${specialChallenges.length} 关）`}
            </button>
          </div>

          {vp.isMobile && (
            <div
              className="filter-pills mobile-scroll-strip challenge-group-pills"
              role="group"
              aria-label="挑战分组筛选"
            >
              <button
                type="button"
                className={activeGroupFilter === "all" ? "active" : ""}
                onClick={() => setGroupFilter("all")}
              >
                全部 ({curTotal})
              </button>
              {currentGroups.map((g) => (
                <button
                  type="button"
                  key={g}
                  className={activeGroupFilter === g ? "active" : ""}
                  onClick={() => setGroupFilter(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {modeTab === "special" ? (
        activeSpecial ? (
          <SpecialChallengeRunner
            challenge={activeSpecial}
            onClose={() => setActiveSpecial(null)}
            toast={(msg) => toast?.(msg)}
          />
        ) : (
          specialGroups
            .filter(
              (typeName) =>
                activeGroupFilter === "all" || activeGroupFilter === typeName,
            )
            .map((typeName) => {
              const items = specialChallenges.filter(
                (c) => c.typeName === typeName,
              );
              const solvedInGroup = items.filter(
                (c) => c.id in game.save.specialChallengeBest,
              ).length;
              return (
                <section className="challenge-group" key={typeName}>
                  <h2>
                    {typeName}
                    <span>
                      {specialTypeMeta[typeName].badge} · {solvedInGroup}/
                      {items.length} 完成 · {specialTypeMeta[typeName].hint}
                    </span>
                  </h2>
                  <div className="challenge-grid">
                    {items.map((c, i) => {
                      const best = game.save.specialChallengeBest[c.id];
                      return (
                        <button
                          key={c.id}
                          className={`challenge-card ${best ? "solved" : ""}`}
                          onClick={() => setActiveSpecial(c)}
                        >
                          <span className="challenge-number">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="challenge-card-body">
                            <div className="challenge-card-head">
                              <h3>{c.name}</h3>
                              <span className="challenge-target-pill">
                                <Sparkles size={11} />
                                {c.difficulty} · +{c.reward.coins} 金币
                              </span>
                            </div>
                            <p className="challenge-desc">{c.description}</p>
                            <div className="challenge-card-foot">
                              <span
                                className="stars"
                                aria-label={`最佳 ${best?.stars || 0} 星`}
                              >
                                {[1, 2, 3].map((n) => (
                                  <Star
                                    key={n}
                                    size={14}
                                    fill={
                                      (best?.stars || 0) >= n
                                        ? "currentColor"
                                        : "none"
                                    }
                                  />
                                ))}
                              </span>
                              {best && (
                                <small className="challenge-best-note">
                                  最佳 {best.attempts} 次
                                  {best.metric ? ` · ${best.metric}` : ""}
                                </small>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={17} />
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })
        )
      ) : modeTab === "simple" ? (
        simpleGroups
          .filter(
            (group) =>
              activeGroupFilter === "all" || activeGroupFilter === group,
          )
          .map((group) => {
            const items = challenges.filter((c) => c.group === group);
            const solvedInGroup = items.filter(
              (c) => c.id in game.save.challengeBest,
            ).length;
            return (
              <section className="challenge-group" key={group}>
                <h2>
                  {group}
                  <span>
                    {simpleGroupMeta[group].badge} · {solvedInGroup}/
                    {items.length} 完成 · {simpleGroupMeta[group].hint}
                  </span>
                </h2>
                <div className="challenge-grid">
                  {items.map((c, i) => {
                    const best = game.save.challengeBest[c.id];
                    const targetSub = byId[c.target];
                    return (
                      <button
                        key={c.id}
                        className={`challenge-card ${best ? "solved" : ""}`}
                        onClick={() => {
                          game.update((s) => ({
                            ...s,
                            currentMode: "simple",
                            quantitativeChallengeRun: null,
                            challengeRun: {
                              id: c.id,
                              inventory: [...c.initial],
                              attempts: 0,
                              hints: 0,
                              complete: false,
                            },
                          }));
                          go("lab");
                        }}
                      >
                        <span className="challenge-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="challenge-card-body">
                          <div className="challenge-card-head">
                            <h3>{c.name}</h3>
                            <span className="challenge-target-pill">
                              <Target size={11} />
                              <SubstanceIcon s={targetSub} size={18} />
                              {targetSub.name}
                            </span>
                          </div>
                          <p className="challenge-desc">{c.description}</p>
                          <p className="challenge-materials">
                            起点：
                            {c.initial.map((id) => byId[id].name).join(" · ")} ·
                            上限 {c.limit} 次
                          </p>
                          <div className="challenge-card-foot">
                            <span
                              className="stars"
                              aria-label={`最佳 ${best?.stars || 0} 星`}
                            >
                              {[1, 2, 3].map((n) => (
                                <Star
                                  key={n}
                                  size={14}
                                  fill={
                                    (best?.stars || 0) >= n
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              ))}
                            </span>
                            {best && (
                              <small className="challenge-best-note">
                                最佳 {best.attempts} 次
                              </small>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={17} />
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })
      ) : (
        quantGroups
          .filter(
            (group) =>
              activeGroupFilter === "all" || activeGroupFilter === group,
          )
          .map((group) => {
            const items = quantitativeChallenges.filter(
              (c) => c.group === group,
            );
            const solvedInGroup = items.filter(
              (c) => c.id in game.save.quantitativeChallengeBest,
            ).length;
            return (
              <section className="challenge-group" key={group}>
                <h2>
                  {group}
                  <span>
                    {quantGroupMeta[group].badge} · {solvedInGroup}/
                    {items.length} 完成 · {quantGroupMeta[group].hint}
                  </span>
                </h2>
                <div className="challenge-grid">
                  {items.map((c, i) => {
                    const best = game.save.quantitativeChallengeBest[c.id];
                    const targetSub = byId[c.target.substanceId];
                    return (
                      <button
                        key={c.id}
                        className={`challenge-card ${best ? "solved" : ""}`}
                        onClick={() => {
                          game.startQuantitativeChallenge(c);
                          go("lab");
                        }}
                      >
                        <span className="challenge-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="challenge-card-body">
                          <div className="challenge-card-head">
                            <h3>{c.name}</h3>
                            <span className="challenge-target-pill">
                              <Scale size={11} />
                              {c.kind === "balancing"
                                ? "系数配平"
                                : `${targetSub.name} ×${c.target.minAmount}`}
                            </span>
                          </div>
                          <p className="challenge-desc">{c.description}</p>
                          <p className="challenge-materials">
                            有限库存：
                            {Object.entries(c.initialInventory)
                              .map(([id, n]) => `${byId[id].name}×${n}`)
                              .join(" · ")}
                            {c.catalysts.length
                              ? ` · 催化：${c.catalysts.map((id) => byId[id].name).join("、")}`
                              : ""}{" "}
                            · 上限 {c.limit} 次
                          </p>
                          <div className="challenge-card-foot">
                            <span
                              className="stars"
                              aria-label={`最佳 ${best?.stars || 0} 星`}
                            >
                              {[1, 2, 3].map((n) => (
                                <Star
                                  key={n}
                                  size={14}
                                  fill={
                                    (best?.stars || 0) >= n
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                              ))}
                            </span>
                            {best && (
                              <small className="challenge-best-note">
                                最佳 {best.attempts} 次
                                {best.bestUtilization !== undefined
                                  ? ` · 利用率 ${Math.round(best.bestUtilization * 100)}%`
                                  : ""}
                              </small>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={17} />
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })
      )}
    </div>
  );
}
