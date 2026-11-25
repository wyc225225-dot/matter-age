/**
 * Authoritative reference URLs verified via OpenStax Chemistry 2e, PubChem, and RSC Education.
 * Note: Having a reference entry supports traceability but does NOT constitute human scientific sign-off.
 * All substances and reactions remain `reviewStatus: "pending"` until human review is completed.
 */

export const pubchem = (cid: number) =>
  `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;

export const OPENSTAX = {
  balancing:
    "https://openstax.org/books/chemistry-2e/pages/4-1-writing-and-balancing-chemical-equations",
  classifying:
    "https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions",
  phaseTransitions:
    "https://openstax.org/books/chemistry-2e/pages/10-3-phase-transitions",
  dissolution:
    "https://openstax.org/books/chemistry-2e/pages/11-1-the-dissolution-process",
  solubility: "https://openstax.org/books/chemistry-2e/pages/11-3-solubility",
  catalysis: "https://openstax.org/books/chemistry-2e/pages/12-7-catalysis",
  acidsBases:
    "https://openstax.org/books/chemistry-2e/pages/14-1-bronsted-lowry-acids-and-bases",
  acidStrength:
    "https://openstax.org/books/chemistry-2e/pages/14-3-relative-strengths-of-acids-and-bases",
  saltHydrolysis:
    "https://openstax.org/books/chemistry-2e/pages/14-4-hydrolysis-of-salts",
  electrolysis:
    "https://openstax.org/books/chemistry-2e/pages/17-7-electrolysis",
  repMetals:
    "https://openstax.org/books/chemistry-2e/pages/18-2-occurrence-and-preparation-of-the-representative-metals",
  metalloids:
    "https://openstax.org/books/chemistry-2e/pages/18-3-structure-and-general-properties-of-the-metalloids",
  nonmetals:
    "https://openstax.org/books/chemistry-2e/pages/18-4-structure-and-general-properties-of-the-nonmetals",
  hydrogen:
    "https://openstax.org/books/chemistry-2e/pages/18-5-occurrence-preparation-and-compounds-of-hydrogen",
  carbonates:
    "https://openstax.org/books/chemistry-2e/pages/18-6-occurrence-preparation-and-properties-of-carbonates",
  nitrogen:
    "https://openstax.org/books/chemistry-2e/pages/18-7-occurrence-preparation-and-properties-of-nitrogen",
  phosphorus:
    "https://openstax.org/books/chemistry-2e/pages/18-8-occurrence-preparation-and-properties-of-phosphorus",
  oxygen:
    "https://openstax.org/books/chemistry-2e/pages/18-9-occurrence-preparation-and-compounds-of-oxygen",
  sulfur:
    "https://openstax.org/books/chemistry-2e/pages/18-10-occurrence-preparation-and-properties-of-sulfur",
  halogens:
    "https://openstax.org/books/chemistry-2e/pages/18-11-occurrence-preparation-and-properties-of-halogens",
  transitionMetals:
    "https://openstax.org/books/chemistry-2e/pages/19-1-occurrence-preparation-and-properties-of-transition-metals-and-their-compounds",
  carboxylicAcids:
    "https://openstax.org/books/chemistry-2e/pages/20-3-aldehydes-ketones-carboxylic-acids-and-esters",
} as const;

export const RSC = {
  limestone:
    "https://edu.rsc.org/experiments/thermal-decomposition-of-calcium-carbonate/704.article",
  thermite:
    "https://portal.ed.rsc.org/resources/the-thermite-reaction-between-aluminium-and-iron-iii-oxide/489208",
  cuoSulfuric:
    "https://portal.ed.rsc.org/resources/reacting-copper-ii-oxide-with-sulfuric-acid/506807",
  cuoReduction:
    "https://portal.ed.rsc.org/resources/microscale-extraction-of-copper/511929",
  neutralisation:
    "https://portal.ed.rsc.org/resources/preparing-salts-by-neutralisation-of-oxides-and-carbonates/506852",
  displacement:
    "https://portal.ed.rsc.org/resources/exothermic-metal-displacement-reactions/510824",
  electrolysis:
    "https://portal.ed.rsc.org/resources/identifying-the-products-of-electrolysis/110637",
} as const;

export const HARVARD = {
  photochemicalH2Cl2:
    "https://sciencedemonstrations.fas.harvard.edu/presentations/photochemical-reaction-hydrogen-and-chlorine",
} as const;
