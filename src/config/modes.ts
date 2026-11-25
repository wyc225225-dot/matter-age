import type { GameMode } from "../types";

export interface ModeDescriptor {
  id: GameMode;
  name: string;
  en: string;
  tagline: string;
  locked: boolean;
  badge: string;
}

export const ADVANCED_LIMITS = {
  minPortions: 1,
  maxPortions: 99,
} as const;

export const MASS_BASIS_LABEL = "按 1 份 = 1 mol 理论基准换算（g）";

export const GAME_MODES: ModeDescriptor[] = [
  {
    id: "simple",
    name: "简单模式",
    en: "SIMPLE MODE",
    tagline: "物质组合、反应条件与独立催化剂探索，发现并收集不断扩充的物质。",
    locked: false,
    badge: "V1.0 探索",
  },
  {
    id: "advanced",
    name: "进阶模式",
    en: "ADVANCED STOICHIOMETRY",
    tagline: "整数份数计量、限制反应物、剩余物质、元素守恒可视化与方程式配平。",
    locked: false,
    badge: "V1.5 定量",
  },
  {
    id: "hard",
    name: "困难模式",
    en: "VIRTUAL LAB · LOCKED",
    tagline:
      "真实虚拟实验仪器、浓度、温压控制、操作流程与实验报告（V2.0 预告）。",
    locked: true,
    badge: "即将推出",
  },
];
