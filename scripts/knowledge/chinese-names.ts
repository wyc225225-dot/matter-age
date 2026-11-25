/**
 * Authoritative Chinese chemical nomenclature mapping for all knowledge species
 * imported from element-atlas / BODR.
 *
 * Rules:
 * - Entity + physical state MUST be distinguished accurately (e.g. HCl(g) 氯化氢 vs HCl(aq) 盐酸,
 *   H2O(l) 水 vs H2O(g) 水蒸气 vs H2O(s) 冰, H2 氢气 vs H 元素, O2 氧气 vs O 氧原子).
 * - Never fabricate review status; all imported knowledge records remain `pending`.
 * - Every species MUST resolve to a valid Chinese name containing Han characters;
 *   unmapped species throw during import so missing translations cannot slip through.
 */

export interface ChineseSpeciesEntry {
  nameZh: string;
  aliasesZh?: string[];
}

export const ELEMENT_ZH_BY_EN: Record<string, string> = {
  Hydrogen: "氢",
  Helium: "氦",
  Lithium: "锂",
  Beryllium: "铍",
  Boron: "硼",
  Carbon: "碳",
  Nitrogen: "氮",
  Oxygen: "氧",
  Fluorine: "氟",
  Neon: "氖",
  Sodium: "钠",
  Magnesium: "镁",
  Aluminum: "铝",
  Aluminium: "铝",
  Silicon: "硅",
  Phosphorus: "磷",
  Sulfur: "硫",
  Chlorine: "氯",
  Argon: "氩",
  Potassium: "钾",
  Calcium: "钙",
  Scandium: "钪",
  Titanium: "钛",
  Vanadium: "钒",
  Chromium: "铬",
  Manganese: "锰",
  Iron: "铁",
  Cobalt: "钴",
  Nickel: "镍",
  Copper: "铜",
  Zinc: "锌",
  Gallium: "镓",
  Germanium: "锗",
  Arsenic: "砷",
  Selenium: "硒",
  Bromine: "溴",
  Krypton: "氪",
  Rubidium: "铷",
  Strontium: "锶",
  Yttrium: "钇",
  Zirconium: "锆",
  Niobium: "铌",
  Molybdenum: "钼",
  Technetium: "锝",
  Ruthenium: "钌",
  Rhodium: "铑",
  Palladium: "钯",
  Silver: "银",
  Cadmium: "镉",
  Indium: "铟",
  Tin: "锡",
  Antimony: "锑",
  Tellurium: "碲",
  Iodine: "碘",
  Xenon: "氙",
  Cesium: "铯",
  Caesium: "铯",
  Barium: "钡",
  Lanthanum: "镧",
  Cerium: "铈",
  Praseodymium: "镨",
  Neodymium: "钕",
  Promethium: "钷",
  Samarium: "钐",
  Europium: "铕",
  Gadolinium: "钆",
  Terbium: "铽",
  Dysprosium: "镝",
  Holmium: "钬",
  Erbium: "铒",
  Thulium: "铥",
  Ytterbium: "镱",
  Lutetium: "镥",
  Hafnium: "铪",
  Tantalum: "钽",
  Tungsten: "钨",
  Rhenium: "铼",
  Osmium: "锇",
  Iridium: "铱",
  Platinum: "铂",
  Gold: "金",
  Mercury: "汞",
  Thallium: "铊",
  Lead: "铅",
  Bismuth: "铋",
};

const ANION_ZH_BY_EN: Record<string, string> = {
  oxide: "氧化",
  peroxide: "过氧化",
  superoxide: "超氧化",
  fluoride: "氟化",
  chloride: "氯化",
  bromide: "溴化",
  iodide: "碘化",
  hydride: "氢化",
  nitride: "氮化",
  sulfide: "硫化",
  carbide: "碳化",
  phosphide: "磷化",
  selenide: "硒化",
};

/**
 * Explicit entity- & state-accurate mappings for common, aqueous, gas, allotrope,
 * organic, ion, hydrated, mixed-valence, and special species.
 */
export const EXPLICIT_SPECIES_ZH: Record<string, ChineseSpeciesEntry> = {
  H2: { nameZh: "氢气", aliasesZh: ["氢分子", "氢单质"] },
  O2: { nameZh: "氧气", aliasesZh: ["氧分子", "氧单质"] },
  "O-g": { nameZh: "氧原子", aliasesZh: ["原子氧", "游离氧"] },
  "O3-g": { nameZh: "臭氧", aliasesZh: ["三氧"] },
  N2: { nameZh: "氮气", aliasesZh: ["氮分子"] },
  Cl2: { nameZh: "氯气", aliasesZh: ["氯单质"] },
  "Cl2-aq": { nameZh: "氯水", aliasesZh: ["氯气水溶液", "溶解氯"] },
  "F2-g": { nameZh: "氟气", aliasesZh: ["氟单质"] },
  He: { nameZh: "氦气", aliasesZh: ["氦"] },
  Ne: { nameZh: "氖气", aliasesZh: ["氖"] },
  Mg: { nameZh: "镁", aliasesZh: ["金属镁", "镁单质"] },
  "Mg-l": { nameZh: "液态镁", aliasesZh: ["熔融镁"] },
  "Mg-g": { nameZh: "镁蒸气", aliasesZh: ["气态镁"] },
  Fe: { nameZh: "铁", aliasesZh: ["金属铁", "铁单质"] },
  S8: { nameZh: "硫单质（S₈）", aliasesZh: ["硫", "硫磺", "环状硫", "八硫"] },
  C: { nameZh: "碳（石墨态）", aliasesZh: ["碳", "石墨", "碳单质"] },
  Na: { nameZh: "钠", aliasesZh: ["金属钠", "钠单质"] },
  "Na-l": { nameZh: "液态钠", aliasesZh: ["熔融钠"] },
  Zn: { nameZh: "锌", aliasesZh: ["金属锌", "锌单质"] },
  "Zn-g": { nameZh: "锌蒸气", aliasesZh: ["气态锌"] },
  Cu: { nameZh: "铜", aliasesZh: ["金属铜", "紫铜"] },
  Ag: { nameZh: "银", aliasesZh: ["金属银", "白银"] },
  Li: { nameZh: "锂", aliasesZh: ["金属锂"] },
  Ca: { nameZh: "钙", aliasesZh: ["金属钙"] },
  Ni: { nameZh: "镍", aliasesZh: ["金属镍"] },
  "Si-s": { nameZh: "硅", aliasesZh: ["晶体硅", "硅单质"] },
  "Sn-s": { nameZh: "锡", aliasesZh: ["金属锡"] },
  Br2: { nameZh: "液溴", aliasesZh: ["溴", "溴单质", "液态溴"] },
  "Br2-g": { nameZh: "溴蒸气", aliasesZh: ["气态溴", "溴气"] },
  "Br2-aq": { nameZh: "溴水", aliasesZh: ["溴水溶液", "溶解溴"] },
  I2: { nameZh: "碘单质", aliasesZh: ["碘", "固态碘"] },
  "I2-g": { nameZh: "碘蒸气", aliasesZh: ["气态碘"] },
  "I2-aq": { nameZh: "碘水", aliasesZh: ["碘水溶液", "溶解碘"] },
  "audit2-common-I2-l": { nameZh: "液态碘", aliasesZh: ["熔融碘"] },

  // Water & Carbon dioxide distinct states
  H2O: { nameZh: "水", aliasesZh: ["液态水", "纯水", "一氧化二氢"] },
  "H2O-g": { nameZh: "水蒸气", aliasesZh: ["气态水", "水汽"] },
  "H2O-ice": { nameZh: "冰", aliasesZh: ["固态水"] },
  CO2: { nameZh: "二氧化碳", aliasesZh: ["二氧化碳气体"] },
  "CO2-aq": { nameZh: "二氧化碳水溶液", aliasesZh: ["溶解二氧化碳", "碳酸水"] },
  "CO2-s": { nameZh: "干冰", aliasesZh: ["固态二氧化碳"] },

  // Acids, bases & solutions (explicit state distinction!)
  HCl: { nameZh: "盐酸", aliasesZh: ["氯化氢水溶液", "氢氯酸", "稀盐酸"] },
  "HCl-g": { nameZh: "氯化氢", aliasesZh: ["氯化氢气体"] },
  "audit2-common-HF-g": { nameZh: "氟化氢", aliasesZh: ["氟化氢气体"] },
  "audit2-common-HBr-g": { nameZh: "溴化氢", aliasesZh: ["溴化氢气体"] },
  "audit2-common-HI-g": { nameZh: "碘化氢", aliasesZh: ["碘化氢气体"] },
  HBr: { nameZh: "氢溴酸", aliasesZh: ["溴化氢水溶液"] },
  HI: { nameZh: "氢碘酸", aliasesZh: ["碘化氢水溶液"] },
  HOCl: { nameZh: "次氯酸", aliasesZh: ["次氯酸溶液"] },
  HNO3: { nameZh: "稀硝酸", aliasesZh: ["硝酸溶液", "硝酸"] },
  "HNO3-l": { nameZh: "液态硝酸", aliasesZh: ["纯硝酸", "发烟硝酸"] },
  H2SO4: { nameZh: "稀硫酸", aliasesZh: ["硫酸溶液", "硫酸"] },
  H3PO4: { nameZh: "磷酸", aliasesZh: ["正磷酸", "磷酸溶液"] },
  "HPO3-s": { nameZh: "偏磷酸", aliasesZh: ["固态偏磷酸"] },
  CH3COOH: { nameZh: "乙酸溶液", aliasesZh: ["醋酸", "乙酸", "醋酸溶液"] },
  H2C2O4: { nameZh: "草酸溶液", aliasesZh: ["乙二酸", "草酸"] },

  NaOH: {
    nameZh: "氢氧化钠溶液",
    aliasesZh: ["氢氧化钠", "烧碱溶液", "苛性钠溶液", "火碱"],
  },
  KOH: { nameZh: "氢氧化钾溶液", aliasesZh: ["氢氧化钾", "苛性钾"] },
  LiOH: { nameZh: "氢氧化锂溶液", aliasesZh: ["氢氧化锂"] },
  "Ba(OH)2": { nameZh: "氢氧化钡溶液", aliasesZh: ["氢氧化钡", "钡水"] },
  "Ca(OH)2": {
    nameZh: "氢氧化钙溶液",
    aliasesZh: ["澄清石灰水", "石灰水", "氢氧化钙", "熟石灰溶液"],
  },
  "Ca(OH)2-s": {
    nameZh: "氢氧化钙",
    aliasesZh: ["熟石灰", "消石灰", "氢氧化钙固体"],
  },
  CuOH2: { nameZh: "氢氧化铜", aliasesZh: ["氢氧化铜(II)", "蓝色沉淀"] },
  "Mg(OH)2": { nameZh: "氢氧化镁", aliasesZh: ["氢氧化镁沉淀"] },
  "Al(OH)3": { nameZh: "氢氧化铝", aliasesZh: ["氢氧化铝沉淀"] },
  "Zn(OH)2": { nameZh: "氢氧化锌", aliasesZh: ["氢氧化锌沉淀"] },

  // Common salts (aq / s / l clearly distinguished)
  NaHCO3: { nameZh: "碳酸氢钠溶液", aliasesZh: ["小苏打溶液", "碳酸氢钠"] },
  KHCO3: { nameZh: "碳酸氢钾溶液", aliasesZh: ["碳酸氢钾"] },
  Na2CO3: {
    nameZh: "碳酸钠溶液",
    aliasesZh: ["纯碱溶液", "苏打溶液", "碳酸钠"],
  },
  "Na2CO3-s": { nameZh: "碳酸钠", aliasesZh: ["纯碱", "苏打", "碳酸钠固体"] },
  K2CO3: { nameZh: "碳酸钾溶液", aliasesZh: ["碳酸钾", "草木灰主要成分"] },
  CaCO3: { nameZh: "碳酸钙", aliasesZh: ["石灰石", "大理石", "白垩"] },
  PbCO3: { nameZh: "碳酸铅", aliasesZh: ["碳酸铅(II)"] },
  "ZnCO3-s": { nameZh: "碳酸锌", aliasesZh: ["菱锌矿"] },
  "Na3(CO3)(HCO3)(H2O)2-s": {
    nameZh: "倍半碳酸钠二水合物",
    aliasesZh: ["天然碱", "碳酸氢三钠二水合物"],
  },

  CuSO4: { nameZh: "硫酸铜溶液", aliasesZh: ["硫酸铜", "胆矾溶液"] },
  Na2SO4: { nameZh: "硫酸钠溶液", aliasesZh: ["硫酸钠", "芒硝溶液"] },
  K2SO4: { nameZh: "硫酸钾溶液", aliasesZh: ["硫酸钾"] },
  ZnSO4: { nameZh: "硫酸锌溶液", aliasesZh: ["硫酸锌"] },
  BaSO4: { nameZh: "硫酸钡", aliasesZh: ["重晶石", "钡餐"] },
  PbSO4: { nameZh: "硫酸铅", aliasesZh: ["硫酸铅(II)"] },
  CaSO4: { nameZh: "硫酸钙", aliasesZh: ["石膏"] },

  AgNO3: { nameZh: "硝酸银溶液", aliasesZh: ["硝酸银"] },
  CuNO3: { nameZh: "硝酸铜溶液", aliasesZh: ["硝酸铜", "硝酸铜(II)"] },
  "Ca(NO3)2": { nameZh: "硝酸钙溶液", aliasesZh: ["硝酸钙"] },
  "Pb(NO3)2": { nameZh: "硝酸铅溶液", aliasesZh: ["硝酸铅", "硝酸铅(II)"] },
  KNO3: { nameZh: "硝酸钾溶液", aliasesZh: ["硝酸钾", "火硝"] },
  "Ba(NO3)2": { nameZh: "硝酸钡溶液", aliasesZh: ["硝酸钡"] },
  NaNO3: { nameZh: "硝酸钠溶液", aliasesZh: ["硝酸钠", "智利硝石"] },
  NH4NO3: { nameZh: "硝酸铵", aliasesZh: ["硝铵"] },

  NaCl: { nameZh: "氯化钠溶液", aliasesZh: ["食盐水", "氯化钠", "盐水"] },
  "NaCl-s": { nameZh: "氯化钠", aliasesZh: ["食盐", "氯化钠固体"] },
  "NaCl-l": { nameZh: "熔融氯化钠", aliasesZh: ["液态氯化钠"] },
  MgCl2: { nameZh: "氯化镁溶液", aliasesZh: ["氯化镁"] },
  "MgCl2-s": { nameZh: "氯化镁", aliasesZh: ["氯化镁固体"] },
  "MgCl2-l": { nameZh: "熔融氯化镁", aliasesZh: ["液态氯化镁"] },
  ZnCl2: { nameZh: "氯化锌溶液", aliasesZh: ["氯化锌"] },
  CaCl2: { nameZh: "氯化钙溶液", aliasesZh: ["氯化钙"] },
  "CaCl2-s": { nameZh: "氯化钙", aliasesZh: ["氯化钙固体"] },
  AgCl: { nameZh: "氯化银", aliasesZh: ["氯化银沉淀"] },
  KCl: { nameZh: "氯化钾", aliasesZh: ["氯化钾固体"] },
  KClO3: { nameZh: "氯酸钾", aliasesZh: ["氯酸钾固体"] },
  NiCl2: { nameZh: "氯化镍溶液", aliasesZh: ["氯化镍(II)溶液", "氯化镍"] },
  KI: { nameZh: "碘化钾溶液", aliasesZh: ["碘化钾"] },
  "KI-s": { nameZh: "碘化钾", aliasesZh: ["碘化钾固体"] },
  PbI2: { nameZh: "碘化铅", aliasesZh: ["碘化铅(II)", "黄金雨沉淀"] },
  CaBr2: { nameZh: "溴化钙溶液", aliasesZh: ["溴化钙"] },
  "CaBr2-s": { nameZh: "溴化钙", aliasesZh: ["溴化钙固体"] },
  Na2S: { nameZh: "硫化钠溶液", aliasesZh: ["硫化钠"] },
  K3PO4: { nameZh: "磷酸钾溶液", aliasesZh: ["磷酸钾"] },
  K2HPO4: { nameZh: "磷酸氢二钾溶液", aliasesZh: ["磷酸氢二钾"] },
  "Ca3(PO4)2-s": { nameZh: "磷酸钙", aliasesZh: ["磷酸三钙"] },
  "CaSiO3-l": { nameZh: "熔融硅酸钙", aliasesZh: ["硅酸钙熔体", "炉渣"] },
  K2C2O4: { nameZh: "草酸钾溶液", aliasesZh: ["草酸钾"] },
  Na2C2O4: { nameZh: "草酸钠溶液", aliasesZh: ["草酸钠"] },
  BaC2O4: { nameZh: "草酸钡", aliasesZh: ["草酸钡沉淀"] },
  "Ca(CH3COO)2": { nameZh: "乙酸钙溶液", aliasesZh: ["醋酸钙溶液", "乙酸钙"] },

  // Ions
  "Ba^2+": { nameZh: "钡离子", aliasesZh: ["Ba2+"] },
  "SO4^2-": { nameZh: "硫酸根离子", aliasesZh: ["硫酸根"] },
  "Pb^2+": { nameZh: "铅离子（Pb²⁺）", aliasesZh: ["二价铅离子", "铅离子"] },
  "CO3^2-": { nameZh: "碳酸根离子", aliasesZh: ["碳酸根"] },
  "HCO3^-": { nameZh: "碳酸氢根离子", aliasesZh: ["碳酸氢根"] },
  "NH4^+": { nameZh: "铵根离子", aliasesZh: ["铵离子"] },
  "NO3^-": { nameZh: "硝酸根离子", aliasesZh: ["硝酸根"] },
  "H3O^+": { nameZh: "水合氢离子", aliasesZh: ["水合质子", "氢离子"] },
  "Fe^2+": { nameZh: "亚铁离子", aliasesZh: ["铁(II)离子", "二价铁离子"] },
  "Ca^2+": { nameZh: "钙离子", aliasesZh: ["Ca2+"] },
  "OH^-": { nameZh: "氢氧根离子", aliasesZh: ["氢氧根"] },
  "Al^3+": { nameZh: "铝离子", aliasesZh: ["Al3+"] },
  "Zn^2+": { nameZh: "锌离子", aliasesZh: ["Zn2+"] },
  "Br^-": { nameZh: "溴离子", aliasesZh: ["Br-"] },
  "Cl^-": { nameZh: "氯离子", aliasesZh: ["Cl-"] },
  "I^-": { nameZh: "碘离子", aliasesZh: ["I-"] },
  "I3^-": { nameZh: "三碘阴离子", aliasesZh: ["三碘离子"] },

  // Common gases, oxides, sulfides, organics & special molecular compounds
  MgO: { nameZh: "氧化镁", aliasesZh: ["苦土"] },
  FeS: { nameZh: "硫化亚铁", aliasesZh: ["硫化铁(II)"] },
  CaO: { nameZh: "氧化钙", aliasesZh: ["生石灰"] },
  ZnO: { nameZh: "氧化锌", aliasesZh: ["锌白"] },
  "ZnS-s": { nameZh: "硫化锌", aliasesZh: ["闪锌矿"] },
  Na2O: { nameZh: "氧化钠" },
  Li2O: { nameZh: "氧化锂" },
  "Al2O3-s": { nameZh: "氧化铝", aliasesZh: ["三氧化二铝", "刚玉"] },
  "SiO2-s": { nameZh: "二氧化硅", aliasesZh: ["石英", "硅石"] },
  "MnO2-s": { nameZh: "二氧化锰", aliasesZh: ["氧化锰(IV)", "软锰矿"] },
  "MnO-s": { nameZh: "氧化亚锰", aliasesZh: ["氧化锰(II)", "一氧化锰"] },
  "SnO2-s": { nameZh: "二氧化锡", aliasesZh: ["氧化锡(IV)"] },
  CO: { nameZh: "一氧化碳", aliasesZh: ["煤气主要成分"] },
  SO2: { nameZh: "二氧化硫", aliasesZh: ["亚硫酸酐"] },
  "SO3-g": { nameZh: "三氧化硫", aliasesZh: ["硫酸酐"] },
  NH3: { nameZh: "氨气", aliasesZh: ["氨"] },
  H2S: { nameZh: "硫化氢", aliasesZh: ["硫化氢气体"] },
  NO: { nameZh: "一氧化氮" },
  NO2: { nameZh: "二氧化氮" },
  N2O: { nameZh: "一氧化二氮", aliasesZh: ["笑气", "氧化亚氮"] },
  N2O5: { nameZh: "五氧化二氮", aliasesZh: ["硝酸酐"] },
  "N2O4-g": { nameZh: "四氧化二氮" },
  "ClNO-g": { nameZh: "亚硝酰氯" },
  P4O10: { nameZh: "五氧化二磷", aliasesZh: ["十氧化四磷", "氧化磷(V)"] },
  "audit2-common-P4O6-s": { nameZh: "三氧化二磷", aliasesZh: ["六氧化四磷"] },
  "P4-g": { nameZh: "磷蒸气（P₄）", aliasesZh: ["四磷蒸气", "气态磷"] },
  "audit2-common-P4-s": { nameZh: "白磷", aliasesZh: ["黄磷", "四磷"] },
  CaH2: { nameZh: "氢化钙" },
  Mg3N2: { nameZh: "氮化镁" },
  Li3N: { nameZh: "氮化锂" },

  // Organics
  CH4: { nameZh: "甲烷", aliasesZh: ["沼气", "天然气主要成分"] },
  C2H6: { nameZh: "乙烷" },
  C2H4: { nameZh: "乙烯" },
  C2H2: { nameZh: "乙炔", aliasesZh: ["电石气"] },
  C4H10: { nameZh: "丁烷" },
  C6H12: { nameZh: "环己烷" },
  C8H18: { nameZh: "异辛烷", aliasesZh: ["2,2,4-三甲基戊烷"] },
  CH3OH: { nameZh: "甲醇", aliasesZh: ["木精"] },
  C2H5OH: { nameZh: "乙醇", aliasesZh: ["酒精"] },
  C12H22O11: { nameZh: "蔗糖", aliasesZh: ["白糖", "蔗糖固体"] },
  "C12H22O11-aq": { nameZh: "蔗糖溶液", aliasesZh: ["糖水", "溶解蔗糖"] },

  // Specific covalent/allotrope/mixed-valence/dimer entries
  "As4O6-s": {
    nameZh: "三氧化二砷",
    aliasesZh: ["六氧化四砷", "砒霜", "氧化砷(III)"],
  },
  "Co3O4-s": { nameZh: "四氧化三钴", aliasesZh: ["氧化钴(II,III)"] },
  "Fe2O3-s": {
    nameZh: "氧化铁",
    aliasesZh: ["三氧化二铁", "铁红", "氧化铁(III)"],
  },
  "Fe3O4-s": {
    nameZh: "四氧化三铁",
    aliasesZh: ["磁性氧化铁", "氧化铁(II,III)"],
  },
  "Mn3O4-s": { nameZh: "四氧化三锰", aliasesZh: ["氧化锰(II,III)"] },
  "Cu2O-s": { nameZh: "氧化亚铜", aliasesZh: ["氧化铜(I)"] },
  "audit2-common-Cu2S-s": { nameZh: "硫化亚铜", aliasesZh: ["硫化铜(I)"] },
  "audit2-common-CuS-s": { nameZh: "硫化铜", aliasesZh: ["硫化铜(II)"] },
  "audit1-al-audit-Al2Br6-s": {
    nameZh: "溴化铝（二聚体）",
    aliasesZh: ["六溴化二铝", "三溴化铝二聚体", "溴化铝"],
  },
  "audit1-al-audit-Al2I6-s": {
    nameZh: "碘化铝（二聚体）",
    aliasesZh: ["六碘化二铝", "三碘化铝二聚体", "碘化铝"],
  },
  "audit1-al-audit-P-s": {
    nameZh: "磷单质（晶型未指定）",
    aliasesZh: ["单质磷", "磷"],
  },
  "audit1-al-audit-Se-s": {
    nameZh: "硒单质（晶型未指定）",
    aliasesZh: ["单质硒", "硒"],
  },
  "audit1-al-audit-Ga-l": { nameZh: "液态镓", aliasesZh: ["镓", "熔融镓"] },
  "audit2-common-B2O3-s": { nameZh: "三氧化二硼", aliasesZh: ["氧化硼"] },
  "audit2-common-BF3-g": { nameZh: "三氟化硼" },
  "audit2-common-BCl3-g": { nameZh: "三氯化硼" },
  "audit2-common-BBr3-l": { nameZh: "三溴化硼" },
  "audit2-common-BN-s": {
    nameZh: "氮化硼",
    aliasesZh: ["氮化硼（晶型未指定）"],
  },
  "audit2-common-CS2-l": { nameZh: "二硫化碳" },
  "audit2-common-SiC-s": { nameZh: "碳化硅", aliasesZh: ["金刚砂"] },
  "audit2-common-Si3N4-s": { nameZh: "氮化硅", aliasesZh: ["四氮化三硅"] },
  "audit2-common-SiF4-g": { nameZh: "四氟化硅" },
  "audit2-common-SiCl4-g": { nameZh: "四氯化硅" },
  "audit2-common-SiBr4-l": { nameZh: "四溴化硅" },
  "audit2-common-SiI4-s": { nameZh: "四碘化硅" },
  "audit2-common-PCl3-l": { nameZh: "三氯化磷" },
  "audit2-common-PCl5-s": { nameZh: "五氯化磷" },
  "audit2-common-PBr3-l": { nameZh: "三溴化磷" },
  "audit2-common-PF5-g": { nameZh: "五氟化磷" },
  "audit2-common-SF6-g": { nameZh: "六氟化硫" },
  "audit2-common-S2Cl2-l": { nameZh: "二氯化二硫", aliasesZh: ["一氯化硫"] },
  "audit2-common-SCl2-l": { nameZh: "二氯化硫" },
  "audit2-common-CF4-g": { nameZh: "四氟化碳", aliasesZh: ["四氟甲烷"] },
  "Se8-s": { nameZh: "硒单质（Se₈）", aliasesZh: ["环状硒", "硒"] },
  "SeO2-s": { nameZh: "二氧化硒", aliasesZh: ["氧化硒(IV)"] },
  "SeCl4-s": { nameZh: "四氯化硒", aliasesZh: ["氯化硒(IV)"] },
  "SeBr4-s": { nameZh: "四溴化硒", aliasesZh: ["溴化硒(IV)"] },
  "TeO2-s": { nameZh: "二氧化碲", aliasesZh: ["氧化碲(IV)"] },
  "audit3-metal-TeO2-s": { nameZh: "二氧化碲", aliasesZh: ["氧化碲(IV)"] },
  "audit3-metal-Pr6O11-s": {
    nameZh: "十一氧化六镨",
    aliasesZh: ["氧化镨(III,IV)", "氧化镨"],
  },
  "audit3-metal-Tb4O7-s": {
    nameZh: "七氧化四铽",
    aliasesZh: ["氧化铽(III,IV)", "氧化铽"],
  },
  "audit3-metal-OsO4-s": { nameZh: "四氧化锇", aliasesZh: ["氧化锇(VIII)"] },
  "audit3-metal-Re2O7-s": { nameZh: "七氧化二铼", aliasesZh: ["氧化铼(VII)"] },
  "audit3-metal-Tc2O7-s": { nameZh: "七氧化二锝", aliasesZh: ["氧化锝(VII)"] },
  "audit3-metal-MoO3-s": { nameZh: "三氧化钼", aliasesZh: ["氧化钼(VI)"] },
  "audit3-metal-WO3-s": { nameZh: "三氧化钨", aliasesZh: ["氧化钨(VI)"] },
  "audit3-metal-Hg-l": { nameZh: "汞", aliasesZh: ["水银", "液态汞"] },
  "V2O5-s": { nameZh: "五氧化二钒", aliasesZh: ["氧化钒(V)"] },
  "TiO2-s": { nameZh: "二氧化钛", aliasesZh: ["钛白粉", "氧化钛(IV)"] },
  "GeO2-s": { nameZh: "二氧化锗", aliasesZh: ["氧化锗(IV)"] },
  "audit3-metal-ZrO2-s": { nameZh: "二氧化锆", aliasesZh: ["氧化锆(IV)"] },
  "audit3-metal-HfO2-s": { nameZh: "二氧化铪", aliasesZh: ["氧化铪(IV)"] },
  "audit3-metal-CeO2-s": { nameZh: "二氧化铈", aliasesZh: ["氧化铈(IV)"] },
  "audit3-metal-IrO2-s": { nameZh: "二氧化铱", aliasesZh: ["氧化铱(IV)"] },
  "audit3-metal-RuO2-s": { nameZh: "二氧化钌", aliasesZh: ["氧化钌(IV)"] },
};

const ROMAN_VALENCE_MAP: Record<string, string> = {
  I: "一",
  II: "二",
  III: "三",
  IV: "四",
  V: "五",
  VI: "六",
  VII: "七",
  VIII: "八",
};

const BINARY_PREFIX_COUNT: Record<string, Record<string, string>> = {
  fluoride: {
    I: "一",
    II: "二",
    III: "三",
    IV: "四",
    V: "五",
    VI: "六",
    VII: "七",
  },
  chloride: {
    I: "一",
    II: "二",
    III: "三",
    IV: "四",
    V: "五",
    VI: "六",
    VII: "七",
  },
  bromide: {
    I: "一",
    II: "二",
    III: "三",
    IV: "四",
    V: "五",
    VI: "六",
    VII: "七",
  },
  iodide: {
    I: "一",
    II: "二",
    III: "三",
    IV: "四",
    V: "五",
    VI: "六",
    VII: "七",
  },
};

export function resolveKnowledgeSpeciesZh(input: {
  id: string;
  nameEn: string;
  formula: string;
  state: string;
}): { nameZh: string; aliasesZh: string[] } {
  const explicit = EXPLICIT_SPECIES_ZH[input.id];
  if (explicit) {
    return {
      nameZh: explicit.nameZh,
      aliasesZh: explicit.aliasesZh ? [...explicit.aliasesZh] : [],
    };
  }

  const trimmed = input.nameEn.trim();

  // Pattern 1: Pure element e.g. "Arsenic (As)" or "Antimony"
  const pureElMatch = trimmed.match(/^([A-Z][a-z]+)(?:\s*\([A-Za-z0-9]+\))?$/);
  if (pureElMatch && ELEMENT_ZH_BY_EN[pureElMatch[1]]) {
    const elZh = ELEMENT_ZH_BY_EN[pureElMatch[1]];
    return {
      nameZh: elZh,
      aliasesZh: [`${elZh}单质`],
    };
  }

  // Pattern 2: Binary compound with Roman oxidation state e.g. "Chromium(III) chloride", "Tin(IV) chloride"
  const romanMatch = trimmed.match(
    /^([A-Z][a-z]+)\(([IVX,]+)\)\s+(oxide|peroxide|superoxide|fluoride|chloride|bromide|iodide|hydride|nitride|sulfide|carbide|phosphide|selenide)$/,
  );
  if (romanMatch) {
    const [, elEn, roman, anionEn] = romanMatch;
    const elZh = ELEMENT_ZH_BY_EN[elEn];
    const anionZh = ANION_ZH_BY_EN[anionEn];
    if (elZh && anionZh) {
      const aliases: string[] = [];
      // For halides with explicit stoichiometry (III -> 三氯化X, IV -> 四氯化X, V -> 五氟化X, etc.)
      const numPrefix = BINARY_PREFIX_COUNT[anionEn]?.[roman];
      if (numPrefix && roman !== "I" && roman !== "II") {
        const primary = `${numPrefix}${anionZh}${elZh}`;
        aliases.push(`${anionZh}${elZh}(${roman})`);
        return { nameZh: primary, aliasesZh: aliases };
      }
      if (roman === "III" && anionEn === "oxide") {
        aliases.push(`三氧化二${elZh}`);
      }
      if (roman === "I" && anionEn === "oxide") {
        aliases.push(`氧化亚${elZh}`);
      }
      if (ROMAN_VALENCE_MAP[roman]) {
        aliases.push(`${anionZh}${elZh}`);
      }
      return {
        nameZh: `${anionZh}${elZh}(${roman})`,
        aliasesZh: [...new Set(aliases)],
      };
    }
  }

  // Pattern 3: Fixed-valence binary compound e.g. "Barium peroxide", "Potassium fluoride", "Aluminum nitride"
  const simpleBinMatch = trimmed.match(
    /^([A-Z][a-z]+)\s+(oxide|peroxide|superoxide|fluoride|chloride|bromide|iodide|hydride|nitride|sulfide|carbide|phosphide|selenide)$/,
  );
  if (simpleBinMatch) {
    const [, elEn, anionEn] = simpleBinMatch;
    const elZh = ELEMENT_ZH_BY_EN[elEn];
    const anionZh = ANION_ZH_BY_EN[anionEn];
    if (elZh && anionZh) {
      return {
        nameZh: `${anionZh}${elZh}`,
        aliasesZh: [],
      };
    }
  }

  throw new Error(
    `Missing Chinese name mapping for knowledge species: id="${input.id}", nameEn="${input.nameEn}", formula="${input.formula}", state="${input.state}"`,
  );
}
