import type {
  EconomyConfig,
  EquipmentDef,
  LabLevelDef,
  OrderDef,
  Reaction,
  RegionDef,
  Save,
  Substance,
  TechnologyDef,
} from "../types";
import {
  appendManagementLog,
  applyRewardBundle,
  consumeManagementItems,
  hasManagementItems,
} from "./progressionEngine";
import {
  buildOrUpgradeEquipment,
  executeManagementProduction,
  upgradeLaboratory,
} from "./laboratoryEngine";
import { buyMaterial } from "./economyEngine";
import { unlockTechnology } from "./technologyEngine";

export function isOrderEligible(save: Save, order: OrderDef): boolean {
  if (save.labLevel < order.requiredLabLevel) return false;
  if (
    order.requiredTechIds?.some((tid) => !save.unlockedTechIds.includes(tid))
  ) {
    return false;
  }
  if (
    order.requiredEquipmentIds?.some(
      (eqId) => (save.equipmentLevels[eqId] ?? 0) < 1,
    )
  ) {
    return false;
  }
  if (!order.repeatable && save.completedOrderIds.includes(order.id)) {
    return false;
  }
  return true;
}

export function getEligibleOrders(
  save: Save,
  allOrders: OrderDef[],
): OrderDef[] {
  return allOrders.filter((o) => isOrderEligible(save, o));
}

export function refreshActiveOrders(
  save: Save,
  allOrders: OrderDef[],
  labs: LabLevelDef[],
): string[] {
  const lab = labs.find((l) => l.level === save.labLevel) ?? labs[0];
  const slots = lab?.activeOrderSlots ?? 3;
  const eligible = getEligibleOrders(save, allOrders);
  const eligibleIds = new Set(eligible.map((o) => o.id));

  // Keep valid existing active orders first
  const active = save.activeOrderIds.filter((id) => eligibleIds.has(id));

  // Prioritize uncompleted orders, then repeatable orders
  const uncompleted = eligible.filter(
    (o) => !active.includes(o.id) && !save.completedOrderIds.includes(o.id),
  );
  const repeatable = eligible.filter(
    (o) =>
      !active.includes(o.id) &&
      save.completedOrderIds.includes(o.id) &&
      o.repeatable,
  );

  for (const candidate of [...uncompleted, ...repeatable]) {
    if (active.length >= slots) break;
    active.push(candidate.id);
  }
  return active.slice(0, slots);
}

export function canDeliverOrder(
  save: Save,
  order: OrderDef,
  db: Record<string, Substance>,
): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (!isOrderEligible(save, order)) {
    reasons.push("尚未满足该订单的实验室等级、科技或设备要求");
  }
  const requiredMap = Object.fromEntries(
    order.deliverables.map((d) => [d.substanceId, d.amount]),
  );
  if (!hasManagementItems(save.managementInventory, requiredMap)) {
    for (const d of order.deliverables) {
      const owned = save.managementInventory[d.substanceId] ?? 0;
      if (owned < d.amount) {
        reasons.push(
          `缺少 ${db[d.substanceId]?.name ?? d.substanceId}（需 ${d.amount}，现 ${owned}）`,
        );
      }
    }
  }
  if (order.stoichRequirement) {
    const req = order.stoichRequirement;
    const best = save.bestUtilization[req.reactionId];
    if (!best) {
      reasons.push("需先完成对应的定量反应制备");
    } else if (req.exactZeroLeftover && best.portionUtilization < 1) {
      reasons.push("需以 100% 份数利用率（零剩余）完成对应反应");
    } else if (
      req.minPortionUtilization &&
      best.portionUtilization < req.minPortionUtilization
    ) {
      reasons.push(
        `对应反应份数利用率需达到 ${Math.round(req.minPortionUtilization * 100)}%`,
      );
    }
  }
  return reasons.length === 0 ? { ok: true } : { ok: false, reasons };
}

/**
 * Atomic order delivery transaction:
 * validates eligibility & inventory -> deducts deliverables -> pays coins/RP/XP ->
 * marks completed & refreshes active orders so no duplicate submission can succeed without stock.
 */
export function deliverOrder(
  save: Save,
  orderId: string,
  allOrders: OrderDef[],
  labs: LabLevelDef[],
  db: Record<string, Substance>,
  now = Date.now(),
): { ok: true; save: Save; message: string } | { ok: false; error: string } {
  const order = allOrders.find((o) => o.id === orderId);
  if (!order) return { ok: false, error: "未找到该研究订单。" };

  const check = canDeliverOrder(save, order, db);
  if (!check.ok) {
    return { ok: false, error: check.reasons.join("；") };
  }

  const requiredMap = Object.fromEntries(
    order.deliverables.map((d) => [d.substanceId, d.amount]),
  );
  const consumed = consumeManagementItems(
    save.managementInventory,
    requiredMap,
  );
  if (!consumed.ok) return consumed;

  const baseNext: Save = {
    ...save,
    managementInventory: consumed.inventory,
    completedOrderIds: save.completedOrderIds.includes(order.id)
      ? save.completedOrderIds
      : [...save.completedOrderIds, order.id],
    orderDeliveryCount: {
      ...save.orderDeliveryCount,
      [order.id]: (save.orderDeliveryCount[order.id] ?? 0) + 1,
    },
    activeOrderIds: save.activeOrderIds.filter((id) => id !== order.id),
  };

  const rewarded = applyRewardBundle(baseNext, order.reward);
  const refreshedActive = refreshActiveOrders(rewarded, allOrders, labs);

  const finalSave = appendManagementLog(
    {
      ...rewarded,
      activeOrderIds: refreshedActive,
    },
    "order",
    `交付订单「${order.title}」（+${order.reward.coins} 金币，+${order.reward.researchPoints} RP，+${order.reward.experience} XP）`,
    now,
  );

  return {
    ok: true,
    save: finalSave,
    message: `订单「${order.title}」交付成功！获得 ${order.reward.coins} 金币、${order.reward.researchPoints} RP。`,
  };
}

/**
 * Automated end-to-end solvability & progression verifier:
 * proves that starting from a fresh Save (Lv.1, 120 coins, 30 RP), a player can gather/buy/produce/deliver
 * orders, unlock required techs & equipment, and reach Lab Lv.2 and Lab Lv.3 with zero deadlocks.
 */
export function simulateProgressionToLabLv3(
  freshSave: Save,
  deps: {
    economy: EconomyConfig;
    labs: LabLevelDef[];
    equipmentMap: Record<string, EquipmentDef>;
    techMap: Record<string, TechnologyDef>;
    allOrders: OrderDef[];
    rules: Reaction[];
    db: Record<string, Substance>;
    regions: RegionDef[];
  },
): { ok: true; finalSave: Save; steps: number } | { ok: false; error: string } {
  let s = structuredClone(freshSave);
  let steps = 0;

  const assertOk = <T extends { ok: boolean }>(
    res: T,
    label: string,
  ): Extract<T, { ok: true }> => {
    steps++;
    if (!res.ok) {
      throw new Error(
        `[进度闭环模拟失败] ${label}: ${(res as { error?: string }).error}`,
      );
    }
    return res as Extract<T, { ok: true }>;
  };

  try {
    // Verify free starter gathering exists in forest even if coins were 0
    const forest = deps.regions.find((r) => r.id === "forest");
    const freeNode = forest?.nodes.find((n) => n.costCoins === 0);
    if (!freeNode) {
      return { ok: false, error: "原始森林缺少免费采集点，存在零金币死锁风险" };
    }

    // 1. Produce Ca(OH)2 from starter CaO + H2O (r018) and deliver ord_01
    s = assertOk(
      executeManagementProduction(
        s,
        "r018",
        2,
        deps.rules,
        deps.db,
        deps.equipmentMap,
        deps.labs,
      ),
      "制取氢氧化钙",
    ).save;
    s = assertOk(
      deliverOrder(s, "ord_01", deps.allOrders, deps.labs, deps.db),
      "交付 ord_01",
    ).save;

    // 2. Produce O2 via catalytic peroxide decomposition (r027) and deliver ord_02
    s = assertOk(
      executeManagementProduction(
        s,
        "r027",
        1,
        deps.rules,
        deps.db,
        deps.equipmentMap,
        deps.labs,
      ),
      "催化制氧",
    ).save;
    s = assertOk(
      deliverOrder(s, "ord_02", deps.allOrders, deps.labs, deps.db),
      "交付 ord_02",
    ).save;

    // 3. Unlock thermal basics & lab expansion 2
    s = assertOk(
      unlockTechnology(s, "tech_thermal_basics", deps.techMap),
      "解锁基础热化学",
    ).save;
    s = assertOk(
      unlockTechnology(s, "tech_lab_expansion_2", deps.techMap),
      "解锁标准实验室扩建",
    ).save;

    // 4. Buy & synthesize diverse Lv.1 products to reach 8 discovered & enough coins/RP for Lv.2
    const lv1Recipes: {
      buys: [string, number][];
      rxn: string;
      batch: number;
      orderId: string;
    }[] = [
      {
        buys: [["sodium_oxide", 1]],
        rxn: "r020",
        batch: 1,
        orderId: "ord_03",
      },
      {
        buys: [
          ["ammonia", 2],
          ["hydrochloric_acid", 2],
        ],
        rxn: "r033",
        batch: 2,
        orderId: "ord_05",
      },
      {
        buys: [
          ["zinc", 1],
          ["hydrochloric_acid", 2],
        ],
        rxn: "r034",
        batch: 1,
        orderId: "ord_07",
      },
      {
        buys: [
          ["copper_oxide", 2],
          ["sulfuric_acid", 2],
        ],
        rxn: "r046",
        batch: 2,
        orderId: "ord_08",
      },
      {
        buys: [
          ["iron", 1],
          ["copper_sulfate", 1],
        ],
        rxn: "r059",
        batch: 1,
        orderId: "ord_09",
      },
    ];
    for (const cycle of lv1Recipes) {
      for (const [sid, qty] of cycle.buys) {
        s = assertOk(
          buyMaterial(s, sid, qty, deps.economy, deps.db),
          `采购 ${sid}`,
        ).save;
      }
      s = assertOk(
        executeManagementProduction(
          s,
          cycle.rxn,
          cycle.batch,
          deps.rules,
          deps.db,
          deps.equipmentMap,
          deps.labs,
        ),
        `生产 ${cycle.rxn}`,
      ).save;
      s = assertOk(
        deliverOrder(s, cycle.orderId, deps.allOrders, deps.labs, deps.db),
        `交付 ${cycle.orderId}`,
      ).save;
    }

    // Extra ord_01 cycles to build coin/RP reserve for Lv.2 upgrade
    for (let i = 0; i < 4; i++) {
      s = assertOk(
        buyMaterial(s, "calcium_oxide", 2, deps.economy, deps.db),
        "采购氧化钙",
      ).save;
      s = assertOk(
        buyMaterial(s, "water", 2, deps.economy, deps.db),
        "采购水",
      ).save;
      s = assertOk(
        executeManagementProduction(
          s,
          "r018",
          2,
          deps.rules,
          deps.db,
          deps.equipmentMap,
          deps.labs,
        ),
        "制取熟石灰",
      ).save;
      s = assertOk(
        deliverOrder(s, "ord_01", deps.allOrders, deps.labs, deps.db),
        "交付 ord_01",
      ).save;
    }

    // 5. Upgrade Lab to Lv.2
    s = assertOk(
      upgradeLaboratory(s, deps.labs, deps.techMap),
      "升级实验室至 Lv.2",
    ).save;

    // 6. Unlock Lv.2 techs (separation, quant analysis, electrolysis) & fund electrolyzer via Lv.2 MgSO4 orders
    s = assertOk(
      unlockTechnology(s, "tech_separation_eng", deps.techMap),
      "解锁分离工程",
    ).save;
    s = assertOk(
      unlockTechnology(s, "tech_quant_analysis", deps.techMap),
      "解锁定量分析",
    ).save;
    for (let i = 0; i < 4; i++) {
      s = assertOk(
        buyMaterial(s, "magnesium", 2, deps.economy, deps.db),
        "采购镁",
      ).save;
      s = assertOk(
        buyMaterial(s, "sulfuric_acid", 2, deps.economy, deps.db),
        "采购硫酸",
      ).save;
      s = assertOk(
        executeManagementProduction(
          s,
          "r038",
          2,
          deps.rules,
          deps.db,
          deps.equipmentMap,
          deps.labs,
        ),
        "制备硫酸镁",
      ).save;
      s = assertOk(
        deliverOrder(s, "ord_18", deps.allOrders, deps.labs, deps.db),
        "交付 ord_18",
      ).save;
    }
    s = assertOk(
      unlockTechnology(s, "tech_electrolysis", deps.techMap),
      "解锁电解原理",
    ).save;
    s = assertOk(
      buildOrUpgradeEquipment(
        s,
        "eq_electrolyzer",
        deps.equipmentMap,
        deps.labs,
        deps.techMap,
      ),
      "建造电解设备",
    ).save;

    // Run electrolysis orders (ord_13) & diversify discoveries to reach Lv.3 requirements
    for (let i = 0; i < 6; i++) {
      s = assertOk(
        buyMaterial(s, "water", 4, deps.economy, deps.db),
        "采购电解用水",
      ).save;
      s = assertOk(
        executeManagementProduction(
          s,
          "r005",
          2,
          deps.rules,
          deps.db,
          deps.equipmentMap,
          deps.labs,
        ),
        "电解水",
      ).save;
      s = assertOk(
        deliverOrder(s, "ord_13", deps.allOrders, deps.labs, deps.db),
        "交付 ord_13",
      ).save;
    }

    // Unlock tech_lab_expansion_3 & diversify 2 more discoveries (MgSO4 + NaCl)
    s = assertOk(
      buyMaterial(s, "magnesium", 2, deps.economy, deps.db),
      "采购镁",
    ).save;
    s = assertOk(
      buyMaterial(s, "sulfuric_acid", 2, deps.economy, deps.db),
      "采购硫酸",
    ).save;
    s = assertOk(
      executeManagementProduction(
        s,
        "r038",
        2,
        deps.rules,
        deps.db,
        deps.equipmentMap,
        deps.labs,
      ),
      "制备硫酸镁",
    ).save;
    s = assertOk(
      deliverOrder(s, "ord_18", deps.allOrders, deps.labs, deps.db),
      "交付 ord_18",
    ).save;

    s = assertOk(
      buyMaterial(s, "sodium_bicarbonate", 2, deps.economy, deps.db),
      "采购碳酸氢钠",
    ).save;
    s = assertOk(
      buyMaterial(s, "hydrochloric_acid", 2, deps.economy, deps.db),
      "采购盐酸",
    ).save;
    s = assertOk(
      executeManagementProduction(
        s,
        "r054",
        2,
        deps.rules,
        deps.db,
        deps.equipmentMap,
        deps.labs,
      ),
      "小苏打产气",
    ).save;
    s = assertOk(
      deliverOrder(s, "ord_10", deps.allOrders, deps.labs, deps.db),
      "交付 ord_10",
    ).save;

    s = assertOk(
      unlockTechnology(s, "tech_lab_expansion_3", deps.techMap),
      "解锁高级实验中心工程",
    ).save;

    // Extra ord_13 runs to fund Lv.3 upgrade cleanly
    for (let i = 0; i < 4; i++) {
      s = assertOk(
        buyMaterial(s, "water", 4, deps.economy, deps.db),
        "采购水",
      ).save;
      s = assertOk(
        executeManagementProduction(
          s,
          "r005",
          2,
          deps.rules,
          deps.db,
          deps.equipmentMap,
          deps.labs,
        ),
        "电解水",
      ).save;
      s = assertOk(
        deliverOrder(s, "ord_13", deps.allOrders, deps.labs, deps.db),
        "交付 ord_13",
      ).save;
    }

    s = assertOk(
      upgradeLaboratory(s, deps.labs, deps.techMap),
      "升级实验室至 Lv.3",
    ).save;

    if (s.labLevel !== 3) {
      return { ok: false, error: `预期到达 Lv.3，实际为 Lv.${s.labLevel}` };
    }
    return { ok: true, finalSave: s, steps };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
