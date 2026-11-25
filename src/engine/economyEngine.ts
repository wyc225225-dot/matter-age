import type { EconomyConfig, Save, Substance } from "../types";
import {
  addManagementItems,
  appendManagementLog,
  consumeManagementItems,
} from "./progressionEngine";

export type EconomyActionResult =
  { ok: true; save: Save; message: string } | { ok: false; error: string };

export function canAfford(
  save: Save,
  coinsCost: number,
  rpCost = 0,
): { ok: true } | { ok: false; error: string } {
  if (!Number.isInteger(coinsCost) || coinsCost < 0) {
    return { ok: false, error: "金币金额无效" };
  }
  if (!Number.isInteger(rpCost) || rpCost < 0) {
    return { ok: false, error: "研究点金额无效" };
  }
  if (save.coins < coinsCost) {
    return {
      ok: false,
      error: `金币不足（需要 ${coinsCost}，当前 ${save.coins}）`,
    };
  }
  if (save.researchPoints < rpCost) {
    return {
      ok: false,
      error: `研究点不足（需要 ${rpCost}，当前 ${save.researchPoints}）`,
    };
  }
  return { ok: true };
}

export function spendCurrency(
  save: Save,
  coinsCost: number,
  rpCost = 0,
): { ok: true; save: Save } | { ok: false; error: string } {
  const check = canAfford(save, coinsCost, rpCost);
  if (!check.ok) return check;
  return {
    ok: true,
    save: {
      ...save,
      coins: save.coins - coinsCost,
      researchPoints: save.researchPoints - rpCost,
      // experience is NEVER deducted when spending research points
    },
  };
}

export function buyMaterial(
  save: Save,
  substanceId: string,
  quantity: number,
  config: EconomyConfig,
  db: Record<string, Substance>,
  now = Date.now(),
): EconomyActionResult {
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
    return { ok: false, error: "购买数量须为 1–99 的正整数。" };
  }
  const price = config.materialPrices[substanceId];
  const sub = db[substanceId];
  if (!sub || !price || price.buy === null) {
    return {
      ok: false,
      error: "该物质不可直接在市场购买，需通过采集或实验制备。",
    };
  }
  if ((price.minLabLevel ?? 1) > save.labLevel) {
    return {
      ok: false,
      error: `需要 Lv.${price.minLabLevel} 实验室才可采购「${sub.name}」。`,
    };
  }
  const totalCost = price.buy * quantity;
  const spent = spendCurrency(save, totalCost, 0);
  if (!spent.ok) return spent;

  const nextSave = appendManagementLog(
    {
      ...spent.save,
      managementInventory: addManagementItems(spent.save.managementInventory, {
        [substanceId]: quantity,
      }),
    },
    "buy",
    `采购 ${sub.name} ×${quantity}（-${totalCost} 金币）`,
    now,
  );
  return {
    ok: true,
    save: nextSave,
    message: `已采购 ${sub.name} ×${quantity}，花费 ${totalCost} 金币。`,
  };
}

export function sellMaterial(
  save: Save,
  substanceId: string,
  quantity: number,
  config: EconomyConfig,
  db: Record<string, Substance>,
  now = Date.now(),
): EconomyActionResult {
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
    return { ok: false, error: "出售数量须为 1–99 的正整数。" };
  }
  const sub = db[substanceId];
  if (!sub) return { ok: false, error: "未知物质。" };
  const unitPrice = config.materialPrices[substanceId]?.sell ?? 4;
  if (unitPrice <= 0) {
    return { ok: false, error: "该物质暂无回收报价。" };
  }
  const consumed = consumeManagementItems(save.managementInventory, {
    [substanceId]: quantity,
  });
  if (!consumed.ok) return consumed;

  const revenue = unitPrice * quantity;
  const nextSave = appendManagementLog(
    {
      ...save,
      coins: save.coins + revenue,
      managementInventory: consumed.inventory,
    },
    "sell",
    `出售 ${sub.name} ×${quantity}（+${revenue} 金币）`,
    now,
  );
  return {
    ok: true,
    save: nextSave,
    message: `已出售 ${sub.name} ×${quantity}，获得 ${revenue} 金币。`,
  };
}
