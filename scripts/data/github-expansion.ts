import type {
  Substance,
  Reaction,
  Condition,
  ModelKind,
} from "../../src/types";
import rawSpecies from "../../src/data/knowledgeSubstances.json";
import facts from "../../src/data/knowledgeTransformations.json";
import elements from "../../src/data/elements.json";
import { reachable } from "../../src/engine/reactionEngine";
// Use the same conventional atomic weights as the base catalog so that a reaction
// crossing old/new items does not mix rounded or isotope-specific source values.
const atomicWeights: Record<string, number> = {
  H: 1.008,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  Na: 22.99,
  Mg: 24.305,
  Al: 26.982,
  Si: 28.085,
  P: 30.974,
  S: 32.06,
  Cl: 35.45,
  K: 39.098,
  Ca: 40.078,
  Mn: 54.938,
  Fe: 55.845,
  Cu: 63.546,
  Zn: 65.38,
  Li: 6.94,
  Ni: 58.6934,
  Sn: 118.71,
  Br: 79.904,
  I: 126.90447,
  Pb: 207.2,
  Ag: 107.8682,
};
type Species = {
  id: string;
  nameEn: string;
  formula: string;
  state: string;
  elementComposition: Record<string, number>;
  charge: number;
  referenceRecordIds: string[];
};
const species = rawSpecies as unknown as Species[];
const selected = new Set([
  "iron-sulfur",
  "methane-combustion",
  "ethane-combustion",
  "ethanol-combustion",
  "acetylene-combustion",
  "methanol-combustion",
  "isooctane-combustion",
  "butane-combustion",
  "cyclohexane-combustion",
  "ethylene-combustion",
  "copper-silver",
  "iron-sulfide-acid",
  "lithium-water",
  "lithium-oxide-water",
  "lithium-nitride",
  "calcium-hydride-water",
  "magnesium-nitride-water",
  "nitric-oxide-oxidation",
  "nitrogen-pentoxide-water",
  "nitrous-oxide-decomposition",
  "phosphorus-oxide-water",
  "zinc-hydroxide-precipitate",
  "aluminum-hydroxide-precipitate",
  "magnesium-nickel",
  "sulfuric-potassium-neutralization",
  "phosphoric-acid-complete",
  "oxalic-neutralization",
  "calcium-acetic-acid",
  "potassium-bicarbonate-base",
  "elements-zinc-sulfide-roasting",
  "elements-tin-oxide-carbon",
  "elements-aluminium-hydroxide-decomposition",
  "bromine-iodide",
  "chlorine-bromide",
  "lead-iodide",
  "brine-electrolysis",
  "potassium-chlorate-decomposition",
  "elements-ozone-formation",
  "elements-no2-dimerization",
  "elements-magnesium-silicon",
  "elements-sulfur-dioxide-oxidation",
]);
const chinese: Record<string, string> = {
  CH4: "甲烷",
  C2H6: "乙烷",
  C2H4: "乙烯",
  C2H2: "乙炔",
  C2H6O: "乙醇",
  CH4O: "甲醇",
  C2H5OH: "乙醇",
  CH3OH: "甲醇",
  CH3COOH: "乙酸",
  "Ca(CH3COO)2": "乙酸钙",
  MgCl2: "氯化镁",
  K3PO4: "磷酸钾",
  NiCl2: "氯化镍",
  HI: "氢碘酸",
  HBr: "氢溴酸",
  C8H18: "异辛烷",
  C4H10: "丁烷",
  C6H12: "环己烷",
  Li: "锂",
  LiOH: "氢氧化锂",
  Li2O: "氧化锂",
  Li3N: "氮化锂",
  CaH2: "氢化钙",
  Mg3N2: "氮化镁",
  FeS: "硫化亚铁",
  H2S: "硫化氢",
  NO: "一氧化氮",
  NO2: "二氧化氮",
  N2O: "一氧化二氮",
  N2O4: "四氧化二氮",
  N2O5: "五氧化二氮",
  P4O10: "十氧化四磷",
  ZnOH2: "氢氧化锌",
  "Zn(OH)2": "氢氧化锌",
  "Al(OH)3": "氢氧化铝",
  Ni: "镍",
  NiSO4: "硫酸镍",
  K2SO4: "硫酸钾",
  Na3PO4: "磷酸钠",
  H2C2O4: "草酸",
  C2H2O4: "草酸",
  Na2C2O4: "草酸钠",
  "Ca(C2H3O2)2": "乙酸钙",
  KHCO3: "碳酸氢钾",
  K2CO3: "碳酸钾",
  ZnS: "硫化锌",
  SnO2: "二氧化锡",
  Sn: "锡",
  Br2: "溴",
  I2: "碘",
  KI: "碘化钾",
  KBr: "溴化钾",
  NaBr: "溴化钠",
  NaI: "碘化钠",
  Ag: "银",
  AgNO3: "硝酸银",
  "Cu(NO3)2": "硝酸铜",
  "Pb(NO3)2": "硝酸铅",
  PbI2: "碘化铅",
  KNO3: "硝酸钾",
  KClO3: "氯酸钾",
  O3: "臭氧",
  S8: "环状硫分子（S₈）",
  Mg2Si: "硅化镁",
  FeCl2: "氯化亚铁",
  AlCl3: "氯化铝",
};
const activation: Record<string, Condition> = {
  none: "mix",
  heat: "heat",
  ignition: "ignite",
  electricity: "electricity",
  cooling: "cool",
};
export function expandGithubCatalog(original: Substance[], base: Reaction[]) {
  const out = [...original];
  const rules = [...base];
  const mapping = new Map<string, string>();
  const state = (s: Species): Substance["state"] =>
    s.state === "g"
      ? "gas"
      : s.state === "l" || s.state === "aq"
        ? "liquid"
        : "solid";
  const selectedFacts = facts.filter(
    (r) =>
      selected.has(r.sourceId) &&
      ![
        "elements-magnesium-silicon",
        "elements-sulfur-dioxide-oxidation",
      ].includes(r.sourceId) &&
      r.sourceExecution !== "equation-only" &&
      r.atomBalanced &&
      r.outcome === "reaction" &&
      !r.atmosphere &&
      r.activation.every((a) => a in activation) &&
      r.reactants
        .concat(r.products)
        .every((p) => species.find((s) => s.id === p.id)?.charge === 0),
  );
  for (const s of species.filter((s) =>
    selectedFacts.some((r) =>
      r.reactants.concat(r.products).some((p) => p.id === s.id),
    ),
  )) {
    if (s.charge !== 0)
      throw new Error("离子条目不在本批中性物质适配范围：" + s.id);
    const found = original.find(
      (x) =>
        x.formula === s.formula &&
        x.state === state(s) &&
        (s.state === "aq"
          ? x.category === "solution"
          : x.category !== "solution"),
    );
    if (found) {
      mapping.set(s.id, found.id);
      continue;
    }
    const id = `kb_${s.id.replace(/[^A-Za-z0-9]/g, "_")}`;
    const refs = selectedFacts
      .filter((r) => r.reactants.concat(r.products).some((p) => p.id === s.id))
      .flatMap((r) => r.references.map((r) => r.url));
    const old = original.find((x) => x.formula === s.formula);
    const nameBase = chinese[s.formula] || old?.name || s.nameEn;
    const name = nameBase + (s.state === "aq" ? "（溶液）" : "");
    const atomic = {
      ...Object.fromEntries(
        elements.map((e) => [e.symbol, Number(e.atomicWeightText)]),
      ),
      ...atomicWeights,
    };
    const mm = Object.entries(s.elementComposition).reduce(
      (n, [e, c]) => n + atomic[e] * c,
      0,
    );
    if (!Number.isFinite(mm)) throw new Error("缺少原子质量 " + s.id);
    const elemental = Object.keys(s.elementComposition).length === 1;
    const organic =
      s.elementComposition.C &&
      s.elementComposition.H &&
      !s.elementComposition.Na &&
      !s.elementComposition.Ca;
    const modelKind: ModelKind = ["S8", "P4O10", "Br2", "I2"].includes(
      s.formula,
    )
      ? "molecule"
      : elemental &&
          s.state === "s" &&
          Object.keys(s.elementComposition)[0] !== "S"
        ? "metallic_network"
        : s.state === "g" || organic
          ? "molecule"
          : "ionic_formula_unit";
    const group = elemental
      ? s.state === "g"
        ? "气体"
        : "金属与单质"
      : s.state === "g"
        ? "气体"
        : organic
          ? "有机物"
          : s.formula.startsWith("H")
            ? "酸"
            : s.formula.includes("OH")
              ? "碱"
              : Object.keys(s.elementComposition).length === 2 &&
                  s.elementComposition.O
                ? "氧化物"
                : "盐";
    out.push({
      id,
      name,
      nameEn: s.nameEn,
      chemicalEntityId: s.formula + (s.state === "aq" ? "(aq)" : ""),
      formula: s.formula,
      category:
        s.state === "aq" ? "solution" : elemental ? "element" : "compound",
      group,
      state: state(s),
      iconId:
        s.state === "g"
          ? "gas"
          : state(s) === "liquid"
            ? "liquid"
            : elemental
              ? "metal"
              : "crystal",
      color: s.state === "g" ? "#9bcbdc" : organic ? "#d6b695" : "#9eb9d2",
      eraId: group === "有机物" ? 3 : elemental ? 2 : 3,
      initialUnlocked: false,
      supply: false,
      appearance: `资料所列相态：${{ g: "气体", l: "液体", s: "固体", aq: "水溶液" }[s.state] || s.state}。卡片配色为游戏编码，具体颜色须参照所引物质资料。`,
      molarMass: Math.round(mm * 1000) / 1000,
      density: null,
      elementComposition: s.elementComposition,
      charge: s.charge,
      modelKind,
      quantitativeResearchEligible: true,
      aliases: [],
      properties: [
        `元素组成：${Object.entries(s.elementComposition)
          .map(([e, n]) => `${e}×${n}`)
          .join("、")}。`,
        s.state === "aq"
          ? "分子式和摩尔质量表示溶质；不代表整个水溶液具有固定组成。"
          : "化学式表示所列物质的组成；晶体化学式单位不等同于独立分子。",
      ],
      uses: [
        "作为来源明确的教学物质，参与本次扩展的氧化还原、酸碱或沉淀路径。",
      ],
      sources: [
        "GitHub 来源目录的结构化化学事实；游戏获取途径由补给与对应反应共同记录。",
      ],
      hazards: [
        "仅作虚拟化学学习，不能据游戏进行现实制备。含铅、镍、卤素及部分气体的条目存在特定毒性或反应危险，具体风险见所引来源。",
      ],
      references: [...new Set(refs)],
      reviewStatus: "pending",
    });
    mapping.set(s.id, id);
  }
  const byId = Object.fromEntries(out.map((s) => [s.id, s]));
  const key = (ids: string[]) => [...new Set(ids)].sort().join("|");
  for (const r of selectedFacts) {
    const reactants = r.reactants.map((p) => ({
      substanceId: mapping.get(p.id)!,
      coefficient: p.coefficient,
    }));
    const products = r.products.map((p) => ({
      substanceId: mapping.get(p.id)!,
      coefficient: p.coefficient,
    }));
    if (reactants.concat(products).some((p) => !p.substanceId)) continue;
    const conditions = [...new Set(r.activation.map((a) => activation[a]))];
    // Keep original paths stable: do not add a second outcome to the same simple-mode reactant set.
    if (
      rules.some(
        (x) =>
          key(x.reactants.map((p) => p.substanceId)) ===
          key(reactants.map((p) => p.substanceId)),
      )
    )
      continue;
    const aqueous = reactants
      .concat(products)
      .some((p) => byId[p.substanceId].category === "solution");
    const side = (parts: typeof reactants) =>
      parts
        .map(
          (p) =>
            `${p.coefficient === 1 ? "" : p.coefficient}${byId[p.substanceId].formula}`,
        )
        .join(" + ");
    const name = `${reactants.map((p) => byId[p.substanceId].name).join("与")}的转化`;
    rules.push({
      id: `github_${r.sourceId.replace(/[^a-z0-9_]/g, "_")}`,
      name,
      reactants,
      products,
      conditions,
      catalysts: [],
      reactionType:
        reactants.length === 1
          ? "decomposition"
          : products.length === 1
            ? "combination"
            : "exchange",
      changeType: "chemical",
      equation: `${side(reactants)} → ${side(products)}`,
      animation: conditions.includes("ignite")
        ? "energy_release"
        : products.some((p) => byId[p.substanceId].state === "gas")
          ? "vaporize"
          : aqueous
            ? "precipitate"
            : "color_change",
      energyType: "unspecified",
      supportedModes: ["simple", "advanced"],
      stoichiometrySupported: true,
      calculationStrategy: "stoichiometric",
      reversible: false,
      simulationOnly: true,
      simplificationNotes: [
        `来源目录：${r.sourceId}；保留具体物态；本操作概括变化，不构成现实实验流程。`,
        ...(aqueous
          ? [
              "水溶液规则用份数描述溶质实体，理论质量为溶质质量；不模拟浓度、溶剂体积或晶体分离。",
            ]
          : []),
      ],
      references: r.references.map((s) => s.url),
      reviewStatus: "pending",
      priority: 0,
      expectedObservations: [
        "本条以守恒方程式和生成物的相态呈现变化，颜色与动态粒子为教学示意。",
      ],
      explanation: `${reactants.map((p) => byId[p.substanceId].name).join("与")}在来源情境中转化为${products.map((p) => byId[p.substanceId].name).join("、")}。查看所引资料可了解该情境的适用范围。`,
    });
  }
  // Drop unused source species and supply only the new starting points that have no current route.
  const used = new Set(
    rules.flatMap((r) =>
      r.reactants.concat(r.products).map((p) => p.substanceId),
    ),
  );
  const all = out.filter(
    (s) => original.some((x) => x.id === s.id) || used.has(s.id),
  );
  let available = reachable(
    all.filter((s) => s.initialUnlocked || s.supply).map((s) => s.id),
    rules,
  );
  for (const r of rules.filter((r) => r.id.startsWith("github_"))) {
    for (const p of r.reactants)
      if (!available.has(p.substanceId)) {
        const s = all.find((s) => s.id === p.substanceId)!;
        s.supply = true;
        s.sources.push("游戏可通过实验室标本补给获取此起点。");
        available = reachable([...available, p.substanceId], rules);
      }
  }
  for (const s of all)
    if (!available.has(s.id)) {
      s.supply = true;
      s.sources.push("游戏标本补给。");
      available.add(s.id);
    }
  return { substances: all, reactions: rules };
}
