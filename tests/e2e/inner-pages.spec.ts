import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

const SHOT_DIR = "output/playwright/inner-polish";
mkdirSync(SHOT_DIR, { recursive: true });

test("Inner pages & workbench polish: mobile landscape warehouse usable, portrait above-the-fold controls, 1-tap catalyst chips, balancing picker, special challenge focus, and desktop fold", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // === 1. MOBILE LANDSCAPE (844x390): Warehouse materials MUST be visible & clickable (fixes collapsed 10px grid!) ===
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/#lab");
  const waterCard = page.getByRole("button", { name: "添加水", exact: true });
  await expect(waterCard).toBeVisible();
  const waterBox = await waterCard.boundingBox();
  expect(waterBox, "Water card bounding box in landscape").not.toBeNull();
  expect(waterBox!.height).toBeGreaterThanOrEqual(60);
  await page.screenshot({
    path: `${SHOT_DIR}/landscape-844-lab-materials.png`,
  });

  // Directly add water in landscape, switch to conditions, select 冷却, run -> Ice!
  await waterCard.click();
  await page.getByRole("tab", { name: /^条件/ }).click();
  await page.getByRole("button", { name: "冷却", exact: true }).click();
  await page.getByRole("button", { name: "执行当前实验", exact: true }).click();
  await expect(page.getByText("发现新物质", { exact: true })).toBeVisible();
  const skip = page.getByRole("button", { name: "跳过动画" });
  if (await skip.isVisible()) await skip.click();

  // Landscape advanced mode
  await page.getByRole("button", { name: /进阶模式/ }).click();
  await page.getByRole("tab", { name: /^材料/ }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.screenshot({
    path: `${SHOT_DIR}/landscape-844-lab-advanced.png`,
  });

  // === 2. MOBILE PORTRAIT (390x844): Compact lab, category pills, supply search, 1-tap catalyst chips, balancing picker ===
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#lab");
  await page.getByRole("button", { name: /简单模式/ }).click();

  // Conditions AND catalyst row visible on portrait screen without hunting
  await expect(
    page.getByRole("button", { name: "冷却", exact: true }),
  ).toBeInViewport();
  await expect(page.locator(".catalyst-row")).toBeInViewport();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-lab-empty.png`,
  });

  // Material picker category pills + supply search
  await page.getByRole("button", { name: "物质槽位 1", exact: true }).click();
  await expect(page.getByRole("group", { name: "物质类别筛选" })).toBeVisible();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-lab-picker.png`,
  });

  // Open supply modal, search & collect H2O2 + MnO2
  await page.getByRole("button", { name: /领取实验室标本/ }).click();
  const supplyDialog = page.getByRole("dialog", { name: "标本补给" });
  await expect(
    supplyDialog.getByRole("searchbox", { name: "搜索标本" }),
  ).toBeVisible();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-supply-modal.png`,
  });
  await supplyDialog
    .getByRole("searchbox", { name: "搜索标本" })
    .fill("过氧化氢");
  await supplyDialog.getByRole("button", { name: "过氧化氢 领取标本" }).click();
  await supplyDialog
    .getByRole("searchbox", { name: "搜索标本" })
    .fill("二氧化锰");
  await supplyDialog.getByRole("button", { name: "二氧化锰 领取标本" }).click();
  await page.getByRole("button", { name: "关闭补给" }).click();

  // Pick H2O2, tap MnO2 1-tap catalyst chip + 混合 condition -> execute -> success!
  await page.getByRole("button", { name: "物质槽位 1", exact: true }).click();
  await page.getByRole("button", { name: "添加过氧化氢", exact: true }).click();
  await page.getByRole("button", { name: "完成选择", exact: true }).click();
  await page.getByRole("button", { name: "混合", exact: true }).click();
  await page
    .getByRole("group", { name: "快捷选择催化剂" })
    .getByRole("button", { name: "二氧化锰", exact: true })
    .click();
  await expect(page.locator(".catalyst-active-pill")).toContainText("二氧化锰");
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-lab-catalyst-chips.png`,
  });
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(page.locator(".result-area")).toContainText("过氧化氢催化分解");
  if (await skip.isVisible()) await skip.click();

  // Advanced slots + balancing picker prev/next
  await page.getByRole("button", { name: /进阶模式/ }).click();
  await page.getByRole("button", { name: "物质槽位 1", exact: true }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "添加铁", exact: true }).click();
  await page.getByRole("button", { name: "完成选择", exact: true }).click();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-lab-advanced.png`,
  });

  await page.getByRole("button", { name: "方程式配平研究" }).click();
  await expect(
    page.getByRole("button", { name: "下一道方程式" }),
  ).toBeVisible();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-lab-balancing.png`,
  });

  // === 3. CHALLENGES LIST (3 tabs visible without cut-off) & SPECIAL CHALLENGE FOCUS (no double chrome) ===
  await page.goto("/#challenge");
  await expect(page.getByRole("button", { name: /特殊挑战/ })).toBeInViewport();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-challenges-list.png`,
  });

  await page.getByRole("button", { name: /特殊挑战/ }).click();
  await page.locator(".challenge-card").first().click();
  // List heading & duplicate back button must be hidden in focus mode
  await expect(page.getByRole("heading", { name: "目标挑战" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /返回挑战列表/ })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "返回关卡挑战" }),
  ).toBeVisible();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-special-challenge.png`,
  });

  // === 4. HISTORY CH.04, BOOK (Lv.2 badge non-overlap), WORLD, KNOWLEDGE ===
  await page.goto("/#history/hist_04");
  await page.getByRole("button", { name: /进入阶段 2/ }).click();
  await page.getByRole("button", { name: /必须由两种不同金属/ }).click();
  await page.getByRole("button", { name: /进入阶段 3/ }).click();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-history-ch04.png`,
  });

  await page.goto("/#book");
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-book.png`,
  });

  await page
    .getByRole("navigation", { name: "二级模式导航" })
    .getByRole("button", { name: "知识库", exact: true })
    .click();
  await expect(page.locator(".knowledge-species-grid")).toBeVisible();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-knowledge.png`,
  });

  await page.goto("/#world");
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-world.png`,
  });

  // === 5. DESKTOP (1280x800): Slots + Conditions + Catalyst + Run button ALL above the fold! ===
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#lab");
  await page.getByRole("button", { name: /简单模式/ }).click();
  await expect(
    page.getByRole("button", { name: "开始实验", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: `${SHOT_DIR}/desktop-1280-lab-simple.png`,
  });

  await page.getByRole("button", { name: /进阶模式/ }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "执行定量实验", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: `${SHOT_DIR}/desktop-1280-lab-advanced.png`,
  });

  expect(errors).toEqual([]);
});
