import type {
  Animation,
  CalculationStrategy,
  Condition,
  Reaction,
  Substance,
} from "../../src/types/index";
import { HARVARD, OPENSTAX, RSC } from "./references";

interface ReactionDef {
  name: string;
  reactants: string;
  products: string;
  conditions: Condition[];
  animation: Animation;
  explanation: string;
  observations: string[];
  references: string[];
  equation?: string;
  physical?: boolean;
  reversible?: boolean;
  reactionType?: string;
  energyType?: "exothermic" | "endothermic" | "unspecified";
  catalysts?: string[];
  notes?: string[];
}

const AQ_SALT_NOTE =
  "水溶液介质简化：反应默认在适宜含水体系中进行，盐类与酸碱收集项以溶质化学实体记录，不代表产物在反应瞬间直接析出干燥晶体。";
const CONDENSED_WATER_NOTE =
  "高温水相简化：反应温度下生成的水通常先呈气态水蒸气，本游戏以冷却收集后的液态水表示总产物。";

export function buildReactions(substances: Substance[]): Reaction[] {
  const byId = Object.fromEntries(substances.map((s) => [s.id, s]));
  const list: Reaction[] = [];

  function add(def: ReactionDef) {
    const parseSide = (spec: string) =>
      spec
        .split(" ")
        .filter(Boolean)
        .map((token) => {
          const [substanceId, coeff] = token.split(":");
          return { substanceId, coefficient: Number(coeff || 1) };
        });

    const reactants = parseSide(def.reactants);
    const products = parseSide(def.products);
    const formatSide = (side: typeof reactants) =>
      side
        .map((p) => {
          const s = byId[p.substanceId];
          const label = s?.formula || s?.name || p.substanceId;
          return `${p.coefficient === 1 ? "" : p.coefficient}${label}`;
        })
        .join(" + ");

    const changeType = def.physical ? "physical" : "chemical";
    const reactionType =
      def.reactionType ||
      (def.physical
        ? "physical"
        : reactants.length === 1
          ? "decomposition"
          : products.length === 1
            ? "combination"
            : "exchange");

    const notes = [...new Set(def.notes ?? [])];

    const allFormulaBearing = [...reactants, ...products].every(
      (p) => byId[p.substanceId]?.formula !== null,
    );
    const hasMaterialProcess =
      def.reactionType === "material_process" ||
      (def.reactionType !== "equilibrium" &&
        [...reactants, ...products].some((p) =>
          ["material", "mixture"].includes(byId[p.substanceId]?.category || ""),
        ));

    let calculationStrategy: CalculationStrategy;
    if (!allFormulaBearing) {
      calculationStrategy = hasMaterialProcess
        ? "material_process_unsupported"
        : "mixture_unsupported";
    } else if (def.physical) {
      calculationStrategy = "phase_change";
    } else {
      calculationStrategy = "stoichiometric";
    }

    const stoichiometrySupported =
      calculationStrategy === "stoichiometric" ||
      calculationStrategy === "phase_change";

    list.push({
      id: `r${String(list.length + 1).padStart(3, "0")}`,
      name: def.name,
      reactants,
      products,
      conditions: [...def.conditions],
      catalysts: [...(def.catalysts ?? [])],
      reactionType,
      changeType,
      equation:
        def.equation ?? `${formatSide(reactants)} → ${formatSide(products)}`,
      animation: def.animation,
      energyType:
        def.energyType ||
        (def.animation === "energy_release" ? "exothermic" : "unspecified"),
      supportedModes: stoichiometrySupported
        ? ["simple", "advanced"]
        : ["simple"],
      stoichiometrySupported,
      calculationStrategy,
      reversible: !!def.reversible,
      simulationOnly: true,
      simplificationNotes: notes,
      references: [...new Set(def.references)],
      reviewStatus: "pending",
      priority: 0,
      expectedObservations: def.observations,
      explanation: def.explanation,
    });
  }

  // r001 - r005: 水的相变与电解
  add({
    name: "水的凝固",
    reactants: "water",
    products: "ice",
    conditions: ["cool"],
    animation: "freeze",
    physical: true,
    reversible: true,
    energyType: "exothermic",
    explanation:
      "在标准大气压下冷却至 0 ℃ 及以下时，液态水放热凝固为固态冰。水分子的化学组成未变，属于物理变化。",
    observations: ["透明液态水逐渐凝结为无色透明固态冰晶，体积略微膨胀。"],
    references: [OPENSTAX.phaseTransitions],
  });
  add({
    name: "冰的熔化",
    reactants: "ice",
    products: "water",
    conditions: ["heat"],
    animation: "melt",
    physical: true,
    reversible: true,
    energyType: "endothermic",
    explanation:
      "冰受热吸收熔化潜热后转变为液态水，两者共享同一化学实体 H₂O，属于可逆物理变化。",
    observations: ["固态冰晶表面逐渐润湿、边缘软化并熔化为无色透明液体。"],
    references: [OPENSTAX.phaseTransitions],
  });
  add({
    name: "水的汽化",
    reactants: "water",
    products: "steam",
    conditions: ["heat"],
    animation: "vaporize",
    physical: true,
    reversible: true,
    energyType: "endothermic",
    explanation:
      "液态水吸热汽化为气态水蒸气，化学组成保持 H₂O 不变。水蒸气本身无色透明，肉眼所见“白雾”是其遇冷凝结的小液滴。",
    observations: [
      "液面升温产生大量气泡并翻滚，无色水蒸气逸出并在较冷空气中形成白雾。",
    ],
    references: [OPENSTAX.phaseTransitions],
  });
  add({
    name: "水蒸气冷凝",
    reactants: "steam",
    products: "water",
    conditions: ["cool"],
    animation: "condense",
    physical: true,
    reversible: true,
    energyType: "exothermic",
    explanation: "气态水蒸气遇冷放出汽化潜热，重新液化为液态水，属于物理相变。",
    observations: ["降温表面析出细密水雾并汇聚成无色透明水滴。"],
    references: [OPENSTAX.phaseTransitions],
  });
  add({
    name: "水的电解",
    reactants: "water:2",
    products: "hydrogen:2 oxygen",
    conditions: ["electricity"],
    animation: "bubbles",
    reactionType: "decomposition",
    energyType: "endothermic",
    explanation:
      "直流电能驱动水发生氧化还原分解，阴极产生氢气、阳极产生氧气（体积比约 2:1）。",
    observations: ["两电极表面持续冒出无色气泡，产生气体的体积比约为 2:1。"],
    notes: [
      "装置简化：现实电解纯水需加入少量适宜电解质增强导电性，并配备直流电源与电极，本游戏仅表达总反应。",
    ],
    references: [OPENSTAX.electrolysis, RSC.electrolysis],
  });

  // r006 - r016: 氧化与燃烧
  add({
    name: "氢的燃烧",
    reactants: "hydrogen:2 oxygen",
    products: "water:2",
    conditions: ["ignite"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation: "氢气在氧气中点燃发生剧烈放热化合反应生成水。",
    observations: [
      "产生淡蓝色火焰并释放显著热量，较冷容器壁上可凝结无色水雾。",
    ],
    notes: [CONDENSED_WATER_NOTE],
    references: [OPENSTAX.hydrogen, OPENSTAX.classifying],
  });
  add({
    name: "铁在氧气中燃烧",
    reactants: "iron:3 oxygen:2",
    products: "magnetite",
    conditions: ["ignite"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "细铁丝在纯氧中点燃会剧烈燃烧生成黑色四氧化三铁（Fe₃O₄），而不是氧化铁。",
    observations: [
      "剧烈燃烧、火星四射，放出大量热，冷却后留下黑色熔融状固体。",
    ],
    notes: [
      "演示简化：实际实验常使用细铁丝并在集气瓶底铺水或细沙防止炸裂，本游戏仅展示总反应。",
    ],
    references: [OPENSTAX.transitionMetals, OPENSTAX.oxygen],
  });
  add({
    name: "铜的氧化",
    reactants: "copper:2 oxygen",
    products: "copper_oxide:2",
    conditions: ["heat"],
    animation: "color_change",
    reactionType: "combination",
    energyType: "exothermic",
    explanation: "金属铜在氧气中加热，表面与氧气化合生成黑色氧化铜（CuO）。",
    observations: ["紫红色铜表面逐渐失去光泽，转为黑色氧化铜粉末层。"],
    references: [OPENSTAX.transitionMetals, OPENSTAX.oxygen],
  });
  add({
    name: "镁的燃烧",
    reactants: "magnesium:2 oxygen",
    products: "magnesium_oxide:2",
    conditions: ["ignite"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "镁在氧气中点燃发生剧烈氧化反应，释放强光和热量并生成白色氧化镁固体。",
    observations: [
      "发出极其耀眼的白色强光，产生大量白烟，生成白色蓬松氧化镁固体。",
    ],
    references: [OPENSTAX.repMetals, OPENSTAX.oxygen],
  });
  add({
    name: "锌的氧化",
    reactants: "zinc:2 oxygen",
    products: "zinc_oxide:2",
    conditions: ["high_heat"],
    animation: "color_change",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "金属锌在高温氧气中氧化生成氧化锌（ZnO）；氧化锌在热态偏淡黄，冷却后呈白色。",
    observations: [
      "蓝白色金属锌在高温下发出淡蓝绿色焰光并生成絮状白色氧化锌烟尘。",
    ],
    references: [OPENSTAX.transitionMetals, OPENSTAX.oxygen],
  });
  add({
    name: "铝的氧化",
    reactants: "aluminium:4 oxygen:3",
    products: "aluminium_oxide:2",
    conditions: ["ignite"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "铝与氧气化合生成致密高熔点的氧化铝（Al₂O₃）。常态块状铝因表面氧化膜保护难以直接点燃，细铝粉或高温条件下方明显燃烧。",
    observations: ["发出明亮白光并放出大量热，生成白色氧化铝固体。"],
    notes: [
      "形态简化：现实中块状铝表面的致密氧化膜会阻碍反应，铝粉或极高温下才剧烈燃烧。",
    ],
    references: [OPENSTAX.repMetals, OPENSTAX.oxygen],
  });
  add({
    name: "碳的充分燃烧",
    reactants: "carbon oxygen",
    products: "carbon_dioxide",
    conditions: ["ignite"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "碳单质在充足氧气中点燃充分燃烧，完全氧化生成无色二氧化碳气体。",
    observations: [
      "在氧气中发出炽热白光并释放热量，产生可使澄清石灰水变浑浊的无色气体。",
    ],
    notes: [
      "氧气充分假设：氧气不足时会生成有毒一氧化碳，本规则仅表示充分燃烧总反应。",
    ],
    references: [OPENSTAX.nonmetals, OPENSTAX.carbonates],
  });
  add({
    name: "一氧化碳燃烧",
    reactants: "carbon_monoxide:2 oxygen",
    products: "carbon_dioxide:2",
    conditions: ["ignite"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation: "一氧化碳在氧气中点燃进一步氧化为二氧化碳，同时放出热量。",
    observations: ["燃烧时呈现清晰的蓝色火焰，放出热量，生成二氧化碳气体。"],
    references: [OPENSTAX.carbonates, OPENSTAX.classifying],
  });
  add({
    name: "硫的燃烧",
    reactants: "sulfur oxygen",
    products: "sulfur_dioxide",
    conditions: ["ignite"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation: "硫在氧气中点燃生成具有刺激性气味的二氧化硫气体。",
    observations: [
      "淡黄色硫熔化并在氧气中发出明亮蓝紫色火焰，生成刺激性无色气体。",
    ],
    notes: [
      "化学式简化：常温硫主要为 S₈ 环状分子，方程式按习惯简写为单原子 S。",
    ],
    references: [OPENSTAX.sulfur, OPENSTAX.oxygen],
  });
  add({
    name: "钙的氧化",
    reactants: "calcium:2 oxygen",
    products: "calcium_oxide:2",
    conditions: ["ignite"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "活泼金属钙在氧气中点燃氧化，生成白色碱性氧化物氧化钙（生石灰）。",
    observations: ["发出砖红色火焰并释放热量，生成白色氧化钙固体。"],
    references: [OPENSTAX.repMetals, OPENSTAX.oxygen],
  });
  add({
    name: "硅的氧化",
    reactants: "silicon oxygen",
    products: "silica",
    conditions: ["high_heat"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "晶体硅常温稳定，在高温氧气中可被氧化生成耐高温的二氧化硅（SiO₂）。",
    observations: ["高温下表面氧化形成白色二氧化硅固体层。"],
    notes: [
      "动力学简化：块状单晶硅表面氧化层会限制体相完全氧化，高温粉末更易充分反应。",
    ],
    references: [OPENSTAX.metalloids],
  });

  // r017 - r019: 石灰循环
  add({
    name: "碳酸钙分解",
    reactants: "calcium_carbonate",
    products: "calcium_oxide carbon_dioxide",
    conditions: ["high_heat"],
    animation: "vaporize",
    reactionType: "decomposition",
    energyType: "endothermic",
    reversible: true,
    explanation:
      "碳酸钙在约 825–900 ℃ 高温煅烧下吸热分解，生成氧化钙（生石灰）并释放二氧化碳气体，是石灰循环的起点。",
    observations: [
      "白色碳酸钙固体强热后质量减轻，释放无色二氧化碳气体，残留白色块状生石灰。",
    ],
    references: [RSC.limestone, OPENSTAX.carbonates],
  });
  add({
    name: "生石灰与水",
    reactants: "calcium_oxide water",
    products: "calcium_hydroxide",
    conditions: ["mix"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "氧化钙与水化合（熟化）生成氢氧化钙（熟石灰），过程放出大量热量。",
    observations: [
      "固体膨胀疏松并剧烈放热，伴随水雾升腾，转化为白色氢氧化钙粉末或石灰乳。",
    ],
    references: [RSC.limestone, OPENSTAX.repMetals],
  });
  add({
    name: "石灰体系吸收二氧化碳",
    reactants: "calcium_hydroxide carbon_dioxide",
    products: "calcium_carbonate water",
    conditions: ["mix"],
    animation: "precipitate",
    reactionType: "exchange",
    energyType: "exothermic",
    explanation:
      "在含水体系（如澄清石灰水）中，氢氧化钙与少量二氧化碳反应生成难溶的碳酸钙白色沉淀和水。",
    observations: ["澄清石灰水迅速变浑浊，析出白色碳酸钙沉淀。"],
    notes: [
      "含水介质与用量简化：默认在含水体系中通入适量 CO₂；若继续通入过量 CO₂ 会进一步转化为可溶碳酸氢钙，本规则未模拟该后续过程。",
    ],
    references: [RSC.limestone, OPENSTAX.carbonates],
  });

  // r020 - r022: 活泼氧化物/金属与水
  add({
    name: "氧化钠与水",
    reactants: "sodium_oxide water",
    products: "sodium_hydroxide:2",
    conditions: ["mix"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation: "强碱性氧化物氧化钠与水剧烈放热反应，生成强碱氢氧化钠。",
    observations: ["白色固体迅速溶解并放出显著热量，溶液呈强碱性。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.repMetals, OPENSTAX.acidsBases],
  });
  add({
    name: "钠与水",
    reactants: "sodium:2 water:2",
    products: "sodium_hydroxide:2 hydrogen",
    conditions: ["mix"],
    animation: "energy_release",
    reactionType: "single_displacement",
    energyType: "exothermic",
    explanation:
      "金属钠密度小于水且熔点低，遇水剧烈放热置换出氢气并生成氢氧化钠强碱。现实操作危险性极高，本游戏仅作原理模拟。",
    observations: [
      "钠块浮于水面熔成闪亮小球迅速游动、发出嘶嘶声并剧烈产生氢气。",
    ],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.repMetals, OPENSTAX.hydrogen],
  });
  add({
    name: "钙与水",
    reactants: "calcium water:2",
    products: "calcium_hydroxide hydrogen",
    conditions: ["mix"],
    animation: "bubbles",
    reactionType: "single_displacement",
    energyType: "exothermic",
    explanation:
      "活泼金属钙沉入水中与水反应，持续释放氢气并生成微溶的氢氧化钙。",
    observations: [
      "金属钙表面产生大量无色氢气气泡，溶液逐渐变浑浊（析出微溶氢氧化钙）。",
    ],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.repMetals, OPENSTAX.hydrogen],
  });

  // r023 - r025: 酸性氧化物水合与碳酸分解
  add({
    name: "二氧化碳溶于水",
    reactants: "carbon_dioxide water",
    products: "carbonic_acid",
    conditions: ["mix"],
    animation: "dissolve",
    reactionType: "combination",
    reversible: true,
    explanation:
      "二氧化碳溶解于水并与水建立碳酸平衡（H₂O + CO₂ ⇌ H₂CO₃），使水溶液呈弱酸性。",
    observations: [
      "气体部分溶入水中，溶液显弱酸性，实际体系中大部分仍以溶解态 CO₂ 存在。",
    ],
    notes: [
      "平衡简化：溶于水的 CO₂ 仅小部分转化为 H₂CO₃ 分子，本游戏以「碳酸水」收集项概括该平衡体系。",
    ],
    references: [OPENSTAX.carbonates, OPENSTAX.acidStrength],
  });
  add({
    name: "碳酸分解",
    reactants: "carbonic_acid",
    products: "water carbon_dioxide",
    conditions: ["heat"],
    animation: "bubbles",
    reactionType: "decomposition",
    energyType: "endothermic",
    reversible: true,
    explanation:
      "碳酸水不稳定，常温下也会缓慢逸出 CO₂，加热会显著降低气体溶解度并加速分解为水和二氧化碳。",
    observations: ["受热后液体中迅速冒出大量无色二氧化碳气泡，酸性减弱。"],
    references: [OPENSTAX.carbonates, OPENSTAX.solubility],
  });
  add({
    name: "三氧化硫水合",
    reactants: "sulfur_trioxide water",
    products: "sulfuric_acid",
    conditions: ["mix"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "酸性氧化物三氧化硫与水剧烈放热化合生成硫酸。工业上因直接加水会产生难吸收酸雾，实际改用 98% 浓硫酸吸收；本规则仅表示总化学计量变化。",
    observations: ["反应剧烈放热并易生成浓白酸雾，转化为强酸性硫酸体系。"],
    notes: [
      "工业安全简化：现实中用浓硫酸吸收 SO₃ 而非直接加水，本规则绝非实验操作指南。",
    ],
    references: [OPENSTAX.sulfur],
  });

  // r026 - r027: 过氧化氢分解（热分解 & 催化分解）
  add({
    name: "过氧化氢受热分解",
    reactants: "peroxide:2",
    products: "water:2 oxygen",
    conditions: ["heat"],
    animation: "bubbles",
    reactionType: "decomposition",
    energyType: "exothermic",
    explanation:
      "过氧化氢分子中的过氧键较不稳定，加热会显著加快其分解为水和氧气。",
    observations: [
      "无色液体受热后产生持续气泡，释放可使带火星木条复燃的氧气。",
    ],
    notes: [
      "浓度简化：现实实验室通常使用稀过氧化氢水溶液，高浓度受热分解极为剧烈。",
    ],
    references: [OPENSTAX.oxygen, OPENSTAX.catalysis],
  });
  add({
    name: "过氧化氢催化分解",
    reactants: "peroxide:2",
    products: "water:2 oxygen",
    conditions: ["mix"],
    catalysts: ["manganese_dioxide"],
    animation: "bubbles",
    reactionType: "decomposition",
    energyType: "exothermic",
    explanation:
      "二氧化锰作为多相催化剂提供更低活化能的反应路径，在常温下显著加速过氧化氢分解为水和氧气，催化剂本身在总反应前后不被消耗。",
    observations: [
      "加入黑色二氧化锰粉末后立刻剧烈冒出大量氧气气泡并微微放热，反应结束后黑色催化剂仍可回收。",
    ],
    notes: ["催化剂不写入消耗反应物，默认在过氧化氢水溶液中进行。"],
    references: [OPENSTAX.catalysis, OPENSTAX.oxygen],
  });

  // r028 - r032: 盐与氢氧化物受热分解
  add({
    name: "碳酸氢钠分解",
    reactants: "sodium_bicarbonate:2",
    products: "sodium_carbonate carbon_dioxide water",
    conditions: ["heat"],
    animation: "vaporize",
    reactionType: "decomposition",
    energyType: "endothermic",
    reversible: true,
    explanation:
      "碳酸氢钠（小苏打）受热分解生成碳酸钠、二氧化碳和水，这是其用作烘焙膨松剂和干粉灭火的重要化学基础。",
    observations: [
      "白色粉末受热释放二氧化碳气体，试管冷壁出现水珠，残留白色碳酸钠固体。",
    ],
    notes: [CONDENSED_WATER_NOTE],
    references: [OPENSTAX.carbonates],
  });
  add({
    name: "氢氧化铜分解",
    reactants: "copper_hydroxide",
    products: "copper_oxide water",
    conditions: ["heat"],
    animation: "color_change",
    reactionType: "decomposition",
    energyType: "endothermic",
    explanation: "难溶性碱氢氧化铜热稳定性低，加热脱水分解为黑色氧化铜和水。",
    observations: ["天蓝色絮状固体受热逐渐变黑，生成黑色氧化铜并析出水。"],
    notes: [CONDENSED_WATER_NOTE],
    references: [OPENSTAX.transitionMetals, OPENSTAX.classifying],
  });
  add({
    name: "氢氧化铁分解",
    reactants: "iron_hydroxide:2",
    products: "iron_oxide water:3",
    conditions: ["heat"],
    animation: "color_change",
    reactionType: "decomposition",
    energyType: "endothermic",
    explanation:
      "红褐色氢氧化铁受热失去水分，分解转化为红棕色氧化铁（Fe₂O₃）和水。",
    observations: ["红褐色固体受热颜色加深变暗，脱水转化为红棕色氧化铁粉末。"],
    notes: [CONDENSED_WATER_NOTE],
    references: [OPENSTAX.transitionMetals],
  });
  add({
    name: "氢氧化镁分解",
    reactants: "magnesium_hydroxide",
    products: "magnesium_oxide water",
    conditions: ["high_heat"],
    animation: "vaporize",
    reactionType: "decomposition",
    energyType: "endothermic",
    explanation:
      "氢氧化镁在约 350 ℃ 以上强热吸热分解，生成白色氧化镁并释放水蒸气。",
    observations: ["白色粉末强热吸热并释放水蒸气，残留白色氧化镁。"],
    notes: [CONDENSED_WATER_NOTE],
    references: [OPENSTAX.repMetals],
  });
  add({
    name: "氢氧化钙分解",
    reactants: "calcium_hydroxide",
    products: "calcium_oxide water",
    conditions: ["high_heat"],
    animation: "vaporize",
    reactionType: "decomposition",
    energyType: "endothermic",
    reversible: true,
    explanation:
      "氢氧化钙在约 512–580 ℃ 高温下吸热脱水，重新分解回氧化钙（生石灰）和水。",
    observations: ["白色粉末在高温下释放水蒸气，转化为白色氧化钙固体。"],
    notes: [CONDENSED_WATER_NOTE],
    references: [RSC.limestone, OPENSTAX.repMetals],
  });

  // r033: 氨与盐酸
  add({
    name: "氯化氢与氨",
    reactants: "ammonia hydrochloric_acid",
    products: "ammonium_chloride",
    conditions: ["mix"],
    animation: "crystallize",
    reactionType: "neutralization",
    energyType: "exothermic",
    explanation:
      "碱性气体氨与盐酸发生酸碱中和反应生成氯化铵；氨气遇浓盐酸挥发出的氯化氢气体会立即产生浓厚白烟（微小氯化铵固体颗粒）。",
    observations: [
      "混合后迅速产生白色氯化铵烟雾（在稀溶液中则形成澄清氯化铵水溶液）。",
    ],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.acidsBases, OPENSTAX.nitrogen],
  });

  // r034 - r047: 金属 / 金属氧化物 / 金属氢氧化物 与 盐酸 / 硫酸 (14条，修复重复名称!)
  const acidSpecs = [
    { id: "hydrochloric_acid", name: "盐酸", suffix: "chloride", coeff: 2 },
    { id: "sulfuric_acid", name: "硫酸", suffix: "sulfate", coeff: 1 },
  ] as const;

  const metalFamilies = [
    {
      metal: "zinc",
      oxide: "zinc_oxide",
      hydroxide: null,
      prefix: "zinc",
      metalObs: "锌粒表面产生大量无色氢气气泡，金属逐渐溶解。",
      oxideObs: "白色氧化锌粉末逐渐溶解于稀酸中，得到澄清无色锌盐溶液。",
      hydObs: "",
    },
    {
      metal: "magnesium",
      oxide: "magnesium_oxide",
      hydroxide: "magnesium_hydroxide",
      prefix: "magnesium",
      metalObs: "镁条与稀酸剧烈反应，迅速冒出大量氢气气泡并明显放热。",
      oxideObs: "白色氧化镁粉末溶解于稀酸，生成无色透明镁盐溶液。",
      hydObs: "白色氢氧化镁悬浊物逐渐中和溶解，溶液转澄清。",
    },
    {
      metal: "calcium",
      oxide: "calcium_oxide",
      hydroxide: "calcium_hydroxide",
      prefix: "calcium",
      metalObs: "金属钙与稀酸剧烈反应放热并迅速放出大量氢气气泡。",
      oxideObs: "白色氧化钙迅速与稀酸放热反应并溶解，形成无色钙盐溶液。",
      hydObs: "白色氢氧化钙与稀酸发生放热中和反应，悬浊液逐渐澄清。",
    },
    {
      metal: "copper",
      oxide: "copper_oxide",
      hydroxide: "copper_hydroxide",
      prefix: "copper",
      metalObs: "",
      oxideObs:
        "黑色氧化铜粉末在稀酸中逐渐溶解，溶液转为亮蓝色（或蓝绿色）铜盐溶液。",
      hydObs:
        "天蓝色氢氧化铜沉淀迅速与稀酸中和溶解，得到澄清蓝/蓝绿色铜盐溶液。",
    },
  ] as const;

  for (const fam of metalFamilies) {
    for (const acid of acidSpecs) {
      const saltId = `${fam.prefix}_${acid.suffix}`;
      if (!byId[saltId]) continue;
      const saltName = byId[saltId].name;
      if (fam.metal !== "copper") {
        add({
          name: `${byId[fam.metal].name}与${acid.name}`,
          reactants: `${fam.metal} ${acid.id}:${acid.coeff}`,
          products: `${saltId} hydrogen`,
          conditions: ["mix"],
          animation: "bubbles",
          reactionType: "single_displacement",
          energyType: "exothermic",
          explanation: `位于金属活动性顺序氢前的${byId[fam.metal].name}与稀${acid.name}发生置换反应，生成${saltName}和氢气。`,
          observations: [fam.metalObs],
          notes: [AQ_SALT_NOTE],
          references: [OPENSTAX.classifying, OPENSTAX.hydrogen],
        });
      }
      add({
        name: `${byId[fam.oxide].name}与${acid.name}`,
        reactants: `${fam.oxide} ${acid.id}:${acid.coeff}`,
        products: `${saltId} water`,
        conditions: ["mix"],
        animation: fam.metal === "copper" ? "color_change" : "dissolve",
        reactionType: "neutralization",
        energyType: "exothermic",
        explanation: `金属氧化物${byId[fam.oxide].name}与稀${acid.name}发生酸碱反应，生成${saltName}和水。`,
        observations: [fam.oxideObs],
        notes: [AQ_SALT_NOTE],
        references:
          fam.oxide === "copper_oxide" && acid.id === "sulfuric_acid"
            ? [RSC.cuoSulfuric, OPENSTAX.acidsBases]
            : [RSC.neutralisation, OPENSTAX.acidsBases],
      });
      if (fam.hydroxide) {
        add({
          name: `${byId[fam.hydroxide].name}与${acid.name}`,
          reactants: `${fam.hydroxide} ${acid.id}:${acid.coeff}`,
          products: `${saltId} water:2`,
          conditions: ["mix"],
          animation: fam.metal === "copper" ? "color_change" : "dissolve",
          reactionType: "neutralization",
          energyType: "exothermic",
          explanation: `碱${byId[fam.hydroxide].name}与稀${acid.name}发生酸碱中和反应，生成${saltName}和水。`,
          observations: [fam.hydObs],
          notes: [AQ_SALT_NOTE],
          references: [OPENSTAX.acidsBases, RSC.neutralisation],
        });
      }
    }
  }

  // r048: 铁与稀硫酸
  add({
    name: "铁与稀硫酸",
    reactants: "iron sulfuric_acid",
    products: "iron_sulfate hydrogen",
    conditions: ["mix"],
    animation: "bubbles",
    reactionType: "single_displacement",
    energyType: "exothermic",
    explanation:
      "金属铁与稀硫酸发生置换反应，生成浅绿色的硫酸亚铁（二价铁盐）并释放氢气；本规则仅限定为稀硫酸。",
    observations: [
      "铁表面持续冒出细密氢气气泡，无色稀酸逐渐转为浅绿色硫酸亚铁溶液。",
    ],
    notes: [
      "酸浓度限定：仅表示稀硫酸反应；冷浓硫酸会使铁钝化，热浓硫酸则生成三价铁盐与二氧化硫。",
      AQ_SALT_NOTE,
    ],
    references: [OPENSTAX.classifying, OPENSTAX.transitionMetals],
  });

  // r049 - r051: 强碱强酸中和
  add({
    name: "盐酸中和氢氧化钠",
    reactants: "sodium_hydroxide hydrochloric_acid",
    products: "sodium_chloride water",
    conditions: ["mix"],
    animation: "dissolve",
    reactionType: "neutralization",
    energyType: "exothermic",
    explanation:
      "强碱氢氧化钠与强酸盐酸在水溶液中发生中和反应（H⁺ + OH⁻ → H₂O），放热并生成中性氯化钠溶液。",
    observations: [
      "无明显气体或沉淀生成，体系温度轻微升高，强酸与强碱中和转为中性盐水。",
    ],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.acidsBases, OPENSTAX.classifying],
  });
  add({
    name: "盐酸中和氢氧化钾",
    reactants: "potassium_hydroxide hydrochloric_acid",
    products: "potassium_chloride water",
    conditions: ["mix"],
    animation: "dissolve",
    reactionType: "neutralization",
    energyType: "exothermic",
    explanation: "强碱氢氧化钾与盐酸在水溶液中放热中和，生成氯化钾和水。",
    observations: ["溶液保持澄清并温和放热，得到中性氯化钾溶液。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.acidsBases],
  });
  add({
    name: "硫酸中和氢氧化钠",
    reactants: "sodium_hydroxide:2 sulfuric_acid",
    products: "sodium_sulfate water:2",
    conditions: ["mix"],
    animation: "dissolve",
    reactionType: "neutralization",
    energyType: "exothermic",
    explanation:
      "二元强酸稀硫酸与强碱氢氧化钠按 1:2 化学计量发生中和反应，生成硫酸钠和水。",
    observations: ["反应放热，溶液保持无色澄清，生成中性硫酸钠水溶液。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.acidsBases],
  });

  // r052 - r054: 碳酸盐/碳酸氢盐与盐酸
  add({
    name: "碳酸钙与盐酸",
    reactants: "calcium_carbonate hydrochloric_acid:2",
    products: "calcium_chloride carbon_dioxide water",
    conditions: ["mix"],
    animation: "bubbles",
    reactionType: "acid_carbonate",
    explanation:
      "难溶碳酸钙与稀盐酸迅速反应溶解，生成氯化钙、水并释放大量二氧化碳气体（实验室制取 CO₂ 的经典原理）。",
    observations: [
      "白色碳酸钙固体遇稀盐酸立即剧烈冒泡并逐渐溶解，放出无色二氧化碳气体。",
    ],
    notes: [AQ_SALT_NOTE],
    references: [RSC.neutralisation, OPENSTAX.carbonates],
  });
  add({
    name: "碳酸钠与盐酸",
    reactants: "sodium_carbonate hydrochloric_acid:2",
    products: "sodium_chloride:2 carbon_dioxide water",
    conditions: ["mix"],
    animation: "bubbles",
    reactionType: "acid_carbonate",
    explanation: "碳酸钠与足量稀盐酸反应生成氯化钠、水和二氧化碳气体。",
    observations: ["混合后迅速产生大量无色二氧化碳气泡，碳酸钠完全反应。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.carbonates, OPENSTAX.classifying],
  });
  add({
    name: "碳酸氢钠与盐酸",
    reactants: "sodium_bicarbonate hydrochloric_acid",
    products: "sodium_chloride carbon_dioxide water",
    conditions: ["mix"],
    animation: "bubbles",
    reactionType: "acid_carbonate",
    explanation:
      "小苏打（碳酸氢钠）与稀盐酸剧烈反应，迅速释放二氧化碳并生成氯化钠和水。",
    observations: ["白色粉末遇稀酸立刻剧烈起泡，产生大量无色二氧化碳气体。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.carbonates],
  });

  // r055 - r058: 碳酸钠/碳酸氢钠/烧碱相互转化
  add({
    name: "二氧化碳与氢氧化钠",
    reactants: "carbon_dioxide sodium_hydroxide:2",
    products: "sodium_carbonate water",
    conditions: ["mix"],
    animation: "dissolve",
    reactionType: "neutralization",
    energyType: "exothermic",
    explanation: "二氧化碳被足量氢氧化钠水溶液吸收，生成碳酸钠和水。",
    observations: ["无色二氧化碳气体被碱液迅速吸收，溶液仍保持澄清。"],
    notes: [
      "用量限定：假定氢氧化钠足量；若二氧化碳持续过量则会进一步生成碳酸氢钠。",
      AQ_SALT_NOTE,
    ],
    references: [OPENSTAX.carbonates],
  });
  add({
    name: "碳酸氢钠的形成",
    reactants: "sodium_carbonate carbon_dioxide water",
    products: "sodium_bicarbonate:2",
    conditions: ["mix"],
    animation: "crystallize",
    reactionType: "combination",
    reversible: true,
    explanation:
      "向饱和碳酸钠水溶液中持续通入二氧化碳，生成溶解度较低的碳酸氢钠；达到过饱和时可析出白色细晶。",
    observations: [
      "随着二氧化碳吸收，饱和碳酸钠溶液中逐渐析出白色细小碳酸氢钠结晶。",
    ],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.carbonates],
  });
  add({
    name: "碳酸氢钠与碱",
    reactants: "sodium_bicarbonate sodium_hydroxide",
    products: "sodium_carbonate water",
    conditions: ["mix"],
    animation: "dissolve",
    reactionType: "neutralization",
    explanation:
      "酸式盐碳酸氢钠中的碳酸氢根与强碱氢氧化钠反应，重新转化为正盐碳酸钠和水。",
    observations: ["溶液保持无色澄清，酸式碳酸盐被强碱中和转为碳酸钠。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.carbonates, OPENSTAX.acidsBases],
  });
  add({
    name: "石灰苛化",
    reactants: "sodium_carbonate calcium_hydroxide",
    products: "calcium_carbonate sodium_hydroxide:2",
    conditions: ["mix"],
    animation: "precipitate",
    reactionType: "double_displacement",
    explanation:
      "历史悠久的工业制碱方法（苛化法）：碳酸钠溶液与氢氧化钙反应，生成难溶碳酸钙沉淀和强碱氢氧化钠。",
    observations: [
      "溶液中迅速产生大量白色碳酸钙沉淀，上层清液转为强碱性氢氧化钠溶液。",
    ],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.carbonates, OPENSTAX.solubility],
  });

  // r059 - r063: 金属置换反应
  add({
    name: "铁置换铜",
    reactants: "iron copper_sulfate",
    products: "iron_sulfate copper",
    conditions: ["mix"],
    animation: "color_change",
    reactionType: "single_displacement",
    energyType: "exothermic",
    explanation:
      "铁的金属活动性强于铜，在水溶液中可将硫酸铜里的 Cu²⁺ 还原置换为金属铜，自身氧化为硫酸亚铁。",
    observations: ["铁表面逐渐析出紫红色金属铜覆盖层，蓝色溶液渐变为浅绿色。"],
    notes: [AQ_SALT_NOTE],
    references: [RSC.displacement, OPENSTAX.classifying],
  });
  add({
    name: "锌置换铜",
    reactants: "zinc copper_sulfate",
    products: "zinc_sulfate copper",
    conditions: ["mix"],
    animation: "color_change",
    reactionType: "single_displacement",
    energyType: "exothermic",
    explanation:
      "活泼金属锌在硫酸铜水溶液中置换出金属铜并生成无色硫酸锌，伴随明显放热。",
    observations: [
      "锌粒表面迅速析出暗红至紫红色海绵状铜，溶液蓝色逐渐褪去转为无色。",
    ],
    notes: [AQ_SALT_NOTE],
    references: [RSC.displacement, OPENSTAX.classifying],
  });
  add({
    name: "镁置换铜",
    reactants: "magnesium copper_sulfate",
    products: "magnesium_sulfate copper",
    conditions: ["mix"],
    animation: "color_change",
    reactionType: "single_displacement",
    energyType: "exothermic",
    explanation:
      "金属镁活动性远强于铜，可剧烈置换硫酸铜水溶液中的铜并生成硫酸镁。",
    observations: [
      "镁表面迅速析出紫红色铜并明显放热，溶液蓝色变浅褪去（现实中因 Cu²⁺ 水解呈弱酸性还常伴少量氢气副反应）。",
    ],
    notes: [
      "副反应简化：硫酸铜溶液略显酸性，现实中镁还会产生少量氢气，本规则仅表达主置换反应。",
      AQ_SALT_NOTE,
    ],
    references: [RSC.displacement, OPENSTAX.classifying],
  });
  add({
    name: "锌置换铁",
    reactants: "zinc iron_sulfate",
    products: "zinc_sulfate iron",
    conditions: ["mix"],
    animation: "color_change",
    reactionType: "single_displacement",
    energyType: "exothermic",
    explanation:
      "锌的活动性强于铁，可从硫酸亚铁水溶液中置换出细小灰黑色铁颗粒并生成无色硫酸锌。",
    observations: ["浅绿色硫酸亚铁溶液逐渐褪色变澄清，锌表面析出灰黑色铁粉。"],
    notes: [AQ_SALT_NOTE],
    references: [RSC.displacement, OPENSTAX.classifying],
  });
  add({
    name: "镁置换铁",
    reactants: "magnesium iron_sulfate",
    products: "magnesium_sulfate iron",
    conditions: ["mix"],
    animation: "color_change",
    reactionType: "single_displacement",
    energyType: "exothermic",
    explanation:
      "镁的活动性强于铁，可将硫酸亚铁溶液中的 Fe²⁺ 置换为铁并生成硫酸镁。",
    observations: ["浅绿色溶液逐渐褪色，析出灰黑色铁颗粒。"],
    notes: [AQ_SALT_NOTE],
    references: [RSC.displacement, OPENSTAX.classifying],
  });

  // r064 - r065: 氢氧化物沉淀反应
  add({
    name: "氢氧化铜沉淀",
    reactants: "copper_sulfate sodium_hydroxide:2",
    products: "copper_hydroxide sodium_sulfate",
    conditions: ["mix"],
    animation: "precipitate",
    reactionType: "double_displacement",
    explanation:
      "硫酸铜与氢氧化钠在水溶液中发生复分解反应，生成难溶的蓝色絮状氢氧化铜沉淀和硫酸钠。",
    observations: ["混合后立刻产生醒目的天蓝色絮状氢氧化铜沉淀。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.classifying, OPENSTAX.solubility],
  });
  add({
    name: "氢氧化镁沉淀",
    reactants: "magnesium_sulfate sodium_hydroxide:2",
    products: "magnesium_hydroxide sodium_sulfate",
    conditions: ["mix"],
    animation: "precipitate",
    reactionType: "double_displacement",
    explanation:
      "硫酸镁与氢氧化钠在水溶液中复分解生成难溶的白色氢氧化镁沉淀和硫酸钠。",
    observations: ["澄清溶液混合后立即生成白色乳状氢氧化镁沉淀。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.solubility, OPENSTAX.classifying],
  });

  // r066 - r073: 冶金还原、水蒸气与铝热反应
  add({
    name: "一氧化碳还原氧化铁",
    reactants: "iron_oxide carbon_monoxide:3",
    products: "iron:2 carbon_dioxide:3",
    conditions: ["high_heat"],
    animation: "color_change",
    reactionType: "redox",
    explanation:
      "高炉炼铁的核心反应之一：高温下一氧化碳夺取红棕色氧化铁中的氧，将其还原为金属铁并生成二氧化碳。",
    observations: [
      "红棕色氧化铁粉末在高温气流中逐渐转为灰黑色金属铁粉，尾气含二氧化碳。",
    ],
    notes: [
      "步骤简化：现实高炉中氧化铁经 Fe₂O₃ → Fe₃O₄ → FeO → Fe 逐级还原，本规则展示总方程式。",
    ],
    references: [OPENSTAX.transitionMetals, OPENSTAX.carbonates],
  });
  add({
    name: "一氧化碳还原氧化铜",
    reactants: "copper_oxide carbon_monoxide",
    products: "copper carbon_dioxide",
    conditions: ["heat"],
    animation: "color_change",
    reactionType: "redox",
    explanation:
      "加热条件下，一氧化碳将黑色氧化铜还原为紫红色金属铜，自身氧化为二氧化碳。",
    observations: [
      "黑色氧化铜粉末受热逐渐转变为光亮的紫红色铜，生成气体可使石灰水变浑浊。",
    ],
    references: [OPENSTAX.transitionMetals, OPENSTAX.classifying],
  });
  add({
    name: "氢气还原氧化铜",
    reactants: "copper_oxide hydrogen",
    products: "copper water",
    conditions: ["heat"],
    animation: "color_change",
    reactionType: "redox",
    explanation: "加热时氢气将黑色氧化铜还原为紫红色金属铜，并生成水。",
    observations: ["黑色粉末逐渐变成紫红色铜，试管较冷管壁凝结无色水珠。"],
    notes: [CONDENSED_WATER_NOTE],
    references: [RSC.cuoReduction, OPENSTAX.hydrogen],
  });
  add({
    name: "碳还原氧化铜",
    reactants: "copper_oxide:2 carbon",
    products: "copper:2 carbon_dioxide",
    conditions: ["high_heat"],
    animation: "color_change",
    reactionType: "redox",
    energyType: "endothermic",
    explanation:
      "高温下碳单质夺取氧化铜中的氧，生成紫红色铜和二氧化碳气体（古代火法炼铜的化学基础）。",
    observations: [
      "黑色混合粉末强热后出现紫红色金属铜粒，并释放二氧化碳气体。",
    ],
    references: [OPENSTAX.transitionMetals, OPENSTAX.nonmetals],
  });
  add({
    name: "二氧化碳与碳",
    reactants: "carbon_dioxide carbon",
    products: "carbon_monoxide:2",
    conditions: ["high_heat"],
    animation: "vaporize",
    reactionType: "redox",
    energyType: "endothermic",
    reversible: true,
    explanation:
      "布杜阿尔反应（Boudouard 反应）：高温下二氧化碳被炽热碳还原为一氧化碳，是高炉内产生还原气 CO 的关键吸热反应。",
    observations: [
      "炽热碳层与二氧化碳气流反应转化为无色一氧化碳气体，无液相冒泡。",
    ],
    references: [OPENSTAX.carbonates],
  });
  add({
    name: "铁与水蒸气",
    reactants: "iron:3 steam:4",
    products: "magnetite hydrogen:4",
    conditions: ["high_heat"],
    animation: "vaporize",
    reactionType: "redox",
    explanation:
      "常温下铁不与纯水迅速反应，但红热铁在高温下能与水蒸气反应生成黑色四氧化三铁和氢气。",
    observations: ["红热铁表面逐渐变黑形成四氧化三铁，气流中产生可燃氢气。"],
    references: [OPENSTAX.hydrogen, OPENSTAX.transitionMetals],
  });
  add({
    name: "镁与水蒸气",
    reactants: "magnesium steam",
    products: "magnesium_oxide hydrogen",
    conditions: ["high_heat"],
    animation: "energy_release",
    reactionType: "single_displacement",
    energyType: "exothermic",
    explanation:
      "高温下活泼金属镁与水蒸气剧烈反应，发出白光并生成白色氧化镁和氢气。",
    observations: ["发出耀眼白光，生成白色氧化镁固体并放出大量氢气。"],
    references: [OPENSTAX.repMetals, OPENSTAX.hydrogen],
  });
  add({
    name: "铝热总反应",
    reactants: "aluminium:2 iron_oxide",
    products: "aluminium_oxide iron:2",
    conditions: ["high_heat"],
    animation: "energy_release",
    reactionType: "redox",
    energyType: "exothermic",
    explanation:
      "高温引发后，铝还原氧化铁生成氧化铝和熔融态铁，放出极高热量，工业上曾用于钢轨现场焊接。本游戏仅呈现总变化，不提供现实引发配方。",
    observations: [
      "发出极其炽热的白光与火星，产生高温熔融金属铁与氧化铝熔渣。",
    ],
    notes: ["安全限定：仅表达总化学计量关系，不涉及现实引燃剂或操作流程。"],
    references: [RSC.thermite, OPENSTAX.repMetals],
  });

  // r074 - r081: 物理溶解/分离、材料加工与溶液体置换 (8条 manual 核验)
  add({
    name: "食盐溶解",
    reactants: "sodium_chloride water",
    products: "salt_solution",
    conditions: ["mix"],
    animation: "dissolve",
    physical: true,
    reversible: true,
    explanation:
      "氯化钠晶体在水中解离为水合 Na⁺ 和 Cl⁻ 形成均一透明的氯化钠溶液；没有生成新化合物，属于物理变化。",
    observations: ["白色氯化钠颗粒逐渐消失，形成无色澄清咸味溶液。"],
    notes: [
      "混合物收集项：氯化钠溶液浓度可变，无单一分子式，不参与自动原子守恒计算。",
    ],
    references: [OPENSTAX.dissolution],
  });
  add({
    name: "食盐结晶",
    reactants: "salt_solution",
    products: "salt_crystal steam",
    conditions: ["evaporate"],
    animation: "crystallize",
    physical: true,
    reversible: true,
    energyType: "endothermic",
    explanation:
      "加热蒸发氯化钠溶液，水分以水蒸气形式逸出，溶质浓缩至过饱和后析出规则立方体食盐晶体，属于物理分离过程。",
    observations: ["水分不断汽化减少，器皿底部逐渐析出晶莹白色食盐晶体。"],
    notes: [
      "混合物收集项：溶剂蒸发分离，收集项不含固定浓度，需人工核验质量描述。",
    ],
    references: [OPENSTAX.solubility, OPENSTAX.phaseTransitions],
  });
  add({
    name: "盐晶体再溶解",
    reactants: "salt_crystal water",
    products: "salt_solution",
    conditions: ["mix"],
    animation: "dissolve",
    physical: true,
    reversible: true,
    explanation:
      "食盐晶体与氯化钠属于同一化学实体 NaCl，再次加水搅拌仍可重新溶解为氯化钠溶液。",
    observations: ["立方食盐晶体在水中迅速溶散，恢复无色透明氯化钠溶液。"],
    notes: ["同一化学实体（NaCl）不同游戏收集形态的物理可逆溶解。"],
    references: [OPENSTAX.dissolution],
  });
  add({
    name: "盐水蒸馏",
    reactants: "salt_solution",
    products: "water sodium_chloride",
    conditions: ["distill"],
    animation: "condense",
    physical: true,
    reversible: true,
    explanation:
      "利用水与氯化钠沸点差异极大，加热蒸发后再冷凝收集纯水，并回收固体氯化钠，属于物理分离。",
    observations: ["冷凝管出口滴落无色纯净液态水，原容器残留白色氯化钠固体。"],
    notes: ["物理分离过程：未产生新化学物质，溶液整体无单一分子式。"],
    references: [OPENSTAX.phaseTransitions, OPENSTAX.dissolution],
  });
  add({
    name: "硫酸铜溶解",
    reactants: "copper_sulfate water",
    products: "copper_solution",
    conditions: ["mix"],
    animation: "dissolve",
    physical: true,
    explanation:
      "灰白色无水硫酸铜遇水迅速水合并溶解，形成标志性的天蓝色硫酸铜水溶液。",
    observations: [
      "灰白色粉末一接触水即转为亮蓝色并逐渐完全溶解，溶液呈透明天蓝色。",
    ],
    notes: ["物理溶解伴随离子水合过程；溶液整体为混合物，无单一分子式。"],
    references: [OPENSTAX.dissolution, RSC.cuoSulfuric],
  });
  add({
    name: "黏土烧制",
    reactants: "clay",
    products: "ceramic",
    conditions: ["high_heat"],
    animation: "color_change",
    reactionType: "material_process",
    explanation:
      "黏土在高温窑炉中脱去结构水并发生复杂硅酸盐矿物相变与烧结，最终形成坚硬致密的陶瓷材料。",
    observations: ["松软土状黏土经高温烧结收缩变硬，质地致密且敲击发声清脆。"],
    notes: [
      "混合物加工简化：省略结合水逸出与多相硅酸盐反应，禁止据此计算质量守恒。",
    ],
    references: [OPENSTAX.metalloids],
  });
  add({
    name: "石英玻璃成形",
    reactants: "silica",
    products: "glass",
    conditions: ["high_heat"],
    animation: "melt",
    physical: true,
    reactionType: "material_process",
    explanation:
      "高纯二氧化硅在约 1700 ℃ 以上高温熔融并经受控冷却玻璃化，形成透明无定形石英玻璃（不同于含钠钙的普通平板玻璃）。",
    observations: [
      "白色二氧化硅在极高温下熔融透明化，冷却后形成无色透明石英玻璃。",
    ],
    notes: ["工艺概括：高温操作概括熔融与冷却玻璃化过程；产品按加工材料记录。"],
    references: [OPENSTAX.metalloids],
  });
  add({
    name: "硫酸铜溶液中的铁置换",
    reactants: "iron copper_solution",
    products: "iron_sulfate copper water",
    conditions: ["mix"],
    animation: "color_change",
    reactionType: "single_displacement",
    energyType: "exothermic",
    explanation:
      "铁在硫酸铜水溶液中发生置换反应，表面析出紫红色铜，溶质转化为浅绿色硫酸亚铁，同时将溶剂水单独归还为游戏收集项。",
    observations: ["蓝色硫酸铜溶液逐渐变为浅绿色，铁表面附着一层紫红色铜。"],
    notes: [
      "溶液收集项简化：硫酸铜溶液整体无固定分子式，不能对游戏收集项直接执行化学计量计算。",
    ],
    references: [RSC.displacement, OPENSTAX.classifying],
  });

  // r082 - r090: 碱性氧化物、碳酸盐与沉淀/置换拓展
  add({
    name: "氧化钠与盐酸",
    reactants: "sodium_oxide hydrochloric_acid:2",
    products: "sodium_chloride:2 water",
    conditions: ["mix"],
    animation: "dissolve",
    reactionType: "neutralization",
    energyType: "exothermic",
    explanation: "强碱性氧化物氧化钠与稀盐酸剧烈放热中和，生成氯化钠和水。",
    observations: ["白色氧化钠迅速溶解并放出热量，得到无色澄清氯化钠溶液。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.acidsBases, OPENSTAX.repMetals],
  });
  add({
    name: "氧化钠与硫酸",
    reactants: "sodium_oxide sulfuric_acid",
    products: "sodium_sulfate water",
    conditions: ["mix"],
    animation: "dissolve",
    reactionType: "neutralization",
    energyType: "exothermic",
    explanation: "氧化钠与稀硫酸发生酸碱中和反应，生成硫酸钠和水。",
    observations: ["固体迅速溶解并放热，生成无色透明硫酸钠溶液。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.acidsBases, OPENSTAX.repMetals],
  });
  add({
    name: "氧化钠吸收二氧化碳",
    reactants: "sodium_oxide carbon_dioxide",
    products: "sodium_carbonate",
    conditions: ["mix"],
    animation: "color_change",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "强碱性氧化物氧化钠吸收酸性氧化物二氧化碳，直接化合生成碳酸钠固体。",
    observations: [
      "白色氧化钠吸收二氧化碳逐渐转化为白色碳酸钠固体，并伴放热。",
    ],
    notes: [
      "动力学说明：干燥气固反应速率受表面积与微量水分影响，本规则表示总化合方程式。",
    ],
    references: [OPENSTAX.carbonates, OPENSTAX.repMetals],
  });
  add({
    name: "氧化钙吸收二氧化碳",
    reactants: "calcium_oxide carbon_dioxide",
    products: "calcium_carbonate",
    conditions: ["mix"],
    animation: "color_change",
    reactionType: "combination",
    energyType: "exothermic",
    reversible: true,
    explanation:
      "氧化钙（生石灰）吸收二氧化碳碳酸化生成碳酸钙，是碳酸钙热分解的逆向过程。",
    observations: ["白色氧化钙吸收二氧化碳气体转化为碳酸钙固体。"],
    notes: [
      "动力学说明：常温干燥条件下 CaO 与 CO₂ 反应较慢，微量水分或适当升温可显著加速碳酸化。",
    ],
    references: [RSC.limestone, OPENSTAX.carbonates],
  });
  add({
    name: "碳酸钠与硫酸",
    reactants: "sodium_carbonate sulfuric_acid",
    products: "sodium_sulfate carbon_dioxide water",
    conditions: ["mix"],
    animation: "bubbles",
    reactionType: "acid_carbonate",
    explanation: "碳酸钠与稀硫酸反应生成硫酸钠、水和大量二氧化碳气体。",
    observations: ["混合后立即剧烈冒泡，放出大量无色二氧化碳气体。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.carbonates],
  });
  add({
    name: "碳酸氢钠与硫酸",
    reactants: "sodium_bicarbonate:2 sulfuric_acid",
    products: "sodium_sulfate carbon_dioxide:2 water:2",
    conditions: ["mix"],
    animation: "bubbles",
    reactionType: "acid_carbonate",
    explanation: "碳酸氢钠与稀硫酸反应生成硫酸钠、二氧化碳和水。",
    observations: ["立即产生大量细密二氧化碳泡沫，固体迅速溶解消失。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.carbonates],
  });
  add({
    name: "碳酸钙沉淀",
    reactants: "calcium_chloride sodium_carbonate",
    products: "calcium_carbonate sodium_chloride:2",
    conditions: ["mix"],
    animation: "precipitate",
    reactionType: "double_displacement",
    explanation:
      "氯化钙与碳酸钠在水溶液中发生复分解反应，Ca²⁺ 与 CO₃²⁻ 结合生成难溶的白色碳酸钙沉淀，同时生成氯化钠。",
    observations: [
      "两种无色澄清溶液混合后迅速变浑浊，析出大量白色碳酸钙沉淀。",
    ],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.solubility, OPENSTAX.classifying],
  });
  add({
    name: "氯化铜溶液的沉淀反应",
    reactants: "copper_chloride sodium_hydroxide:2",
    products: "copper_hydroxide sodium_chloride:2",
    conditions: ["mix"],
    animation: "precipitate",
    reactionType: "double_displacement",
    explanation:
      "氯化铜与氢氧化钠在水溶液中发生复分解反应，生成天蓝色氢氧化铜絮状沉淀和氯化钠。",
    observations: ["蓝绿色氯化铜溶液遇氢氧化钠立即产生天蓝色絮状沉淀。"],
    notes: [AQ_SALT_NOTE],
    references: [OPENSTAX.solubility, OPENSTAX.classifying],
  });
  add({
    name: "锌与氯化铜",
    reactants: "zinc copper_chloride",
    products: "zinc_chloride copper",
    conditions: ["mix"],
    animation: "color_change",
    reactionType: "single_displacement",
    energyType: "exothermic",
    explanation:
      "较活泼的金属锌将氯化铜水溶液中的 Cu²⁺ 置换为紫红色金属铜，同时生成氯化锌。",
    observations: ["锌粒表面迅速析出紫红色铜，溶液蓝绿色逐渐褪去变无色。"],
    notes: [AQ_SALT_NOTE],
    references: [RSC.displacement, OPENSTAX.classifying],
  });

  // r091 - r093: 铵盐与碱受热制氨
  add({
    name: "铵盐与氢氧化钾",
    reactants: "ammonium_chloride potassium_hydroxide",
    products: "potassium_chloride ammonia water",
    conditions: ["heat"],
    animation: "bubbles",
    reactionType: "double_displacement",
    explanation:
      "氯化铵与强碱氢氧化钾共热，铵根离子与氢氧根反应生成刺激性氨气、水和氯化钾。",
    observations: [
      "加热后逸出具有强烈刺激性气味、能使湿润红色石蕊试纸变蓝的氨气。",
    ],
    notes: ["介质说明：可在固相共热或浓碱水溶液加热条件下发生。"],
    references: [OPENSTAX.nitrogen, OPENSTAX.acidsBases],
  });
  add({
    name: "铵盐与氢氧化钠",
    reactants: "ammonium_chloride sodium_hydroxide",
    products: "sodium_chloride ammonia water",
    conditions: ["heat"],
    animation: "bubbles",
    reactionType: "double_displacement",
    explanation:
      "氯化铵与氢氧化钠共热释放氨气，同时生成氯化钠和水（铵盐检验的典型反应）。",
    observations: ["加热后迅速放出刺鼻氨气，使湿润红色石蕊试纸变蓝。"],
    notes: ["介质说明：常在含水体系或浓碱加热条件下进行。"],
    references: [OPENSTAX.nitrogen, OPENSTAX.acidsBases],
  });
  add({
    name: "铵盐与氢氧化钙",
    reactants: "ammonium_chloride:2 calcium_hydroxide",
    products: "calcium_chloride ammonia:2 water:2",
    conditions: ["heat"],
    animation: "bubbles",
    reactionType: "double_displacement",
    explanation:
      "氯化铵与熟石灰（氢氧化钙）固体混合加热，生成氯化钙、水并释放氨气（实验室经典固相制氨原理）。",
    observations: [
      "白色混合粉末受热释放强烈刺鼻氨气，试管口内壁出现细小水珠。",
    ],
    notes: [CONDENSED_WATER_NOTE],
    references: [OPENSTAX.nitrogen],
  });

  // r094 - r100: 铁矿还原、碳热还原、镁与 CO2、水煤气、钠与氯气
  add({
    name: "一氧化碳还原磁铁矿",
    reactants: "magnetite carbon_monoxide:4",
    products: "iron:3 carbon_dioxide:4",
    conditions: ["high_heat"],
    animation: "color_change",
    reactionType: "redox",
    explanation:
      "高温下一氧化碳将黑色四氧化三铁（磁铁矿主要成分）还原为金属铁，自身氧化为二氧化碳。",
    observations: ["黑色磁铁矿粉末在高温还原气氛中逐渐转化为灰黑色金属铁粉。"],
    references: [OPENSTAX.transitionMetals],
  });
  add({
    name: "氢气还原氧化铁",
    reactants: "iron_oxide hydrogen:3",
    products: "iron:2 water:3",
    conditions: ["high_heat"],
    animation: "color_change",
    reactionType: "redox",
    explanation:
      "高温下氢气将红棕色氧化铁还原为金属铁并生成水（氢冶金的绿色炼铁思路基础）。",
    observations: [
      "红棕色氧化铁逐渐变为灰黑色金属铁粉，并产生水蒸气冷凝水珠。",
    ],
    notes: [CONDENSED_WATER_NOTE],
    references: [OPENSTAX.hydrogen, OPENSTAX.transitionMetals],
  });
  add({
    name: "氢气还原磁铁矿",
    reactants: "magnetite hydrogen:4",
    products: "iron:3 water:4",
    conditions: ["high_heat"],
    animation: "color_change",
    reactionType: "redox",
    explanation: "高温下氢气还原四氧化三铁生成金属铁和水。",
    observations: ["黑色四氧化三铁逐渐还原为灰黑色铁粉，气流带出水蒸气。"],
    notes: [CONDENSED_WATER_NOTE],
    references: [OPENSTAX.hydrogen, OPENSTAX.transitionMetals],
  });
  add({
    name: "碳还原氧化锌",
    reactants: "zinc_oxide carbon",
    products: "zinc carbon_monoxide",
    conditions: ["high_heat"],
    animation: "color_change",
    reactionType: "redox",
    energyType: "endothermic",
    explanation:
      "高温下（约 1000 ℃ 以上）碳将氧化锌还原为金属锌蒸气（冷却收集为金属锌）并生成一氧化碳，属于传统火法炼锌原理。",
    observations: [
      "高温下白色氧化锌与碳反应，经冷凝回收蓝白色金属锌并放出 CO 气体。",
    ],
    notes: [
      "相态简化：反应温度高于锌的沸点（907 ℃），产物锌实际先呈气态再经冷凝收集为固态锌。",
    ],
    references: [OPENSTAX.transitionMetals],
  });
  add({
    name: "镁与二氧化碳",
    reactants: "magnesium:2 carbon_dioxide",
    products: "magnesium_oxide:2 carbon",
    conditions: ["ignite"],
    animation: "energy_release",
    reactionType: "redox",
    energyType: "exothermic",
    explanation:
      "点燃的镁条能在二氧化碳中继续剧烈燃烧，夺取二氧化碳中的氧生成白色氧化镁和黑色碳颗粒——这也是不能用 CO₂ 灭火器扑救镁火的原因。",
    observations: [
      "在二氧化碳中继续剧烈燃烧发出耀眼白光，器壁留下白色氧化镁与黑色碳粉。",
    ],
    references: [OPENSTAX.repMetals, OPENSTAX.carbonates],
  });
  add({
    name: "水煤气总反应",
    reactants: "carbon steam",
    products: "carbon_monoxide hydrogen",
    conditions: ["high_heat"],
    animation: "vaporize",
    reactionType: "redox",
    energyType: "endothermic",
    explanation:
      "高温（约 800–1000 ℃）下炽热碳与水蒸气发生吸热反应，生成一氧化碳与氢气的混合气体（水煤气 / 合成气）。",
    observations: [
      "水蒸气通过炽热碳层转化为可燃混合气体（CO 与 H₂），体系强烈吸热。",
    ],
    notes: [
      "平衡简化：实际气化过程还伴随水煤气变换等副反应与热力学平衡，本规则仅表达主反应。",
    ],
    references: [OPENSTAX.hydrogen, OPENSTAX.nonmetals],
  });
  add({
    name: "钠与氯气",
    reactants: "sodium:2 chlorine",
    products: "sodium_chloride:2",
    conditions: ["ignite"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "活泼金属钠在黄绿色氯气中点燃剧烈化合，电子从钠转移给氯，形成离子化合物氯化钠。",
    observations: [
      "发出耀眼黄色火焰，产生大量白色氯化钠烟尘，黄绿色氯气迅速褪去。",
    ],
    notes: [
      "安全提示：涉及剧毒氯气与极活泼金属钠，现实操作极其危险，本游戏仅作虚拟演示。",
    ],
    references: [OPENSTAX.halogens, OPENSTAX.repMetals],
  });

  // r101 - r103: 光化学与气态氯化氢路径
  add({
    name: "氢气与氯气光化学反应",
    reactants: "hydrogen chlorine",
    products: "hydrogen_chloride:2",
    conditions: ["light"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "氢气与氯气在适宜短波光照（紫外光或蓝紫光）引发下发生自由基链式化合反应，光子打断键能约 243 kJ/mol 的 Cl–Cl 键产生氯自由基（Cl₂ + hν → 2Cl·），剧烈放热并直接生成气态氯化氢（HCl(g)）。直接产物为气态氯化氢，不能直接等同于液态盐酸溶液。",
    observations: [
      "在短波紫外或蓝紫强光照射下瞬间发生剧烈放热反应，黄绿色氯气迅速褪去，生成无色刺激性氯化氢气体。",
    ],
    notes: [
      "光源波长边界：光照不等于所有任意光源；红光、黄光等低能量长波光不足以打断 Cl–Cl 键，需紫外光或蓝紫光等足够高能量的短波光子引发自由基链式反应。",
      "产物物态区分：本反应直接生成气态氯化氢（HCl(g)），不等同于液态盐酸（HCl 水溶液）；氯化氢需进一步溶于水才形成盐酸。",
      "安全提示：氢气与氯气混合受短波强光照射可发生剧烈爆炸，现实实验极度危险，本游戏仅作虚拟演示。",
    ],
    references: [
      HARVARD.photochemicalH2Cl2,
      OPENSTAX.halogens,
      OPENSTAX.hydrogen,
    ],
  });
  add({
    name: "氢气在氯气中燃烧",
    reactants: "hydrogen chlorine",
    products: "hydrogen_chloride:2",
    conditions: ["ignite"],
    animation: "energy_release",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "纯净氢气在氯气中点燃可安静燃烧并发出苍白色火焰，直接化合生成气态氯化氢（HCl(g)）。该热引发燃烧路径与短波光化学引发路径（光照）相互独立，无需同时施加点燃与光照。",
    observations: [
      "氢气在氯气中发出苍白色火焰并放出热量，黄绿色逐渐褪去，生成无色氯化氢气体并在潮湿空气中形成白雾。",
    ],
    notes: [
      "路径独立性：点燃燃烧与短波光照是两种独立的引发路径，不可随意合并为必须同时满足的条件。",
      "产物物态区分：直接产物为气态氯化氢（HCl(g)），不等同于液态盐酸水溶液。",
    ],
    references: [OPENSTAX.halogens, OPENSTAX.hydrogen],
  });
  add({
    name: "气态氯化氢与氨气化合",
    reactants: "ammonia hydrogen_chloride",
    products: "ammonium_chloride",
    conditions: ["mix"],
    animation: "precipitate",
    reactionType: "combination",
    energyType: "exothermic",
    explanation:
      "无色氨气与气态氯化氢在常温下相遇即可发生气相化合反应，迅速凝结形成大量白色氯化铵固体微粒（白烟）。",
    observations: [
      "两种无色刺激性气体接触瞬间产生浓密白色烟雾，并在容器壁附着白色氯化铵粉末。",
    ],
    references: [OPENSTAX.acidsBases, OPENSTAX.nitrogen],
  });
  add({
    name: "氯气溶于水（可逆平衡体系）",
    reactants: "chlorine water",
    products: "chlorine_water",
    conditions: ["mix"],
    animation: "dissolve",
    reactionType: "equilibrium",
    reversible: true,
    energyType: "exothermic",
    equation: "Cl2 + H2O ⇌ 氯水（含溶解 Cl2、HCl、HClO 平衡混合体系）",
    explanation:
      "氯气通入水中首先物理溶解，同时一部分氯气与水发生可逆歧化反应（Cl₂ + H₂O ⇌ HCl + HClO，离子式 Cl₂(aq) + 2H₂O ⇌ HClO + H₃O⁺ + Cl⁻），形成淡黄绿色的氯水混合体系。常温下该可逆平衡转化不完全，体系中同时共存未反应的溶解 Cl₂、H₂O 与部分生成的 HClO、H₃O⁺、Cl⁻，不能默认按 100% 完全转化计算。",
    observations: [
      "黄绿色氯气部分溶于水，液体变为淡黄绿色并散发刺激性气味，形成含溶解 Cl₂、HCl 与 HClO 的平衡混合体系。",
    ],
    notes: [
      "可逆平衡边界：氯气与水在常温下建立化学平衡（Cl₂ + H₂O ⇌ HCl + HClO），不能把可逆平衡默认视作 100% 完全转化为纯产物，因此不适用进阶模式的 100% 纯物质整数化学计量。",
      "混合体系简化：新制氯水同时包含溶解 Cl₂、H₂O、HClO、H₃O⁺、Cl⁻ 等多种物种，本游戏在简单模式中以混合物收集项「氯水」表征该平衡体系。",
    ],
    references: [OPENSTAX.halogens, OPENSTAX.solubility],
  });

  return list;
}
