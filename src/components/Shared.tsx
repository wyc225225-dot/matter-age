import type { ReactNode } from "react";

/**
 * Formats chemical formulas and equations with proper subscripts and ionic superscripts.
 * Leading stoichiometric coefficients (e.g., `2` in `2H2 + O2 → 2H2O`) stay baseline-aligned;
 * only element/group counts following a letter or `)` become subscripts.
 */
export function fmt(value: string): ReactNode[] {
  const out: ReactNode[] = [];
  const tokenRe = /\^(\d*[+-])|([A-Za-z)])(\d+)/g;
  let last = 0;
  let key = 0;
  for (const match of value.matchAll(tokenRe)) {
    const idx = match.index ?? 0;
    if (idx > last) out.push(value.slice(last, idx));
    if (match[1]) {
      out.push(<sup key={key++}>{match[1]}</sup>);
    } else {
      out.push(match[2]);
      out.push(<sub key={key++}>{match[3]}</sub>);
    }
    last = idx + match[0].length;
  }
  if (last < value.length) out.push(value.slice(last));
  return out;
}

export function Formula({ value }: { value: string | null }) {
  return <span className="formula">{value ? fmt(value) : "混合体系"}</span>;
}

export function PageHeading({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}
