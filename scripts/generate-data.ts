import { writeFileSync, mkdirSync } from "node:fs";
import { buildSubstances } from "./data/substances-source";
import { buildReactions } from "./data/reactions-source";
import { challengesSource } from "./data/challenges-source";
import { quantitativeChallengesSource } from "./data/quantitative-challenges-source";
import { generatePwaIcons } from "./data/generate-icons";
import { expandGithubCatalog } from "./data/github-expansion";

mkdirSync("src/data", { recursive: true });

const baseSubstances = buildSubstances();
const expanded = expandGithubCatalog(
  baseSubstances,
  buildReactions(baseSubstances),
);
const substances = expanded.substances;
const reactions = expanded.reactions;
const extraRules = reactions
  .filter(
    (r) =>
      r.id.startsWith("github_") &&
      r.products.some((p) => p.substanceId.startsWith("kb_")),
  )
  .slice(0, 6);
const challenges = [
  ...challengesSource,
  ...extraRules.map((r, i) => ({
    id: `github_c${i + 1}`,
    name: `新物质：${substances.find((s) => s.id === r.products.find((p) => p.substanceId.startsWith("kb_"))!.substanceId)!.name}`,
    description: "利用来源明确的新物质路径完成一次转化。",
    group: "基础探索",
    initial: r.reactants.map((p) => p.substanceId),
    conditions: r.conditions,
    target: r.products.find((p) => p.substanceId.startsWith("kb_"))!
      .substanceId,
    limit: 2,
  })),
];
const quantitativeChallenges = [
  ...quantitativeChallengesSource,
  ...extraRules.map((r, i) => {
    const target = r.products.find((p) => p.substanceId.startsWith("kb_"))!;
    return {
      id: `github_q${i + 1}`,
      name: `精确份数：${substances.find((s) => s.id === target.substanceId)!.name}`,
      description: "按最简方程式系数配置投入，在有限库存内形成目标产物。",
      group: "基础份数" as const,
      kind: "synthesis" as const,
      initialInventory: Object.fromEntries(
        r.reactants.map((p) => [p.substanceId, p.coefficient]),
      ),
      catalysts: r.catalysts,
      conditions: r.conditions,
      target: {
        substanceId: target.substanceId,
        minAmount: target.coefficient,
        exactZeroLeftover: true,
      },
      limit: 2,
      solutionSteps: [
        {
          reactionId: r.id,
          inputs: Object.fromEntries(
            r.reactants.map((p) => [p.substanceId, p.coefficient]),
          ),
          conditions: r.conditions,
          catalysts: r.catalysts,
        },
      ],
    };
  }),
];

writeFileSync(
  "src/data/substances.json",
  JSON.stringify(substances, null, 2) + "\n",
);
writeFileSync(
  "src/data/reactions.json",
  JSON.stringify(reactions, null, 2) + "\n",
);
writeFileSync(
  "src/data/challenges.json",
  JSON.stringify(challenges, null, 2) + "\n",
);
writeFileSync(
  "src/data/quantitativeChallenges.json",
  JSON.stringify(quantitativeChallenges, null, 2) + "\n",
);
generatePwaIcons();

console.log(
  `${substances.length} substances; ${reactions.length} authored rules; ${challenges.length} simple challenges; ${quantitativeChallenges.length} quantitative challenges; 4 PNG icons`,
);
