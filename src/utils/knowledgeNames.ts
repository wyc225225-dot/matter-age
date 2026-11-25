export interface KnowledgeSpeciesRecord {
  id: string;
  nameZh: string;
  aliasesZh?: string[];
  nameEn: string;
  formula: string;
  displayFormula: string;
  state: string;
  elementComposition: Record<string, number>;
  charge: number;
  atomicNumber: number | null;
  referenceRecordIds: string[];
}

export interface KnowledgePart {
  id: string;
  coefficient: number;
}

export interface KnowledgeTransformationRecord {
  id: string;
  sourceId: string;
  equation: string;
  reactants: KnowledgePart[];
  products: KnowledgePart[];
  activation: string[];
  atmosphere: string | null;
  kind: string;
  outcome: string;
  sourceExecution: string;
  atomBalanced: boolean;
  reviewStatus: string;
  note: string;
}

const STATE_LABELS: Record<string, string> = {
  s: "固态",
  l: "液态",
  g: "气态",
  aq: "水溶液",
  Solid: "固态",
  Liquid: "液态",
  Gas: "气态",
};

const ACTIVATION_LABELS: Record<string, string> = {
  none: "常温情境",
  heat: "加热",
  ignition: "点燃",
  electricity: "通电",
  cooling: "冷却",
  light: "光照",
};

const ATMOSPHERE_LABELS: Record<string, string> = {
  oxygen: "富氧气氛",
  inert: "惰性气氛",
};

const KIND_LABELS: Record<string, string> = {
  chemical: "化学变化",
  physical: "物理变化",
};

const OUTCOME_LABELS: Record<string, string> = {
  reaction: "发生转化",
  "no-reaction": "常温下无明显反应",
};

export function formatKnowledgeState(state: string): string {
  return STATE_LABELS[state] ?? state;
}

export function formatKnowledgeActivation(activation: string): string {
  return ACTIVATION_LABELS[activation] ?? activation;
}

export function formatKnowledgeAtmosphere(atmosphere: string | null): string {
  if (!atmosphere) return "";
  return ATMOSPHERE_LABELS[atmosphere] ?? atmosphere;
}

export function formatKnowledgeKind(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

export function formatKnowledgeOutcome(outcome: string): string {
  return OUTCOME_LABELS[outcome] ?? outcome;
}

export function resolveSpeciesDisplayName(
  species: KnowledgeSpeciesRecord | undefined,
  fallbackId = "",
): string {
  return species?.nameZh || fallbackId;
}

export function speciesSearchText(species: KnowledgeSpeciesRecord): string {
  return [
    species.nameZh,
    ...(species.aliasesZh ?? []),
    species.nameEn,
    species.formula,
    species.displayFormula,
    species.id,
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Generates a structured, state-accurate Chinese transformation summary directly
 * from structured reactants/products + species nameZh (never hardcoded separate strings).
 * Example: 2H2(g) + O2(g) -> 2H2O(g) => "2份氢气 + 1份氧气 → 2份水蒸气"
 */
export function formatTransformationChinese(
  record: Pick<
    KnowledgeTransformationRecord,
    "reactants" | "products" | "outcome"
  >,
  speciesById: Record<string, KnowledgeSpeciesRecord>,
): string {
  const allParts = [...record.reactants, ...record.products];
  const showPortions = allParts.some((p) => p.coefficient > 1);
  const fmtSide = (parts: KnowledgePart[]) =>
    parts
      .map((p) => {
        const name = resolveSpeciesDisplayName(speciesById[p.id], p.id);
        return showPortions ? `${p.coefficient}份${name}` : name;
      })
      .join(" + ");
  const left = fmtSide(record.reactants);
  if (record.outcome === "no-reaction" || record.products.length === 0) {
    return `${left} → 无明显反应`;
  }
  return `${left} → ${fmtSide(record.products)}`;
}
