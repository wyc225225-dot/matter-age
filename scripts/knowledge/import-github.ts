import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

type Species = {
  id: string;
  name: string;
  formula: string;
  state: string;
  composition: Record<string, number>;
  charge: number;
  elementZ?: number;
};
type Part = { id: string; coefficient: number };
type Entry = {
  id: string;
  reactants: Part[];
  products: Part[];
  sourceIds: string[];
  requiredActivation?: string[];
  requiredAtmosphere?: string;
  execution?: string;
  process?: string;
  outcome?: string;
  sourceEquation?: string;
  sourceLocator?: string;
};
type Reference = {
  id: string;
  name: string;
  url: string;
  retrievedAt?: string;
};
const root = "knowledge/vendor/element-atlas";
const atlas: {
  version: string;
  substances: Species[];
  reactions: Entry[];
  sources: Reference[];
} = JSON.parse(readFileSync(`${root}/public/data/reactions.json`, "utf8"));
const commit = (dir: string) =>
  execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
const stamp = new Date().toISOString();
const atlasCommit = commit(root);
const speciesById = Object.fromEntries(atlas.substances.map((s) => [s.id, s]));
function atomCounts(parts: Part[]) {
  const atoms: Record<string, number> = {};
  let charge = 0;
  for (const p of parts) {
    const s = speciesById[p.id];
    if (!s) throw new Error("Unknown species " + p.id);
    if (!Number.isSafeInteger(p.coefficient) || p.coefficient < 1)
      throw new Error("Invalid coefficient");
    for (const [e, n] of Object.entries(s.composition))
      atoms[e] = (atoms[e] || 0) + n * p.coefficient;
    charge += s.charge * p.coefficient;
  }
  return { atoms, charge };
}
const ascii = (value: string) =>
  value.replace(/[₀-₉]/g, (c) => String("₀₁₂₃₄₅₆₇₈₉".indexOf(c)));
const side = (parts: Part[]) =>
  parts
    .map(
      (p) =>
        `${p.coefficient === 1 ? "" : p.coefficient}${ascii(speciesById[p.id].formula)}${speciesById[p.id].state ? `(${speciesById[p.id].state})` : ""}`,
    )
    .join(" + ");
const records = atlas.reactions.map((r) => {
  const a = atomCounts(r.reactants),
    b = atomCounts(r.products);
  const balanced =
    [...new Set([...Object.keys(a.atoms), ...Object.keys(b.atoms)])].every(
      (e) => (a.atoms[e] || 0) === (b.atoms[e] || 0),
    ) && a.charge === b.charge;
  const refs = r.sourceIds.map((id) => atlas.sources.find((s) => s.id === id));
  if (refs.some((r) => !r)) throw new Error("Unresolved source " + r.id);
  return {
    id: `atlas:${r.id}`,
    sourceId: r.id,
    equation: `${side(r.reactants)} → ${side(r.products)}`,
    reactants: r.reactants,
    products: r.products,
    activation: r.requiredActivation || [],
    atmosphere: r.requiredAtmosphere || null,
    kind: r.process || "chemical",
    outcome: r.outcome || "reaction",
    sourceExecution:
      r.execution === "equation-only" ? "equation-only" : "modeled-upstream",
    atomBalanced: balanced,
    sourceLocator: r.sourceLocator || null,
    references: refs.map((s) => ({ url: s!.url, title: s!.name })),
    provenance: {
      repository: "https://github.com/rfeynman/element-nuwa",
      requestedRepository: "https://github.com/rfeynman/element-atlas",
      commit: atlasCommit,
      datasetVersion: atlas.version,
      retrievedAt: stamp,
    },
    gameRuleId: null,
    reviewStatus: "pending",
    note:
      r.execution === "equation-only"
        ? "仅方程式资料，条件未完整建模；不会自动作为游戏反应执行。"
        : "上游存在模拟情境；本项目尚未将此条目自动转成实验台配方。",
  };
});
const species = atlas.substances.map((s) => ({
  id: s.id,
  nameEn: s.name,
  formula: ascii(s.formula),
  displayFormula: s.formula,
  state: s.state,
  elementComposition: s.composition,
  charge: s.charge,
  atomicNumber: s.elementZ ?? null,
  referenceRecordIds: records
    .filter((r) => [...r.reactants, ...r.products].some((p) => p.id === s.id))
    .map((r) => r.id),
}));
// BODR factual coordinates supplement the authoritative PubChem records. Narratives,
// photographs, original application code and upstream procedural prose are not imported.
const xml = readFileSync(
  "knowledge/vendor/bodr/bodr/elements/elements.xml",
  "utf8",
);
const bodr: Record<
  string,
  {
    period: number | null;
    group: number | null;
    block: string | null;
    radiusCovalentAngstrom: number | null;
    atomicMass: number | null;
  }
> = {};
for (const m of xml.matchAll(/<atom id="([^"]+)">([\s\S]*?)<\/atom>/g)) {
  const scalar = (name: string) => {
    for (const s of m[2].matchAll(/<scalar([^>]*)>([^<]*)<\/scalar>/g))
      if (s[1].includes(`dictRef="bo:${name}"`)) return s[2];
    return null;
  };
  const number = (name: string) => {
    const raw = scalar(name);
    return raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : null;
  };
  bodr[m[1]] = {
    period: number("period"),
    group: number("group"),
    block: scalar("periodTableBlock"),
    radiusCovalentAngstrom: number("radiusCovalent"),
    atomicMass: number("mass"),
  };
}
const elements = JSON.parse(readFileSync("src/data/elements.json", "utf8")).map(
  (e: { symbol: string; atomicNumber: number }) => ({
    ...e,
    bodr: bodr[e.symbol] || null,
    relatedSpeciesIds: species
      .filter((s) => s.elementComposition[e.symbol] > 0)
      .map((s) => s.id),
    additionalReferences: ["https://github.com/BlueObelisk/bodr"],
  }),
);
mkdirSync("knowledge/licenses", { recursive: true });
for (const [file, data] of Object.entries({
  elements,
  knowledgeSubstances: species,
  knowledgeTransformations: records,
}))
  writeFileSync(`src/data/${file}.json`, JSON.stringify(data, null, 2) + "\n");
copyFileSync(
  "knowledge/vendor/bodr/bodr/COPYING",
  "knowledge/licenses/bodr-COPYING.txt",
);
const manifest = {
  retrievedAt: stamp,
  sources: [
    {
      repository: "https://github.com/BlueObelisk/bodr",
      commit: commit("knowledge/vendor/bodr"),
      purpose: "元素周期/族/区与共价半径事实",
      license:
        "COPYING: CC0-1.0; elements.xml metadata also names MIT; both retained in raw clone",
    },
    {
      repository: "https://github.com/Bowserinator/Periodic-Table-JSON",
      commit: commit("knowledge/vendor/periodic-table-json"),
      purpose: "已下载参考，未导入叙述、图片或程序",
      license: "CC-BY-SA-3.0; no runtime fields copied",
    },
    {
      repository: "https://github.com/rfeynman/element-nuwa",
      commit: commit(root),
      purpose:
        "仅提取物质式、组成、相态、系数、条件标签和来源链接等化学事实；未复制原创解释或应用代码",
      license:
        "No root application license found; no application code or narrative imported",
    },
  ],
  counts: {
    elements: elements.length,
    species: species.length,
    transformations: records.length,
    balanced: records.filter((r) => r.atomBalanced).length,
    equationOnly: records.filter((r) => r.sourceExecution === "equation-only")
      .length,
    sourceLinks: atlas.sources.length,
  },
};
writeFileSync(
  "knowledge/SOURCES.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
writeFileSync(
  "knowledge/README.md",
  `# Matter Age 化学知识库\n\n本地资料涵盖 ${elements.length} 种元素、${species.length} 个物质记录、${records.length} 条反应/变化资料、${atlas.sources.length} 个上游来源链接。\n\n## 数据与游戏的关系\n\n元素资料由 PubChem 周期表采集，BODR 补充周期、族、区和共价半径事实。GitHub 反应目录只提取结构化化学事实和引用，未复制上游解释、图片或程序。来源 commit、日期与用途详见 SOURCES.json。\n\n物质资料按相态和同素异形体区分；532 个资料记录不是声称有 532 个已接入游戏的收集项。反应资料中 ${manifest.counts.equationOnly} 条仅有方程式证据，其他条目也须显式适配本项目的条件和状态才能成为游戏配方。所有条目保持 pending，但无需新增用户审批流程即可在开发预览继续集成。\n\n## 刷新\n\n1. 获取 PubChem 快照并运行 npx tsx scripts/knowledge/import-elements.ts。\n2. 在 knowledge/vendor 下拉取/更新对应仓库，记录 commit。\n3. 运行 npx tsx scripts/knowledge/import-github.ts。\n4. 运行校验与界面测试后再接入游戏目录。\n\n源快照和 vendor 不由网页下载。知识页面使用本地 JSON，运行无需联网。\n`,
);
console.log(manifest.counts);
