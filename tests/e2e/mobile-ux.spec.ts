import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

mkdirSync("output/playwright/mobile-ux", { recursive: true });

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const ok = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(ok, `Horizontal overflow detected: ${label}`).toBe(true);
}

async function assertNoOverlap(
  page: Page,
  selA: string,
  selB: string,
  label: string,
) {
  const boxes = await page.evaluate(
    ([a, b]) => {
      const elA = document.querySelector(a);
      const elB = document.querySelector(b);
      if (!elA || !elB) return null;
      const rA = elA.getBoundingClientRect();
      const rB = elB.getBoundingClientRect();
      return {
        a: { top: rA.top, bottom: rA.bottom, left: rA.left, right: rA.right },
        b: { top: rB.top, bottom: rB.bottom, left: rB.left, right: rB.right },
      };
    },
    [selA, selB],
  );
  expect(boxes, `Missing elements for overlap check: ${label}`).not.toBeNull();
  if (!boxes) return;
  const overlapX =
    Math.min(boxes.a.right, boxes.b.right) -
    Math.max(boxes.a.left, boxes.b.left);
  const overlapY =
    Math.min(boxes.a.bottom, boxes.b.bottom) -
    Math.max(boxes.a.top, boxes.b.top);
  expect(
    overlapX > 2 && overlapY > 2,
    `Elements overlap (${label}): ${JSON.stringify(boxes)}`,
  ).toBe(false);
}

test("Mobile UX matrix: zero overflow across all 13 routes on 360x800, 390x844, 844x390, 800x360 and 768x1024", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const routes = [
    "home",
    "lab",
    "management",
    "challenge",
    "history",
    "world",
    "tech",
    "museum",
    "book",
    "tree",
    "eras",
    "achievements",
    "settings",
  ];
  const l3UtilityRoutes = new Set(["eras", "achievements", "settings"]);

  const viewports = [
    { width: 360, height: 800, mode: "mobile-portrait" },
    { width: 390, height: 844, mode: "mobile-portrait" },
    { width: 844, height: 390, mode: "mobile-landscape" },
    { width: 800, height: 360, mode: "mobile-landscape" },
    { width: 768, height: 1024, mode: "tablet" },
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const route of routes) {
      await page.goto(`/#${route}`);
      await expect(page.locator(".app")).toHaveAttribute(
        "data-viewport",
        vp.mode,
      );
      await assertNoHorizontalOverflow(
        page,
        `#${route} @ ${vp.width}x${vp.height}`,
      );
      const nav = page.getByRole("navigation", { name: "移动端主导航" });
      if (vp.mode === "mobile-portrait") {
        if (l3UtilityRoutes.has(route)) {
          await expect(nav).toBeHidden();
          await expect(page.locator(".mobile-parent-back")).toBeVisible();
        } else {
          await expect(nav).toBeVisible();
          await expect(nav.getByRole("button")).toHaveCount(4);
        }
      } else if (vp.mode === "mobile-landscape") {
        await expect(nav).toBeVisible();
        await expect(nav.getByRole("button")).toHaveCount(4);
      }
    }
  }

  expect(errors).toEqual([]);
});

test("Mobile UX Portrait & Landscape real gameplay: Simplified Lobby, Lab state retention, History Ch04/Ch07 L3 single bar, Management, World, Challenges, Tech, Museum, Book, Tree, Settings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // === 1. SIMPLIFIED LOBBY: 390x844 Portrait & 844x390 Landscape ===
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#home");
  await expect(
    page.getByRole("button", { name: "开始第一次实验" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "查看成就与成长" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /困难/ })).toBeDisabled();
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-home.png",
  });

  // Profile strip -> Achievements & Growth -> Back to Lobby
  await page.getByRole("button", { name: "查看成就与成长" }).click();
  await expect(page.getByRole("button", { name: "返回大厅" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "移动端主导航" }),
  ).toBeHidden();
  await page.getByRole("button", { name: "返回大厅" }).click();
  await expect(
    page.getByRole("button", { name: "开始第一次实验" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".app")).toHaveAttribute(
    "data-viewport",
    "mobile-landscape",
  );
  await expect(
    page.getByRole("button", { name: "开始第一次实验" }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/playwright/mobile-ux/landscape-844-home.png",
  });

  // === 2. LABORATORY: Portrait pick -> Rotate to Landscape (preserve selection!) -> Run experiment -> Verify dock non-overlap ===
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#lab");
  await assertNoOverlap(
    page,
    ".mobile-experiment-dock",
    ".mobile-bottom-nav",
    "lab dock vs bottom nav 390x844",
  );
  await page.getByRole("button", { name: "物质槽位 1", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "选择实验物质" });
  await expect(picker).toBeVisible();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "完成选择", exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "移除水", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-lab.png",
  });

  // Rotate to Landscape 844x390 — water MUST remain selected!
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    page.getByRole("button", { name: "移除水", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /^条件/ }).click();
  await page.getByRole("button", { name: "冷却", exact: true }).click();
  await page.getByRole("button", { name: "执行当前实验", exact: true }).click();
  await expect(page.getByText("发现新物质", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "output/playwright/mobile-ux/landscape-844-lab.png",
  });

  // Advanced Mode at 360x800 portrait
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole("button", { name: /进阶模式/ }).click();
  await assertNoHorizontalOverflow(page, "advanced lab 360x800");
  await assertNoOverlap(
    page,
    ".mobile-experiment-dock",
    ".mobile-bottom-nav",
    "advanced lab dock vs nav 360x800",
  );
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-360-lab-advanced.png",
  });

  // Returning player Lobby now shows "继续实验"
  await page.goto("/#home");
  await expect(page.getByRole("button", { name: "继续实验" })).toBeVisible();
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-360-home-returning.png",
  });

  // === 3. CHALLENGE HISTORY: Ch.04 Voltaic Pile (L3 hidden bottom nav -> single bottom bar, Landscape split) ===
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#history");
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-history-timeline.png",
  });
  await page
    .locator(".history-card")
    .filter({ hasText: "人类的第一块电池" })
    .getByRole("button", { name: /进入历史现场/ })
    .click();

  // In L3 active chapter: bottom primary nav MUST be hidden (zero double bar!), parent back button visible
  await expect(
    page.getByRole("navigation", { name: "移动端主导航" }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "返回挑战历史（保留当前进度）" }),
  ).toBeVisible();
  await expect(page.locator(".history-step-badge")).toContainText("第 1/5 步");

  // Open collapsible Background & Materials drawer, then close
  await page.getByRole("button", { name: "章节背景与材料" }).click();
  await expect(
    page.getByRole("dialog", { name: "章节背景与实验材料" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭章节信息" }).click();

  // Advance Stage 1 -> Stage 2 -> Stage 3 via single fixed bottom dock
  await expect(page.locator(".history-sticky-dock")).toBeInViewport();
  await page.getByRole("button", { name: /进入阶段 2/ }).click();
  await page.getByRole("button", { name: /必须由两种不同金属/ }).click();
  await page.getByRole("button", { name: /进入阶段 3/ }).click();
  await expect(page.locator(".history-step-badge")).toContainText("第 3/5 步");

  // Stack 2 cells & verify live voltmeter and Submit button are BOTH visible in viewport!
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "+ 锌片 (Zn)" }).click();
    await page
      .getByRole("button", { name: "+ 盐水湿布/纸板（电解质）" })
      .click();
    await page.getByRole("button", { name: "+ 铜片 (Cu)" }).click();
  }
  await expect(page.locator(".voltaic-meter")).toContainText("1.6 V");
  await expect(page.locator(".voltaic-meter")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "提交实验检验" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "提交实验检验" }).click();
  await expect(page.locator(".dock-feedback")).toContainText("装配成功");
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-history-ch04.png",
  });

  // Rotate Ch.04 to Landscape 844x390 — 1.6 V & stack preserved!
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".history-sticky-dock")).toContainText("1.6 V");
  await expect(
    page.getByRole("button", { name: /进入第 4\/5 步/ }),
  ).toBeEnabled();
  await page.screenshot({
    path: "output/playwright/mobile-ux/landscape-844-history-ch04.png",
  });

  // Check Ch.07 Periodic Table card selection banner on 390x844
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#history/hist_07");
  await page.getByRole("button", { name: /进入阶段 2/ }).click();
  await page
    .getByRole("button", { name: /坚持同族化学性质一致的原则/ })
    .click();
  await page.getByRole("button", { name: /进入阶段 3/ }).click();
  await page.getByRole("button", { name: /Na 钠/ }).click();
  await expect(page.locator(".selected-card-banner")).toContainText("Na 钠");
  await page.getByRole("button", { name: "第3周期第1族槽位" }).click();
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-history-ch07.png",
  });

  // === 4. MANAGEMENT: 390x844 Portrait (L2 生产/订单/设备 + 市场/实验台L3) & 800x360 Landscape ===
  await page.goto("/#management");
  await expect(page.locator(".order-card").first()).toBeInViewport();
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-management.png",
  });
  await page
    .getByRole("navigation", { name: "二级模式导航" })
    .getByRole("button", { name: "生产", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "筛选生产配方" })
    .fill("生石灰与水");
  await page
    .locator(".recipe-card")
    .filter({ hasText: "生石灰与水" })
    .getByRole("button", { name: "执行生产" })
    .click();
  await expect(page.getByRole("status")).toContainText("生产完成");
  await page.getByRole("button", { name: "实验台/升级" }).click();
  await expect(
    page.getByRole("img", { name: /2D 等距实验台场景/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "返回经营" })).toBeVisible();
  await page.getByRole("button", { name: "返回经营" }).click();

  await page.setViewportSize({ width: 800, height: 360 });
  await expect(
    page.getByRole("img", { name: /2D 等距实验台场景/ }),
  ).toBeVisible();
  await assertNoHorizontalOverflow(page, "management landscape 800x360");
  await page.screenshot({
    path: "output/playwright/mobile-ux/landscape-800-management.png",
  });

  // === 5. WORLD EXPLORATION: 390x844 Portrait & 844x390 Landscape ===
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#world");
  const springBtn = page
    .locator(".gather-node-card")
    .filter({ hasText: "林间溪泉" })
    .getByRole("button", { name: /立即采集/ });
  await expect(springBtn).toBeInViewport();
  await springBtn.click();
  await springBtn.click();
  await springBtn.click();
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-world.png",
  });
  await page.getByRole("tab", { name: /区域任务/ }).click();
  await page.getByRole("button", { name: "领取任务奖励" }).first().click();
  await expect(page.getByRole("status")).toContainText("完成");

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    page.getByRole("img", { name: "物质纪元 2D 世界探索区域地图" }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/playwright/mobile-ux/landscape-844-world.png",
  });

  // === 6. SPECIAL CHALLENGE: L3 Detail hides bottom nav -> single bottom bar, zero overlap ===
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#challenge");
  await page.getByRole("button", { name: /特殊挑战/ }).click();
  await page.getByRole("button", { name: "未知物质鉴定", exact: true }).click();
  await page.getByRole("button", { name: /无色气体鉴别/ }).click();
  await expect(
    page.getByRole("navigation", { name: "移动端主导航" }),
  ).toBeHidden();
  await expect(
    page.getByRole("button", { name: "返回关卡挑战" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "通入澄清石灰水" }).click();
  await page.getByRole("button", { name: "二氧化碳", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(
    page.getByRole("button", { name: "确认鉴定结果" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "确认鉴定结果" }).click();
  await expect(page.locator(".runner-feedback")).toContainText("鉴定准确");
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-special-challenge.png",
  });

  // === 7. TECH TREE (w/ L3 detail), MUSEUM (w/ L3 detail), BOOK, TREE, SETTINGS Screenshots ===
  await page.goto("/#tech");
  await page.getByRole("button", { name: /可研究/ }).click();
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-tech.png",
  });
  await page.locator(".tech-detail-btn").first().click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "返回科技" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "返回科技" })
    .click();

  await page.goto("/#museum");
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-museum.png",
  });
  await page.locator(".museum-case").first().click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "返回博物馆" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "返回博物馆" })
    .click();

  await page.goto("/#book");
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-book.png",
  });

  await page.goto("/#tree");
  await expect(page.locator(".react-flow")).toBeVisible();
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-tree.png",
  });

  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({
    path: "output/playwright/mobile-ux/landscape-844-tree.png",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#settings");
  await expect(page.locator(".mobile-parent-back")).toBeVisible();
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-settings.png",
  });

  // Tablet 768x1024 & Desktop 1440x900 sanity screenshots
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/#lab");
  await assertNoHorizontalOverflow(page, "tablet lab 768x1024");
  await page.screenshot({
    path: "output/playwright/mobile-ux/tablet-768-lab.png",
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#home");
  await assertNoHorizontalOverflow(page, "desktop home 1440x900");

  expect(errors).toEqual([]);
});

test("Follow-up requirements E2E: 4-item L1 + L2 navigation, Knowledge L3 detail collapse & state restore, and failure-only catalyst role assist + undo (simple & advanced)", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // === 1. L1 (4 items) -> L2 Navigation Hierarchy on Mobile Portrait (390x844) & Landscape (844x390) ===
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#home");
  const bottomNav = page.getByRole("navigation", { name: "移动端主导航" });
  const subNav = page.getByRole("navigation", { name: "二级模式导航" });
  await expect(bottomNav.getByRole("button")).toHaveCount(4);

  // L1 实验 -> L2 关卡挑战 -> L2 挑战历史 -> L2 自由实验
  await bottomNav.getByRole("button", { name: "实验", exact: true }).click();
  await expect(subNav).toBeVisible();
  await subNav.getByRole("button", { name: "关卡挑战", exact: true }).click();
  await expect(page.getByRole("heading", { name: "目标挑战" })).toBeVisible();
  await subNav.getByRole("button", { name: "挑战历史", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /挑战历史：化学史时间线/ }),
  ).toBeVisible();

  // L1 经营 -> L2 生产 -> L2 订单 -> L2 设备 -> L2 野外采集 -> L2 科技
  await bottomNav.getByRole("button", { name: "经营", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "实验室经营中心" }),
  ).toBeVisible();
  await subNav.getByRole("button", { name: "生产", exact: true }).click();
  await expect(
    page.getByRole("searchbox", { name: "筛选生产配方" }),
  ).toBeVisible();
  await subNav.getByRole("button", { name: "设备", exact: true }).click();
  await expect(page.locator(".equip-card").first()).toBeVisible();
  await subNav.getByRole("button", { name: "野外采集", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "世界探索地图" }),
  ).toBeVisible();
  await subNav.getByRole("button", { name: "科技", exact: true }).click();
  await expect(page.getByRole("heading", { name: "科技研究树" })).toBeVisible();

  // L1 图鉴 -> L2 博物馆 -> L2 发现网络 -> L2 知识库
  await bottomNav.getByRole("button", { name: "图鉴", exact: true }).click();
  await expect(page.getByRole("heading", { name: "物质图鉴" })).toBeVisible();
  await subNav.getByRole("button", { name: "博物馆", exact: true }).click();
  await expect(page.getByRole("heading", { name: "科学博物馆" })).toBeVisible();
  await subNav.getByRole("button", { name: "发现网络", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "科学发现网络" }),
  ).toBeVisible();

  // Landscape inline L2 nav verification (844x390)
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(subNav).toBeVisible();
  await subNav.getByRole("button", { name: "知识库", exact: true }).click();
  await expect(page.getByRole("heading", { name: "物质资料库" })).toBeVisible();

  // === 2. Knowledge Library: Search 氯化氢 -> Detail (collapse filter + hide bottom nav) -> Return restores query! ===
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("textbox", { name: "知识库搜索" }).fill("氯化氢");
  await expect(page.locator(".knowledge-species-grid")).toContainText("氯化氢");
  await expect(page.locator(".knowledge-species-grid")).toContainText("盐酸");
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-knowledge-hcl.png",
  });

  await page
    .locator(".knowledge-species-grid button")
    .filter({ hasText: "氯化氢" })
    .first()
    .click();
  await expect(page.locator(".archive-detail h2")).toHaveText("氯化氢");
  await expect(page.getByRole("textbox", { name: "知识库搜索" })).toHaveCount(
    0,
  );
  await expect(bottomNav).toBeHidden();
  await expect(page.getByRole("button", { name: "返回知识库" })).toBeVisible();
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-knowledge-hcl-detail.png",
  });

  // Click parent back button -> search query "氯化氢" MUST be preserved!
  await page.getByRole("button", { name: "返回知识库" }).click();
  await expect(page.getByRole("textbox", { name: "知识库搜索" })).toHaveValue(
    "氯化氢",
  );
  await expect(page.locator(".knowledge-species-grid")).toContainText("氯化氢");

  await page.getByRole("button", { name: "转化路径", exact: true }).click();
  await page.getByRole("textbox", { name: "知识库搜索" }).fill("水蒸气");
  await expect(page.locator(".knowledge-reaction-list")).toContainText(
    "2份氢气 + 1份氧气 → 2份水蒸气",
  );
  await page
    .locator(".knowledge-reaction-list button")
    .filter({ hasText: "2份氢气 + 1份氧气 → 2份水蒸气" })
    .first()
    .click();
  await expect(page.locator(".archive-detail h2")).toContainText(
    "2份氢气 + 1份氧气 → 2份水蒸气",
  );
  await expect(page.locator(".archive-detail")).toContainText("2H");
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-knowledge-transform-zh.png",
  });

  // === 3. Failure-Only Contextual Catalyst Role Assist + Undo (Simple & Advanced) ===
  await page.goto("/#lab");
  // Obtain H2O2 & MnO2 specimens via mobile picker -> supply modal
  await page.getByRole("button", { name: "物质槽位 1", exact: true }).click();
  await page.getByRole("button", { name: /领取实验室标本/ }).click();
  const supplyDialog = page.getByRole("dialog", { name: "标本补给" });
  await supplyDialog.getByRole("button", { name: "过氧化氢 领取标本" }).click();
  await supplyDialog.getByRole("button", { name: "二氧化锰 领取标本" }).click();
  await page.getByRole("button", { name: "关闭补给" }).click();

  // Put BOTH H2O2 and MnO2 into reactant slots
  await page.getByRole("button", { name: "物质槽位 1", exact: true }).click();
  await page.getByRole("button", { name: "添加过氧化氢", exact: true }).click();
  await page.getByRole("button", { name: "添加二氧化锰", exact: true }).click();
  await page.getByRole("button", { name: "完成选择", exact: true }).click();

  // BEFORE clicking run: NO unsolicited failure diagnostic popup!
  await expect(
    page.getByRole("region", { name: "实验失败诊断提示" }),
  ).toHaveCount(0);

  // Click run -> fails -> pure engine diagnoses MnO2 as catalyst!
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  const diagBox = page.getByRole("region", { name: "实验失败诊断提示" });
  await expect(diagBox).toBeVisible();
  await expect(diagBox).toContainText("二氧化锰");
  await expect(diagBox).toContainText("催化剂");
  await page.screenshot({
    path: "output/playwright/mobile-ux/portrait-390-lab-catalyst-diag.png",
  });

  // One-tap move MnO2 to catalyst slot -> verify undo works -> re-run fail & move -> select mix -> succeed!
  await page
    .getByRole("button", { name: "将「二氧化锰」移至催化剂栏" })
    .click();
  await expect(page.locator(".catalyst-active-pill")).toContainText("二氧化锰");
  await page.getByRole("button", { name: /撤回角色调整/ }).click();
  await expect(
    page.getByRole("button", { name: "移除二氧化锰", exact: true }),
  ).toBeVisible();

  // Trigger failure again, move MnO2, confirm missing condition 混合, then run -> SUCCESS!
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await page
    .getByRole("button", { name: "将「二氧化锰」移至催化剂栏" })
    .click();
  await page.getByRole("button", { name: "选中条件：混合" }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(page.locator(".result-area")).toContainText("过氧化氢催化分解");
  // Success must NOT show failure diagnostic!
  await expect(
    page.getByRole("region", { name: "实验失败诊断提示" }),
  ).toHaveCount(0);

  // Also test Advanced Quantitative Mode with H2O2 (2 portions) + MnO2 in slots -> move -> succeed
  await page.getByRole("button", { name: "跳过动画" }).click();
  await page.getByRole("button", { name: /进阶模式/ }).click();
  await page.getByRole("button", { name: "物质槽位 1", exact: true }).click();
  await page.getByRole("button", { name: "添加过氧化氢", exact: true }).click();
  await page.getByRole("button", { name: "添加过氧化氢", exact: true }).click();
  await page.getByRole("button", { name: "添加二氧化锰", exact: true }).click();
  await page.getByRole("button", { name: "完成选择", exact: true }).click();
  await page.getByRole("button", { name: "混合", exact: true }).click();
  await page.getByRole("button", { name: "执行定量实验", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "将「二氧化锰」移至催化剂栏" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "将「二氧化锰」移至催化剂栏" })
    .click();
  await page.getByRole("button", { name: "执行定量实验", exact: true }).click();
  await expect(page.locator(".stoich-report")).toContainText("完全反应");

  expect(errors).toEqual([]);
});
