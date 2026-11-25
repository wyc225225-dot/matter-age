import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

const SHOT_DIR = "output/playwright/reaction-gaps";
mkdirSync(SHOT_DIR, { recursive: true });

test("real entry: H2 + Cl2 missing light -> light -> HCl(g), advanced 1:1:2 stoichiometry, and honest knowledge coverage", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#lab");

  // 1. Real entry to obtain H2 (water + electricity) and Cl2 + Ca (specimen supply)
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "通电", exact: true }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "添加氢气", exact: true }),
  ).toBeVisible();
  const skip = page.getByRole("button", { name: "跳过动画" });
  if (await skip.isVisible()) await skip.click();

  await page.getByRole("button", { name: /领取实验室标本/ }).click();
  const supplyDialog = page.getByRole("dialog", { name: "标本补给" });
  await expect(supplyDialog).toBeVisible();
  await supplyDialog.getByRole("button", { name: /氯气/ }).click();
  await supplyDialog.getByRole("button", { name: /钙/ }).first().click();
  await supplyDialog.getByRole("button", { name: "关闭补给" }).click();

  // 2. Put H2 + Cl2 on bench WITHOUT light -> must report missing light (光照), NOT unmatched
  await page.getByRole("button", { name: "清空台面" }).click();
  await page.getByRole("button", { name: "添加氢气", exact: true }).click();
  await page.getByRole("button", { name: "添加氯气", exact: true }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();

  await expect(page.locator(".result-area")).toContainText("缺少：光照");
  await expect(
    page.getByRole("button", { name: "光照", exact: true }),
  ).toHaveClass(/highlight-cond/);
  await page.screenshot({
    path: `${SHOT_DIR}/desktop-h2-cl2-missing-light.png`,
    fullPage: false,
  });

  // 3. Select 光照 -> run -> produces gaseous 氯化氢 (NOT 盐酸)
  await page.getByRole("button", { name: "光照", exact: true }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(page.locator(".result-area")).toContainText("发现新物质");
  await expect(page.locator(".result-products")).toContainText("氯化氢");
  await expect(page.locator(".result-products")).not.toContainText("盐酸");
  await expect(page.locator(".result-area .equation")).toContainText(
    "H2 + Cl2 → 2HCl",
  );
  await expect(page.locator(".knowledge-card")).toContainText("氯化氢");
  await expect(page.locator(".knowledge-card")).toContainText("短波");
  if (await skip.isVisible()) await skip.click();
  await page.screenshot({
    path: `${SHOT_DIR}/desktop-h2-cl2-light-success.png`,
    fullPage: false,
  });

  // 4. Cl2 + H2O reversible equilibrium mixture (Simple succeeds -> 氯水; Advanced refuses 100% conversion!)
  await page.getByRole("button", { name: "清空台面" }).click();
  await page.getByRole("button", { name: "添加氯气", exact: true }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "混合", exact: true }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(page.locator(".result-products")).toContainText("氯水");
  await expect(page.locator(".result-area .equation")).toContainText("⇌");
  if (await skip.isVisible()) await skip.click();

  // 4b. Unopened knowledge path feedback vs missing condition (Ca + Cl2 is equation-only in KB)
  await page.getByRole("button", { name: "清空台面" }).click();
  await page.getByRole("button", { name: "添加钙", exact: true }).click();
  await page.getByRole("button", { name: "添加氯气", exact: true }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(page.locator(".result-area")).toContainText("尚未收录可玩规则");
  await expect(page.locator(".result-area")).toContainText(
    "资料路径 · 尚未开放实验台模拟",
  );

  // 5. Switch to Advanced Mode -> verify 1:1:2 stoichiometry & conservation for H2 + Cl2 + light
  await page.getByRole("button", { name: /进阶模式/ }).click();
  await page.getByRole("button", { name: "添加氢气", exact: true }).click();
  await page.getByRole("button", { name: "添加氯气", exact: true }).click();
  await page.getByRole("button", { name: "光照", exact: true }).click();
  await page.getByRole("button", { name: "执行定量实验", exact: true }).click();

  const report = page.locator(".result-area");
  await expect(report).toContainText("完全反应");
  await expect(report).toContainText("氯化氢");
  await expect(report).toContainText("2 份");
  await expect(report).toContainText("1 份 = 1 mol");
  await page.screenshot({
    path: `${SHOT_DIR}/desktop-h2-cl2-advanced-112.png`,
    fullPage: false,
  });

  // 5b. Advanced Mode Cl2 + H2O MUST refuse 100% conversion as reversible equilibrium mixture
  await page.getByRole("button", { name: "清空台面" }).click();
  await page.getByRole("button", { name: "添加氯气", exact: true }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "混合", exact: true }).click();
  await page.getByRole("button", { name: "执行定量实验", exact: true }).click();
  await expect(page.locator(".result-area")).toContainText("可逆平衡混合体系");
  await expect(page.locator(".result-area")).toContainText("100%");

  // 6. Check Knowledge Base honest coverage badges & zero provenance leaks
  await page.goto("/#book");
  await page.getByRole("button", { name: "转化路径", exact: true }).click();
  await expect(page.locator(".archive-note")).toContainText("435 条转化资料");
  await expect(page.locator(".archive-note")).toContainText(
    "尚未开放实验台模拟",
  );

  const kbSearch = page.getByRole("textbox", { name: "知识库搜索" });
  await kbSearch.fill("氯化氢");
  const h2Cl2Row = page
    .locator(".knowledge-reaction-list button")
    .filter({ hasText: "1份氢气 + 1份氯气 → 2份氯化氢" })
    .first();
  await expect(h2Cl2Row).toBeVisible();
  await expect(h2Cl2Row).toContainText("已开放实验台");
  await expect(h2Cl2Row).toContainText("光照");
  await h2Cl2Row.click();
  await expect(page.locator(".knowledge-coverage-box")).toContainText(
    "实验台已开放模拟",
  );
  await page.screenshot({
    path: `${SHOT_DIR}/desktop-kb-h2-cl2-playable.png`,
    fullPage: false,
  });

  await page.getByRole("button", { name: "返回列表" }).click();
  await kbSearch.fill("臭氧");
  const o3Row = page
    .locator(".knowledge-reaction-list button")
    .filter({ hasText: "臭氧 → 氧原子 + 氧气" })
    .first();
  await expect(o3Row).toBeVisible();
  await expect(o3Row).toContainText("资料路径·未开放模拟");
  await o3Row.click();
  await expect(page.locator(".knowledge-coverage-box")).toContainText(
    "资料路径 · 尚未开放实验台模拟",
  );
  await page.screenshot({
    path: `${SHOT_DIR}/desktop-kb-o3-unopened.png`,
    fullPage: false,
  });

  // Ensure zero upstream provenance/provider/commit leaks on player page
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(
    /element-nuwa|element-atlas|752e6ba|github\.com/i,
  );
  expect(errors).toEqual([]);
});

test("light condition button is accessible and functional on mobile portrait (390x844, 360x800) and landscape (844x390)", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  // Portrait 390x844
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#lab");

  // Unlock H2 via electrolysis & Cl2 via specimen supply using real mobile UI
  await page.getByRole("button", { name: "物质槽位 1", exact: true }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "完成选择", exact: true }).click();
  await page.getByRole("button", { name: "通电", exact: true }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  const skip = page.getByRole("button", { name: "跳过动画" });
  if (await skip.isVisible()) await skip.click();

  await page.getByRole("button", { name: /选物质/ }).click();
  await page.getByRole("button", { name: /领取实验室标本/ }).click();
  const supplyDialog = page.getByRole("dialog", { name: "标本补给" });
  await supplyDialog.getByRole("button", { name: /氯气/ }).click();
  await supplyDialog.getByRole("button", { name: "关闭补给" }).click();

  // Select H2 + Cl2 in portrait picker
  await page.getByRole("button", { name: "清空台面" }).click();
  await page.getByRole("button", { name: /选物质/ }).click();
  await page.getByRole("button", { name: "添加氢气", exact: true }).click();
  await page.getByRole("button", { name: "添加氯气", exact: true }).click();
  await page.getByRole("button", { name: "完成选择", exact: true }).click();

  // Verify 光照 button is visible and within viewport width (zero horizontal overflow)
  const lightBtnPortrait = page.getByRole("button", {
    name: "光照",
    exact: true,
  });
  await expect(lightBtnPortrait).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  // Trigger missing-light feedback in portrait, then select light and succeed
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(page.locator(".result-area")).toContainText("缺少：光照");
  await lightBtnPortrait.click();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-light-condition.png`,
    fullPage: false,
  });
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(page.locator(".result-products")).toContainText("氯化氢");
  if (await skip.isVisible()) await skip.click();

  // Check 360x800 narrow portrait zero horizontal overflow
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(lightBtnPortrait).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  // Rotate to Landscape 844x390 and verify 光照 button is accessible in conditions tab
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("tab", { name: /^条件/ }).click();
  const lightBtnLandscape = page.getByRole("button", {
    name: "光照",
    exact: true,
  });
  await expect(lightBtnLandscape).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${SHOT_DIR}/landscape-844-light-condition.png`,
    fullPage: false,
  });

  // Execute in landscape to confirm full functionality
  await page.getByRole("button", { name: "执行当前实验" }).click();
  await expect(page.locator(".result-products")).toContainText("氯化氢");
  expect(errors).toEqual([]);
});
