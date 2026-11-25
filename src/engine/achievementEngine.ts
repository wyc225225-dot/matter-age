import type { Save } from "../types";
import { substances, eras } from "../data";
import { claimRewardOnce } from "./progressionEngine";

export type AchievementCategory =
  | "discovery"
  | "stoichiometry"
  | "management"
  | "history"
  | "world"
  | "museum_tech";

export interface AchievementEntry {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  earned: boolean;
  reward: { coins: number; researchPoints: number; experience: number };
}

export function currentEra(save: Save) {
  let n = 0;
  for (let i = 0; i < eras.length - 1; i++) {
    if (eras[i].targets.every((id) => id in save.discovered)) n = i + 1;
    else break;
  }
  return n;
}

export function detailedAchievements(s: Save): AchievementEntry[] {
  const n = Object.keys(s.discovered).length;
  const best = Object.values(s.challengeBest);
  const quantBest = Object.values(s.quantitativeChallengeBest);
  const specialBest = Object.values(s.specialChallengeBest);
  const historyDone = Object.values(s.historyProgress).filter(
    (h) => h.completed,
  );
  const totalGathers = Object.values(s.regionProgress).reduce(
    (sum, r) => sum + r.gatherCount,
    0,
  );
  const totalOrderDeliveries = Object.values(s.orderDeliveryCount).reduce(
    (sum, c) => sum + c,
    0,
  );
  const balancedCount = Object.values(s.balancingRecords).filter(
    (b) => b.solved,
  ).length;
  const museumCount = Object.keys(s.museumUnlocked).length;

  const list: (Omit<AchievementEntry, "earned"> & { condition: boolean })[] = [
    // === Original 12 achievements (exact names preserved for v1/v2 backward compatibility) ===
    {
      id: "第一次实验",
      name: "第一次实验",
      description: "完成一次自由实验",
      category: "discovery",
      condition: s.totalExperiments >= 1,
      reward: { coins: 20, researchPoints: 8, experience: 20 },
    },
    {
      id: "发现者",
      name: "发现者",
      description: "通过实验发现新物质",
      category: "discovery",
      condition: s.history.some((h) => h.newProducts.length > 0),
      reward: { coins: 25, researchPoints: 10, experience: 25 },
    },
    {
      id: "初识物质",
      name: "初识物质",
      description: "收集 10 种物质",
      category: "discovery",
      condition: n >= 10,
      reward: { coins: 35, researchPoints: 12, experience: 30 },
    },
    {
      id: "探索无界",
      name: "探索无界",
      description: "收集 30 种物质",
      category: "discovery",
      condition: n >= 30,
      reward: { coins: 70, researchPoints: 25, experience: 60 },
    },
    {
      id: "物质收藏家",
      name: "物质收藏家",
      description: `收集全部 ${substances.length} 种物质`,
      category: "discovery",
      condition: n === substances.length,
      reward: { coins: 300, researchPoints: 100, experience: 250 },
    },
    {
      id: "挑战启程",
      name: "挑战启程",
      description: "完成一个挑战",
      category: "discovery",
      condition: best.length >= 1,
      reward: { coins: 30, researchPoints: 10, experience: 25 },
    },
    {
      id: "实验达人",
      name: "实验达人",
      description: "完成 10 个挑战",
      category: "discovery",
      condition: best.length >= 10,
      reward: { coins: 80, researchPoints: 30, experience: 75 },
    },
    {
      id: "完美实验",
      name: "完美实验",
      description: "首次获得三星",
      category: "discovery",
      condition: best.some((b) => b.stars === 3),
      reward: { coins: 35, researchPoints: 14, experience: 30 },
    },
    {
      id: "新纪元",
      name: "新纪元",
      description: "解锁火与材料时代",
      category: "discovery",
      condition: currentEra(s) >= 1,
      reward: { coins: 50, researchPoints: 20, experience: 45 },
    },
    {
      id: "气体之友",
      name: "气体之友",
      description: "收集气体分类的所有物质",
      category: "discovery",
      condition: substances
        .filter((x) => x.group === "气体")
        .every((x) => x.id in s.discovered),
      reward: { coins: 65, researchPoints: 24, experience: 55 },
    },
    {
      id: "金属之心",
      name: "金属之心",
      description: "收集全部金属与单质",
      category: "discovery",
      condition: substances
        .filter((x) => x.group === "金属与单质")
        .every((x) => x.id in s.discovered),
      reward: { coins: 90, researchPoints: 32, experience: 80 },
    },
    {
      id: "坚持探索",
      name: "坚持探索",
      description: "完成 20 次自由实验",
      category: "discovery",
      condition: s.totalExperiments >= 20,
      reward: { coins: 55, researchPoints: 20, experience: 50 },
    },

    // === 22 New V1.6 Achievements across Stoichiometry, Management, History, World, Tech & Museum ===
    {
      id: "定量启航",
      name: "定量启航",
      description: "在进阶定量模式中完成首道定量挑战",
      category: "stoichiometry",
      condition: quantBest.length >= 1,
      reward: { coins: 40, researchPoints: 18, experience: 40 },
    },
    {
      id: "零浪费大师",
      name: "零浪费大师",
      description: "在进阶定量或特殊挑战中达成 100% 份数利用率",
      category: "stoichiometry",
      condition: Object.values(s.bestUtilization).some(
        (u) => u.portionUtilization >= 1,
      ),
      reward: { coins: 45, researchPoints: 20, experience: 45 },
    },
    {
      id: "配平学者",
      name: "配平学者",
      description: "在方程式配平工作室正确配平 3 条化学方程式",
      category: "stoichiometry",
      condition: balancedCount >= 3,
      reward: { coins: 50, researchPoints: 24, experience: 50 },
    },
    {
      id: "特殊试炼初捷",
      name: "特殊试炼初捷",
      description: "完成 1 道 V1.6 特殊挑战（极限/最短/零浪费/鉴定/逆推）",
      category: "stoichiometry",
      condition: specialBest.length >= 1,
      reward: { coins: 50, researchPoints: 22, experience: 50 },
    },
    {
      id: "推理侦探",
      name: "推理侦探",
      description: "完成 5 道 V1.6 特殊挑战",
      category: "stoichiometry",
      condition: specialBest.length >= 5,
      reward: { coins: 110, researchPoints: 45, experience: 100 },
    },
    {
      id: "首批委托",
      name: "首批委托",
      description: "在实验室经营中交付第 1 份研究订单",
      category: "management",
      condition: totalOrderDeliveries >= 1,
      reward: { coins: 40, researchPoints: 16, experience: 35 },
    },
    {
      id: "稳健经营者",
      name: "稳健经营者",
      description: "累计交付 10 份研究订单",
      category: "management",
      condition: totalOrderDeliveries >= 10,
      reward: { coins: 120, researchPoints: 40, experience: 95 },
    },
    {
      id: "设备工匠",
      name: "设备工匠",
      description: "在经营实验室中建造至少 3 台实验设备",
      category: "management",
      condition: Object.keys(s.equipmentLevels).length >= 3,
      reward: { coins: 70, researchPoints: 24, experience: 60 },
    },
    {
      id: "全套装备",
      name: "全套装备",
      description: "在经营实验室中集齐全部 8 台功能设备",
      category: "management",
      condition: Object.keys(s.equipmentLevels).length >= 8,
      reward: { coins: 200, researchPoints: 70, experience: 160 },
    },
    {
      id: "标准实验室",
      name: "标准实验室",
      description: "将实验室升级至 Lv.2 标准研究实验室",
      category: "management",
      condition: s.labLevel >= 2,
      reward: { coins: 100, researchPoints: 35, experience: 90 },
    },
    {
      id: "高级实验中心",
      name: "高级实验中心",
      description: "将实验室升级至 Lv.3 高级定量实验中心",
      category: "management",
      condition: s.labLevel >= 3,
      reward: { coins: 220, researchPoints: 75, experience: 180 },
    },
    {
      id: "科技萌芽",
      name: "科技萌芽",
      description: "在科技研究树中解锁第 1 项科技",
      category: "museum_tech",
      condition: s.unlockedTechIds.length >= 1,
      reward: { coins: 35, researchPoints: 15, experience: 35 },
    },
    {
      id: "科学体系架构师",
      name: "科学体系架构师",
      description: "在科技研究树中累计解锁 12 项科技",
      category: "museum_tech",
      condition: s.unlockedTechIds.length >= 12,
      reward: { coins: 150, researchPoints: 55, experience: 130 },
    },
    {
      id: "全能科技树",
      name: "全能科技树",
      description: "解锁全部 24 项 V1.6 科技节点",
      category: "museum_tech",
      condition: s.unlockedTechIds.length >= 24,
      reward: { coins: 300, researchPoints: 100, experience: 250 },
    },
    {
      id: "野外采样员",
      name: "野外采样员",
      description: "在世界探索中累计完成 3 次区域采集",
      category: "world",
      condition: totalGathers >= 3,
      reward: { coins: 40, researchPoints: 15, experience: 35 },
    },
    {
      id: "山脉勘探家",
      name: "山脉勘探家",
      description: "解锁世界探索区域「矿石山脉」",
      category: "world",
      condition: s.unlockedRegionIds.includes("mountains"),
      reward: { coins: 75, researchPoints: 28, experience: 65 },
    },
    {
      id: "盐湖远征队",
      name: "盐湖远征队",
      description: "解锁世界探索区域「海洋与盐湖」",
      category: "world",
      condition: s.unlockedRegionIds.includes("ocean"),
      reward: { coins: 95, researchPoints: 34, experience: 80 },
    },
    {
      id: "重返化学史",
      name: "重返化学史",
      description: "完成任意 1 个「挑战历史」可玩章节",
      category: "history",
      condition: historyDone.length >= 1,
      reward: { coins: 60, researchPoints: 25, experience: 55 },
    },
    {
      id: "电化学先锋",
      name: "电化学先锋",
      description: "完成挑战历史第 4 章「伏打电堆与电化学诞生」",
      category: "history",
      condition: Boolean(s.historyProgress.hist_04?.completed),
      reward: { coins: 85, researchPoints: 32, experience: 75 },
    },
    {
      id: "周期预言家",
      name: "周期预言家",
      description: "完成挑战历史第 7 章「元素周期律与空白预言」",
      category: "history",
      condition: Boolean(s.historyProgress.hist_07?.completed),
      reward: { coins: 95, researchPoints: 36, experience: 85 },
    },
    {
      id: "科学史见证者",
      name: "科学史见证者",
      description: "通关 V1.6 全部 5 个可玩历史章节",
      category: "history",
      condition: historyDone.length >= 5,
      reward: { coins: 220, researchPoints: 80, experience: 200 },
    },
    {
      id: "博物馆策展人",
      name: "博物馆策展人",
      description: "在科学博物馆中点亮至少 6 件珍贵藏品",
      category: "museum_tech",
      condition: museumCount >= 6,
      reward: { coins: 120, researchPoints: 45, experience: 100 },
    },
  ];

  return list.map(({ condition, ...rest }) => ({
    ...rest,
    earned: condition || s.achievements.includes(rest.name),
  }));
}

/**
 * Legacy tuple signature preserved for existing unit tests & callers.
 */
export function achievements(s: Save): [string, string, boolean][] {
  return detailedAchievements(s).map((a) => [a.name, a.description, a.earned]);
}

/**
 * Idempotent achievement reward claim.
 */
export function claimAchievementReward(
  save: Save,
  achievementName: string,
): { ok: true; save: Save; message: string } | { ok: false; error: string } {
  const item = detailedAchievements(save).find(
    (a) => a.name === achievementName,
  );
  if (!item) return { ok: false, error: "未知成就。" };
  if (!item.earned)
    return { ok: false, error: "尚未达成该成就，无法领取奖励。" };
  if (save.claimedAchievementRewards.includes(item.name)) {
    return { ok: false, error: "该成就奖励已领取，不可重复领取。" };
  }
  const eventId = `achievement_reward:${item.name}`;
  const claimed = claimRewardOnce(save, eventId, item.reward);
  if (!claimed.claimed) {
    return { ok: false, error: "该成就奖励已登记领取。" };
  }
  return {
    ok: true,
    save: {
      ...claimed.save,
      claimedAchievementRewards: [
        ...claimed.save.claimedAchievementRewards,
        item.name,
      ],
    },
    message: `已领取成就「${item.name}」奖励：+${item.reward.coins} 金币，+${item.reward.researchPoints} RP，+${item.reward.experience} XP。`,
  };
}
