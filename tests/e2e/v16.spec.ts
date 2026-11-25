import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

mkdirSync("output/playwright/v16", { recursive: true });

test("V1.6 full real gameplay loop: Lobby, World Exploration, Management, Tech Tree, History Ch04, Museum, Special Challenge & screenshots", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Lobby Home: HUD, 6 mode cards (Industrial locked), real mission board
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /从一滴水/ })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "研究者状态栏" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /工业文明/ })).toBeDisabled();
  await expect(
    page.getByRole("region", { name: "实时研究任务板" }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/playwright/v16/desktop-lobby.png",
    fullPage: true,
  });

  // 2. World Exploration: 2D SVG Map + Free Forest Gathering (3x) + Region Task claim
  await page.getByRole("button", { name: "世界探索", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "物质纪元 2D 世界探索区域地图" }),
  ).toBeVisible();
  const gatherSpringBtn = page
    .locator(".gather-node-card")
    .filter({ hasText: "林间溪泉" })
    .getByRole("button", { name: /立即采集/ });
  await gatherSpringBtn.click();
  await gatherSpringBtn.click();
  await gatherSpringBtn.click();
  await page.getByRole("button", { name: "领取任务奖励" }).first().click();
  await expect(page.getByRole("status")).toContainText("完成");
  await page.screenshot({
    path: "output/playwright/v16/desktop-world.png",
    fullPage: true,
  });

  // 3. Management: Isometric 2D Lab Bench + Finite Production (r018 x2) + Atomic Order Delivery (ord_01)
  await page.getByRole("button", { name: "实验室经营", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /2D 等距实验台场景/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /有限库存制备/ }).click();
  await page
    .getByRole("searchbox", { name: "筛选生产配方" })
    .fill("生石灰与水");
  await page.getByRole("spinbutton", { name: "生石灰与水生产批量" }).fill("2");
  await page
    .locator(".recipe-card")
    .filter({ hasText: "生石灰与水" })
    .getByRole("button", { name: "执行生产" })
    .click();
  await expect(page.getByRole("status")).toContainText("生产完成");

  await page.getByRole("tab", { name: /研究订单/ }).click();
  await page
    .locator(".order-card")
    .filter({ hasText: "熟石灰建材试样" })
    .getByRole("button", { name: "交付订单" })
    .click();
  await expect(page.getByRole("status")).toContainText("交付成功");
  await page.screenshot({
    path: "output/playwright/v16/desktop-management.png",
    fullPage: true,
  });

  // 4. Tech Tree (separate from Discovery Network): Unlock 基础热化学操作 & build 加热设备
  await page.getByRole("button", { name: "前往科技研究树" }).click();
  await expect(
    page.getByRole("heading", { name: "科技研究树", exact: true }),
  ).toBeVisible();
  await page
    .locator(".tech-node", {
      has: page.getByRole("heading", { name: "基础热化学操作", exact: true }),
    })
    .getByRole("button", { name: /研究/ })
    .click();
  await expect(page.getByRole("status")).toContainText("基础热化学操作");
  await page.screenshot({
    path: "output/playwright/v16/desktop-tech.png",
    fullPage: true,
  });

  await page.getByRole("button", { name: "实验室经营", exact: true }).click();
  await page.getByRole("tab", { name: /实验设备工坊/ }).click();
  await page
    .locator(".equip-card")
    .filter({ hasText: "加热设备" })
    .getByRole("button", { name: /建造设备/ })
    .click();
  await expect(page.getByRole("status")).toContainText("加热设备");

  // 5. Challenge History: 10-chapter timeline + complete Ch 04 Voltaic Pile (5 stages)
  await page.getByRole("button", { name: "挑战历史", exact: true }).click();
  await expect(page.getByRole("heading", { name: /挑战历史/ })).toBeVisible();
  await page.screenshot({
    path: "output/playwright/v16/desktop-history.png",
    fullPage: true,
  });

  await page
    .locator(".history-card")
    .filter({ hasText: "人类的第一块电池" })
    .getByRole("button", { name: /进入历史现场/ })
    .click();
  // Stage 1 -> Stage 2
  await page.getByRole("button", { name: /进入阶段 2/ }).click();
  // Stage 2: select correct hypothesis
  await page.getByRole("button", { name: /必须由两种不同金属/ }).click();
  await page.getByRole("button", { name: /进入阶段 3/ }).click();
  // Stage 3: Build 2 valid Zn -> Brine -> Cu cells
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "+ 锌片 (Zn)" }).click();
    await page
      .getByRole("button", { name: "+ 盐水湿布/纸板（电解质）" })
      .click();
    await page.getByRole("button", { name: "+ 铜片 (Cu)" }).click();
  }
  await page.getByRole("button", { name: "提交实验检验" }).click();
  await expect(page.locator(".stage-feedback")).toContainText("装配成功");
  await page.screenshot({
    path: "output/playwright/v16/desktop-history-voltaic.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /进入阶段 4/ }).click();
  // Stage 4: Analysis
  await page
    .getByRole("button", { name: /它首次提供了持续可控的直流电流/ })
    .click();
  await page.getByRole("button", { name: /完成推理并揭晓历史真相/ }).click();
  await expect(page.getByText(/电化学时代开启/)).toBeVisible();

  // 6. Science Museum: verify Voltaic Pile exhibit is unlocked by real history completion
  await page.getByRole("button", { name: "科学博物馆", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "科学博物馆", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /锌铜叠层伏打电堆/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/playwright/v16/desktop-museum.png",
    fullPage: true,
  });

  // 7. Special Challenge: Unknown Identification (sp_id_1)
  await page.getByRole("button", { name: "目标挑战", exact: true }).click();
  await page.getByRole("button", { name: /特殊挑战/ }).click();
  await page.getByRole("button", { name: /无色气体鉴别/ }).click();
  await page.getByRole("button", { name: "通入澄清石灰水" }).click();
  await expect(page.locator(".obs-text")).toContainText("碳酸钙沉淀");
  await page.getByRole("button", { name: "二氧化碳", exact: true }).click();
  await page.getByRole("button", { name: "确认鉴定结果" }).click();
  await expect(page.locator(".runner-feedback")).toContainText("鉴定准确");

  // 8. Save v2 -> v3 migration via Settings UI
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const v2File = join(tmpdir(), `matter-age-v2-migration-${Date.now()}.json`);
  writeFileSync(
    v2File,
    JSON.stringify({
      version: 2,
      currentMode: "advanced",
      achievements: ["第一次实验"],
      discovered: {
        water: 1000,
        air: 1000,
        wood: 1000,
        sand: 1000,
        iron: 1000,
        ice: 2000,
      },
      completed: ["r001"],
      history: [],
      favorites: ["ice"],
      settings: { sound: false, motion: true },
      challengeBest: {},
      challengeRun: null,
      collected: [],
      totalExperiments: 3,
      research: {},
      quantitativeHistory: [],
      quantitativeChallengeBest: {},
      quantitativeChallengeRun: null,
      bestUtilization: {},
      balancingRecords: {},
    }),
  );
  await page.locator("input[type=file]").setInputFiles(v2File);
  await expect(page.getByRole("status")).toHaveText("存档已校验并恢复。");
  await expect(page.locator(".preview-bar")).toContainText("自动保存 v3");

  expect(errors).toEqual([]);
});

test("V1.6 responsive verification at 360px, 390px and 768px with mobile bottom nav & drawer", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const v16Routes = [
    "home",
    "management",
    "tech",
    "world",
    "history",
    "museum",
  ];

  for (const width of [360, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of v16Routes) {
      await page.goto("/#" + route);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `#${route} at ${width}px`,
      ).toBe(true);
    }
  }

  // Tablet screenshot
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/#home");
  await page.screenshot({
    path: "output/playwright/v16/tablet-lobby.png",
    fullPage: true,
  });

  // Mobile 390px 4-item bottom nav + L2 subnav navigation & screenshots
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#home");
  const mobileNav = page.getByRole("navigation", { name: "移动端主导航" });
  await expect(mobileNav).toBeVisible();
  await expect(mobileNav.getByRole("button")).toHaveCount(4);
  await page.screenshot({
    path: "output/playwright/v16/mobile-lobby.png",
    fullPage: true,
  });

  await mobileNav.getByRole("button", { name: "经营" }).click();
  await expect(
    page.getByRole("heading", { name: "实验室经营中心" }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/playwright/v16/mobile-management.png",
    fullPage: true,
  });

  await page
    .getByRole("navigation", { name: "二级模式导航" })
    .getByRole("button", { name: "野外采集", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "世界探索地图" }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/playwright/v16/mobile-world.png",
    fullPage: true,
  });

  expect(errors).toEqual([]);
});
