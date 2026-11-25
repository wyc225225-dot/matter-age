import rawSubstances from "./substances.json";
import rawReactions from "./reactions.json";
import rawChallenges from "./challenges.json";
import rawQuantitativeChallenges from "./quantitativeChallenges.json";
import type {
  Substance,
  Reaction,
  Condition,
  Challenge,
  QuantitativeChallenge,
} from "../types";

export const substances = rawSubstances as Substance[];
export const reactions = rawReactions as Reaction[];
export const challenges = rawChallenges as Challenge[];
export const quantitativeChallenges =
  rawQuantitativeChallenges as unknown as QuantitativeChallenge[];

export const byId = Object.fromEntries(
  substances.map((s) => [s.id, s]),
) as Record<string, Substance>;

export const reviewedAdvancedRules = reactions.filter(
  (r) =>
    r.reviewStatus === "reviewed" &&
    r.stoichiometrySupported &&
    r.supportedModes.includes("advanced"),
);

export const conditions: { id: Condition; name: string; symbol: string }[] = [
  { id: "heat", name: "加热", symbol: "♨" },
  { id: "ignite", name: "点燃", symbol: "✦" },
  { id: "high_heat", name: "高温", symbol: "≋" },
  { id: "electricity", name: "通电", symbol: "ϟ" },
  { id: "light", name: "光照", symbol: "☀" },
  { id: "cool", name: "冷却", symbol: "❄" },
  { id: "grind", name: "研磨", symbol: "⋈" },
  { id: "mix", name: "混合", symbol: "⤨" },
  { id: "filter", name: "过滤", symbol: "▽" },
  { id: "evaporate", name: "蒸发", symbol: "♨" },
  { id: "distill", name: "蒸馏", symbol: "⌁" },
];

export const conditionName = (id: string) =>
  conditions.find((c) => c.id === id)?.name || byId[id]?.name || id;

export const eras = [
  {
    name: "自然时代",
    en: "AGE OF NATURE",
    description: "从一滴水出发，认识自然中的物质与状态。",
    targets: ["water", "ice", "steam", "oxygen"],
  },
  {
    name: "火与材料时代",
    en: "AGE OF FIRE",
    description: "热改变了材料，也改变了我们理解世界的方式。",
    targets: ["calcium_oxide", "calcium_hydroxide", "glass", "ceramic"],
  },
  {
    name: "金属时代",
    en: "AGE OF METALS",
    description: "理解氧化与还原，探索金属的不同面貌。",
    targets: ["copper", "zinc", "magnetite", "copper_oxide"],
  },
  {
    name: "化学工业时代",
    en: "AGE OF CHEMISTRY",
    description: "酸、碱、盐构成更广阔的化学网络。",
    targets: [
      "sodium_hydroxide",
      "sodium_carbonate",
      "copper_hydroxide",
      "sodium_sulfate",
    ],
  },
];

export * from "./v16";
