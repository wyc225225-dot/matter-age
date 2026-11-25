import { useState } from "react";
import { CheckCircle2, Coins, Sparkles, Trophy } from "lucide-react";
import type { Page } from "../types/navigation";
import {
  detailedAchievements,
  type AchievementCategory,
} from "../engine/achievementEngine";
import { useGame } from "../stores/game";
import { useViewport } from "../hooks/useViewport";
import { PageHeading } from "../components/Shared";

const catLabels: Record<AchievementCategory | "all", string> = {
  all: "全部成就",
  discovery: "发现与探索",
  stoichiometry: "定量与挑战",
  management: "实验室经营",
  history: "挑战历史",
  world: "世界探索",
  museum_tech: "科技与博物馆",
};

export default function Achievements({
  toast,
  go,
}: {
  toast?: (s: string) => void;
  go?: (p: Page) => void;
}) {
  const game = useGame();
  const vp = useViewport();
  const save = game.save;
  const [cat, setCat] = useState<AchievementCategory | "all" | "claimable">(
    "all",
  );

  const all = detailedAchievements(save);
  const earnedCount = all.filter((a) => a.earned).length;
  const claimableCount = all.filter(
    (a) => a.earned && !save.claimedAchievementRewards.includes(a.name),
  ).length;
  const visible =
    cat === "all"
      ? all
      : cat === "claimable"
        ? all.filter(
            (a) => a.earned && !save.claimedAchievementRewards.includes(a.name),
          )
        : all.filter((a) => a.category === cat);

  return (
    <div className="page-width standard-page">
      {vp.isMobile && go && (
        <div
          className="mobile-seg-tabs growth-mode-tabs"
          role="tablist"
          aria-label="成就与成长切换"
        >
          <button type="button" role="tab" aria-selected className="active">
            探索成就 ({earnedCount}/{all.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            onClick={() => go("eras")}
          >
            科技演进
          </button>
        </div>
      )}
      <div className="page-heading">
        <PageHeading
          kicker="MILESTONES OF CURIOSITY · V1.6"
          title="探索成就"
          description={`已达成 ${earnedCount} / ${all.length} 项科学成就。每项成就达成后可幂等领取一次金币、研究点与经验奖励。`}
        />
      </div>

      <div className="mobile-sticky-bar">
        <div className="filter-pills mobile-scroll-strip">
          {claimableCount > 0 && (
            <button
              className={cat === "claimable" ? "active" : ""}
              onClick={() => setCat("claimable")}
            >
              可领取（{claimableCount}）
            </button>
          )}
          {(Object.keys(catLabels) as (AchievementCategory | "all")[]).map(
            (k) => (
              <button
                key={k}
                className={cat === k ? "active" : ""}
                onClick={() => setCat(k)}
              >
                {catLabels[k]}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="achievement-grid">
        {visible.map((a) => {
          const claimed = save.claimedAchievementRewards.includes(a.name);
          return (
            <div
              className={`panel achievement ${a.earned ? "earned" : ""}`}
              key={a.id}
            >
              <Trophy size={30} />
              <h3>{a.name}</h3>
              <p>{a.description}</p>
              <div className="ach-reward-line">
                <span>
                  <Coins size={12} /> +{a.reward.coins}
                </span>
                <span>
                  <Sparkles size={12} /> +{a.reward.researchPoints} RP
                </span>
              </div>
              {a.earned ? (
                claimed ? (
                  <span className="done-badge">
                    <CheckCircle2 size={13} /> 已领取奖励
                  </span>
                ) : (
                  <button
                    className="primary small"
                    onClick={() => {
                      const res = game.claimAchievementRewardAction(a.name);
                      toast?.(res.message);
                    }}
                  >
                    领取成就奖励
                  </button>
                )
              ) : (
                <span>尚未获得</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
