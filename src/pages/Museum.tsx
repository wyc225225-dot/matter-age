import { useState } from "react";
import { Award, Calendar, Landmark, Lock, Sparkles, X } from "lucide-react";
import type { MuseumCategory, MuseumItemDef } from "../types";
import { museumItems } from "../data";
import { useGame } from "../stores/game";

const categoryLabels: Record<MuseumCategory | "all", string> = {
  all: "全部馆藏",
  historical_discovery: "科学史里程碑",
  iconic_experiment: "经典实验仪器",
  rare_substance: "特征物质标本",
  civilization_milestone: "文明与探索",
  lab_relic: "实验室荣誉",
};

function ExhibitGraphic({
  item,
  unlocked,
}: {
  item: MuseumItemDef;
  unlocked: boolean;
}) {
  const stroke = unlocked ? item.accentColor : "#46586b";
  return (
    <svg className="exhibit-svg" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id={`spot-${item.id}`} cx="50%" cy="32%" r="60%">
          <stop
            offset="0%"
            stopColor={unlocked ? item.accentColor : "#2d3c4d"}
            stopOpacity={unlocked ? "0.35" : "0.14"}
          />
          <stop offset="100%" stopColor="#09111b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="56" r="52" fill={`url(#spot-${item.id})`} />
      {/* Museum pedestal */}
      <polygon
        points="26,96 94,96 102,108 18,108"
        fill="#132234"
        stroke={stroke}
        strokeOpacity="0.45"
        strokeWidth="1.4"
      />
      {/* Stylized exhibit silhouette by iconKind */}
      {item.iconKind === "battery" ? (
        <g stroke={stroke} strokeWidth="2" fill="none">
          <rect
            x="42"
            y="26"
            width="36"
            height="10"
            rx="2"
            fill={unlocked ? "#e09b52" : "#1d2c3b"}
          />
          <rect
            x="42"
            y="40"
            width="36"
            height="8"
            rx="2"
            fill={unlocked ? "#53b8f3" : "#182432"}
          />
          <rect
            x="42"
            y="52"
            width="36"
            height="10"
            rx="2"
            fill={unlocked ? "#9fb3c8" : "#1d2c3b"}
          />
          <rect
            x="42"
            y="66"
            width="36"
            height="8"
            rx="2"
            fill={unlocked ? "#53b8f3" : "#182432"}
          />
          <rect
            x="42"
            y="78"
            width="36"
            height="10"
            rx="2"
            fill={unlocked ? "#e09b52" : "#1d2c3b"}
          />
        </g>
      ) : item.iconKind === "balance" ? (
        <g stroke={stroke} strokeWidth="2" fill="none">
          <line x1="60" y1="28" x2="60" y2="90" />
          <line x1="28" y1="42" x2="92" y2="42" />
          <path d="M28,42 L20,66 L36,66 Z" />
          <path d="M92,42 L84,66 L100,66 Z" />
          <circle cx="60" cy="42" r="4" fill={stroke} />
        </g>
      ) : item.iconKind === "crystal" ? (
        <g
          stroke={stroke}
          strokeWidth="2"
          fill={unlocked ? `${item.accentColor}28` : "none"}
        >
          <polygon points="60,22 86,38 86,70 60,86 34,70 34,38" />
          <polyline points="34,38 60,54 86,38" />
          <line x1="60" y1="54" x2="60" y2="86" />
        </g>
      ) : item.iconKind === "grid" ? (
        <g stroke={stroke} strokeWidth="1.8" fill="none">
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={32 + c * 20}
                y={28 + r * 20}
                width="16"
                height="16"
                rx="2"
                fill={r === 1 && c === 1 ? `${item.accentColor}45` : "none"}
              />
            )),
          )}
        </g>
      ) : (
        <g
          stroke={stroke}
          strokeWidth="2"
          fill={unlocked ? `${item.accentColor}22` : "none"}
        >
          <path d="M48,26 L72,26 L68,48 L84,82 Q88,90 76,90 L44,90 Q32,90 36,82 L52,48 Z" />
          <circle cx="56" cy="74" r="4" fill={stroke} />
          <circle cx="66" cy="66" r="3" fill={stroke} />
        </g>
      )}
    </svg>
  );
}

export default function Museum() {
  const save = useGame((s) => s.save);
  const [cat, setCat] = useState<MuseumCategory | "all">("all");
  const [selected, setSelected] = useState<MuseumItemDef | null>(null);

  const unlockedCount = Object.keys(save.museumUnlocked).length;
  const visible =
    cat === "all" ? museumItems : museumItems.filter((m) => m.category === cat);

  return (
    <div className="page-width standard-page museum-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SCIENCE MUSEUM · PERMANENT COLLECTION</p>
          <h1>科学博物馆</h1>
          <p>
            每一件藏品都必须由真实游戏事件点亮：科学史章节、标志性实验、特征物质、实验室升级与世界探索里程碑。
          </p>
        </div>
        <div className="mgmt-quick-stats">
          <div className="stat-chip gold">
            <Landmark size={15} />
            <strong>
              {unlockedCount} / {museumItems.length}
            </strong>
            <span>已点亮馆藏</span>
          </div>
        </div>
      </div>

      <div className="filter-pills">
        {(Object.keys(categoryLabels) as (MuseumCategory | "all")[]).map(
          (k) => (
            <button
              key={k}
              className={cat === k ? "active" : ""}
              onClick={() => setCat(k)}
            >
              {categoryLabels[k]}
            </button>
          ),
        )}
      </div>

      <div className="museum-grid">
        {visible.map((item) => {
          const ts = save.museumUnlocked[item.id];
          const unlocked = Boolean(ts);
          return (
            <button
              key={item.id}
              className={`museum-case ${unlocked ? "unlocked" : "locked"}`}
              onClick={() => setSelected(item)}
            >
              <div className="museum-case-top">
                <span className="eyebrow">{item.eraLabel}</span>
                {unlocked ? (
                  <Sparkles size={14} color={item.accentColor} />
                ) : (
                  <Lock size={14} />
                )}
              </div>
              <ExhibitGraphic item={item} unlocked={unlocked} />
              <h3>{unlocked ? item.name : "未点亮藏品"}</h3>
              <p className="muted">
                {unlocked ? item.description : item.unlockHint}
              </p>
              <span className="museum-foot">
                {unlocked
                  ? `收藏于 ${new Date(ts).toLocaleDateString()}`
                  : "点击查看解锁条件"}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="modal museum-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close icon-button"
              aria-label="关闭展品档案"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            <p className="eyebrow">{selected.en}</p>
            <h2>{selected.name}</h2>
            <ExhibitGraphic
              item={selected}
              unlocked={Boolean(save.museumUnlocked[selected.id])}
            />
            {save.museumUnlocked[selected.id] ? (
              <>
                <p>{selected.description}</p>
                <div className="note-box">
                  <h4>
                    <Award size={14} /> 科学意义
                  </h4>
                  <p>{selected.scientificSignificance}</p>
                </div>
                <p className="muted">
                  <Calendar size={13} /> 馆藏记录时间：
                  {new Date(save.museumUnlocked[selected.id]).toLocaleString()}
                </p>
              </>
            ) : (
              <div className="note-box">
                <h4>尚未点亮</h4>
                <p>解锁条件：{selected.unlockHint}</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
