import { z } from "zod";
const text = z.string().min(1);

export const conditionSchema = z.enum([
  "heat",
  "ignite",
  "high_heat",
  "electricity",
  "light",
  "cool",
  "grind",
  "mix",
  "filter",
  "evaporate",
  "distill",
]);

export const calculationStrategySchema = z.enum([
  "stoichiometric",
  "phase_change",
  "ionic_stoichiometric",
  "mixture_unsupported",
  "material_process_unsupported",
]);

export const modelKindSchema = z.enum([
  "molecule",
  "ionic_formula_unit",
  "metallic_network",
  "covalent_network",
  "mixture_schematic",
]);

export const substanceSchema = z
  .object({
    id: text,
    chemicalEntityId: text,
    name: text,
    nameEn: text,
    formula: text.nullable(),
    category: z.enum([
      "element",
      "compound",
      "mixture",
      "solution",
      "material",
      "state",
    ]),
    group: text,
    state: z.enum(["solid", "liquid", "gas"]),
    iconId: text,
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    eraId: z.number().int().min(0).max(3),
    initialUnlocked: z.boolean(),
    supply: z.boolean(),
    appearance: text,
    molarMass: z.number().positive().nullable(),
    density: z
      .object({
        value: z.number().positive(),
        unit: text,
        temperatureC: z.number(),
      })
      .nullable(),
    elementComposition: z.record(text, z.number().int().positive()).nullable(),
    charge: z.number().int().nullable(),
    modelKind: modelKindSchema,
    quantitativeResearchEligible: z.boolean(),
    aliases: z.array(text),
    properties: z.array(text).min(1),
    uses: z.array(text).min(1),
    sources: z.array(text).min(1),
    hazards: z.array(text).min(1),
    references: z.array(z.url()).min(1),
    reviewStatus: z.enum(["pending", "reviewed"]),
  })
  .refine(
    (s) => !["mixture", "material"].includes(s.category) || s.formula === null,
    { message: "混合物和加工材料不能指定单一分子式" },
  )
  .refine((s) => s.formula !== null || s.molarMass === null, {
    message: "无固定分子式的物质不能指定摩尔质量",
  })
  .refine((s) => s.formula !== null || s.elementComposition === null, {
    message: "无固定分子式的物质不能指定元素组成",
  })
  .refine(
    (s) =>
      !["mixture", "material"].includes(s.category) ||
      !s.quantitativeResearchEligible,
    { message: "混合物和加工材料不能标记为适用纯物质定量计量研究" },
  );

const component = z.object({
  substanceId: text,
  coefficient: z.number().int().positive(),
});

export const reactionSchema = z
  .object({
    id: text,
    name: text,
    reactants: z.array(component).min(1).max(4),
    products: z.array(component).min(1),
    conditions: z.array(conditionSchema),
    catalysts: z.array(text),
    reactionType: text,
    changeType: z.enum(["chemical", "physical"]),
    equation: text,
    animation: z.enum([
      "energy_release",
      "bubbles",
      "precipitate",
      "dissolve",
      "crystallize",
      "color_change",
      "vaporize",
      "freeze",
      "melt",
      "condense",
    ]),
    energyType: text,
    supportedModes: z.array(z.enum(["simple", "advanced", "hard"])).min(1),
    stoichiometrySupported: z.boolean(),
    calculationStrategy: calculationStrategySchema,
    reversible: z.boolean(),
    simulationOnly: z.literal(true),
    simplificationNotes: z.array(text),
    references: z.array(z.url()).min(1),
    reviewStatus: z.enum(["pending", "reviewed"]),
    priority: z.number().int(),
    explanation: text,
    expectedObservations: z.array(text).min(1),
  })
  .refine(
    (r) =>
      r.stoichiometrySupported
        ? ["stoichiometric", "phase_change", "ionic_stoichiometric"].includes(
            r.calculationStrategy,
          )
        : !r.supportedModes.includes("advanced"),
    { message: "不支持计量的规则不得声明支持 advanced 模式" },
  );

export const challengeSchema = z.object({
  id: text,
  name: text,
  description: text,
  initial: z.array(text).min(1),
  conditions: z.array(conditionSchema).min(1),
  target: text,
  limit: z.number().int().positive(),
  group: z.enum(["基础探索", "组合实验", "科学推演"]),
});

export const quantitativeChallengeSchema = z.object({
  id: text,
  name: text,
  description: text,
  group: z.enum(["基础份数", "剩余物质", "定量推演"]),
  kind: z.enum(["synthesis", "balancing"]),
  initialInventory: z.record(text, z.number().int().positive()),
  catalysts: z.array(text),
  conditions: z.array(conditionSchema).min(1),
  target: z.object({
    substanceId: text,
    minAmount: z.number().int().positive(),
    exactZeroLeftover: z.boolean().optional(),
    minPortionUtilization: z.number().min(0).max(1).optional(),
  }),
  balancingReactionId: text.optional(),
  limit: z.number().int().positive(),
  solutionSteps: z
    .array(
      z.object({
        reactionId: text,
        inputs: z.record(text, z.number().int().positive()),
        conditions: z.array(conditionSchema),
        catalysts: z.array(text).optional(),
      }),
    )
    .min(1),
});
