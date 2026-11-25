import { useCallback, useEffect, useState, Suspense, lazy } from "react";
import {
  Atom,
  BookOpen,
  Building2,
  Check,
  ChevronLeft,
  Coins,
  Compass,
  Cpu,
  FlaskConical,
  Home as HomeIcon,
  Landmark,
  Network,
  Plus,
  ScrollText,
  Settings,
  Target,
  Trophy,
  Wrench,
  ClipboardList,
  BookMarked,
  X,
} from "lucide-react";
import { useGame } from "./stores/game";
import { useViewport } from "./hooks/useViewport";
import { substances } from "./data";
import { SubstanceIcon } from "./components/SubstanceIcon";
import type { Substance } from "./types";
import type {
  BookSubMode,
  ManagementTab,
  MobileDetailBar,
  Page,
} from "./types/navigation";
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

type PrimaryPillar = "home" | "experiment" | "manage" | "archive";

function getPrimaryPillar(p: Page): PrimaryPillar {
  if (p === "lab" || p === "challenge" || p === "history") return "experiment";
  if (p === "management" || p === "tech" || p === "world") return "manage";
  if (p === "book" || p === "tree" || p === "museum") return "archive";
  return "home";
}

const pageReturnLabels: Record<Page, string> = {
  home: "大厅",
  lab: "自由实验",
  management: "经营",
  challenge: "关卡挑战",
  history: "挑战历史",
  world: "野外采集",
  book: "图鉴",
  tech: "科技",
  tree: "发现网络",
  museum: "博物馆",
  eras: "大厅",
  achievements: "大厅",
  settings: "大厅",
};

export default function App() {
  const game = useGame();
  const vp = useViewport();
  const [page, setPage] = useState<Page>(() => parseHashState().page);
  const [returnPage, setReturnPage] = useState<Page>("home");
  const [deepHistoryId, setDeepHistoryId] = useState<string | null>(
    () => parseHashState().chapterId,
  );
  const [mgmtTab, setMgmtTab] = useState<ManagementTab>("orders");
  const [bookMode, setBookMode] = useState<BookSubMode>("collection");
  const [detail, setDetail] = useState<Substance | null>(null);
  const [pageDetailBar, setPageDetailBar] = useState<MobileDetailBar | null>(
    null,
  );
  const [supply, setSupply] = useState(false);
  const [supplyQuery, setSupplyQuery] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    void useGame.getState().init();
    const fn = () => {
      const parsed = parseHashState();
      setPage(parsed.page);
      setDeepHistoryId(parsed.chapterId);
      setPageDetailBar(null);
    };
    addEventListener("hashchange", fn);
    return () => removeEventListener("hashchange", fn);
  }, []);

  useEffect(() => {
    if (!supply) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSupply(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [supply]);

  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4200);
      return () => clearTimeout(id);
    }
  }, [toast]);

  const go = useCallback(
    (p: Page) => {
      if (p === "settings" && page !== "settings") {
        setReturnPage(page);
      } else if (
        (p === "achievements" || p === "eras") &&
        page !== "achievements" &&
        page !== "eras"
      ) {
        setReturnPage(page);
      }
      setPageDetailBar(null);
      if (location.hash !== `#${p}`) {
        location.hash = p;
      }
      setPage(p);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    },
    [page],
  );

  const count = Object.keys(game.save.discovered).length;
  const activePillar = getPrimaryPillar(page);
  const isUtilityL3Page =
    page === "settings" || page === "achievements" || page === "eras";
  const isActiveHistoryChapter =
    page === "history" && Boolean(game.save.activeHistoryChapterId);

  const activeMobileBack: MobileDetailBar | null = vp.isMobile
    ? pageDetailBar
      ? pageDetailBar
      : page === "settings"
        ? {
            parentLabel: pageReturnLabels[returnPage] ?? "大厅",
            title: "设置",
            onBack: () => go(returnPage),
          }
        : page === "achievements" || page === "eras"
          ? {
              parentLabel: "大厅",
              title: "成就与成长",
              onBack: () => go("home"),
            }
          : null
    : null;

  const inDetailMode =
    vp.isMobile &&
    (Boolean(pageDetailBar) ||
      isUtilityL3Page ||
      isActiveHistoryChapter ||
      Boolean(detail));

  const showL2Subnav =
    vp.isMobile &&
    !inDetailMode &&
    activePillar !== "home" &&
    !isActiveHistoryChapter;

  const renderL2SubnavButtons = () => {
    if (activePillar === "experiment") {
      return (
        <>
          <button
            type="button"
            aria-current={page === "lab" ? "page" : undefined}
            className={page === "lab" ? "active" : ""}
            onClick={() => go("lab")}
          >
            <FlaskConical size={13} />
            <span>自由实验</span>
          </button>
          <button
            type="button"
            aria-current={page === "challenge" ? "page" : undefined}
            className={page === "challenge" ? "active" : ""}
            onClick={() => go("challenge")}
          >
            <Target size={13} />
            <span>关卡挑战</span>
          </button>
          <button
            type="button"
            aria-current={page === "history" ? "page" : undefined}
            className={page === "history" ? "active" : ""}
            onClick={() => go("history")}
          >
            <ScrollText size={13} />
            <span>挑战历史</span>
          </button>
        </>
      );
    }

    if (activePillar === "manage") {
      return (
        <>
          <button
            type="button"
            aria-current={
              page === "management" && mgmtTab === "produce"
                ? "page"
                : undefined
            }
            className={
              page === "management" && mgmtTab === "produce" ? "active" : ""
            }
            onClick={() => {
              setMgmtTab("produce");
              go("management");
            }}
          >
            <FlaskConical size={13} />
            <span>生产</span>
          </button>
          <button
            type="button"
            aria-current={
              page === "management" && mgmtTab === "orders" ? "page" : undefined
            }
            className={
              page === "management" && mgmtTab === "orders" ? "active" : ""
            }
            onClick={() => {
              setMgmtTab("orders");
              go("management");
            }}
          >
            <ClipboardList size={13} />
            <span>订单</span>
          </button>
          <button
            type="button"
            aria-current={
              page === "management" && mgmtTab === "equipment"
                ? "page"
                : undefined
            }
            className={
              page === "management" && mgmtTab === "equipment" ? "active" : ""
            }
            onClick={() => {
              setMgmtTab("equipment");
              go("management");
            }}
          >
            <Wrench size={13} />
            <span>设备</span>
          </button>
          <button
            type="button"
            aria-current={page === "world" ? "page" : undefined}
            className={page === "world" ? "active" : ""}
            onClick={() => go("world")}
          >
            <Compass size={13} />
            <span>野外采集</span>
          </button>
          <button
            type="button"
            aria-current={page === "tech" ? "page" : undefined}
            className={page === "tech" ? "active" : ""}
            onClick={() => go("tech")}
          >
            <Cpu size={13} />
            <span>科技</span>
          </button>
        </>
      );
    }

    if (activePillar === "archive") {
      return (
        <>
          <button
            type="button"
            aria-current={
              page === "book" && bookMode === "collection" ? "page" : undefined
            }
            className={
              page === "book" && bookMode === "collection" ? "active" : ""
            }
            onClick={() => {
              setBookMode("collection");
              go("book");
            }}
          >
            <BookOpen size={13} />
            <span>我的物质</span>
          </button>
          <button
            type="button"
            aria-current={
              page === "book" && bookMode === "knowledge" ? "page" : undefined
            }
            className={
              page === "book" && bookMode === "knowledge" ? "active" : ""
            }
            onClick={() => {
              setBookMode("knowledge");
              go("book");
            }}
          >
            <BookMarked size={13} />
            <span>知识库</span>
          </button>
          <button
            type="button"
            aria-current={page === "tree" ? "page" : undefined}
            className={page === "tree" ? "active" : ""}
            onClick={() => go("tree")}
          >
            <Network size={13} />
            <span>发现网络</span>
          </button>
          <button
            type="button"
            aria-current={page === "museum" ? "page" : undefined}
            className={page === "museum" ? "active" : ""}
            onClick={() => go("museum")}
          >
            <Landmark size={13} />
            <span>博物馆</span>
          </button>
        </>
      );
    }

    return null;
  };

  const detailParentLabel =
    page === "book"
      ? bookMode === "knowledge"
        ? "知识库"
        : "我的物质"
      : page === "tree"
        ? "发现网络"
        : page === "lab"
          ? "自由实验"
          : (pageReturnLabels[page] ?? "返回");

  if (!game.ready)
    return (
      <div className="loading">
        <Atom size={46} />
        <p>正在打开实验室…</p>
      </div>
    );

  return (
    <div
      className={`app ${game.save.settings.motion ? "" : "reduce-motion"} ${inDetailMode ? "in-detail-mode" : ""}`}
      data-viewport={vp.mode}
      data-page={page}
    >
      <header className="topbar">
        {vp.isMobile && activeMobileBack ? (
          <div className="mobile-back-header">
            <button
              type="button"
              className="mobile-parent-back"
              onClick={activeMobileBack.onBack}
            >
              <ChevronLeft size={16} />
              <span>返回{activeMobileBack.parentLabel}</span>
            </button>
            {activeMobileBack.title && (
              <span className="mobile-back-title">
                {activeMobileBack.title}
              </span>
            )}
          </div>
        ) : (
          <button className="brand" onClick={() => go("home")}>
            <span className="brand-mark">
              <Atom size={26} />
            </span>
            <span>
              物质纪元<small>MATTER AGE</small>
            </span>
          </button>
        )}

        {vp.isMobileLandscape && showL2Subnav && (
          <nav
            className="domain-subnav inline-landscape-subnav mobile-scroll-strip"
            aria-label="二级模式导航"
          >
            {renderL2SubnavButtons()}
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
            className={`icon-button top-settings-btn ${page === "settings" ? "active" : ""}`}
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

      {vp.isMobilePortrait && showL2Subnav && (
        <nav
          className="domain-subnav portrait-domain-subnav mobile-scroll-strip"
          aria-label="二级模式导航"
        >
          {renderL2SubnavButtons()}
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
          <Management
            go={go}
            toast={setToast}
            controlledTab={vp.isMobile ? mgmtTab : undefined}
            onTabChange={setMgmtTab}
            onMobileDetailBar={setPageDetailBar}
          />
        ) : page === "tech" ? (
          <Technology toast={setToast} onMobileDetailBar={setPageDetailBar} />
        ) : page === "world" ? (
          <WorldMap toast={setToast} />
        ) : page === "history" ? (
          <History go={go} toast={setToast} deepChapterId={deepHistoryId} />
        ) : page === "museum" ? (
          <Museum onMobileDetailBar={setPageDetailBar} />
        ) : page === "book" ? (
          <Encyclopedia
            setDetail={setDetail}
            controlledBookMode={vp.isMobile ? bookMode : undefined}
            onBookModeChange={setBookMode}
            onMobileDetailBar={setPageDetailBar}
          />
        ) : page === "settings" ? (
          <SettingsPage toast={setToast} />
        ) : page === "tree" ? (
          <Suspense fallback={<div className="empty">正在加载发现网络…</div>}>
            <DiscoveryTree setDetail={setDetail} />
          </Suspense>
        ) : page === "challenge" ? (
          <Challenges
            go={go}
            toast={setToast}
            onMobileDetailBar={setPageDetailBar}
          />
        ) : page === "eras" ? (
          <Civilizations go={go} />
        ) : page === "achievements" ? (
          <Achievements toast={setToast} go={go} />
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

      {/* Mobile Bottom Navigation Bar / Landscape Left Rail (4 streamlined L1 player goals) */}
      <nav className="mobile-bottom-nav" aria-label="移动端主导航">
        <button
          className={activePillar === "home" ? "active" : ""}
          aria-current={activePillar === "home" ? "page" : undefined}
          onClick={() => go("home")}
        >
          <HomeIcon size={18} />
          <span>大厅</span>
        </button>
        <button
          className={activePillar === "experiment" ? "active" : ""}
          aria-current={activePillar === "experiment" ? "page" : undefined}
          onClick={() => go("lab")}
        >
          <FlaskConical size={18} />
          <span>实验</span>
        </button>
        <button
          className={activePillar === "manage" ? "active" : ""}
          aria-current={activePillar === "manage" ? "page" : undefined}
          onClick={() => go("management")}
        >
          <Building2 size={18} />
          <span>经营</span>
        </button>
        <button
          className={activePillar === "archive" ? "active" : ""}
          aria-current={activePillar === "archive" ? "page" : undefined}
          onClick={() => go("book")}
        >
          <BookOpen size={18} />
          <span>图鉴</span>
        </button>
      </nav>

      {detail && (
        <Detail
          s={detail}
          close={() => setDetail(null)}
          onSelect={(next) => setDetail(next)}
          parentLabel={detailParentLabel}
        />
      )}

      {supply &&
        (() => {
          const allSupply = substances.filter((s) => s.supply);
          const collectedSupplyCount = allSupply.filter(
            (s) => s.id in game.save.discovered,
          ).length;
          const sq = supplyQuery.trim().toLowerCase();
          const filteredSupply = allSupply.filter(
            (s) =>
              !sq ||
              `${s.name}${s.nameEn}${s.formula || ""}${s.aliases.join("")}`
                .toLowerCase()
                .includes(sq),
          );
          return (
            <div className="modal-backdrop" onClick={() => setSupply(false)}>
              <section
                className="modal wide supply-modal"
                role="dialog"
                aria-modal="true"
                aria-label="标本补给"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-sticky-head">
                  <div>
                    <p className="eyebrow">
                      SPECIMEN COLLECTION · {collectedSupplyCount}/
                      {allSupply.length}
                    </p>
                    <h2>实验室标本补给（自由探索）</h2>
                  </div>
                  <button
                    className="close icon-button"
                    aria-label="关闭补给"
                    onClick={() => setSupply(false)}
                  >
                    <X />
                  </button>
                </div>
                <p className="muted supply-desc">
                  领取仅解锁自由探索标本，不会直接增加实验室经营模式的有限库存。
                </p>
                <label className="search-box supply-search-box">
                  <input
                    type="search"
                    aria-label="搜索标本"
                    placeholder="搜索标本名称 / 俗名 / 化学式"
                    value={supplyQuery}
                    onChange={(e) => setSupplyQuery(e.target.value)}
                  />
                  {supplyQuery && (
                    <button
                      type="button"
                      className="search-clear-mini"
                      aria-label="清空标本搜索"
                      onClick={() => setSupplyQuery("")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>
                <div className="modal-scroll-body">
                  <div className="supply-grid">
                    {filteredSupply.map((s) => (
                      <button
                        disabled={s.id in game.save.discovered}
                        key={s.id}
                        onClick={() => game.collect(s.id)}
                      >
                        <SubstanceIcon s={s} size={36} />
                        <span>
                          {s.name}
                          <small>
                            {s.id in game.save.discovered
                              ? "已收集"
                              : "领取标本"}
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
                  {!filteredSupply.length && (
                    <p className="empty small">没有匹配的实验室标本。</p>
                  )}
                </div>
              </section>
            </div>
          );
        })()}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
