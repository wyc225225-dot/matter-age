import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

const SHOT_DIR = "output/playwright/history-remaining";
mkdirSync(SHOT_DIR, { recursive: true });

async function assertNoHorizontalOverflow(
  page: import("@playwright/test").Page,
) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test("Remaining 5 History Chapters (CH.05/06/08/09/10): full playable walkthrough, reload persistence, idempotent rewards, museum unlocks & mobile portrait/landscape", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // ==================== 1. CH.05 生命物质的边界 (Desktop + Mid-Stage Reload Persistence) ====================
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#history/hist_05");
  await expect(page.locator(".history-opening-panel")).toContainText("1828 年");
  await expect(page.locator(".history-opening-panel")).not.toContainText(
    /虚构教学旁白|时代背景线索（/,
  );
  await page.getByRole("button", { name: "开始提出假设" }).click();
  await page.getByRole("button", { name: /与生物尿素完全一致/ }).click();
  await page.getByRole("button", { name: "开始实验" }).click();

  await page.getByRole("button", { name: /混合氰酸银/ }).click();
  await page.getByRole("button", { name: /加热蒸发滤液/ }).click();

  // Reload browser mid-experiment and confirm session state persists!
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /证据实验台 · 生命物质的边界/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "元素组成定量测定" }),
  ).toBeEnabled();

  await page.getByRole("button", { name: "元素组成定量测定" }).click();
  await page.getByRole("button", { name: "酸碱反应性对照" }).click();
  await page.getByRole("button", { name: "晶体形态与浓硝酸检验" }).click();
  await page
    .getByRole("button", { name: /产物 X 与生物体提取的尿素为同一化合物/ })
    .click();
  await page.screenshot({
    path: `${SHOT_DIR}/desktop-ch05-urea.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "提交实验检验" }).click();
  await expect(page.locator(".stage-feedback")).toContainText(
    "产物对照检验通过",
  );
  await page.getByRole("button", { name: "整理证据与结论" }).click();
  await page
    .getByRole("button", { name: /它动摇了「有机物必须依赖生命力」/ })
    .click();
  await page.getByRole("button", { name: "揭晓历史真相" }).click();
  await expect(
    page.getByRole("heading", { name: /人工合成尿素与同分异构/ }),
  ).toBeVisible();

  // ==================== 2. CH.06 电流的化学法则 (Desktop Advanced Quantitative) ====================
  await page.goto("/#history/hist_06");
  await page.getByRole("button", { name: "进阶定量模式" }).click();
  await page.getByRole("button", { name: "开始提出假设" }).click();
  await page.getByRole("button", { name: /随总电量 Q 成正比增加/ }).click();
  await page.getByRole("button", { name: "开始实验" }).click();

  // Record 3 trials: Ag+ (1A x 1), Ag+ (2A x 1), Cu2+ (2A x 1)
  await page.getByRole("button", { name: "通电并记录数据" }).click();
  await page
    .getByRole("radiogroup", { name: "电流强度" })
    .getByRole("radio", { name: "2 A" })
    .click();
  await page.getByRole("button", { name: "通电并记录数据" }).click();
  await page
    .getByRole("radiogroup", { name: "电解液选择" })
    .getByRole("radio", { name: /硫酸铜溶液/ })
    .click();
  await page.getByRole("button", { name: "通电并记录数据" }).click();
  await page.getByRole("button", { name: /产物物质的量与总电量 Q/ }).click();
  await page.getByRole("spinbutton", { name: "串联析出铜份数" }).fill("2");
  await page.screenshot({
    path: `${SHOT_DIR}/desktop-ch06-faraday.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "提交实验检验" }).click();
  await expect(page.locator(".stage-feedback")).toContainText("全部通过");
  await page.getByRole("button", { name: "整理证据与结论" }).click();
  await page.getByRole("button", { name: /存在基本量子（电子）/ }).click();
  await page.getByRole("button", { name: "揭晓历史真相" }).click();
  await expect(
    page.getByRole("heading", { name: /法拉第电解定律/ }),
  ).toBeVisible();

  // ==================== 3. CH.08 矿石中的未知信号 (Mobile Portrait 390x844, Virtual Data Analysis) ====================
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#history/hist_08");
  expect(await page.locator("select").count()).toBe(0);
  await assertNoHorizontalOverflow(page);
  await page.getByRole("button", { name: "开始提出假设" }).click();
  await page
    .getByRole("button", { name: /放射性远强于铀的极微量新元素/ })
    .click();
  await page.getByRole("button", { name: "开始实验" }).click();

  const measureButtons = page.getByRole("button", { name: "测定电离信号" });
  const count = await measureButtons.count();
  for (let i = 0; i < count; i++) {
    await page.getByRole("button", { name: "测定电离信号" }).first().click();
  }
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-ch08-radioactivity.png`,
  });
  await page.getByRole("tab", { name: /2\. 信号推断/ }).click();
  await page.getByRole("button", { name: /至少存在两种新元素/ }).click();
  await page.getByRole("button", { name: "提交实验检验" }).click();
  await expect(page.locator(".dock-feedback")).toContainText("推断通过");
  await page.getByRole("button", { name: "整理证据与结论" }).click();
  await page
    .getByRole("button", { name: /证实放射性是特定原子内在的物理属性/ })
    .click();
  await page.getByRole("button", { name: "揭晓历史真相" }).click();
  await expect(
    page.getByRole("heading", { name: /钋与镭的发现/ }),
  ).toBeVisible();

  // ==================== 4. CH.09 原子内部的世界 (Mobile Portrait 390x844 + Landscape 844x390) ====================
  await page.goto("/#history/hist_09");
  expect(await page.locator("select").count()).toBe(0);
  await page.getByRole("button", { name: "开始提出假设" }).click();
  await page
    .getByRole("button", { name: /绝大多数 α 粒子穿过空旷外围/ })
    .click();
  await page.getByRole("button", { name: "开始实验" }).click();

  // Switch model view & fire beam at forward + backscatter angles
  await page
    .getByRole("radiogroup", { name: "散射模型示意切换" })
    .getByRole("radio", { name: "中心原子核模型" })
    .click();
  await page.getByRole("button", { name: "发射模拟 α 粒子束" }).click();
  await page
    .getByRole("radiogroup", { name: "荧光屏观测角" })
    .getByRole("radio", { name: /大角度反弹区/ })
    .click();
  await page.getByRole("button", { name: "发射模拟 α 粒子束" }).click();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-ch09-scattering.png`,
  });

  // Rotate to Landscape 844x390 -> verify state persists and layout fits!
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".scatter-obs-list")).toContainText("大角度反弹区");
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${SHOT_DIR}/landscape-844-ch09-scattering.png`,
  });

  await page
    .getByRole("button", {
      name: /全部正电荷与几乎全部质量集中在极微小致密的中心原子核内/,
    })
    .click();
  await page.getByRole("button", { name: "提交实验检验" }).click();
  await expect(page.locator(".dock-feedback")).toContainText("推断通过");
  await page.getByRole("button", { name: "整理证据与结论" }).click();
  await page
    .getByRole("button", { name: /哪怕只占万分之一的极端反常观测/ })
    .click();
  await page.getByRole("button", { name: "揭晓历史真相" }).click();
  await expect(
    page.getByRole("heading", { name: /卢瑟福原子核模型/ }),
  ).toBeVisible();

  // ==================== 5. CH.10 来自空气的农业革命 (Portrait + Landscape + Museum Verification) ====================
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#history/hist_10");
  expect(await page.locator("select").count()).toBe(0);
  await page.getByRole("button", { name: "开始提出假设" }).click();
  await page.getByRole("button", { name: /采用适宜中高温兼顾速率/ }).click();
  await page.getByRole("button", { name: "开始实验" }).click();

  // Trial 1 (baseline) then Trial 2 (optimal industrial with iron catalyst + recycle)
  await page.getByRole("button", { name: /运行工艺试车/ }).click();
  await page
    .getByRole("radiogroup", { name: "合成氨温度" })
    .getByRole("radio", { name: /中高温/ })
    .click();
  await page
    .getByRole("radiogroup", { name: "合成氨压强" })
    .getByRole("radio", { name: /中高压/ })
    .click();
  await page
    .getByRole("radiogroup", { name: "合成氨催化剂" })
    .getByRole("radio", { name: /铁基促进催化剂/ })
    .click();
  await page.getByRole("switch", { name: /未反应原料气循环/ }).click();
  await page.getByRole("button", { name: /运行工艺试车/ }).click();
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-ch10-haber.png`,
  });

  // Landscape check
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".haber-kpi-grid")).toContainText("成本可控");
  await assertNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${SHOT_DIR}/landscape-844-ch10-haber.png`,
  });

  await page.getByRole("button", { name: "提交实验检验" }).click();
  await expect(page.locator(".dock-feedback")).toContainText("通过");
  await page.getByRole("button", { name: "整理证据与结论" }).click();
  await page.getByRole("button", { name: /基础化学平衡理论与材料/ }).click();
  await page.getByRole("button", { name: "揭晓历史真相" }).click();
  await expect(
    page.getByRole("heading", { name: /哈伯-博施合成氨工业化/ }),
  ).toBeVisible();

  // ==================== 6. Reward Idempotency Check (Replay CH.05 -> no first-clear replay) ====================
  await page.setViewportSize({ width: 1280, height: 800 });
  const coinsBeforeReplay = Number(
    (await page.locator(".top-hud-chip").first().innerText()).replace(
      /\D/g,
      "",
    ),
  );
  await page.goto("/#history/hist_05");
  await page.getByRole("button", { name: "重新开始本章" }).click();
  await page.getByRole("button", { name: "确认重开本章" }).click();
  await page.getByRole("button", { name: "开始提出假设" }).click();
  await page.getByRole("button", { name: /与生物尿素完全一致/ }).click();
  await page.getByRole("button", { name: "开始实验" }).click();
  await page.getByRole("button", { name: /混合氰酸银/ }).click();
  await page.getByRole("button", { name: /加热蒸发滤液/ }).click();
  await page.getByRole("button", { name: "元素组成定量测定" }).click();
  await page.getByRole("button", { name: "酸碱反应性对照" }).click();
  await page
    .getByRole("button", { name: /产物 X 与生物体提取的尿素为同一化合物/ })
    .click();
  await page.getByRole("button", { name: "提交实验检验" }).click();
  await page.getByRole("button", { name: "整理证据与结论" }).click();
  await page
    .getByRole("button", { name: /它动摇了「有机物必须依赖生命力」/ })
    .click();
  await page.getByRole("button", { name: "揭晓历史真相" }).click();
  await expect(page.locator(".toast")).toContainText("复玩完成");
  const coinsAfterReplay = Number(
    (await page.locator(".top-hud-chip").first().innerText()).replace(
      /\D/g,
      "",
    ),
  );
  // CH.05 first reward is 130 coins; repeat reward is 26 coins (never replays 130!)
  expect(coinsAfterReplay - coinsBeforeReplay).toBe(26);

  // Verify ALL 5 new museum exhibits are unlocked!
  await page.goto("/#museum");
  for (const name of [
    "1828 针状尿素结晶标本瓶",
    "法拉第定量电量计模型",
    "压电石英电离测量仪模型",
    "金箔散射真空观测室模型",
    "高压催化合成氨反应釜模型",
  ]) {
    await expect(
      page.getByRole("button", { name: new RegExp(name) }),
    ).toBeVisible();
  }

  expect(errors).toEqual([]);
});
