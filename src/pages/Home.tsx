import {
  ArrowRight,
  Building2,
  ChevronRight,
  Coins,
  Compass,
  Cpu,
  Factory,
  FlaskConical,
  Landmark,
  Lock,
  Network,
  Plus,
  Scale,
  ScrollText,
  Sparkles,
  Target,
} from "lucide-react";
import type { Substance } from "../types";
import type { Page } from "../types/navigation";
import {
  byId,
  challenges,
  economyConfig,
  eras,
  historyChapters,
  labLevels,
  museumItems,
  orderById,
  quantitativeChallenges,
  reactions,
  specialChallenges,
  substances,
  techById,
  technologies,
} from "../data";
import { GAME_MODES } from "../config/modes";
import { useGame } from "../stores/game";
import { currentEra } from "../engine/achievementEngine";
import { getResearchLevelStatus } from "../engine/progressionEngine";
import { getTechUnlockStatus } from "../engine/technologyEngine";
import { SubstanceIcon } from "../components/SubstanceIcon";
import { Formula } from "../components/Shared";

export default function Home({
  count,
  go,
  setDetail,
}: {
  count: number;
  go: (p: Page) => void;
  setDetail: (s: Substance) => void;
}) {
  const game = useGame();
  const save = game.save;
  const quantSolved = Object.keys(save.quantitativeChallengeBest).length;
  const specialSolved = Object.keys(save.specialChallengeBest).length;
  const historyDone = historyChapters.filter(
    (c) => c.playable && save.historyProgress[c.id]?.completed,
  ).length;
  const museumCount = Object.keys(save.museumUnlocked).length;
  const era = eras[currentEra(save)];
  const levelInfo = getResearchLevelStatus(save.experience, economyConfig);
  const currentLab =
    labLevels.find((l) => l.level === save.labLevel) ?? labLevels[0];

  // Real save-driven mission board recommendations (never fake static tasks)
  const nextOrder = save.activeOrderIds
    .map((id) => orderById[id])
    .find(Boolean);
  const nextHistory = historyChapters.find(
    (c) => c.playable && !save.historyProgress[c.id]?.completed,
  );
  const nextTech = technologies.find(
    (t) => getTechUnlockStatus(save, t, techById).status === "available",
  );
  const forestGathers = save.regionProgress.forest?.gatherCount ?? 0;

  return (
    <div className="home page-width">
      {/* Live Researcher Lobby Status HUD */}
      <section className="lobby-hud" aria-label="研究者状态栏">
        <div className="hud-identity">
          <span
            className="level-badge"
            style={{ borderColor: levelInfo.current.badgeColor }}
          >
            LV.{levelInfo.current.level}
          </span>
          <div>
            <strong>{levelInfo.current.title}</strong>
            <div className="xp-bar-row">
              <div className="xp-bar">
                <i
                  style={{
                    width: `${levelInfo.progressPercent}%`,
                    background: levelInfo.current.badgeColor,
                  }}
                />
              </div>
              <small>
                {levelInfo.next
                  ? `${save.experience} / ${levelInfo.next.minExperience} XP`
                  : `${save.experience} XP · MAX`}
              </small>
            </div>
          </div>
        </div>
        <div className="hud-metrics">
          <button className="hud-pill" onClick={() => go("management")}>
            <Building2 size={14} />
            <span>
              Lv.{save.labLevel} {currentLab.name}
            </span>
          </button>
          <button className="hud-pill gold" onClick={() => go("management")}>
            <Coins size={14} />
            <strong>{save.coins}</strong>
            <small>金币</small>
          </button>
          <button className="hud-pill cyan" onClick={() => go("tech")}>
            <Sparkles size={14} />
            <strong>{save.researchPoints}</strong>
            <small>RP</small>
          </button>
          <button className="hud-pill" onClick={() => go("museum")}>
            <Landmark size={14} />
            <strong>
              {museumCount}/{museumItems.length}
            </strong>
            <small>馆藏</small>
          </button>
          <button className="hud-pill" onClick={() => go("eras")}>
            <span>{era.name}</span>
          </button>
        </div>
      </section>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" /> SCIENTIFIC STRATEGY SANDBOX · V1.6
          </p>
          <h1>
            从一滴水，
            <br />到<span>万物的可能。</span>
          </h1>
          <p className="hero-description">
            探索 129 种物质与 134
            条反应规则，经营你的化学实验室，重返改变人类认知的科学史现场，在世界地图中勘探元素与矿物来源。
          </p>
          <div className="hero-buttons">
            <button className="primary" onClick={() => go("lab")}>
              <FlaskConical size={18} />
              进入实验室
              <ArrowRight size={18} />
            </button>
            <button className="secondary" onClick={() => go("management")}>
              <Building2 size={17} />
              实验室经营
            </button>
            <button className="text-button" onClick={() => go("book")}>
              翻开我的图鉴
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="hero-stats">
            <div>
              <strong>
                {String(count).padStart(2, "0")}
                <small> / {substances.length}</small>
              </strong>
              <span>已发现物质</span>
            </div>
            <div>
              <strong>
                {String(save.completed.length).padStart(2, "0")}
                <small> / {reactions.length}</small>
              </strong>
              <span>已完成反应</span>
            </div>
            <div>
              <strong>
                {save.unlockedTechIds.length}
                <small> / {technologies.length}</small>
              </strong>
              <span>已研究科技</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="orbital orbit-one" />
          <div className="orbital orbit-two" />
          <span className="orbit-label label-one">
            H₂O<span>一切从这里开始</span>
          </span>
          <span className="orbit-label label-two">
            2H₂ + O₂<span>定量与经营</span>
          </span>
          <div className="hero-particle p1" />
          <div className="hero-particle p2" />
          <div className="hero-particle p3" />
          <svg className="hero-flask" viewBox="0 0 340 380" aria-hidden="true">
            <defs>
              <linearGradient id="flaskGlass" x1="0" x2="1">
                <stop stopColor="#b0e5fa" stopOpacity=".24" />
                <stop offset=".5" stopColor="#8bcce9" stopOpacity=".03" />
                <stop offset="1" stopColor="#9edff7" stopOpacity=".25" />
              </linearGradient>
              <linearGradient id="flaskWater" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#83cde9" stopOpacity=".82" />
                <stop offset="1" stopColor="#286283" stopOpacity=".78" />
              </linearGradient>
            </defs>
            <ellipse
              cx="170"
              cy="347"
              rx="119"
              ry="16"
              fill="#70c4e5"
              opacity=".08"
            />
            <path
              d="M132 40v99L55 285q-20 45 28 45h174q48 0 28-45l-77-146V40"
              fill="url(#flaskGlass)"
              stroke="#9dd3e8"
              strokeOpacity=".6"
              strokeWidth="2"
            />
            <path
              d="M95 226q40-20 76 0t74 0l38 63q12 35-27 35H84q-39 0-27-35z"
              fill="url(#flaskWater)"
            />
            <ellipse
              cx="170"
              cy="40"
              rx="42"
              ry="10"
              fill="#203444"
              stroke="#9dd3e8"
              strokeOpacity=".65"
              strokeWidth="2"
            />
            <path
              d="M139 59v80L75 269"
              stroke="white"
              strokeOpacity=".2"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="147" cy="266" r="10" fill="#a2e5fa" opacity=".35" />
            <circle cx="188" cy="287" r="6" fill="#a2e5fa" opacity=".5" />
            <circle cx="176" cy="215" r="5" fill="#a2e5fa" opacity=".35" />
          </svg>
          <div className="visual-caption">
            <span className="status-dot" />
            实验室已就绪<span>LAB 1.6</span>
          </div>
        </div>
      </section>

      {/* 6 Core Game Mode Portal Cards (Cleanly separated from Difficulty Mode) */}
      <section className="lobby-modes" aria-label="六大玩法模式">
        <div className="section-heading">
          <h2>
            玩法模式入口 <span>GAME MODES</span>
          </h2>
          <span className="muted">
            玩法入口与实验难度解耦：自由探索与实验室经营严格区分库存边界
          </span>
        </div>
        <div className="six-mode-grid">
          <button className="portal-card cyan" onClick={() => go("lab")}>
            <div className="portal-top">
              <FlaskConical size={22} />
              <span className="tag-pill">无限实验台</span>
            </div>
            <h3>自由探索</h3>
            <p>组合 129 种物质、自由切换简单/进阶定量模式与方程式配平。</p>
            <span className="portal-meta">
              已发现 {count}/{substances.length} · 全部条件开放 →
            </span>
          </button>

          <button
            className="portal-card emerald"
            onClick={() => go("management")}
          >
            <div className="portal-top">
              <Building2 size={22} />
              <span className="tag-pill">Lv.{save.labLevel} 经营</span>
            </div>
            <h3>实验室经营</h3>
            <p>
              有限库存生产、30 项研究订单、8 台设备工坊与 2D 等距实验台升级。
            </p>
            <span className="portal-meta">
              已交付 {save.completedOrderIds.length} 单 · 设备{" "}
              {Object.keys(save.equipmentLevels).length}/8 →
            </span>
          </button>

          <button className="portal-card amber" onClick={() => go("challenge")}>
            <div className="portal-top">
              <Target size={22} />
              <span className="tag-pill">87 道关卡</span>
            </div>
            <h3>目标挑战</h3>
            <p>
              {challenges.length} 简单 + {quantitativeChallenges.length} 定量 +{" "}
              {specialChallenges.length} 特殊推理挑战。
            </p>
            <span className="portal-meta">
              已完成{" "}
              {Object.keys(save.challengeBest).length +
                quantSolved +
                specialSolved}{" "}
              关 →
            </span>
          </button>

          <button className="portal-card copper" onClick={() => go("history")}>
            <div className="portal-top">
              <ScrollText size={22} />
              <span className="tag-pill">5 章可玩 / 10 章时间线</span>
            </div>
            <h3>挑战历史</h3>
            <p>
              氧气发现、质量守恒、水的组成、伏打电堆与门捷列夫周期表 5
              大独立谜题。
            </p>
            <span className="portal-meta">
              已通关 {historyDone}/5 章 · 解锁博物馆展品 →
            </span>
          </button>

          <button className="portal-card sky" onClick={() => go("world")}>
            <div className="portal-top">
              <Compass size={22} />
              <span className="tag-pill">2D 区域地图</span>
            </div>
            <h3>世界探索</h3>
            <p>
              原始森林免费采集、矿石山脉与海洋盐湖资源节点、区域任务与野外奇遇。
            </p>
            <span className="portal-meta">
              已解锁 {save.unlockedRegionIds.length}/3 可玩区域 →
            </span>
          </button>

          <button className="portal-card locked" disabled>
            <div className="portal-top">
              <Factory size={22} />
              <span className="tag-pill">
                <Lock size={11} /> V1.7 锁定
              </span>
            </div>
            <h3>工业文明</h3>
            <p>连续化工产线、能源管网与自动化反应单元（已预留底层接口）。</p>
            <span className="portal-meta">V1.7 / V2.0 即将推出</span>
          </button>
        </div>
      </section>

      {/* Real Save-Driven Mission Board */}
      <section className="panel mission-board" aria-label="实时研究任务板">
        <div className="section-heading">
          <h2>
            当前研究任务板 <span>LIVE MISSION BOARD</span>
          </h2>
          <span className="muted">全部由你的真实存档状态实时驱动</span>
        </div>
        <div className="mission-grid">
          <button className="mission-item" onClick={() => go("management")}>
            <span className="eyebrow">活跃研究订单</span>
            <strong>{nextOrder ? nextOrder.title : "当前订单已清空"}</strong>
            <p className="muted">
              {nextOrder
                ? `${nextOrder.client} · 奖励 +${nextOrder.reward.coins} 金币 / +${nextOrder.reward.researchPoints} RP`
                : "前往实验室经营查看新委托"}
            </p>
          </button>
          <button className="mission-item" onClick={() => go("history")}>
            <span className="eyebrow">推荐科学史章节</span>
            <strong>
              {nextHistory ? nextHistory.title : "全部 5 个可玩章节已通关！"}
            </strong>
            <p className="muted">
              {nextHistory
                ? `${nextHistory.eraYear} · 首通奖励 +${nextHistory.firstReward.researchPoints} RP`
                : "可重复挑战进阶模式冲击满星"}
            </p>
          </button>
          <button className="mission-item" onClick={() => go("tech")}>
            <span className="eyebrow">下一项可研究科技</span>
            <strong>{nextTech ? nextTech.name : "积攒研究点解锁新分支"}</strong>
            <p className="muted">
              {nextTech
                ? `消耗 ${nextTech.costRP} RP · ${nextTech.unlocks.bonusNote ?? nextTech.description}`
                : `当前持有 ${save.researchPoints} RP · 已研究 ${save.unlockedTechIds.length}/${technologies.length}`}
            </p>
          </button>
          <button className="mission-item" onClick={() => go("world")}>
            <span className="eyebrow">野外探索进度</span>
            <strong>
              {forestGathers < 3
                ? `原始森林采样（${forestGathers}/3）`
                : "继续勘探矿石山脉与盐湖"}
            </strong>
            <p className="muted">
              原始森林含永久免费采集点，随时零成本补充水、木炭与基础原料。
            </p>
          </button>
        </div>
      </section>

      {/* Difficulty Selection Section (Preserves exact V1.5 controls & selectors) */}
      <section className="mode-section" aria-label="游戏难度选择">
        <div className="section-heading">
          <h2>
            实验难度与化学模型 <span>DIFFICULTY MODES</span>
          </h2>
          <span className="mode-gate-note">
            开发预览可用定量规则：
            {reactions.filter((r) => r.stoichiometrySupported).length} /
            {reactions.length}（开发预览）
          </span>
        </div>
        <div className="mode-grid">
          {GAME_MODES.map((m) => {
            const active = save.currentMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={m.locked}
                className={`mode-card ${active ? "active" : ""} ${m.locked ? "locked" : ""}`}
                onClick={() => {
                  if (m.id === "simple" || m.id === "advanced") {
                    game.setMode(m.id);
                    go("lab");
                  }
                }}
              >
                <div className="mode-card-top">
                  <span className="mode-kicker">{m.en}</span>
                  <span className="mode-pill">
                    {m.locked ? (
                      <Lock size={11} />
                    ) : m.id === "advanced" ? (
                      <Scale size={11} />
                    ) : (
                      <Sparkles size={11} />
                    )}
                    {m.badge}
                  </span>
                </div>
                <h3>{m.name}</h3>
                <p>{m.tagline}</p>
                <span className="mode-action">
                  {m.locked
                    ? "V2.0 锁定预告"
                    : active
                      ? "当前模式 · 进入实验台 →"
                      : `切换至${m.name} →`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick Knowledge & Archive Shortcuts */}
      <div className="home-cards">
        <button className="feature-card" onClick={() => go("tech")}>
          <span className="feature-icon amber">
            <Cpu />
          </span>
          <div>
            <span className="card-kicker">TECH TREE · DAG</span>
            <h3>科技研究树</h3>
            <p>
              6 大分支 {technologies.length}{" "}
              项无环科技，解锁设备、区域与实验室升级。
            </p>
          </div>
          <ArrowRight size={19} />
          <span className="card-bottom">
            已研究 {save.unlockedTechIds.length}/{technologies.length}
            <span>展开科技树 →</span>
          </span>
        </button>
        <button className="feature-card" onClick={() => go("tree")}>
          <span className="feature-icon blue">
            <Network />
          </span>
          <div>
            <span className="card-kicker">DISCOVERY NETWORK</span>
            <h3>科学发现网络</h3>
            <p>独立于科技树的物质合成图谱，查看配比与反应节点关联。</p>
          </div>
          <ArrowRight size={19} />
          <span className="card-bottom">
            研究等级与反应比率<span>探索网络 →</span>
          </span>
        </button>
        <button className="feature-card" onClick={() => go("museum")}>
          <span className="feature-icon green">
            <Landmark />
          </span>
          <div>
            <span className="card-kicker">SCIENCE MUSEUM</span>
            <h3>科学博物馆</h3>
            <p>
              点亮 {museumItems.length}{" "}
              件科学史里程碑、仪器标本与实验室荣誉藏品。
            </p>
          </div>
          <ArrowRight size={19} />
          <span className="card-bottom">
            已点亮 {museumCount}/{museumItems.length} 件<span>进入展厅 →</span>
          </span>
        </button>
      </div>

      <section className="recent-section">
        <div className="section-heading">
          <h2>
            你的物质收藏 <span>MY COLLECTION</span>
          </h2>
          <button className="text-button" onClick={() => go("book")}>
            全部图鉴 <ArrowRight size={15} />
          </button>
        </div>
        <div className="home-substances">
          {Object.keys(save.discovered)
            .slice(-8)
            .map((id) => (
              <button key={id} onClick={() => setDetail(byId[id])}>
                <SubstanceIcon s={byId[id]} />
                <span>{byId[id].name}</span>
                <Formula value={byId[id].formula} />
              </button>
            ))}
          <button className="discover-more" onClick={() => go("lab")}>
            <Plus size={28} />
            <span>下一个发现</span>
            <small>会是什么？</small>
          </button>
        </div>
      </section>
    </div>
  );
}
