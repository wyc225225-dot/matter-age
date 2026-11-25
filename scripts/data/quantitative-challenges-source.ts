import type { QuantitativeChallenge } from "../../src/types/index";

/**
 * 30 curated V1.5 Quantitative Challenges across 3 tiers (10 each):
 * - 基础份数 (q1-q10): exact integer ratios, coefficients, phase-change & catalysis
 * - 剩余物质 (q11-q20): limiting reactants, partial vs complete reactions, zero-waste tuning
 * - 定量推演 (q21-q30): finite-inventory multi-step synthesis + equation balancing challenges
 *
 * Note: Official execution remains strictly gated on `reviewStatus === "reviewed"` of underlying rules.
 * Every challenge includes verified `solutionSteps` replayed by `verifyQuantitativeChallenge()`.
 */
export const quantitativeChallengesSource: QuantitativeChallenge[] = [
  // ── 一、基础份数（q1–q10：整数比例与化学计量系数） ───────────────────
  {
    id: "q1",
    name: "氢氧 2:1 合成水",
    description: "按 2H₂ + O₂ → 2H₂O 的化学计量比投入，完全反应生成 2 份水。",
    group: "基础份数",
    kind: "synthesis",
    initialInventory: { hydrogen: 2, oxygen: 1 },
    catalysts: [],
    conditions: ["ignite", "heat"],
    target: { substanceId: "water", minAmount: 2, exactZeroLeftover: true },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r006",
        inputs: { hydrogen: 2, oxygen: 1 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q2",
    name: "双倍电解制氢",
    description:
      "电解 4 份水（2H₂O → 2H₂ + O₂），精确获得 4 份氢气且无水剩余。",
    group: "基础份数",
    kind: "synthesis",
    initialInventory: { water: 4 },
    catalysts: [],
    conditions: ["electricity", "heat"],
    target: { substanceId: "hydrogen", minAmount: 4, exactZeroLeftover: true },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r005",
        inputs: { water: 4 },
        conditions: ["electricity"],
      },
    ],
  },
  {
    id: "q3",
    name: "物态守恒：三份结冰",
    description:
      "独立物态变化遵循 1:1 份数守恒，将 3 份液态水全部凝固为 3 份冰。",
    group: "基础份数",
    kind: "synthesis",
    initialInventory: { water: 3 },
    catalysts: [],
    conditions: ["cool", "heat"],
    target: { substanceId: "ice", minAmount: 3, exactZeroLeftover: true },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r001",
        inputs: { water: 3 },
        conditions: ["cool"],
      },
    ],
  },
  {
    id: "q4",
    name: "催化剂零消耗制氧",
    description:
      "使用独立催化剂二氧化锰分解 6 份过氧化氢（2H₂O₂ → 2H₂O + O₂），制取 3 份氧气。",
    group: "基础份数",
    kind: "synthesis",
    initialInventory: { peroxide: 6 },
    catalysts: ["manganese_dioxide"],
    conditions: ["mix", "cool"],
    target: { substanceId: "oxygen", minAmount: 3, exactZeroLeftover: true },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r027",
        inputs: { peroxide: 6 },
        conditions: ["mix"],
        catalysts: ["manganese_dioxide"],
      },
    ],
  },
  {
    id: "q5",
    name: "铁氧 3:2 制磁铁矿",
    description:
      "依据 3Fe + 2O₂ → Fe₃O₄，恰好消耗 6 份铁与 4 份氧气制得 2 份四氧化三铁。",
    group: "基础份数",
    kind: "synthesis",
    initialInventory: { iron: 6, oxygen: 4 },
    catalysts: [],
    conditions: ["ignite", "heat"],
    target: { substanceId: "magnetite", minAmount: 2, exactZeroLeftover: true },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r007",
        inputs: { iron: 6, oxygen: 4 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q6",
    name: "镁条燃氧 2:1",
    description: "按 2Mg + O₂ → 2MgO 投入，制取 4 份氧化镁且不留剩余。",
    group: "基础份数",
    kind: "synthesis",
    initialInventory: { magnesium: 4, oxygen: 2 },
    catalysts: [],
    conditions: ["ignite", "mix"],
    target: {
      substanceId: "magnesium_oxide",
      minAmount: 4,
      exactZeroLeftover: true,
    },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r009",
        inputs: { magnesium: 4, oxygen: 2 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q7",
    name: "铝氧 4:3 化合",
    description:
      "掌握非 1 系数配比 4Al + 3O₂ → 2Al₂O₃，完全反应制得 2 份氧化铝。",
    group: "基础份数",
    kind: "synthesis",
    initialInventory: { aluminium: 4, oxygen: 3 },
    catalysts: [],
    conditions: ["ignite", "high_heat"],
    target: {
      substanceId: "aluminium_oxide",
      minAmount: 2,
      exactZeroLeftover: true,
    },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r011",
        inputs: { aluminium: 4, oxygen: 3 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q8",
    name: "煅烧三份石灰石",
    description: "高温分解 3 份碳酸钙（CaCO₃ → CaO + CO₂），获取 3 份氧化钙。",
    group: "基础份数",
    kind: "synthesis",
    initialInventory: { calcium_carbonate: 3 },
    catalysts: [],
    conditions: ["high_heat", "heat"],
    target: {
      substanceId: "calcium_oxide",
      minAmount: 3,
      exactZeroLeftover: true,
    },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r017",
        inputs: { calcium_carbonate: 3 },
        conditions: ["high_heat"],
      },
    ],
  },
  {
    id: "q9",
    name: "二元酸 2:1 中和",
    description: "按 2NaOH + H₂SO₄ → Na₂SO₄ + 2H₂O 精确投入，制取 2 份硫酸钠。",
    group: "基础份数",
    kind: "synthesis",
    initialInventory: { sodium_hydroxide: 4, sulfuric_acid: 2 },
    catalysts: [],
    conditions: ["mix", "heat"],
    target: {
      substanceId: "sodium_sulfate",
      minAmount: 2,
      exactZeroLeftover: true,
    },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r051",
        inputs: { sodium_hydroxide: 4, sulfuric_acid: 2 },
        conditions: ["mix"],
      },
    ],
  },
  {
    id: "q10",
    name: "碳酸钙与盐酸 1:2",
    description:
      "按 CaCO₃ + 2HCl → CaCl₂ + CO₂ + H₂O 完全反应，收集 3 份二氧化碳。",
    group: "基础份数",
    kind: "synthesis",
    initialInventory: { calcium_carbonate: 3, hydrochloric_acid: 6 },
    catalysts: [],
    conditions: ["mix", "cool"],
    target: {
      substanceId: "carbon_dioxide",
      minAmount: 3,
      exactZeroLeftover: true,
    },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r052",
        inputs: { calcium_carbonate: 3, hydrochloric_acid: 6 },
        conditions: ["mix"],
      },
    ],
  },

  // ── 二、剩余物质（q11–q20：限制反应物、部分反应与配比调优） ──────────
  {
    id: "q11",
    name: "经典限制物：3 氢 2 氧",
    description:
      "库存为 3 份氢气和 2 份氧气。执行一次反应观察 3H₂ + 2O₂ 仅能反应 1 次生成 2 份水并各剩 1 份。",
    group: "剩余物质",
    kind: "synthesis",
    initialInventory: { hydrogen: 3, oxygen: 2 },
    catalysts: [],
    conditions: ["ignite"],
    target: { substanceId: "water", minAmount: 2 },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r006",
        inputs: { hydrogen: 3, oxygen: 2 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q12",
    name: "精准截取无浪费：氢氧配比",
    description:
      "仓库里有 5 份氢气和 4 份氧气。仅投入能完全反应的最大整数配比，单次 100% 利用率制取 4 份水。",
    group: "剩余物质",
    kind: "synthesis",
    initialInventory: { hydrogen: 5, oxygen: 4 },
    catalysts: [],
    conditions: ["ignite"],
    target: { substanceId: "water", minAmount: 4, minPortionUtilization: 1 },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r006",
        inputs: { hydrogen: 4, oxygen: 2 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q13",
    name: "铁氧受限反应",
    description:
      "拥有 7 份铁和 5 份氧气，找出最大完全反应整数倍，零浪费单次制取 2 份四氧化三铁。",
    group: "剩余物质",
    kind: "synthesis",
    initialInventory: { iron: 7, oxygen: 5 },
    catalysts: [],
    conditions: ["ignite"],
    target: {
      substanceId: "magnetite",
      minAmount: 2,
      minPortionUtilization: 1,
    },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r007",
        inputs: { iron: 6, oxygen: 4 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q14",
    name: "铝氧配比瓶颈",
    description:
      "拥有 9 份铝与 7 份氧气，识别限制反应物并按最大整倍完全反应制得 4 份氧化铝。",
    group: "剩余物质",
    kind: "synthesis",
    initialInventory: { aluminium: 9, oxygen: 7 },
    catalysts: [],
    conditions: ["ignite"],
    target: {
      substanceId: "aluminium_oxide",
      minAmount: 4,
      minPortionUtilization: 1,
    },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r011",
        inputs: { aluminium: 8, oxygen: 6 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q15",
    name: "一氧化碳过量控制",
    description:
      "拥有 5 份一氧化碳和 3 份氧气（2CO + O₂ → 2CO₂），按完全反应比例一次制得 4 份二氧化碳。",
    group: "剩余物质",
    kind: "synthesis",
    initialInventory: { carbon_monoxide: 5, oxygen: 3 },
    catalysts: [],
    conditions: ["ignite"],
    target: {
      substanceId: "carbon_dioxide",
      minAmount: 4,
      minPortionUtilization: 1,
    },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r013",
        inputs: { carbon_monoxide: 4, oxygen: 2 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q16",
    name: "金属钠遇水计量",
    description:
      "拥有 5 份钠和 4 份水（2Na + 2H₂O → 2NaOH + H₂），按完全反应比例投入以制取 2 份氢气。",
    group: "剩余物质",
    kind: "synthesis",
    initialInventory: { sodium: 5, water: 4 },
    catalysts: [],
    conditions: ["mix"],
    target: {
      substanceId: "hydrogen",
      minAmount: 2,
      minPortionUtilization: 1,
    },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r021",
        inputs: { sodium: 4, water: 4 },
        conditions: ["mix"],
      },
    ],
  },
  {
    id: "q17",
    name: "锌与盐酸限制物",
    description:
      "拥有 4 份锌与 5 份盐酸（Zn + 2HCl → ZnCl₂ + H₂），找出最大整数反应单元制得 2 份氯化锌。",
    group: "剩余物质",
    kind: "synthesis",
    initialInventory: { zinc: 4, hydrochloric_acid: 5 },
    catalysts: [],
    conditions: ["mix"],
    target: {
      substanceId: "zinc_chloride",
      minAmount: 2,
      minPortionUtilization: 1,
    },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r034",
        inputs: { zinc: 2, hydrochloric_acid: 4 },
        conditions: ["mix"],
      },
    ],
  },
  {
    id: "q18",
    name: "蓝絮沉淀精确控碱",
    description:
      "拥有 3 份硫酸铜与 5 份氢氧化钠（CuSO₄ + 2NaOH → Cu(OH)₂ + Na₂SO₄），100% 份数利用率沉淀出 2 份氢氧化铜。",
    group: "剩余物质",
    kind: "synthesis",
    initialInventory: { copper_sulfate: 3, sodium_hydroxide: 5 },
    catalysts: [],
    conditions: ["mix"],
    target: {
      substanceId: "copper_hydroxide",
      minAmount: 2,
      minPortionUtilization: 1,
    },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r064",
        inputs: { copper_sulfate: 2, sodium_hydroxide: 4 },
        conditions: ["mix"],
      },
    ],
  },
  {
    id: "q19",
    name: "高炉还原 1:3 限制物",
    description:
      "拥有 3 份氧化铁与 7 份一氧化碳（Fe₂O₃ + 3CO → 2Fe + 3CO₂），按完全反应比例一次炼出 4 份铁。",
    group: "剩余物质",
    kind: "synthesis",
    initialInventory: { iron_oxide: 3, carbon_monoxide: 7 },
    catalysts: [],
    conditions: ["high_heat"],
    target: { substanceId: "iron", minAmount: 4, minPortionUtilization: 1 },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r066",
        inputs: { iron_oxide: 2, carbon_monoxide: 6 },
        conditions: ["high_heat"],
      },
    ],
  },
  {
    id: "q20",
    name: "红热铁与水蒸气 3:4",
    description:
      "拥有 7 份铁和 9 份水蒸气（3Fe + 4H₂O → Fe₃O₄ + 4H₂），按完全反应比例一次制取 8 份氢气。",
    group: "剩余物质",
    kind: "synthesis",
    initialInventory: { iron: 7, steam: 9 },
    catalysts: [],
    conditions: ["high_heat"],
    target: {
      substanceId: "hydrogen",
      minAmount: 8,
      minPortionUtilization: 1,
    },
    limit: 2,
    solutionSteps: [
      {
        reactionId: "r071",
        inputs: { iron: 6, steam: 8 },
        conditions: ["high_heat"],
      },
    ],
  },

  // ── 三、定量推演（q21–q30：有限库存多步串联 + 方程式配平） ───────────
  {
    id: "q21",
    name: "有限库存：电解再炼铜",
    description:
      "初始仅有 2 份水与 2 份氧化铜。先电解水获得 2 份氢气，再用氢气加热还原氧化铜制取 2 份铜。",
    group: "定量推演",
    kind: "synthesis",
    initialInventory: { water: 2, copper_oxide: 2 },
    catalysts: [],
    conditions: ["electricity", "heat"],
    target: { substanceId: "copper", minAmount: 2 },
    limit: 3,
    solutionSteps: [
      {
        reactionId: "r005",
        inputs: { water: 2 },
        conditions: ["electricity"],
      },
      {
        reactionId: "r068",
        inputs: { copper_oxide: 2, hydrogen: 2 },
        conditions: ["heat"],
      },
    ],
  },
  {
    id: "q22",
    name: "有限库存：石灰熟化倍增",
    description:
      "仅有 3 份碳酸钙与 3 份水。煅烧制得 3 份氧化钙，再全部熟化为 3 份氢氧化钙。",
    group: "定量推演",
    kind: "synthesis",
    initialInventory: { calcium_carbonate: 3, water: 3 },
    catalysts: [],
    conditions: ["high_heat", "mix"],
    target: { substanceId: "calcium_hydroxide", minAmount: 3 },
    limit: 3,
    solutionSteps: [
      {
        reactionId: "r017",
        inputs: { calcium_carbonate: 3 },
        conditions: ["high_heat"],
      },
      {
        reactionId: "r018",
        inputs: { calcium_oxide: 3, water: 3 },
        conditions: ["mix"],
      },
    ],
  },
  {
    id: "q23",
    name: "催化留存：两步制氧化镁",
    description:
      "用 4 份过氧化氢与保留催化剂二氧化锰制取 2 份氧气，再与 4 份镁完全燃烧生成 4 份氧化镁。",
    group: "定量推演",
    kind: "synthesis",
    initialInventory: { peroxide: 4, magnesium: 4 },
    catalysts: ["manganese_dioxide"],
    conditions: ["mix", "ignite"],
    target: { substanceId: "magnesium_oxide", minAmount: 4 },
    limit: 3,
    solutionSteps: [
      {
        reactionId: "r027",
        inputs: { peroxide: 4 },
        conditions: ["mix"],
        catalysts: ["manganese_dioxide"],
      },
      {
        reactionId: "r009",
        inputs: { magnesium: 4, oxygen: 2 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q24",
    name: "三步高炉：精准炼出 2 份铁",
    description:
      "资源紧张：仅有 4 份碳、2 份氧气和 1 份氧化铁。合理分配碳用于燃烧与布杜阿尔还原，最终炼出 2 份铁。",
    group: "定量推演",
    kind: "synthesis",
    initialInventory: { carbon: 4, oxygen: 2, iron_oxide: 1 },
    catalysts: [],
    conditions: ["ignite", "high_heat"],
    target: { substanceId: "iron", minAmount: 2 },
    limit: 4,
    solutionSteps: [
      {
        reactionId: "r012",
        inputs: { carbon: 2, oxygen: 2 },
        conditions: ["ignite"],
      },
      {
        reactionId: "r070",
        inputs: { carbon_dioxide: 2, carbon: 2 },
        conditions: ["high_heat"],
      },
      {
        reactionId: "r066",
        inputs: { iron_oxide: 1, carbon_monoxide: 3 },
        conditions: ["high_heat"],
      },
    ],
  },
  {
    id: "q25",
    name: "三步氢冶金：3 份水到 2 份铁",
    description:
      "拥有 4 份水与 2 份氢氧化铁。电解水得 4 份氢气，分解氢氧化铁得 1 份氧化铁，再高温还原得 2 份铁。",
    group: "定量推演",
    kind: "synthesis",
    initialInventory: { water: 4, iron_hydroxide: 2 },
    catalysts: [],
    conditions: ["electricity", "heat", "high_heat"],
    target: { substanceId: "iron", minAmount: 2 },
    limit: 4,
    solutionSteps: [
      {
        reactionId: "r005",
        inputs: { water: 4 },
        conditions: ["electricity"],
      },
      {
        reactionId: "r030",
        inputs: { iron_hydroxide: 2 },
        conditions: ["heat"],
      },
      {
        reactionId: "r095",
        inputs: { iron_oxide: 1, hydrogen: 3 },
        conditions: ["high_heat"],
      },
    ],
  },
  {
    id: "q26",
    name: "三步苛化：定量制 4 份烧碱",
    description:
      "用 2 份碳酸钙、2 份水与 2 份碳酸钠依次煅烧、熟化、苛化，精准制取 4 份氢氧化钠。",
    group: "定量推演",
    kind: "synthesis",
    initialInventory: {
      calcium_carbonate: 2,
      water: 2,
      sodium_carbonate: 2,
    },
    catalysts: [],
    conditions: ["high_heat", "mix"],
    target: { substanceId: "sodium_hydroxide", minAmount: 4 },
    limit: 4,
    solutionSteps: [
      {
        reactionId: "r017",
        inputs: { calcium_carbonate: 2 },
        conditions: ["high_heat"],
      },
      {
        reactionId: "r018",
        inputs: { calcium_oxide: 2, water: 2 },
        conditions: ["mix"],
      },
      {
        reactionId: "r058",
        inputs: { sodium_carbonate: 2, calcium_hydroxide: 2 },
        conditions: ["mix"],
      },
    ],
  },
  {
    id: "q27",
    name: "方程式配平：氢氧合成水",
    description:
      "在配平面板调整化学式前的整数系数（不可改下标），配平 H₂ + O₂ → H₂O 并追求最简整数比。",
    group: "定量推演",
    kind: "balancing",
    initialInventory: { hydrogen: 2, oxygen: 1 },
    catalysts: [],
    conditions: ["ignite"],
    target: { substanceId: "water", minAmount: 2 },
    balancingReactionId: "r006",
    limit: 3,
    solutionSteps: [
      {
        reactionId: "r006",
        inputs: { hydrogen: 2, oxygen: 1 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q28",
    name: "方程式配平：铁燃成磁铁矿",
    description:
      "配平 Fe + O₂ → Fe₃O₄，理解混合价态氧化物中铁原子与氧原子的守恒关系。",
    group: "定量推演",
    kind: "balancing",
    initialInventory: { iron: 3, oxygen: 2 },
    catalysts: [],
    conditions: ["ignite"],
    target: { substanceId: "magnetite", minAmount: 1 },
    balancingReactionId: "r007",
    limit: 3,
    solutionSteps: [
      {
        reactionId: "r007",
        inputs: { iron: 3, oxygen: 2 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q29",
    name: "方程式配平：铝的氧化",
    description:
      "配平 Al + O₂ → Al₂O₃，通过最小公倍数法处理氧原子奇偶配平并化为最简比。",
    group: "定量推演",
    kind: "balancing",
    initialInventory: { aluminium: 4, oxygen: 3 },
    catalysts: [],
    conditions: ["ignite"],
    target: { substanceId: "aluminium_oxide", minAmount: 2 },
    balancingReactionId: "r011",
    limit: 3,
    solutionSteps: [
      {
        reactionId: "r011",
        inputs: { aluminium: 4, oxygen: 3 },
        conditions: ["ignite"],
      },
    ],
  },
  {
    id: "q30",
    name: "方程式配平：高炉炼铁总式",
    description:
      "配平 Fe₂O₃ + CO → Fe + CO₂，掌握多原子氧化物与还原气的守恒配平。",
    group: "定量推演",
    kind: "balancing",
    initialInventory: { iron_oxide: 1, carbon_monoxide: 3 },
    catalysts: [],
    conditions: ["high_heat"],
    target: { substanceId: "iron", minAmount: 2 },
    balancingReactionId: "r066",
    limit: 3,
    solutionSteps: [
      {
        reactionId: "r066",
        inputs: { iron_oxide: 1, carbon_monoxide: 3 },
        conditions: ["high_heat"],
      },
    ],
  },
];
