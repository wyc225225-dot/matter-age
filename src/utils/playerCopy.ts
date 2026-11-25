/** Keep provenance in data files while presenting only player-facing science text. */
export function playerCopy(text: string) {
  return text
    .replace(/来源目录：[^；。]*[；。]?/g, "")
    .replace(/查看所引资料[^。]*。?/g, "")
    .replace(/具体颜色须参照所引物质资料。?/g, "")
    .trim();
}
