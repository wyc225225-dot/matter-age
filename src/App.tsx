import { useEffect, useState, Suspense, lazy } from "react";
import {
  Atom,
  BookOpen,
  Building2,
  Check,
  Coins,
  Compass,
  Cpu,
  FlaskConical,
  Home as HomeIcon,
  Landmark,
  Menu,
  Network,
  Plus,
  ScrollText,
  Settings,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useGame } from "./stores/game";
import { useViewport } from "./hooks/useViewport";
import { substances } from "./data";
import { SubstanceIcon } from "./components/SubstanceIcon";
import type { Substance } from "./types";
import type { Page } from "./types/navigation";
import Home from "./pages/Home";
import Laboratory from "./pages/Laboratory";
import Management from "./pages/Management";
import Technology from "./pages/Technology";
import WorldMap from "./pages/WorldMap";
import History from "./pages/History";
import Museum from "./pages/Museum";
import Encyclopedia from "./pages/Encyclopedia";
import SettingsPage from "./pages/SettingsPage";
import Challenges from "./pages/Challenges";
import Civilizations from "./pages/Civilizations";
import Achievements from "./pages/Achievements";
import Detail from "./components/Detail";

const DiscoveryTree = lazy(() => import("./pages/DiscoveryTree"));

const VALID_PAGES = new Set<Page>([
  "home",
  "lab",
  "management",
  "challenge",
  "history",
  "world",
  "book",
  "tech",
  "tree",
  "museum",
  "eras",
  "achievements",
  "settings",
]);

function parseHashState(): { page: Page; chapterId: string | null } {
  const raw = location.hash.slice(1);
  if (raw.startsWith("history/")) {
    const cid = raw.slice("history/".length).trim() || null;
    return { page: "history", chapterId: cid };
  }
  const p = raw as Page;
  return { page: VALID_PAGES.has(p) ? p : "home", chapterId: null };
}

const desktopPrimaryNav: { id: Page; name: string; icon: typeof Atom }[] = [
  { id: "home", name: "探索大厅", icon: HomeIcon },
  { id: "lab", name: "自由探索", icon: FlaskConical },
  { id: "management", name: "实验室经营", icon: Building2 },
  { id: "challenge", name: "目标挑战", icon: Target },
  { id: "history", name: "挑战历史", icon: ScrollText },
  { id: "world", name: "世界探索", icon: Compass },
  { id: "book", name: "物质图鉴", icon: BookOpen },
  { id: "tree", name: "发现网络", icon: Network },
];

type PrimaryPillar = "home" | "experiment" | "manage" | "archive" | "more";

const domainSubNav: Record<
  Exclude<PrimaryPillar, "home">,
  { id: Page; name: string; icon: typeof Atom }[]
> = {
  experiment: [
    { id: "lab", name: "自由实验", icon: FlaskConical },
    { id: "challenge", name: "目标挑战", icon: Target },
    { id: "history", name: "挑战历史", icon: ScrollText },
  ],
  manage: [
    { id: "management", name: "实验室经营", icon: Building2 },
    { id: "tech", name: "科技研究", icon: Cpu },
    { id: "world", name: "世界探索", icon: Compass },
  ],
  archive: [
    { id: "book", name: "物质图鉴", icon: BookOpen },
    { id: "tree", name: "发现网络", icon: Network },
    { id: "museum", name: "科学博物馆", icon: Landmark },
  ],
  more: [
    { id: "eras", name: "科技演进", icon: Sparkles },
    { id: "achievements", name: "探索成就", icon: Trophy },
    { id: "settings", name: "实验室设置", icon: Settings },
  ],
};

function getPrimaryPillar(p: Page): PrimaryPillar {
  if (p === "home") return "home";
  if (p === "lab" || p === "challenge" || p === "history") return "experiment";
  if (p === "management" || p === "tech" || p === "world") return "manage";
  if (p === "book" || p === "tree" || p === "museum") return "archive";
  return "more";
}

const archiveDrawerItems: {
  id: Page;
  name: string;
  desc: string;
  group: "里程碑与系统" | "玩法快捷直达";
  icon: typeof Atom;
}[] = [
  {
    id: "eras",
    name: "科技演进",
    desc: "四大化学文明时代与研究路线",
    group: "里程碑与系统",
    icon: Sparkles,
  },
  {
    id: "achievements",
    name: "探索成就",
    desc: "34 项科学成就与幂等奖励",
    group: "里程碑与系统",
    icon: Trophy,
  },
  {
    id: "settings",
    name: "实验室设置",
    desc: "音效动画、存档导入导出 v3",
    group: "里程碑与系统",
    icon: Settings,
  },
  {
    id: "history",
    name: "挑战历史",
    desc: "实验域 · 10 章时间线（5 章可玩）",
    group: "玩法快捷直达",
    icon: ScrollText,
  },
  {
    id: "world",
    name: "世界探索",
    desc: "经营域 · 2D 区域地图与采集",
    group: "玩法快捷直达",
    icon: Compass,
  },
  {
    id: "tech",
    name: "科技研究",
    desc: "经营域 · 24 项无环科技树",
    group: "玩法快捷直达",
    icon: Cpu,
  },
  {
    id: "museum",
    name: "科学博物馆",
    desc: "图鉴域 · 16 件成就里程碑馆藏",
    group: "玩法快捷直达",
    icon: Landmark,
  },
];

export default function App() {
  const game = useGame();
  const vp = useViewport();
  const [page, setPage] = useState<Page>(() => parseHashState().page);
  const [deepHistoryId, setDeepHistoryId] = useState<string | null>(
    () => parseHashState().chapterId,
  );
  const [detail, setDetail] = useState<Substance | null>(null);
  const [supply, setSupply] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    void useGame.getState().init();
    const fn = () => {
      const parsed = parseHashState();
      setPage(parsed.page);
      setDeepHistoryId(parsed.chapterId);
    };
    addEventListener("hashchange", fn);
    return () => removeEventListener("hashchange", fn);
  }, []);

  useEffect(() => {
    if (!drawerOpen && !supply) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (supply) setSupply(false);
        else if (drawerOpen) setDrawerOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen, supply]);

  useEffect(() => {
    if (!vp.isMobile && drawerOpen) setDrawerOpen(false);
  }, [vp.isMobile, drawerOpen]);

  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4200);
      return () => clearTimeout(id);
    }
  }, [toast]);

  function go(p: Page) {
    location.hash = p;
    setPage(p);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }

  const count = Object.keys(game.save.discovered).length;
  const activePillar = getPrimaryPillar(page);
  const subNavItems =
    activePillar === "home" ? null : domainSubNav[activePillar];
  const hideSubNavInActiveHistory =
    page === "history" && Boolean(game.save.activeHistoryChapterId);

  if (!game.ready)
    return (
      <div className="loading">
        <Atom size={46} />
        <p>正在打开实验室…</p>
      </div>
    );

  return (
    <div
      className={`app ${game.save.settings.motion ? "" : "reduce-motion"}`}
      data-viewport={vp.mode}
      data-page={page}
    >
      <header className="topbar">
        <button className="brand" onClick={() => go("home")}>
          <span className="brand-mark">
            <Atom size={26} />
          </span>
          <span>
            物质纪元<small>MATTER AGE</small>
          </span>
        </button>

        {vp.isMobileLandscape && subNavItems && !hideSubNavInActiveHistory && (
          <nav
            className="domain-subnav inline-landscape-subnav mobile-scroll-strip"
            aria-label="二级模式导航"
          >
            {subNavItems.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={page === item.id ? "page" : undefined}
                className={page === item.id ? "active" : ""}
                onClick={() => go(item.id)}
              >
                <item.icon size={13} />
                <span>{item.name}</span>
              </button>
            ))}
          </nav>
        )}

        <nav className="desktop-nav" aria-label="主导航">
          {desktopPrimaryNav.map((p) => (
            <button
              key={p.id}
              onClick={() => go(p.id)}
              className={page === p.id ? "active" : ""}
            >
              <p.icon size={15} />
              <span>{p.name}</span>
            </button>
          ))}
        </nav>

        <div className="top-actions">
          <button
            className="top-hud-chip"
            onClick={() => go("management")}
            title="实验室经营金币"
          >
            <Coins size={13} />
            <span>{game.save.coins}</span>
          </button>
          <button
            className="top-hud-chip cyan"
            onClick={() => go("tech")}
            title="科技研究树与研究点"
          >
            <Cpu size={13} />
            <span>{game.save.researchPoints} RP</span>
          </button>
          <button
            className={`icon-button ${page === "museum" ? "active" : ""}`}
            aria-label="科学博物馆"
            title="科学博物馆"
            onClick={() => go("museum")}
          >
            <Landmark size={18} />
          </button>
          <button
            className={`icon-button ${page === "achievements" ? "active" : ""}`}
            aria-label="成就"
            title="探索成就"
            onClick={() => go("achievements")}
          >
            <Trophy size={18} />
          </button>
          <button
            className={`icon-button ${page === "settings" ? "active" : ""}`}
            aria-label="设置"
            title="实验室设置"
            onClick={() => go("settings")}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <div className="preview-bar">
        <span className="status-dot" />
        开发预览（V1.6）· 化学与科学史内容待逐条审核（pending） · 当前实验模式：
        {game.save.currentMode === "advanced" ? "进阶定量模式" : "简单探索模式"}
        <span className="offline-label">
          Lv.{game.save.labLevel} 实验室 · 自动保存 v{game.save.version}
        </span>
      </div>

      {vp.isMobilePortrait && subNavItems && !hideSubNavInActiveHistory && (
        <nav
          className="domain-subnav portrait-domain-subnav mobile-scroll-strip"
          aria-label="二级模式导航"
        >
          {subNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={page === item.id ? "page" : undefined}
              className={page === item.id ? "active" : ""}
              onClick={() => go(item.id)}
            >
              <item.icon size={14} />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      )}

      {game.error && (
        <div role="alert" className="error-banner">
          {game.error}
        </div>
      )}

      <main>
        {page === "home" ? (
          <Home count={count} go={go} setDetail={setDetail} />
        ) : page === "lab" ? (
          <Laboratory
            setDetail={setDetail}
            setSupply={setSupply}
            toast={setToast}
          />
        ) : page === "management" ? (
          <Management go={go} toast={setToast} />
        ) : page === "tech" ? (
          <Technology toast={setToast} />
        ) : page === "world" ? (
          <WorldMap toast={setToast} />
        ) : page === "history" ? (
          <History go={go} toast={setToast} deepChapterId={deepHistoryId} />
        ) : page === "museum" ? (
          <Museum />
        ) : page === "book" ? (
          <Encyclopedia setDetail={setDetail} />
        ) : page === "settings" ? (
          <SettingsPage toast={setToast} />
        ) : page === "tree" ? (
          <Suspense fallback={<div className="empty">正在加载发现网络…</div>}>
            <DiscoveryTree setDetail={setDetail} />
          </Suspense>
        ) : page === "challenge" ? (
          <Challenges go={go} toast={setToast} />
        ) : page === "eras" ? (
          <Civilizations />
        ) : page === "achievements" ? (
          <Achievements toast={setToast} />
        ) : (
          <Home count={count} go={go} setDetail={setDetail} />
        )}
      </main>

      <footer>
        <span>
          <Atom size={13} /> MATTER AGE <i>/</i> 好奇心，让世界发生反应。
        </span>
        <span>V1.6 开发预览 · 探索 / 经营 / 科学史 / 世界地图 · 本地离线</span>
      </footer>

      {/* Mobile Bottom Navigation Bar / Landscape Left Rail (5 stable L1 player goals) */}
      <nav className="mobile-bottom-nav" aria-label="移动端主导航">
        <button
          className={activePillar === "home" && !drawerOpen ? "active" : ""}
          aria-current={activePillar === "home" ? "page" : undefined}
          onClick={() => go("home")}
        >
          <HomeIcon size={18} />
          <span>大厅</span>
        </button>
        <button
          className={
            activePillar === "experiment" && !drawerOpen ? "active" : ""
          }
          aria-current={activePillar === "experiment" ? "page" : undefined}
          onClick={() => go("lab")}
        >
          <FlaskConical size={18} />
          <span>实验</span>
        </button>
        <button
          className={activePillar === "manage" && !drawerOpen ? "active" : ""}
          aria-current={activePillar === "manage" ? "page" : undefined}
          onClick={() => go("management")}
        >
          <Building2 size={18} />
          <span>经营</span>
        </button>
        <button
          className={activePillar === "archive" && !drawerOpen ? "active" : ""}
          aria-current={activePillar === "archive" ? "page" : undefined}
          onClick={() => go("book")}
        >
          <BookOpen size={18} />
          <span>图鉴</span>
        </button>
        <button
          className={drawerOpen || activePillar === "more" ? "active" : ""}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <Menu size={18} />
          <span>更多</span>
        </button>
      </nav>

      {/* Mobile / Archive Drawer */}
      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <section
            className="mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="更多功能与档案导航"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-head">
              <strong>更多功能与模式直达</strong>
              <button
                className="icon-button"
                aria-label="关闭导航抽屉"
                onClick={() => setDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            {(["里程碑与系统", "玩法快捷直达"] as const).map((group) => (
              <div className="drawer-group" key={group}>
                <p className="drawer-group-label">{group}</p>
                <div className="drawer-grid">
                  {archiveDrawerItems
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <button
                        key={item.id}
                        className={`drawer-item ${page === item.id ? "active" : ""}`}
                        onClick={() => go(item.id)}
                      >
                        <item.icon size={18} />
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.desc}</small>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {detail && (
        <Detail
          s={detail}
          close={() => setDetail(null)}
          onSelect={(next) => setDetail(next)}
        />
      )}

      {supply && (
        <div className="modal-backdrop" onClick={() => setSupply(false)}>
          <section
            className="modal wide"
            role="dialog"
            aria-modal="true"
            aria-label="标本补给"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close icon-button"
              aria-label="关闭补给"
              onClick={() => setSupply(false)}
            >
              <X />
            </button>
            <p className="eyebrow">SPECIMEN COLLECTION</p>
            <h2>实验室标本补给（自由探索）</h2>
            <p className="muted">
              有些原料需要来自实验室，而不是凭空合成。领取仅解锁自由探索标本，不会直接增加实验室经营模式的有限库存。
            </p>
            <div className="supply-grid">
              {substances
                .filter((s) => s.supply)
                .map((s) => (
                  <button
                    disabled={s.id in game.save.discovered}
                    key={s.id}
                    onClick={() => game.collect(s.id)}
                  >
                    <SubstanceIcon s={s} size={36} />
                    <span>
                      {s.name}
                      <small>
                        {s.id in game.save.discovered ? "已收集" : "领取标本"}
                      </small>
                    </span>
                    {s.id in game.save.discovered ? (
                      <Check size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                  </button>
                ))}
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
