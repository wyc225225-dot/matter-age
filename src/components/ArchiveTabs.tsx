export type ArchiveView =
  "collection" | "elements" | "species" | "transformations" | "lessons";
const tabs: [ArchiveView, string][] = [
  ["collection", "我的物质图鉴"],
  ["elements", "118 种元素"],
  ["species", "物质资料"],
  ["transformations", "转化路径"],
  ["lessons", "学习任务"],
];
export function ArchiveTabs({
  view,
  onChange,
}: {
  view: ArchiveView;
  onChange: (v: ArchiveView) => void;
}) {
  return (
    <nav className="archive-tabs" aria-label="知识库分类">
      {tabs.map(([id, name]) => (
        <button
          key={id}
          className={view === id ? "active" : ""}
          onClick={() => onChange(id)}
        >
          {name}
        </button>
      ))}
    </nav>
  );
}
