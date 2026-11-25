import { useState } from "react";
import { CheckCircle2, Coins, Sparkles, Trophy } from "lucide-react";
import {
  detailedAchievements,
  type AchievementCategory,
} from "../engine/achievementEngine";
import { useGame } from "../stores/game";
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
}: {
  toast?: (s: string) => void;
}) {
  const game = useGame();
  const save = game.save;
  const [cat, setCat] = useState<AchievementCategory | "all">("all");

  const all = detailedAchievements(save);
  const earnedCount = all.filter((a) => a.earned).length;
  const visible = cat === "all" ? all : all.filter((a) => a.category === cat);

  return (
    <div className="page-width standard-page">
      <div className="page-heading">
        <PageHeading
          kicker="MILESTONES OF CURIOSITY · V1.6"
          title="探索成就"
          description={`已达成 ${earnedCount} / ${all.length} 项科学成就。每项成就达成后可幂等领取一次金币、研究点与经验奖励。`}
        />
      </div>

      <div className="filter-pills">
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
