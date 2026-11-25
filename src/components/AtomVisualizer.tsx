import type {
  IntegerStoichiometryResult,
  ModelKind,
  Substance,
} from "../types";
import { byId } from "../data";
import { Formula } from "./Shared";

const ELEMENT_COLORS: Record<string, { bg: string; fg: string }> = {
  H: { bg: "#d9f3ff", fg: "#0e2233" },
  O: { bg: "#e26d6d", fg: "#fff5f5" },
  C: { bg: "#5d6b78", fg: "#f0f5fa" },
  N: { bg: "#6f8ae8", fg: "#f4f7ff" },
  Na: { bg: "#b59ae6", fg: "#181028" },
  Cl: { bg: "#89cf7a", fg: "#0f2410" },
  Fe: { bg: "#c98562", fg: "#1d100a" },
  Cu: { bg: "#d98c5f", fg: "#201008" },
  Ca: { bg: "#d6cfa8", fg: "#242010" },
  Mg: { bg: "#9ac9b8", fg: "#0d241c" },
  Al: { bg: "#b8c7d8", fg: "#141f2b" },
  Zn: { bg: "#87b5be", fg: "#0e2024" },
  S: { bg: "#e6d267", fg: "#292308" },
  Si: { bg: "#c9a679", fg: "#23190d" },
  K: { bg: "#c796d8", fg: "#200f26" },
  Mn: { bg: "#9e7aa8", fg: "#faf5fc" },
  P: { bg: "#e39b5d", fg: "#261405" },
};

const MODEL_KIND_LABELS: Record<ModelKind, string> = {
  molecule: "分子模型",
  ionic_formula_unit: "离子晶体化学式单位",
  metallic_network: "金属晶格单元",
  covalent_network: "共价网络单元",
  mixture_schematic: "混合体系示意",
};

export function modelKindLabel(kind: ModelKind) {
  return MODEL_KIND_LABELS[kind];
}

function atomColor(el: string) {
  return ELEMENT_COLORS[el] || { bg: "#83cde9", fg: "#0e1622" };
}

/**
 * Renders a single substance's 2D schematic unit (molecule vs ionic crystal formula unit vs lattice)
 * with explicit element color AND symbol labels. Never renders ionic salts as isolated covalent molecules.
 */
export function SubstanceUnitGlyph({
  s,
  count = 1,
  compact = false,
}: {
  s: Substance;
  count?: number;
  compact?: boolean;
}) {
  const atoms: string[] = [];
  if (s.elementComposition) {
    for (const [el, n] of Object.entries(s.elementComposition)) {
      const cap = Math.min(n, 6);
      for (let i = 0; i < cap; i++) atoms.push(el);
    }
  }
  const displayAtoms = atoms.slice(0, compact ? 5 : 8);
  const w = compact ? 92 : 124;
  const h = compact ? 38 : 48;
  const r = compact ? 10 : 12;

  return (
    <div
      className={`unit-glyph ${s.modelKind} ${compact ? "compact" : ""}`}
      title={`${s.name} · ${MODEL_KIND_LABELS[s.modelKind]}`}
    >
      <div className="unit-glyph-head">
        <span className="unit-kind-tag">{MODEL_KIND_LABELS[s.modelKind]}</span>
        {count > 1 && <span className="unit-count-badge">×{count}</span>}
      </div>
      {displayAtoms.length > 0 ? (
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label={`${s.name} ${MODEL_KIND_LABELS[s.modelKind]}`}
        >
          {s.modelKind === "ionic_formula_unit" && (
            <rect
              x="3"
              y="3"
              width={w - 6}
              height={h - 6}
              rx="6"
              fill="#152432"
              stroke="#6c9ab0"
              strokeDasharray="3 3"
              strokeWidth="1.2"
            />
          )}
          {s.modelKind === "metallic_network" && (
            <rect
              x="4"
              y="4"
              width={w - 8}
              height={h - 8}
              rx="5"
              fill="#1b2b39"
              stroke="#8ba2b8"
              strokeWidth="1.2"
            />
          )}
          {s.modelKind === "covalent_network" && (
            <line
              x1="12"
              y1={h / 2}
              x2={w - 12}
              y2={h / 2}
              stroke="#799bb0"
              strokeWidth="2"
              strokeDasharray="2 2"
            />
          )}
          {s.modelKind === "molecule" && displayAtoms.length > 1 && (
            <line
              x1={18}
              y1={h / 2}
              x2={w - 18}
              y2={h / 2}
              stroke="#77a7be"
              strokeWidth="2.5"
            />
          )}
          {displayAtoms.map((el, i) => {
            const step =
              displayAtoms.length === 1
                ? 0
                : (w - 32) / (displayAtoms.length - 1);
            const cx = displayAtoms.length === 1 ? w / 2 : 16 + i * step;
            const cy =
              s.modelKind === "ionic_formula_unit"
                ? h / 2 + (i % 2 === 0 ? -4 : 4)
                : h / 2;
            const palette = atomColor(el);
            return (
              <g key={`${el}-${i}`}>
                {s.modelKind === "ionic_formula_unit" ? (
                  <rect
                    x={cx - r + 1}
                    y={cy - r + 1}
                    width={(r - 1) * 2}
                    height={(r - 1) * 2}
                    rx="4"
                    fill={palette.bg}
                    stroke="#0e1622"
                    strokeWidth="1.2"
                  />
                ) : (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={palette.bg}
                    stroke="#0e1622"
                    strokeWidth="1.2"
                  />
                )}
                <text
                  x={cx}
                  y={cy + 3.5}
                  textAnchor="middle"
                  fontSize={compact ? 8.5 : 9.5}
                  fontWeight="700"
                  fill={palette.fg}
                  fontFamily="Consolas, sans-serif"
                >
                  {el}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <div className="unit-mixture-box">多组分 / 非单一化学式</div>
      )}
      {!compact && (
        <div className="unit-glyph-foot">
          <strong>{s.name}</strong>
          <Formula value={s.formula} />
        </div>
      )}
    </div>
  );
}

/**
 * Full reaction atom rearrangement & conservation visualization panel.
 * Displays reactants -> products + remaining unreacted reactants, with per-element atom tally.
 */
export function ReactionAtomPanel({
  stoich,
}: {
  stoich: IntegerStoichiometryResult;
}) {
  const { conservation } = stoich;
  const elements = [
    ...new Set([
      ...Object.keys(conservation.inputAtoms),
      ...Object.keys(conservation.outputAtoms),
    ]),
  ];

  return (
    <div className="atom-panel">
      <div className="atom-panel-head">
        <h4>原子重组与守恒示意</h4>
        <span
          className={`conservation-pill ${conservation.atomsConserved && conservation.chargeConserved ? "ok" : "bad"}`}
        >
          {conservation.atomsConserved && conservation.chargeConserved
            ? "原子与电荷守恒（含剩余物）"
            : "守恒异常"}
        </span>
      </div>

      <div className="atom-rearrangement">
        <div className="atom-side">
          <small>投入反应物（总计）</small>
          <div className="atom-units-row">
            {stoich.reactants.map((r) => (
              <SubstanceUnitGlyph
                key={r.substanceId}
                s={byId[r.substanceId]}
                count={r.input}
                compact
              />
            ))}
          </div>
        </div>
        <div className="atom-arrow" aria-hidden="true">
          <span>→</span>
          <small>×{stoich.extent}</small>
        </div>
        <div className="atom-side">
          <small>生成产物 + 剩余反应物</small>
          <div className="atom-units-row">
            {stoich.products
              .filter((p) => p.produced > 0)
              .map((p) => (
                <SubstanceUnitGlyph
                  key={`prod-${p.substanceId}`}
                  s={byId[p.substanceId]}
                  count={p.produced}
                  compact
                />
              ))}
            {stoich.reactants
              .filter((r) => r.remaining > 0)
              .map((r) => (
                <div
                  className="remaining-unit-wrap"
                  key={`rem-${r.substanceId}`}
                >
                  <SubstanceUnitGlyph
                    s={byId[r.substanceId]}
                    count={r.remaining}
                    compact
                  />
                  <span className="rem-tag">剩余</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="atom-tally-grid">
        {elements.map((el) => {
          const lhs = conservation.inputAtoms[el] || 0;
          const rhs = conservation.outputAtoms[el] || 0;
          const palette = atomColor(el);
          return (
            <div className="atom-tally-chip" key={el}>
              <span
                className="atom-dot"
                style={{ background: palette.bg, color: palette.fg }}
              >
                {el}
              </span>
              <span>
                投入 <strong>{lhs}</strong> = 反应后（产物+剩余）{" "}
                <strong>{rhs}</strong>
              </span>
            </div>
          );
        })}
        {(conservation.inputCharge !== 0 ||
          conservation.outputCharge !== 0) && (
          <div className="atom-tally-chip">
            <span className="atom-dot charge-dot">q</span>
            <span>
              电荷：投入 <strong>{conservation.inputCharge}</strong> = 反应后{" "}
              <strong>{conservation.outputCharge}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
