import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const SOURCE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON";
const raw = JSON.parse(
  readFileSync("knowledge/sources/pubchem-periodic-table.json", "utf8"),
);
const columns: string[] = raw.Table.Columns.Column;
const chinese =
  "氢 氦 锂 铍 硼 碳 氮 氧 氟 氖 钠 镁 铝 硅 磷 硫 氯 氩 钾 钙 钪 钛 钒 铬 锰 铁 钴 镍 铜 锌 镓 锗 砷 硒 溴 氪 铷 锶 钇 锆 铌 钼 锝 钌 铑 钯 银 镉 铟 锡 锑 碲 碘 氙 铯 钡 镧 铈 镨 钕 钷 钐 铕 钆 铽 镝 钬 铒 铥 镱 镥 铪 钽 钨 铼 锇 铱 铂 金 汞 铊 铅 铋 钋 砹 氡 钫 镭 锕 钍 镤 铀 镎 钚 镅 锔 锫 锎 锿 镄 钔 锘 铹".split(
    " ",
  );
const groups: Record<string, string> = {
  Nonmetal: "非金属",
  "Noble gas": "稀有气体",
  "Alkali metal": "碱金属",
  "Alkaline earth metal": "碱土金属",
  Metalloid: "类金属",
  Halogen: "卤素",
  "Transition metal": "过渡金属",
  "Post-transition metal": "后过渡金属",
  Lanthanide: "镧系",
  Actinide: "锕系",
};
const optional = (s: unknown) =>
  s === undefined || s === null || s === "" ? null : String(s);
const records = raw.Table.Row.map((row: { Cell: string[] }) => {
  const r = Object.fromEntries(columns.map((c, i) => [c, row.Cell[i]]));
  const number = Number(r.AtomicNumber);
  return {
    atomicNumber: number,
    symbol: r.Symbol,
    nameEn: r.Name,
    name: chinese[number - 1] || r.Name,
    atomicWeightText: r.AtomicWeight,
    atomicWeightNote:
      "保留 PubChem 原始数值文本；放射性/人工合成元素的同位素质量不应当作稳定元素的标准原子量。",
    groupBlock: r.GroupBlock,
    groupName: groups[r.GroupBlock] || r.GroupBlock,
    electronConfiguration: optional(r.ElectronConfiguration),
    electronegativity: optional(r.Electronegativity),
    atomicRadiusPm: optional(r.AtomicRadius),
    ionizationEnergyEV: optional(r.IonizationEnergy),
    electronAffinityEV: optional(r.ElectronAffinity),
    oxidationStates: optional(r.OxidationStates),
    standardState: r.StandardState,
    stateNote: r.StandardState.toLowerCase().includes("expected")
      ? "预测性质，非实测相态"
      : null,
    meltingPointK: optional(r.MeltingPoint),
    boilingPointK: optional(r.BoilingPoint),
    densityText: optional(r.Density),
    densityNote: "来源表密度为 g/cm³；保留来源文本，不跨温压条件进行比较。",
    yearDiscovered: optional(r.YearDiscovered),
    color: r.CPKHexColor ? `#${r.CPKHexColor}` : "#83cde9",
    reference: `https://pubchem.ncbi.nlm.nih.gov/element/${r.Symbol}`,
    datasetReference: SOURCE,
    reviewStatus: "pending",
    sourceRetrievedAt: new Date().toISOString().slice(0, 10),
  };
});
if (
  records.length !== 118 ||
  new Set(records.map((e: { symbol: string }) => e.symbol)).size !== 118
)
  throw new Error("元素数据不完整");
mkdirSync("src/data", { recursive: true });
mkdirSync("knowledge/elements", { recursive: true });
writeFileSync(
  "src/data/elements.json",
  JSON.stringify(records, null, 2) + "\n",
);
writeFileSync(
  "knowledge/elements/README.md",
  `# 118 种化学元素资料\n\n来源：[PubChem 周期表数据接口](${SOURCE})，采集于 ${records[0].sourceRetrievedAt}。原始快照在 knowledge/sources/pubchem-periodic-table.json，结构化本地数据在 src/data/elements.json。\n\n逐元素保留英文标准名、原子序数、符号、来源分类、原子量文本、电子排布、常见氧化态及可用物性。来源缺失值保留 null；预测状态明确标注，未经逐元素专业核验。\n\n元素不是物质收集项；H、H2、水中的氢代表相关但不同的层级。化学反应重排原子，不改变原子核身份；本游戏不模拟核转变。\n\n中文名覆盖前103种，后续暂保留来源英文名，避免未核验译名。\n`,
);
console.log(
  `Imported ${records.length} elements from the local PubChem snapshot`,
);
