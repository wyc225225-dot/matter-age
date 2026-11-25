/** Molecular formula parser. Parenthesized groups and hydrate dots; ions use explicit ^2+ notation. */
export function parseFormula(input: string): Record<string, number> {
  if (!input || !/^[A-Za-z0-9().·]+$/.test(input))
    throw new Error(`不支持的化学式：${input}`);
  const total: Record<string, number> = {};
  for (const raw of input.split(/[·.]/)) {
    const m = raw.match(/^(\d+)(.*)$/);
    const factor = m ? Number(m[1]) : 1;
    const s = m ? m[2] : raw;
    if (!s || !Number.isSafeInteger(factor) || factor < 1)
      throw new Error("化学式片段无效");
    let i = 0;
    const count = () => {
      const start = i;
      while (/\d/.test(s[i] || "") && i < s.length) i++;
      const n = i === start ? 1 : Number(s.slice(start, i));
      if (!Number.isSafeInteger(n) || n < 1)
        throw new Error("原子数必须为正整数");
      return n;
    };
    const group = (nested = false): Record<string, number> => {
      const out: Record<string, number> = {};
      while (i < s.length) {
        if (s[i] === ")") {
          if (!nested) throw new Error("括号不匹配");
          if (!Object.keys(out).length) throw new Error("不支持空原子组");
          i++;
          return out;
        }
        if (s[i] === "(") {
          i++;
          const sub = group(true),
            n = count();
          for (const [e, v] of Object.entries(sub))
            out[e] = (out[e] || 0) + v * n;
        } else {
          const token = s.slice(i).match(/^[A-Z][a-z]?/);
          if (!token) throw new Error("化学式语法错误");
          i += token[0].length;
          out[token[0]] = (out[token[0]] || 0) + count();
        }
      }
      if (nested) throw new Error("括号不匹配");
      return out;
    };
    for (const [e, v] of Object.entries(group()))
      total[e] = (total[e] || 0) + v * factor;
  }
  return total;
}
export function parseIon(formula: string) {
  const m = formula.match(/^(.*)\^(\d*)([+-])$/);
  return {
    elements: parseFormula(m ? m[1] : formula),
    charge: m ? Number(m[2] || 1) * (m[3] === "+" ? 1 : -1) : 0,
  };
}
