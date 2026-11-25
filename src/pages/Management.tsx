import { useMemo, useState } from "react";
import {
  ArrowUpCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Coins,
  Compass,
  Cpu,
  FlaskConical,
  Lock,
  Package,
  ShoppingCart,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { Page } from "../types/navigation";
import {
  byId,
  conditionName,
  economyConfig,
  equipmentById,
  equipmentList,
  labLevels,
  orderById,
  orders,
  reactions,
  techById,
} from "../data";
import { useGame } from "../stores/game";
import { useViewport } from "../hooks/useViewport";
import {
  getEquipmentUpgradeCost,
  getManagementAllowedConditions,
  getManagementMaxBatch,
  getNextLabUpgradeCheck,
} from "../engine/laboratoryEngine";
import { canDeliverOrder } from "../engine/orderEngine";
import { IsometricLabBench } from "../components/IsometricLabBench";
import { SubstanceIcon } from "../components/SubstanceIcon";
import { Formula } from "../components/Shared";

type Tab = "orders" | "produce" | "equipment" | "market" | "overview";

export default function Management({
  go,
  toast,
}: {
  go: (p: Page) => void;
  toast: (msg: string) => void;
}) {
  const game = useGame();
  const vp = useViewport();
  const save = game.save;
  const [tab, setTab] = useState<Tab>("orders");
  const [selectedEqId, setSelectedEqId] = useState<string | null>(
    "eq_basic_bench",
  );
  const [recipeSearch, setRecipeSearch] = useState("");
  const [onlyReadyRecipes, setOnlyReadyRecipes] = useState(false);
  const [marketPane, setMarketPane] = useState<"inventory" | "buy">(
    "inventory",
  );
  const [batchMap, setBatchMap] = useState<Record<string, number>>({});

  const effectiveTab: Tab =
    !vp.isMobilePortrait && tab === "overview" ? "orders" : tab;

  const currentLab =
    labLevels.find((l) => l.level === save.labLevel) ?? labLevels[0];
  const upgradeCheck = getNextLabUpgradeCheck(save, labLevels, techById);
  const allowedConditions = useMemo(
    () => getManagementAllowedConditions(save, equipmentById),
    [save],
  );
  const maxBatch = useMemo(
    () => getManagementMaxBatch(save, labLevels, equipmentById),
    [save],
  );

  const activeOrders = save.activeOrderIds
    .map((id) => orderById[id])
    .filter(Boolean);

  const readyOrderCount = activeOrders.filter(
    (o) => canDeliverOrder(save, o, byId).ok,
  ).length;

  // Recipes operable in Management mode (prioritize ones matching current conditions & stock)
  const craftableReactions = useMemo(() => {
    const q = recipeSearch.trim().toLowerCase();
    return reactions
      .filter((r) => {
        if (onlyReadyRecipes) {
          const condOk = r.conditions.every((c) =>
            allowedConditions.includes(c),
          );
          const stockOk = r.reactants.every(
            (p) =>
              (save.managementInventory[p.substanceId] ?? 0) >= p.coefficient,
          );
          const catOk = r.catalysts.every(
            (cid) => (save.managementInventory[cid] ?? 0) >= 1,
          );
          if (!condOk || !stockOk || !catOk) return false;
        }
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          r.equation.toLowerCase().includes(q) ||
          r.products.some((p) =>
            byId[p.substanceId]?.name.toLowerCase().includes(q),
          )
        );
      })
      .sort((a, b) => {
        const aCond = a.conditions.every((c) => allowedConditions.includes(c))
          ? 1
          : 0;
        const bCond = b.conditions.every((c) => allowedConditions.includes(c))
          ? 1
          : 0;
        if (bCond !== aCond) return bCond - aCond;
        const aStock = a.reactants.every(
          (p) =>
            (save.managementInventory[p.substanceId] ?? 0) >= p.coefficient,
        )
          ? 1
          : 0;
        const bStock = b.reactants.every(
          (p) =>
            (save.managementInventory[p.substanceId] ?? 0) >= p.coefficient,
        )
          ? 1
          : 0;
        return bStock - aStock;
      });
  }, [
    allowedConditions,
    onlyReadyRecipes,
    recipeSearch,
    save.managementInventory,
  ]);

  const inventoryEntries = Object.entries(save.managementInventory)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  const marketItems = Object.entries(economyConfig.materialPrices)
    .filter(([, p]) => p.buy !== null)
    .sort((a, b) => (a[1].minLabLevel ?? 1) - (b[1].minLabLevel ?? 1));

  function notify(res: { ok: boolean; message: string }) {
    toast(res.message);
  }

  const labStageAndUpgrade = (
    <section className="mgmt-hero-grid">
      <IsometricLabBench
        labLevel={save.labLevel}
        labDef={currentLab}
        equipmentLevels={save.equipmentLevels}
        equipmentList={equipmentList}
        selectedEquipmentId={selectedEqId}
        onSelectEquipment={(id) => {
          setSelectedEqId(id);
          setTab("equipment");
        }}
      />
      <aside className="panel lab-upgrade-panel">
        <div className="upgrade-head">
          <span className="eyebrow">LAB PROGRESSION</span>
          <h2>
            Lv.{save.labLevel} {currentLab.name}
          </h2>
          <p className="muted">{currentLab.tagline}</p>
        </div>
        <div className="allowed-cond-strip">
          <span className="muted">经营模式已解锁条件：</span>
          <div className="cond-tags">
            {allowedConditions.map((c) => (
              <span key={c} className="tag-pill">
                {conditionName(c)}
              </span>
            ))}
          </div>
        </div>
        {upgradeCheck.nextLab ? (
          <div className="next-lab-box">
            <div className="next-lab-title">
              <ArrowUpCircle size={17} />
              <strong>
                下一阶段：Lv.{upgradeCheck.nextLab.level}{" "}
                {upgradeCheck.nextLab.name}
              </strong>
            </div>
            <p className="muted">{upgradeCheck.nextLab.description}</p>
            {!upgradeCheck.nextLab.lockedPreview ? (
              <>
                <ul className="req-list">
                  <li
                    className={
                      save.coins >= upgradeCheck.nextLab.upgradeCostCoins
                        ? "met"
                        : ""
                    }
                  >
                    金币：{save.coins} / {upgradeCheck.nextLab.upgradeCostCoins}
                  </li>
                  <li
                    className={
                      save.researchPoints >= upgradeCheck.nextLab.upgradeCostRP
                        ? "met"
                        : ""
                    }
                  >
                    研究点：{save.researchPoints} /{" "}
                    {upgradeCheck.nextLab.upgradeCostRP} RP
                  </li>
                  <li
                    className={
                      Object.keys(save.discovered).length >=
                      upgradeCheck.nextLab.requiredDiscoveredCount
                        ? "met"
                        : ""
                    }
                  >
                    已发现物质：{Object.keys(save.discovered).length} /{" "}
                    {upgradeCheck.nextLab.requiredDiscoveredCount}
                  </li>
                  {upgradeCheck.nextLab.requiredTechIds.map((tid) => (
                    <li
                      key={tid}
                      className={
                        save.unlockedTechIds.includes(tid) ? "met" : ""
                      }
                    >
                      前置科技：{techById[tid]?.name ?? tid}
                    </li>
                  ))}
                </ul>
                <button
                  className="primary full"
                  disabled={!upgradeCheck.canUpgrade}
                  onClick={() => notify(game.upgradeLabAction())}
                >
                  <ArrowUpCircle size={16} />
                  升级至 Lv.{upgradeCheck.nextLab.level} 实验室
                </button>
              </>
            ) : (
              <div className="locked-interface-note">
                <Lock size={14} />
                <span>
                  已达 V1.6 最高实验室等级（Lv.3）！Lv.4 工业产线与 Lv.5
                  现代研究院接口已预留，将在 V1.7 / V2.0 开放。
                </span>
              </div>
            )}
          </div>
        ) : null}
        <div className="quick-jump-row">
          <button className="secondary" onClick={() => go("tech")}>
            <Cpu size={15} />
            前往科技研究树
          </button>
          <button className="secondary" onClick={() => go("world")}>
            <Compass size={15} />
            野外免费采集
          </button>
        </div>
      </aside>
    </section>
  );

  return (
    <div
      className={`page-width standard-page management-page ${vp.isMobileLandscape ? "mgmt-landscape-split" : ""}`}
    >
      <div className="page-heading">
        <div>
          <p className="eyebrow">LABORATORY MANAGEMENT · FINITE INVENTORY</p>
          <h1>实验室经营中心</h1>
          <p>
            管理有限原料库存、调用共享化学引擎生产样品、交付研究订单、建造设备并升级实验室（与自由探索无限库存严格隔离）。
          </p>
        </div>
        <div className="mgmt-quick-stats">
          <div className="stat-chip gold">
            <Coins size={15} />
            <strong>{save.coins}</strong>
            <span>金币</span>
          </div>
          <div className="stat-chip cyan">
            <Sparkles size={15} />
            <strong>{save.researchPoints}</strong>
            <span>研究点 RP</span>
          </div>
          <div className="stat-chip green">
            <ClipboardList size={15} />
            <strong>{save.completedOrderIds.length}</strong>
            <span>/ {orders.length} 订单</span>
          </div>
        </div>
      </div>

      <div className="mgmt-shell">
        {/* Desktop & Landscape left pane shows Isometric Lab Stage + Upgrade Panel */}
        {!vp.isMobilePortrait && (
          <div className="mgmt-stage-pane">{labStageAndUpgrade}</div>
        )}

        <div className="mgmt-ops-pane">
          {/* Sub-navigation Tabs (Sticky on mobile with compact resource strip) */}
          <div className="mobile-sticky-bar mgmt-sticky-bar">
            {vp.isMobile && (
              <div className="compact-hud-row">
                <span className="tag-pill">
                  <Building2 size={12} /> Lv.{save.labLevel} {currentLab.name}
                </span>
                <span className="tag-pill">
                  <Coins size={12} /> {save.coins}
                </span>
                <span className="tag-pill free">
                  <Sparkles size={12} /> {save.researchPoints} RP
                </span>
                {vp.isMobilePortrait && effectiveTab !== "overview" && (
                  <button
                    type="button"
                    className="secondary small mgmt-lab-jump"
                    onClick={() => setTab("overview")}
                  >
                    2D 实验台 / 升级
                    <ChevronRight size={13} />
                  </button>
                )}
              </div>
            )}

            <div
              className="mgmt-tabs mobile-scroll-strip"
              role="tablist"
              aria-label="实验室经营模块"
            >
              <button
                role="tab"
                aria-selected={effectiveTab === "orders"}
                className={effectiveTab === "orders" ? "active" : ""}
                onClick={() => setTab("orders")}
              >
                <ClipboardList size={15} />
                {vp.isMobile
                  ? `研究订单 (${activeOrders.length})`
                  : `研究订单（${activeOrders.length} 活跃 / ${orders.length} 模板）`}
                {readyOrderCount > 0 && (
                  <span className="tab-dot-badge">{readyOrderCount}</span>
                )}
              </button>
              <button
                role="tab"
                aria-selected={effectiveTab === "produce"}
                className={effectiveTab === "produce" ? "active" : ""}
                onClick={() => setTab("produce")}
              >
                <FlaskConical size={15} />
                有限库存制备
              </button>
              <button
                role="tab"
                aria-selected={effectiveTab === "equipment"}
                className={effectiveTab === "equipment" ? "active" : ""}
                onClick={() => setTab("equipment")}
              >
                <Wrench size={15} />
                {vp.isMobile
                  ? `实验设备工坊 (${Object.keys(save.equipmentLevels).length}/8)`
                  : `实验设备工坊（${Object.keys(save.equipmentLevels).length}/8）`}
              </button>
              <button
                role="tab"
                aria-selected={effectiveTab === "market"}
                className={effectiveTab === "market" ? "active" : ""}
                onClick={() => setTab("market")}
              >
                <ShoppingCart size={15} />
                库存与原料市场
              </button>
              {vp.isMobilePortrait && (
                <button
                  role="tab"
                  aria-selected={effectiveTab === "overview"}
                  className={effectiveTab === "overview" ? "active" : ""}
                  onClick={() => setTab("overview")}
                >
                  <Building2 size={15} />
                  实验台与升级
                </button>
              )}
            </div>
          </div>

          <div className="mgmt-ops-scroll">
            {/* MOBILE PORTRAIT TAB: Overview (2D Isometric Bench + Lab Upgrade) */}
            {vp.isMobilePortrait &&
              effectiveTab === "overview" &&
              labStageAndUpgrade}

            {/* TAB 1: Research Orders */}
            {effectiveTab === "orders" && (
              <section className="mgmt-section">
                <div className="section-heading">
                  <h2>
                    活跃研究委托 <span>ACTIVE ORDERS</span>
                  </h2>
                  <span className="muted">
                    当前实验室可同时承接 {currentLab.activeOrderSlots} 项委托 ·
                    交付扣除有限经营库存
                  </span>
                </div>
                <div className="order-grid">
                  {activeOrders.map((o) => {
                    const check = canDeliverOrder(save, o, byId);
                    const deliveredTimes = save.orderDeliveryCount[o.id] ?? 0;
                    return (
                      <article
                        key={o.id}
                        className={`panel order-card ${check.ok ? "ready" : ""}`}
                      >
                        <div className="order-top">
                          <span className="tag-pill">
                            T{o.tier} · {o.client}
                          </span>
                          {deliveredTimes > 0 && (
                            <span className="done-badge">
                              <CheckCircle2 size={13} /> 已交付 {deliveredTimes}{" "}
                              次
                            </span>
                          )}
                        </div>
                        <h3>{o.title}</h3>
                        <p className="muted">{o.description}</p>
                        <div className="deliverables-list">
                          {o.deliverables.map((d) => {
                            const sub = byId[d.substanceId];
                            const owned =
                              save.managementInventory[d.substanceId] ?? 0;
                            const enough = owned >= d.amount;
                            return (
                              <div
                                key={d.substanceId}
                                className={`deliverable-row ${enough ? "ok" : ""}`}
                              >
                                <SubstanceIcon s={sub} size={24} />
                                <span>{sub.name}</span>
                                <strong>
                                  {owned} / {d.amount}
                                </strong>
                              </div>
                            );
                          })}
                        </div>
                        {o.stoichRequirement && (
                          <p className="stoich-req-note">
                            计量要求：需先在反应{" "}
                            {o.stoichRequirement.reactionId} 中达到{" "}
                            {o.stoichRequirement.exactZeroLeftover
                              ? "100% 零剩余"
                              : `${Math.round((o.stoichRequirement.minPortionUtilization ?? 1) * 100)}% 利用率`}
                          </p>
                        )}
                        <div className="order-footer">
                          <div className="reward-pills">
                            <span>+{o.reward.coins} 金币</span>
                            <span>+{o.reward.researchPoints} RP</span>
                            <span>+{o.reward.experience} XP</span>
                          </div>
                          <button
                            className={check.ok ? "primary" : "secondary"}
                            disabled={!check.ok}
                            onClick={() =>
                              notify(game.deliverOrderAction(o.id))
                            }
                          >
                            {check.ok ? "交付订单" : "库存不足"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* TAB 2: Finite-Inventory Production (Shared Chemistry Engine) */}
            {effectiveTab === "produce" && (
              <section className="mgmt-section">
                <div className="section-heading produce-filter-head">
                  <h2>
                    经营实验台制备 <span>SHARED ENGINE PRODUCTION</span>
                  </h2>
                  <div className="produce-filter-controls">
                    <input
                      type="search"
                      className="search-input"
                      aria-label="筛选生产配方"
                      placeholder="搜索物质、反应名或方程式…"
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      className={`secondary small ${onlyReadyRecipes ? "active-cond" : ""}`}
                      aria-pressed={onlyReadyRecipes}
                      onClick={() => setOnlyReadyRecipes((v) => !v)}
                    >
                      {onlyReadyRecipes ? "✓ 仅看可生产" : "仅看可生产"}
                    </button>
                  </div>
                </div>
                <p className="muted">
                  直接调用共享反应/化学计量引擎：扣除有限库存反应物、产物入经营库、催化剂不消耗。当前单次最高批量：×
                  {maxBatch}。
                </p>
                <div className="recipe-grid">
                  {craftableReactions.slice(0, 24).map((r) => {
                    const batch = batchMap[r.id] ?? 1;
                    const missingConds = r.conditions.filter(
                      (c) => !allowedConditions.includes(c),
                    );
                    const missingStock = r.reactants.some(
                      (p) =>
                        (save.managementInventory[p.substanceId] ?? 0) <
                        p.coefficient * batch,
                    );
                    const missingCat = r.catalysts.some(
                      (cid) => (save.managementInventory[cid] ?? 0) < 1,
                    );
                    const ready =
                      missingConds.length === 0 && !missingStock && !missingCat;

                    return (
                      <article
                        key={r.id}
                        className={`panel recipe-card ${ready ? "ready" : ""}`}
                      >
                        <div className="recipe-head">
                          <h3>{r.name}</h3>
                          <span className="tag-pill">
                            {r.conditions.map(conditionName).join(" + ") ||
                              "常温"}
                          </span>
                        </div>
                        <div className="recipe-eq">
                          <Formula value={r.equation} />
                        </div>
                        <div className="recipe-io">
                          <div>
                            <small className="muted">消耗原料：</small>
                            {r.reactants.map((p) => {
                              const owned =
                                save.managementInventory[p.substanceId] ?? 0;
                              const need = p.coefficient * batch;
                              return (
                                <span
                                  key={p.substanceId}
                                  className={`io-chip ${owned >= need ? "ok" : "lack"}`}
                                >
                                  {byId[p.substanceId].name} {owned}/{need}
                                </span>
                              );
                            })}
                            {r.catalysts.map((cid) => (
                              <span
                                key={cid}
                                className={`io-chip ${(save.managementInventory[cid] ?? 0) >= 1 ? "cat" : "lack"}`}
                              >
                                催化:{byId[cid].name}（不消耗）
                              </span>
                            ))}
                          </div>
                          <div>
                            <small className="muted">产出：</small>
                            {r.products.map((p) => (
                              <span
                                key={p.substanceId}
                                className="io-chip prod"
                              >
                                {byId[p.substanceId].name} ×
                                {p.coefficient * batch}
                              </span>
                            ))}
                          </div>
                        </div>
                        {missingConds.length > 0 && (
                          <p className="warn-note">
                            需先建造支持「
                            {missingConds.map(conditionName).join("、")}
                            」的设备
                          </p>
                        )}
                        <div className="recipe-actions">
                          <div className="batch-control">
                            <span>批量</span>
                            <button
                              type="button"
                              className="icon-mini"
                              aria-label={`减少${r.name}批量`}
                              disabled={batch <= 1}
                              onClick={() =>
                                setBatchMap((m) => ({
                                  ...m,
                                  [r.id]: Math.max(1, batch - 1),
                                }))
                              }
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={maxBatch}
                              value={batch}
                              aria-label={`${r.name}生产批量`}
                              onChange={(e) => {
                                const v = Math.max(
                                  1,
                                  Math.min(
                                    maxBatch,
                                    Number(e.target.value) || 1,
                                  ),
                                );
                                setBatchMap((m) => ({ ...m, [r.id]: v }));
                              }}
                            />
                            <button
                              type="button"
                              className="icon-mini"
                              aria-label={`增加${r.name}批量`}
                              disabled={batch >= maxBatch}
                              onClick={() =>
                                setBatchMap((m) => ({
                                  ...m,
                                  [r.id]: Math.min(maxBatch, batch + 1),
                                }))
                              }
                            >
                              +
                            </button>
                          </div>
                          <button
                            className={ready ? "primary" : "secondary"}
                            disabled={!ready}
                            onClick={() =>
                              notify(game.produceInManagement(r.id, batch))
                            }
                          >
                            执行生产
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {craftableReactions.length === 0 && (
                    <div className="panel empty-box">
                      <p>
                        当前筛选条件下没有可生产配方，试试清空搜索或前往野外免费采集原料。
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* TAB 3: Equipment Workshop */}
            {effectiveTab === "equipment" && (
              <section className="mgmt-section">
                <div className="section-heading">
                  <h2>
                    实验设备工坊 <span>EQUIPMENT WORKSHOP</span>
                  </h2>
                  <span className="muted">
                    设备条件限制仅在经营模式生效；自由探索实验室始终开放全部条件
                  </span>
                </div>
                <div className="equip-grid">
                  {equipmentList.map((eq) => {
                    const lv = save.equipmentLevels[eq.id] ?? 0;
                    const cost = getEquipmentUpgradeCost(eq, lv);
                    const maxed = lv >= eq.maxLevel;
                    const techMet =
                      !eq.requiredTechId ||
                      save.unlockedTechIds.includes(eq.requiredTechId);
                    const labMet = save.labLevel >= eq.requiredLabLevel;
                    const canBuild =
                      !eq.lockedPreview &&
                      !maxed &&
                      techMet &&
                      labMet &&
                      save.coins >= cost.coins &&
                      save.researchPoints >= cost.rp;

                    return (
                      <article
                        key={eq.id}
                        className={`panel equip-card ${lv > 0 ? "installed" : ""} ${selectedEqId === eq.id ? "selected" : ""} ${eq.lockedPreview ? "locked" : ""}`}
                      >
                        <div className="equip-top">
                          <span className="eyebrow">{eq.en}</span>
                          <span className="tag-pill">
                            {eq.lockedPreview
                              ? "V2.0 接口"
                              : lv > 0
                                ? `Lv.${lv} / ${eq.maxLevel}`
                                : "未建造"}
                          </span>
                        </div>
                        <h3>{eq.name}</h3>
                        <p className="muted">{eq.description}</p>
                        {eq.unlockedConditions.length > 0 && (
                          <p className="equip-meta">
                            解锁条件：
                            {eq.unlockedConditions
                              .map(conditionName)
                              .join("、")}
                          </p>
                        )}
                        <p className="equip-meta">
                          要求：Lv.{eq.requiredLabLevel} 实验室
                          {eq.requiredTechId
                            ? ` · 科技「${techById[eq.requiredTechId]?.name ?? eq.requiredTechId}」`
                            : ""}
                          {" · "}功耗接口预留 {eq.energyUsagePreviewWatts}W
                        </p>
                        {eq.lockedPreview ? (
                          <button className="secondary" disabled>
                            <Lock size={14} /> 工业自动化预告
                          </button>
                        ) : maxed ? (
                          <button className="secondary" disabled>
                            已达满级
                          </button>
                        ) : (
                          <button
                            className={canBuild ? "primary" : "secondary"}
                            disabled={!canBuild}
                            onClick={() =>
                              notify(game.buildOrUpgradeEquipmentAction(eq.id))
                            }
                          >
                            {lv === 0 ? "建造设备" : `升级至 Lv.${lv + 1}`}（
                            {cost.coins} 金币 / {cost.rp} RP）
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* TAB 4: Finite Inventory & Material Market */}
            {effectiveTab === "market" && (
              <section className="mgmt-section">
                {vp.isMobilePortrait && (
                  <div
                    className="mobile-seg-tabs market-sub-tabs"
                    role="tablist"
                    aria-label="库存与市场切换"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={marketPane === "inventory"}
                      className={marketPane === "inventory" ? "active" : ""}
                      onClick={() => setMarketPane("inventory")}
                    >
                      我的库存 ({inventoryEntries.length})
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={marketPane === "buy"}
                      className={marketPane === "buy" ? "active" : ""}
                      onClick={() => setMarketPane("buy")}
                    >
                      原料采购市场 ({marketItems.length})
                    </button>
                  </div>
                )}

                <div className="market-layout">
                  {(!vp.isMobilePortrait || marketPane === "inventory") && (
                    <div className="panel">
                      <h2>
                        <Package size={18} /> 经营有限库存（
                        {inventoryEntries.length} 种）
                      </h2>
                      {inventoryEntries.length === 0 ? (
                        <div className="empty-box">
                          <p>
                            当前经营库存为空。前往「原始森林」免费采集即可零成本补充基础原料！
                          </p>
                          <button
                            className="primary"
                            onClick={() => go("world")}
                          >
                            前往原始森林免费采集
                          </button>
                        </div>
                      ) : (
                        <div className="inv-list">
                          {inventoryEntries.map(([id, count]) => {
                            const sub = byId[id];
                            const sellPrice =
                              economyConfig.materialPrices[id]?.sell ?? 4;
                            return (
                              <div key={id} className="inv-row">
                                <SubstanceIcon s={sub} size={28} />
                                <div className="inv-info">
                                  <strong>{sub.name}</strong>
                                  <small>
                                    库存 {count} 份 · 回收 {sellPrice} 金币/份
                                  </small>
                                </div>
                                <button
                                  className="secondary small"
                                  onClick={() =>
                                    notify(game.sellMaterialAction(id, 1))
                                  }
                                >
                                  出售 1 份 (+{sellPrice})
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {(!vp.isMobilePortrait || marketPane === "buy") && (
                    <div className="panel">
                      <h2>
                        <ShoppingCart size={18} /> 实验室原料采购市场
                      </h2>
                      <div className="market-list">
                        {marketItems.map(([id, price]) => {
                          const sub = byId[id];
                          const locked =
                            (price.minLabLevel ?? 1) > save.labLevel;
                          const unitBuy = price.buy!;
                          return (
                            <div key={id} className="inv-row">
                              <SubstanceIcon s={sub} size={28} />
                              <div className="inv-info">
                                <strong>{sub.name}</strong>
                                <small>
                                  单价 {unitBuy} 金币 · 现有{" "}
                                  {save.managementInventory[id] ?? 0} 份
                                  {locked
                                    ? ` · 需 Lv.${price.minLabLevel} 实验室`
                                    : ""}
                                </small>
                              </div>
                              <div className="buy-btns">
                                <button
                                  className="secondary small"
                                  disabled={locked || save.coins < unitBuy}
                                  onClick={() =>
                                    notify(game.buyMaterialAction(id, 1))
                                  }
                                >
                                  +1
                                </button>
                                <button
                                  className="secondary small"
                                  disabled={locked || save.coins < unitBuy * 4}
                                  onClick={() =>
                                    notify(game.buyMaterialAction(id, 4))
                                  }
                                >
                                  +4
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Management Ledger */}
            {save.managementHistory.length > 0 && (
              <details className="panel ledger-panel" open={!vp.isMobile}>
                <summary className="ledger-summary">
                  <strong>
                    最近经营日志（{Math.min(6, save.managementHistory.length)}）
                  </strong>
                </summary>
                <ul className="ledger-list">
                  {save.managementHistory.slice(0, 6).map((h) => (
                    <li key={h.id}>
                      <span className="tag-pill">{h.kind}</span>
                      <span>{h.summary}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
