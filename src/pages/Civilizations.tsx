import { Check, Atom } from "lucide-react";
import type { Page } from "../types/navigation";
import { currentEra } from "../engine/achievementEngine";

import { byId, eras } from "../data";
import { useGame } from "../stores/game";
import { useViewport } from "../hooks/useViewport";
import { SubstanceIcon } from "../components/SubstanceIcon";
import { PageHeading } from "../components/Shared";
import { learningTracks } from "../data/learningTracks";

export default function Civilizations({ go }: { go?: (p: Page) => void }) {
  const save = useGame((s) => s.save);
  const vp = useViewport();
  const era = currentEra(save);
  return (
    <div className="page-width standard-page">
      {vp.isMobile && go && (
        <div
          className="mobile-seg-tabs growth-mode-tabs"
          role="tablist"
          aria-label="成就与成长切换"
        >
          <button
            type="button"
            role="tab"
            aria-selected={false}
            onClick={() => go("achievements")}
          >
            探索成就
          </button>
          <button type="button" role="tab" aria-selected className="active">
            科技演进
          </button>
        </div>
      )}
      <PageHeading
        kicker="CIVILIZATION THROUGH MATTER"
        title="科技演进"
        description="发现新的物质，打开新的时代。这是一条学习路线，并非严格的历史年表。"
      />
      <div className="era-list">
        {eras.map((e, i) => (
          <section
            className={`panel civilization ${i <= era ? "unlocked" : ""}`}
            key={e.name}
          >
            <div className="era-index">
              0{i + 1}
              <span>{i <= era ? "已解锁" : "待解锁"}</span>
            </div>
            <div>
              <p className="eyebrow">{e.en}</p>
              <h2>{e.name}</h2>
              <p className="muted">{e.description}</p>
              <div className="era-targets">
                {e.targets.map((id) => (
                  <span
                    className={id in save.discovered ? "done" : ""}
                    key={id}
                  >
                    <SubstanceIcon s={byId[id]} size={30} />
                    {id in save.discovered ? byId[id].name : "未知目标"}
                    {id in save.discovered && <Check size={13} />}
                  </span>
                ))}
              </div>
              <div className="progress-track">
                <i
                  style={{
                    width: `${(e.targets.filter((id) => id in save.discovered).length / e.targets.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </section>
        ))}
        <section className="panel" style={{ padding: 22, marginBottom: 20 }}>
          <p className="eyebrow">EXTENDED LEARNING ROUTES</p>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>扩展研究路线</h2>
          {learningTracks.map((track) => {
            const targets = track.targets.filter((id) => byId[id]);
            return (
              <details
                key={track.id}
                style={{ borderTop: "1px solid #314455", padding: "16px 0" }}
              >
                <summary style={{ cursor: "pointer", color: "#a5cddd" }}>
                  {track.name} ·{" "}
                  {targets.filter((id) => id in save.discovered).length}/
                  {targets.length}
                </summary>
                <p
                  className="muted"
                  style={{ fontSize: 12, lineHeight: 1.9, marginTop: 12 }}
                >
                  {track.description}
                </p>
                <div className="era-targets">
                  {targets.map((id) => (
                    <span
                      className={id in save.discovered ? "done" : ""}
                      key={id}
                    >
                      <SubstanceIcon s={byId[id]} size={30} />
                      {byId[id].name}
                      {id in save.discovered && <Check size={13} />}
                    </span>
                  ))}
                </div>
              </details>
            );
          })}
        </section>
        <div className="future-era">
          <Atom />
          <div>
            <h3>现代科技时代</h3>
            <p>半导体、电池与高分子材料 · 后续版本</p>
          </div>
          <span>COMING NEXT</span>
        </div>
      </div>
    </div>
  );
}
