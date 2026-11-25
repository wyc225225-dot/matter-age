import { useMemo, useState } from "react";
import type { Reaction, Substance } from "../types";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { X, Scale, Target, SlidersHorizontal } from "lucide-react";
import { substances, byId, reactions, quantitativeChallenges } from "../data";
import { useGame } from "../stores/game";
import { useViewport } from "../hooks/useViewport";
import { SubstanceIcon } from "../components/SubstanceIcon";
import { PageHeading, fmt } from "../components/Shared";

export default function DiscoveryTree({
  setDetail,
}: {
  setDetail: (s: Substance) => void;
}) {
  const save = useGame((s) => s.save);
  const vp = useViewport();
  const [category, setCategory] = useState("全部");
  const [focusId, setFocusId] = useState("");
  const [showEntityLinks, setShowEntityLinks] = useState(true);
  const [showUnknownFrontier, setShowUnknownFrontier] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(
    null,
  );

  const discoveredIds = useMemo(
    () => Object.keys(save.discovered),
    [save.discovered],
  );

  const { nodes, edges, completedCount } = useMemo(() => {
    const completed = reactions.filter((r) => save.completed.includes(r.id));

    const depth = new Map<string, number>();
    for (const id of discoveredIds) {
      const s = byId[id];
      if (s?.initialUnlocked || s?.supply) depth.set(id, 0);
    }
    for (let iter = 0; iter < 12; iter++) {
      let changed = false;
      for (const r of completed) {
        const inDepths = [
          ...r.reactants.map((p) => p.substanceId),
          ...r.catalysts,
        ]
          .map((id) => depth.get(id))
          .filter((d): d is number => d !== undefined);
        const base = inDepths.length ? Math.max(...inDepths) + 1 : 1;
        for (const p of r.products) {
          const prev = depth.get(p.substanceId);
          if (prev === undefined || base < prev) {
            depth.set(p.substanceId, base);
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
    for (const id of discoveredIds) {
      if (!depth.has(id)) depth.set(id, 0);
    }

    let focusSet: Set<string> | null = null;
    if (focusId && byId[focusId]) {
      focusSet = new Set<string>([focusId]);
      const queue = [focusId];
      while (queue.length) {
        const cur = queue.shift()!;
        for (const r of completed) {
          if (r.products.some((p) => p.substanceId === cur)) {
            focusSet.add(r.id);
            for (const dep of [
              ...r.reactants.map((p) => p.substanceId),
              ...r.catalysts,
            ]) {
              if (!focusSet.has(dep)) {
                focusSet.add(dep);
                queue.push(dep);
              }
            }
          }
          if (
            cur === focusId &&
            (r.reactants.some((p) => p.substanceId === cur) ||
              r.catalysts.includes(cur))
          ) {
            focusSet.add(r.id);
            for (const p of r.products) focusSet.add(p.substanceId);
          }
        }
      }
    }

    const visibleSubstances = substances.filter(
      (s) =>
        s.id in save.discovered &&
        (category === "全部" || s.group === category || focusSet?.has(s.id)) &&
        (!focusSet || focusSet.has(s.id)),
    );
    const visibleSubIds = new Set(visibleSubstances.map((s) => s.id));

    const visibleReactions = completed.filter(
      (r) =>
        (!focusSet || focusSet.has(r.id)) &&
        (r.reactants.some((p) => visibleSubIds.has(p.substanceId)) ||
          r.products.some((p) => visibleSubIds.has(p.substanceId))),
    );

    for (const r of visibleReactions) {
      for (const id of [
        ...r.reactants.map((p) => p.substanceId),
        ...r.products.map((p) => p.substanceId),
        ...r.catalysts,
      ]) {
        if (id in save.discovered && !visibleSubIds.has(id)) {
          visibleSubIds.add(id);
          visibleSubstances.push(byId[id]);
        }
      }
    }

    const layers = new Map<number, Substance[]>();
    for (const s of visibleSubstances) {
      const d = depth.get(s.id) ?? 0;
      const arr = layers.get(d) || [];
      arr.push(s);
      layers.set(d, arr);
    }

    const builtNodes: Node[] = [];
    const posMap = new Map<string, { x: number; y: number }>();

    for (const [layerIdx, items] of [...layers.entries()].sort(
      (a, b) => a[0] - b[0],
    )) {
      const y = layerIdx * 230;
      items.forEach((s, col) => {
        const x = col * 200;
        const quantDone = !!save.research[s.id]?.quantitativeResearchCompleted;
        posMap.set(s.id, { x, y });
        builtNodes.push({
          id: s.id,
          data: {
            label: (
              <span className="flow-label">
                <SubstanceIcon s={s} size={28} />
                <span>
                  {s.name}
                  {quantDone && <em className="flow-lv2">Lv.2</em>}
                </span>
              </span>
            ),
          },
          position: { x, y },
          style: {
            background: quantDone
              ? "#223b42"
              : focusId === s.id
                ? "#284359"
                : "#203042",
            color: "#e2eaf6",
            border: quantDone
              ? "2px solid #81c9a3"
              : focusId === s.id
                ? "2px solid #83cde9"
                : "1px solid #52849b",
            borderRadius: 10,
            width: 168,
          },
          type: "default",
        });
      });
    }

    const rxLaneCount = new Map<number, number>();
    for (const r of visibleReactions) {
      const inPos = r.reactants
        .map((p) => posMap.get(p.substanceId))
        .filter((p): p is { x: number; y: number } => !!p);
      const outPos = r.products
        .map((p) => posMap.get(p.substanceId))
        .filter((p): p is { x: number; y: number } => !!p);
      const avgX = inPos.length
        ? inPos.reduce((n, p) => n + p.x, 0) / inPos.length
        : 0;
      const baseY = inPos.length
        ? Math.max(...inPos.map((p) => p.y)) + 110
        : outPos.length
          ? Math.max(0, Math.min(...outPos.map((p) => p.y)) - 110)
          : 110;
      const laneKey = Math.round(baseY / 110);
      const offsetIdx = rxLaneCount.get(laneKey) || 0;
      rxLaneCount.set(laneKey, offsetIdx + 1);
      const x = Math.round(avgX + ((offsetIdx % 3) - 1) * 48);
      const y = baseY + (offsetIdx % 2) * 18;
      const quantDone =
        r.id in save.bestUtilization || !!save.balancingRecords[r.id]?.solved;
      builtNodes.push({
        id: r.id,
        data: { label: `${r.name}${quantDone ? " · 定量" : ""}` },
        position: { x, y },
        style: {
          background: quantDone ? "#2b3b30" : "#28302d",
          color: quantDone ? "#a4e5be" : "#eac477",
          border: quantDone ? "1.5px solid #81c9a3" : "1px solid #6d5c40",
          borderRadius: 22,
          fontSize: 11,
          width: 148,
        },
        type: "default",
      });
    }

    const frontierEdges: Edge[] = [];
    if (showUnknownFrontier && !focusId) {
      const frontierProducts = new Map<string, string[]>();
      for (const r of reactions) {
        if (save.completed.includes(r.id)) continue;
        const canRun = [
          ...r.reactants.map((p) => p.substanceId),
          ...r.catalysts,
        ].every((id) => id in save.discovered);
        if (!canRun) continue;
        for (const p of r.products) {
          if (p.substanceId in save.discovered) continue;
          if (!frontierProducts.has(p.substanceId)) {
            frontierProducts.set(
              p.substanceId,
              r.reactants
                .map((x) => x.substanceId)
                .filter((id) => visibleSubIds.has(id)),
            );
          }
        }
      }
      const maxLayer = Math.max(0, ...layers.keys());
      let col = 0;
      for (const [unknownId, sources] of [...frontierProducts.entries()].slice(
        0,
        8,
      )) {
        if (!sources.length) continue;
        const nodeId = `unknown-${unknownId}`;
        builtNodes.push({
          id: nodeId,
          data: { label: "？ 未知新物质" },
          position: { x: col * 185, y: (maxLayer + 1) * 230 },
          style: {
            background: "#141f2a",
            color: "#8196ad",
            border: "1px dashed #4a6073",
            borderRadius: 10,
            fontSize: 11,
            width: 140,
          },
          type: "default",
        });
        col++;
        for (const src of sources) {
          frontierEdges.push({
            id: `hint-${src}-${nodeId}`,
            source: src,
            target: nodeId,
            style: {
              stroke: "#587185",
              strokeWidth: 1.2,
              strokeDasharray: "4 4",
            },
          });
        }
      }
    }

    const nodeIds = new Set(builtNodes.map((n) => n.id));
    const reactionEdges: Edge[] = visibleReactions
      .flatMap((r): Edge[] => [
        ...r.reactants.map((p) => ({
          id: `${r.id}-in-${p.substanceId}`,
          source: p.substanceId,
          target: r.id,
          style: { stroke: "#7eaeb7", strokeWidth: 1.6 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#7eaeb7" },
        })),
        ...r.catalysts.map((catId) => ({
          id: `${r.id}-cat-${catId}`,
          source: catId,
          target: r.id,
          label: "催化",
          labelStyle: { fill: "#eac477", fontSize: 10 },
          labelBgStyle: { fill: "#182531", fillOpacity: 0.9 },
          style: {
            stroke: "#eac477",
            strokeWidth: 1.4,
            strokeDasharray: "5 4",
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#eac477" },
        })),
        ...r.products.map((p) => ({
          id: `${r.id}-out-${p.substanceId}`,
          source: r.id,
          target: p.substanceId,
          style: { stroke: "#81c9a3", strokeWidth: 1.8 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#81c9a3" },
        })),
      ])
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

    const entityEdges: Edge[] = [];
    if (showEntityLinks) {
      const byEntity = new Map<string, Substance[]>();
      for (const s of visibleSubstances) {
        if (!s.formula) continue;
        const arr = byEntity.get(s.chemicalEntityId) || [];
        arr.push(s);
        byEntity.set(s.chemicalEntityId, arr);
      }
      for (const [entityId, group] of byEntity.entries()) {
        if (group.length < 2) continue;
        for (let i = 0; i < group.length - 1; i++) {
          entityEdges.push({
            id: `entity-${entityId}-${group[i].id}-${group[i + 1].id}`,
            source: group[i].id,
            target: group[i + 1].id,
            label: `同实体 ${entityId}`,
            labelStyle: { fill: "#b6a5e8", fontSize: 10 },
            labelBgStyle: { fill: "#182531", fillOpacity: 0.9 },
            style: {
              stroke: "#9e8bd6",
              strokeWidth: 1.3,
              strokeDasharray: "2 5",
            },
          });
        }
      }
    }

    return {
      nodes: builtNodes,
      edges: [...reactionEdges, ...entityEdges, ...frontierEdges],
      completedCount: completed.length,
    };
  }, [
    save.discovered,
    save.completed,
    save.research,
    save.bestUtilization,
    save.balancingRecords,
    discoveredIds,
    category,
    focusId,
    showEntityLinks,
    showUnknownFrontier,
  ]);

  const relatedQuantChallenges = selectedReaction
    ? quantitativeChallenges.filter((qc) =>
        qc.solutionSteps.some((st) => st.reactionId === selectedReaction.id),
      )
    : [];

  return (
    <div
      className={`page-width standard-page tree-page ${vp.isMobileLandscape ? "tree-landscape-split" : ""}`}
    >
      <PageHeading
        kicker="THE DISCOVERY NETWORK · RESEARCH TIERS"
        title="科学发现网络"
        description="点击物质查看图鉴详情，点击已验证反应节点查看化学计量配比、研究记录与关联定量挑战。"
      />

      <div className="tree-workspace">
        <div className="tree-canvas-pane">
          {vp.isMobilePortrait && (
            <div className="tree-mobile-bar">
              <span className="tag-pill">
                已发现 {discoveredIds.length} · 反应 {completedCount}
              </span>
              <button
                type="button"
                className="secondary small"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((v) => !v)}
              >
                <SlidersHorizontal size={13} />
                {filtersOpen ? "收起筛选" : "筛选与图例"}
              </button>
            </div>
          )}

          {(!vp.isMobilePortrait || filtersOpen) && !vp.isMobileLandscape && (
            <div className="tree-toolbar">
              <span>
                <i className="legend-dot blue-dot" />
                Lv.1 已发现 <i className="legend-dot green-dot" />
                Lv.2 已定量研究 <i className="legend-dot gold-dot" />
                已验证反应 <i className="legend-dot purple-dot" />
                同实体关联
              </span>
              <div className="tree-controls">
                <select
                  aria-label="发现网络类别"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {["全部", ...new Set(substances.map((s) => s.group))].map(
                    (g) => (
                      <option key={g}>{g}</option>
                    ),
                  )}
                </select>
                <select
                  aria-label="聚焦物质合成路径"
                  value={focusId}
                  onChange={(e) => setFocusId(e.target.value)}
                >
                  <option value="">全部已知网络</option>
                  {discoveredIds.map((id) => (
                    <option key={id} value={id}>
                      合成路径：{byId[id].name}
                    </option>
                  ))}
                </select>
                <label className="tree-toggle">
                  <input
                    type="checkbox"
                    checked={showEntityLinks}
                    onChange={(e) => setShowEntityLinks(e.target.checked)}
                  />
                  实体关联
                </label>
                <label className="tree-toggle">
                  <input
                    type="checkbox"
                    checked={showUnknownFrontier}
                    onChange={(e) => setShowUnknownFrontier(e.target.checked)}
                  />
                  未知前沿
                </label>
              </div>
            </div>
          )}

          <div className="flow-panel">
            <ReactFlow
              key={`${category}-${focusId}-${showEntityLinks}-${showUnknownFrontier}-${completedCount}`}
              defaultNodes={nodes}
              defaultEdges={edges}
              fitView
              onNodeClick={(_, n) => {
                if (byId[n.id]) {
                  setDetail(byId[n.id]);
                  return;
                }
                const rx = reactions.find((r) => r.id === n.id);
                if (rx) setSelectedReaction(rx);
              }}
            >
              <Background color="#314455" gap={24} />
              <Controls />
            </ReactFlow>
            {!completedCount && (
              <div className="flow-empty">
                完成一次实验，点亮你的第一条发现路径。
              </div>
            )}
          </div>
        </div>

        {(vp.isMobileLandscape || selectedReaction) && (
          <div
            className={`tree-side-pane ${vp.isMobilePortrait && selectedReaction ? "mobile-sheet-active" : ""}`}
          >
            {vp.isMobilePortrait && selectedReaction && (
              <button
                type="button"
                className="sheet-backdrop-btn"
                aria-label="关闭反应详情遮罩"
                onClick={() => setSelectedReaction(null)}
              />
            )}

            {vp.isMobileLandscape && (
              <div className="panel tree-landscape-controls">
                <div className="tree-legend-compact">
                  <span>
                    <i className="legend-dot blue-dot" /> Lv.1
                  </span>
                  <span>
                    <i className="legend-dot green-dot" /> Lv.2
                  </span>
                  <span>
                    <i className="legend-dot gold-dot" /> 反应
                  </span>
                  <span>
                    <i className="legend-dot purple-dot" /> 实体
                  </span>
                </div>
                <select
                  aria-label="发现网络类别"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {["全部", ...new Set(substances.map((s) => s.group))].map(
                    (g) => (
                      <option key={g}>{g}</option>
                    ),
                  )}
                </select>
                <select
                  aria-label="聚焦物质合成路径"
                  value={focusId}
                  onChange={(e) => setFocusId(e.target.value)}
                >
                  <option value="">全部已知网络</option>
                  {discoveredIds.map((id) => (
                    <option key={id} value={id}>
                      合成路径：{byId[id].name}
                    </option>
                  ))}
                </select>
                <div className="tree-toggle-row">
                  <label className="tree-toggle">
                    <input
                      type="checkbox"
                      checked={showEntityLinks}
                      onChange={(e) => setShowEntityLinks(e.target.checked)}
                    />
                    实体关联
                  </label>
                  <label className="tree-toggle">
                    <input
                      type="checkbox"
                      checked={showUnknownFrontier}
                      onChange={(e) => setShowUnknownFrontier(e.target.checked)}
                    />
                    未知前沿
                  </label>
                </div>
              </div>
            )}

            {selectedReaction && (
              <section
                className="panel reaction-inspector"
                aria-label="反应节点研究详情"
              >
                <div className="panel-title">
                  <h2>
                    <Scale size={16} />
                    {selectedReaction.name} · 化学计量与研究档案
                  </h2>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="关闭反应详情"
                    onClick={() => setSelectedReaction(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="inspector-grid">
                  <div>
                    <small>化学方程式</small>
                    <p className="equation">{fmt(selectedReaction.equation)}</p>
                    <small>
                      计量策略：
                      {(
                        {
                          stoichiometric: "整数化学计量",
                          ionic_stoichiometric: "离子化学计量",
                          phase_change: "物态变化",
                          mixture_unsupported: "混合物/加工规则",
                          material_process_unsupported: "材料加工规则",
                        } as Record<string, string>
                      )[selectedReaction.calculationStrategy] ??
                        selectedReaction.calculationStrategy}{" "}
                      · 审核状态：
                      {selectedReaction.reviewStatus === "reviewed"
                        ? "已审核"
                        : "待人工审核（preview）"}
                    </small>
                  </div>
                  <div>
                    <small>反应物比例</small>
                    <p>
                      {selectedReaction.reactants
                        .map(
                          (p) =>
                            `${byId[p.substanceId].name} ×${p.coefficient}`,
                        )
                        .join(" : ")}
                    </p>
                    <small>产物比例</small>
                    <p>
                      {selectedReaction.products
                        .map(
                          (p) =>
                            `${byId[p.substanceId].name} ×${p.coefficient}`,
                        )
                        .join(" : ")}
                    </p>
                  </div>
                  <div>
                    <small>定量研究记录</small>
                    <p>
                      {save.bestUtilization[selectedReaction.id]
                        ? `最佳份数利用率 ${Math.round(save.bestUtilization[selectedReaction.id].portionUtilization * 1000) / 10}%`
                        : "尚未在进阶模式完成定量实验"}
                    </p>
                    <small>配平记录</small>
                    <p>
                      {save.balancingRecords[selectedReaction.id]?.solved
                        ? save.balancingRecords[selectedReaction.id]
                            .simplestRatio
                          ? "已通过最简整数比配平"
                          : "已通过等比例配平"
                        : "尚未完成方程式配平"}
                    </p>
                  </div>
                  <div>
                    <small>关联定量挑战</small>
                    {relatedQuantChallenges.length ? (
                      <ul className="inspector-challenges">
                        {relatedQuantChallenges.map((qc) => (
                          <li key={qc.id}>
                            <Target size={12} />
                            <span>
                              {qc.name}（{qc.group}）
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">暂无直接关联定量关卡。</p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
