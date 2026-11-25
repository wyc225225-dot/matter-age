import { readdirSync, readFileSync, writeFileSync } from "node:fs";
function visit(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const file = `${dir}/${ent.name}`;
    if (ent.isDirectory()) visit(file);
    else if (/\.tsx?$/.test(ent.name)) {
      let code = readFileSync(file, "utf8");
      const body = code.replace(/import[\s\S]*?from\s*["'][^"']+["'];/g, "");
      code = code.replace(
        /import\s+(type\s+)?\{([^}]+)\}\s+from\s*(["'][^"']+["']);/g,
        (_, type, items, module) => {
          const used = items
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
            .filter((item) => {
              const local = item
                .split(/\s+as\s+/)
                .at(-1)
                .replace(/^type\s+/, "");
              return new RegExp(`\\b${local}\\b`).test(body);
            });
          return used.length
            ? `import ${type || ""}{${used.join(",")}} from ${module};`
            : "";
        },
      );
      writeFileSync(file, code);
    }
  }
}
visit("src");
