import type { Condition, Reaction, Substance } from "../types";
import { findPathToTarget } from "./reactionEngine";

const defaultConditionLabels: Record<Condition, string> = {
  heat: "加热",
  ignite: "点燃",
  high_heat: "高温",
  electricity: "通电",
  light: "光照",
  cool: "冷却",
  grind: "研磨",
  mix: "混合",
  filter: "过滤",
  evaporate: "蒸发",
  distill: "蒸馏",
};

export interface HintOptions {
  target?: string;
  labelCondition?: (c: Condition) => string;
}

export function getHint(
  owned: string[],
  completed: string[],
  rules: Reaction[],
  db: Record<string, Substance>,
  level: number,
  options: HintOptions = {},
) {
  const formatCond =
    options.labelCondition ||
    ((c: Condition) => defaultConditionLabels[c] || c);

  let rule: Reaction | undefined;
  let remainingSteps = 1;

  if (options.target) {
    const path = findPathToTarget(owned, options.target, rules);
    if (path && path.length > 0) {
      rule = path[0];
      remainingSteps = path.length;
    }
  }

  if (!rule) {
    const available = rules.filter((r) =>
      [...r.reactants.map((p) => p.substanceId), ...r.catalysts].every((id) =>
        owned.includes(id),
      ),
    );
    rule =
      available.find((r) =>
        r.products.some((p) => !owned.includes(p.substanceId)),
      ) || available.find((r) => !completed.includes(r.id));
  }

  if (!rule)
    return {
      message: options.target
        ? "当前挑战材料下暂未找到通向目标的新路径，请检查是否已达成目标或尝试重置关卡。"
        : "当前已知材料的可执行路径已探索。可前往标本补给获取新的起点。",
      rule: null,
    };

  const groups = [
    ...new Set(rule.reactants.map((p) => db[p.substanceId].group)),
  ];
  const stepNote =
    options.target && remainingSteps > 1
      ? `（距离目标还需约 ${remainingSteps} 步，先合成中间产物）`
      : "";

  const message =
    level === 1
      ? `试试「${groups.join("」「")}」类别的材料${rule.catalysts.length ? "，并留意催化剂" : ""}。${stepNote}`
      : level === 2
        ? `当前可执行步骤需要：${rule.reactants.map((p) => db[p.substanceId].name).join(" + ")}${rule.catalysts.length ? `（可搭配催化剂：${rule.catalysts.map((id) => db[id].name).join("、")}）` : ""}。${stepNote}`
        : `组合：${rule.reactants.map((p) => db[p.substanceId].name).join(" + ")}；条件：${rule.conditions.map(formatCond).join("、")}${rule.catalysts.length ? "；催化剂：" + rule.catalysts.map((id) => db[id].name).join("、") : ""}。${stepNote}`;

  return { message, rule };
}
