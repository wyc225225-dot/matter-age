import { parseIon } from "./formulaParser";
import type { Reaction, Substance } from "../types";

export interface BalanceCheckResult {
  validInput: boolean;
  balanced: boolean;
  atomsConserved: boolean;
  chargeConserved: boolean;
  leftAtoms: Record<string, number>;
  rightAtoms: Record<string, number>;
  leftCharge: number;
  rightCharge: number;
  gcd: number;
  isSimplestRatio: boolean;
  canonicalCoefficients: { reactants: number[]; products: number[] };
  message: string;
}

function gcdTwo(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function gcdList(nums: number[]): number {
  return nums.reduce((acc, n) => gcdTwo(acc, n), nums[0] || 1);
}

function getElementsAndCharge(s: Substance) {
  if (s.elementComposition) {
    return { elements: s.elementComposition, charge: s.charge ?? 0 };
  }
  if (s.formula) {
    return parseIon(s.formula);
  }
  throw new Error(`物质缺少化学式，无法进行方程式配平：${s.name}`);
}

/**
 * Evaluates user-submitted stoichiometric coefficients for a reaction.
 * - Accepts any positive-integer proportional multiple that conserves atoms & charge.
 * - Identifies whether the answer is already reduced to the simplest integer ratio (gcd === 1).
 * - Never permits modifying subscripts inside chemical formulas.
 */
export function checkEquationBalance(
  reaction: Reaction,
  reactantCoefficients: number[],
  productCoefficients: number[],
  db: Record<string, Substance>,
): BalanceCheckResult {
  const canonical = {
    reactants: reaction.reactants.map((p) => p.coefficient),
    products: reaction.products.map((p) => p.coefficient),
  };

  if (
    !reaction.stoichiometrySupported ||
    reactantCoefficients.length !== reaction.reactants.length ||
    productCoefficients.length !== reaction.products.length ||
    [...reactantCoefficients, ...productCoefficients].some(
      (c) => !Number.isInteger(c) || c < 1 || c > 99,
    )
  ) {
    return {
      validInput: false,
      balanced: false,
      atomsConserved: false,
      chargeConserved: false,
      leftAtoms: {},
      rightAtoms: {},
      leftCharge: 0,
      rightCharge: 0,
      gcd: 1,
      isSimplestRatio: false,
      canonicalCoefficients: canonical,
      message:
        "请输入 1–99 之间的正整数系数（仅可修改化学式前的系数，不可修改下标）。",
    };
  }

  const leftAtoms: Record<string, number> = {};
  const rightAtoms: Record<string, number> = {};
  let leftCharge = 0;
  let rightCharge = 0;

  reaction.reactants.forEach((p, idx) => {
    const coeff = reactantCoefficients[idx];
    const { elements, charge } = getElementsAndCharge(db[p.substanceId]);
    for (const [el, n] of Object.entries(elements)) {
      leftAtoms[el] = (leftAtoms[el] || 0) + n * coeff;
    }
    leftCharge += charge * coeff;
  });

  reaction.products.forEach((p, idx) => {
    const coeff = productCoefficients[idx];
    const { elements, charge } = getElementsAndCharge(db[p.substanceId]);
    for (const [el, n] of Object.entries(elements)) {
      rightAtoms[el] = (rightAtoms[el] || 0) + n * coeff;
    }
    rightCharge += charge * coeff;
  });

  const allEls = [
    ...new Set([...Object.keys(leftAtoms), ...Object.keys(rightAtoms)]),
  ];
  const atomsConserved = allEls.every(
    (el) => (leftAtoms[el] || 0) === (rightAtoms[el] || 0),
  );
  const chargeConserved = leftCharge === rightCharge;
  const balanced = atomsConserved && chargeConserved;

  const allCoeffs = [...reactantCoefficients, ...productCoefficients];
  const divisor = gcdList(allCoeffs);
  const isSimplestRatio = balanced && divisor === 1;

  let message = "配平成功，且已化为最简整数比！";
  if (!atomsConserved) {
    const diff = allEls
      .filter((el) => (leftAtoms[el] || 0) !== (rightAtoms[el] || 0))
      .map(
        (el) => `${el}（左 ${leftAtoms[el] || 0} / 右 ${rightAtoms[el] || 0}）`,
      )
      .join("、");
    message = `原子尚未守恒：${diff}。请调整化学式前的系数。`;
  } else if (!chargeConserved) {
    message = `电荷尚未守恒（左 ${leftCharge} / 右 ${rightCharge}）。`;
  } else if (!isSimplestRatio) {
    message = `等比例配平成立！但各项系数存在公约数 ${divisor}，同除以 ${divisor} 可化为最简整数比。`;
  }

  return {
    validInput: true,
    balanced,
    atomsConserved,
    chargeConserved,
    leftAtoms,
    rightAtoms,
    leftCharge,
    rightCharge,
    gcd: divisor,
    isSimplestRatio,
    canonicalCoefficients: canonical,
    message,
  };
}
