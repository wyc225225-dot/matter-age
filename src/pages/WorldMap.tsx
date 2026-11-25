import { useState } from "react";
import {
  CheckCircle2,
  Coins,
  Compass,
  Lock,
  MapPin,
  Pickaxe,
  Sparkles,
} from "lucide-react";
import type { RegionId } from "../types";
import { byId, regionById, regions, techById } from "../data";
import { useGame } from "../stores/game";
import {
  getRegionUnlockReasons,
  isRegionUnlocked,
} from "../engine/explorationEngine";
import { SubstanceIcon } from "../components/SubstanceIcon";

export default function WorldMap({ toast }: { toast: (s: string) => void }) {
  const game = useGame();
  const save = game.save;
  const [selectedId, setSelectedId] = useState<RegionId>("forest");

  const selectedRegion = regionById[selectedId] ?? regions[0];
  const unlocked = isRegionUnlocked(save, selectedRegion);
  const lockReasons = getRegionUnlockReasons(save, selectedRegion, techById);
  const progress = save.regionProgress[selectedRegion.id] ?? {
    gatherCount: 0,
    completedTaskIds: [],
    eventLog: [],
  };

  return (
    <div className="page-width standard-page world-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORLD EXPLORATION · 2D REGIONAL MAP</p>
          <h1>世界探索地图</h1>
          <p>
            点击 2D
            区域地图或野外采集点获取有限经营原料。原始森林提供永久免费采集点，彻底杜绝零资源死锁；随机探索事件仅影响奇遇奖励，绝不干扰确定性化学规则。
          </p>
        </div>
        <div className="mgmt-quick-stats">
          <div className="stat-chip gold">
            <Coins size={15} />
            <strong>{save.coins}</strong>
            <span>金币</span>
          </div>
          <div className="stat-chip green">
            <Compass size={15} />
            <strong>
              {regions.filter((r) => isRegionUnlocked(save, r)).length}/3
            </strong>
            <span>已解锁可玩区</span>
          </div>
        </div>
      </div>

      {/* Illustrated 2D World Map Canvas */}
      <section className="world-map-layout">
        <div className="panel world-map-stage">
          <svg
            className="world-map-svg"
            viewBox="0 0 1000 560"
            role="img"
            aria-label="物质纪元 2D 世界探索区域地图"
          >
            <defs>
              <linearGradient id="oceanBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#081a2c" />
                <stop offset="55%" stopColor="#0d2942" />
                <stop offset="100%" stopColor="#081b2e" />
              </linearGradient>
              <linearGradient id="forestLand" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1b4d3e" />
                <stop offset="100%" stopColor="#11332b" />
              </linearGradient>
              <linearGradient id="mountainLand" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4c3829" />
                <stop offset="100%" stopColor="#2a2220" />
              </linearGradient>
              <linearGradient id="saltFlat" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#174c6b" />
                <stop offset="100%" stopColor="#0f3149" />
              </linearGradient>
              <linearGradient id="eastContinent" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2b2135" />
                <stop offset="100%" stopColor="#191928" />
              </linearGradient>
            </defs>

            {/* Sea backdrop & subtle cartographic grid */}
            <rect width="1000" height="560" rx="18" fill="url(#oceanBg)" />
            <g stroke="#4bb3e8" strokeOpacity="0.08" strokeWidth="1">
              {[100, 200, 300, 400, 500].map((y) => (
                <line key={y} x1="0" y1={y} x2="1000" y2={y} />
              ))}
              {[150, 300, 450, 600, 750, 900].map((x) => (
                <line key={x} x1={x} y1="0" x2={x} y2="560" />
              ))}
            </g>

            {/* Landmass 1: Primeval Forest */}
            <path
              d="M65,245 Q130,175 245,205 Q315,245 295,355 Q245,440 125,415 Q45,355 65,245 Z"
              fill="url(#forestLand)"
              stroke="#4cc38a"
              strokeOpacity="0.45"
              strokeWidth="2"
            />
            {/* Forest canopy details */}
            <g fill="#2e7d5d" opacity="0.55">
              <circle cx="130" cy="260" r="18" />
              <circle cx="170" cy="235" r="22" />
              <circle cx="220" cy="275" r="16" />
              <circle cx="155" cy="340" r="20" />
            </g>

            {/* Landmass 2: Mineral Mountains */}
            <path
              d="M340,130 Q470,70 605,135 Q625,245 555,285 Q425,295 345,235 Z"
              fill="url(#mountainLand)"
              stroke="#e09b52"
              strokeOpacity="0.48"
              strokeWidth="2"
            />
            {/* Mountain peaks */}
            <g fill="#7d593e" opacity="0.7">
              <polygon points="400,195 435,125 470,195" />
              <polygon points="475,200 518,118 560,200" />
              <polygon points="440,245 480,170 520,245" />
            </g>

            {/* Landmass 3: Ocean & Salt Flats */}
            <path
              d="M320,365 Q455,335 585,375 Q605,475 510,515 Q365,515 315,445 Z"
              fill="url(#saltFlat)"
              stroke="#53b8f3"
              strokeOpacity="0.52"
              strokeWidth="2"
            />
            <g
              stroke="#8be0ff"
              strokeOpacity="0.28"
              strokeWidth="1.5"
              fill="none"
            >
              <path d="M355,430 Q420,415 485,435 T565,425" />
              <path d="M370,468 Q435,455 505,472" />
            </g>

            {/* Landmass 4: Locked East Frontier (Volcano / Industrial Ruins / Future City) */}
            <path
              d="M670,115 Q825,85 935,195 Q965,365 910,495 Q775,525 700,425 Q655,275 670,115 Z"
              fill="url(#eastContinent)"
              stroke="#79699e"
              strokeOpacity="0.35"
              strokeDasharray="6 5"
              strokeWidth="2"
            />

            {/* Expedition Route Lines */}
            <g
              stroke="#8ec8eb"
              strokeOpacity="0.45"
              strokeWidth="2"
              strokeDasharray="6 5"
              fill="none"
            >
              <path d="M185,310 Q320,235 465,195" />
              <path d="M185,310 Q315,375 455,405" />
              <path d="M465,195 Q615,170 745,175" strokeOpacity="0.22" />
              <path d="M455,405 Q640,370 790,325" strokeOpacity="0.22" />
              <path d="M790,325 L850,455" strokeOpacity="0.22" />
            </g>

            {/* Clickable Gathering Node Markers for the active playable region */}
            {selectedRegion.playable &&
              unlocked &&
              selectedRegion.nodes.map((node) => (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    toast(
                      game.gatherWorldNode(selectedRegion.id, node.id).message,
                    )
                  }
                >
                  <circle
                    r="11"
                    fill={selectedRegion.themeColor}
                    fillOpacity="0.28"
                    stroke={selectedRegion.themeColor}
                    strokeWidth="2"
                  />
                  <circle r="4" fill="#ffffff" />
                  <title>{`点击采集：${node.name}`}</title>
                </g>
              ))}

            {/* Clickable Region Pins */}
            {regions.map((r) => {
              const isOpen = isRegionUnlocked(save, r);
              const isSel = r.id === selectedId;
              return (
                <g
                  key={r.id}
                  transform={`translate(${r.mapCoord.x}, ${r.mapCoord.y})`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedId(r.id)}
                >
                  {isSel && (
                    <circle
                      r="34"
                      fill="none"
                      stroke={r.themeColor}
                      strokeWidth="2"
                      strokeOpacity="0.7"
                    />
                  )}
                  <circle
                    r="24"
                    fill={isOpen ? "#10253a" : "#151a26"}
                    stroke={isOpen ? r.themeColor : "#67778a"}
                    strokeWidth={isSel ? 3 : 2}
                  />
                  <text
                    y="4"
                    textAnchor="middle"
                    fill={isOpen ? "#f0f7ff" : "#8fa1b5"}
                    fontSize="11"
                    fontWeight="700"
                  >
                    {isOpen
                      ? r.id === "forest"
                        ? "林"
                        : r.id === "mountains"
                          ? "矿"
                          : "盐"
                      : "锁"}
                  </text>
                  <rect
                    x="-54"
                    y="29"
                    width="108"
                    height="22"
                    rx="11"
                    fill="#081420"
                    fillOpacity="0.92"
                    stroke={isSel ? r.themeColor : "#2c4660"}
                  />
                  <text
                    y="44"
                    textAnchor="middle"
                    fill={isOpen ? "#eaf4ff" : "#8da2b8"}
                    fontSize="11.5"
                    fontWeight="600"
                  >
                    {r.name}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="map-region-strip">
            {regions.map((r) => {
              const isOpen = isRegionUnlocked(save, r);
              return (
                <button
                  key={r.id}
                  className={`region-tab ${r.id === selectedId ? "active" : ""} ${isOpen ? "" : "locked"}`}
                  onClick={() => setSelectedId(r.id)}
                >
                  {isOpen ? <MapPin size={14} /> : <Lock size={14} />}
                  <span>{r.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Region Command Panel */}
        <aside className="panel region-detail-panel">
          <span
            className="eyebrow"
            style={{ color: selectedRegion.themeColor }}
          >
            {selectedRegion.en}
          </span>
          <h2>{selectedRegion.name}</h2>
          <p className="muted">{selectedRegion.description}</p>

          {!unlocked ? (
            <div className="locked-region-box">
              <Lock size={22} />
              <div>
                <strong>
                  {selectedRegion.playable
                    ? "区域尚未解锁"
                    : "后续版本预告区域"}
                </strong>
                <ul>
                  {lockReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <>
              <div className="region-stat-line">
                <span>累计采集：{progress.gatherCount} 次</span>
                <span>
                  任务完成：{progress.completedTaskIds.length}/
                  {selectedRegion.tasks.length}
                </span>
              </div>

              <h3>野外采集点</h3>
              <div className="gather-node-list">
                {selectedRegion.nodes.map((node) => {
                  const canPay = save.coins >= node.costCoins;
                  return (
                    <div key={node.id} className="gather-node-card">
                      <div className="gather-node-head">
                        <strong>{node.name}</strong>
                        <span
                          className={`tag-pill ${node.costCoins === 0 ? "free" : ""}`}
                        >
                          {node.costCoins === 0
                            ? "永久免费"
                            : `${node.costCoins} 金币`}
                        </span>
                      </div>
                      <p className="muted">{node.description}</p>
                      <div className="yield-chips">
                        {node.yields.map((y) => (
                          <span key={y.substanceId} className="yield-chip">
                            <SubstanceIcon s={byId[y.substanceId]} size={18} />
                            {byId[y.substanceId].name} ×{y.amount}
                          </span>
                        ))}
                      </div>
                      <button
                        className={canPay ? "primary small" : "secondary small"}
                        disabled={!canPay}
                        onClick={() =>
                          toast(
                            game.gatherWorldNode(selectedRegion.id, node.id)
                              .message,
                          )
                        }
                      >
                        <Pickaxe size={14} />
                        立即采集（+{node.experienceGain} XP）
                      </button>
                    </div>
                  );
                })}
              </div>

              <h3>区域探索任务</h3>
              <div className="region-task-list">
                {selectedRegion.tasks.map((t) => {
                  const done = progress.completedTaskIds.includes(t.id);
                  const gatherOk =
                    !t.targetGatherCount ||
                    progress.gatherCount >= t.targetGatherCount;
                  const deliverOk =
                    !t.targetDeliverSubstance ||
                    (save.managementInventory[
                      t.targetDeliverSubstance.substanceId
                    ] ?? 0) >= t.targetDeliverSubstance.amount;
                  const ready = !done && gatherOk && deliverOk;

                  return (
                    <div
                      key={t.id}
                      className={`region-task-card ${done ? "done" : ""}`}
                    >
                      <div className="task-head">
                        <strong>{t.title}</strong>
                        {done && (
                          <span className="done-badge">
                            <CheckCircle2 size={13} /> 已完成
                          </span>
                        )}
                      </div>
                      <p className="muted">{t.description}</p>
                      <div className="task-foot">
                        <span className="reward-inline">
                          +{t.reward.coins} 金币 · +{t.reward.researchPoints} RP
                        </span>
                        {!done && (
                          <button
                            className={
                              ready ? "primary small" : "secondary small"
                            }
                            disabled={!ready}
                            onClick={() =>
                              toast(
                                game.completeRegionTaskAction(
                                  selectedRegion.id,
                                  t.id,
                                ).message,
                              )
                            }
                          >
                            领取任务奖励
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {progress.eventLog.length > 0 && (
                <div className="event-log-box">
                  <h4>
                    <Sparkles size={14} /> 最近野外奇遇记录
                  </h4>
                  <ul>
                    {progress.eventLog.slice(0, 4).map((ev, i) => (
                      <li key={`${ev.id}-${i}`}>{ev.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </aside>
      </section>
    </div>
  );
}
