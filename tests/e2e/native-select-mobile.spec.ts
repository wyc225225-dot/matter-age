import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const SHOT_DIR = "output/playwright/native-select-fix";
mkdirSync(SHOT_DIR, { recursive: true });

async function assertNoNativeSelects(page: Page, context: string) {
  const count = await page.locator("select").count();
  expect(count, `Expected zero native <select> in ${context}`).toBe(0);
}

async function assertPopoverWithinViewport(
  page: Page,
  viewport: { width: number; height: number },
  label: string,
  minLeft = 4,
) {
  const popover = page.locator('[data-compact-select-popover="true"]');
  await expect(popover, `Expanded popover visible for ${label}`).toBeVisible();
  const box = await popover.boundingBox();
  expect(box, `Bounding box for ${label}`).not.toBeNull();
  expect(box!.x, `${label} left inside viewport`).toBeGreaterThanOrEqual(
    minLeft,
  );
  expect(box!.y, `${label} top inside viewport`).toBeGreaterThanOrEqual(4);
  expect(
    box!.x + box!.width,
    `${label} right inside viewport`,
  ).toBeLessThanOrEqual(viewport.width - 4);
  expect(
    box!.y + box!.height,
    `${label} bottom inside viewport`,
  ).toBeLessThanOrEqual(viewport.height - 4);
  // Must remain a compact contextual popover, NOT a giant full-screen blocking panel
  expect(
    box!.height,
    `${label} compact height leaves context visible`,
  ).toBeLessThan(viewport.height * 0.72);
  // Must NOT spawn a full-screen dimming backdrop conflict
  const backdropCount = await page.locator(".compact-select-backdrop").count();
  expect(backdropCount).toBe(0);
  return box!;
}

test("Mobile Portrait (390x844): zero native selects, real expanded popovers keep context, keyboard/Escape/focus-restore, and filter/sort state persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const vp = { width: 390, height: 844 };
  await page.setViewportSize(vp);

  // 1. Laboratory Material Picker: category pills & sort chip preserve selected slots & done footer
  await page.goto("/#lab");
  await assertNoNativeSelects(page, "portrait lab bench");

  await page.getByRole("button", { name: "物质槽位 1", exact: true }).click();
  await assertNoNativeSelects(page, "portrait lab material picker");
  await expect(page.locator(".picker-selection")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "完成选择", exact: true }),
  ).toBeVisible();

  // Filter by category pill & toggle sort pill while context stays unobstructed
  const catGroup = page.getByRole("group", { name: "物质类别筛选" });
  await catGroup.getByRole("button", { name: "自然材料", exact: true }).click();
  await expect(
    catGroup.getByRole("button", { name: "自然材料", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const sortBtn = page.getByRole("button", { name: "切换物质排序" });
  await sortBtn.click();
  await expect(sortBtn).toHaveAttribute("aria-pressed", "true");
  await expect(sortBtn).toContainText("按名称");

  // Add water and confirm selected slots & footer remain visible simultaneously
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await expect(page.locator(".picker-selection")).toContainText(
    "实验台已选 1/4",
  );
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-lab-picker-filtered.png`,
  });
  await page.getByRole("button", { name: "完成选择", exact: true }).click();

  // 2. Laboratory Balancing: searchable CompactSelect real expanded state, Escape + focus restore, search + keyboard select
  await page.getByRole("button", { name: /进阶模式/ }).click();
  await page.getByRole("button", { name: "方程式配平研究" }).click();
  await assertNoNativeSelects(page, "portrait balancing studio");

  const balTrigger = page.getByRole("combobox", { name: "选择配平方程式" });
  await balTrigger.click();
  await assertPopoverWithinViewport(page, vp, "portrait balancing picker");
  // Surrounding balancing workspace header & studio remain visible
  await expect(page.locator(".equation-studio")).toBeVisible();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-balancing-expanded.png`,
  });

  // Escape closes popover and restores focus to trigger
  await page.keyboard.press("Escape");
  await expect(balTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(balTrigger).toBeFocused();

  // Reopen via keyboard ArrowDown, search for R005, select via Enter, verify state & focus restore
  await page.keyboard.press("ArrowDown");
  await expect(balTrigger).toHaveAttribute("aria-expanded", "true");
  const balSearch = page.getByRole("searchbox", {
    name: "搜索选择配平方程式",
  });
  await balSearch.fill("R005");
  await page.keyboard.press("Enter");
  await expect(balTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(balTrigger).toContainText("R005");
  await expect(balTrigger).toBeFocused();

  // 3. Encyclopedia: CompactSelect category grid popover + 2-option inline sort toggle
  await page.goto("/#book");
  await assertNoNativeSelects(page, "portrait encyclopedia");
  const bookCat = page.getByRole("combobox", { name: "图鉴分类" });
  await bookCat.click();
  await assertPopoverWithinViewport(page, vp, "portrait encyclopedia category");
  await expect(page.locator(".encyclopedia-grid")).toBeVisible();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-book-category-expanded.png`,
  });
  await page.getByRole("option", { name: "自然材料", exact: true }).click();
  await expect(bookCat).toContainText("自然材料");
  await expect(bookCat).toBeFocused();
  await expect(
    page.locator(".encyclopedia-card").filter({ hasText: "水" }).first(),
  ).toBeVisible();

  const sortGroup = page.getByRole("group", { name: "图鉴排序" });
  await sortGroup.getByRole("button", { name: "发现时间" }).click();
  await expect(
    sortGroup.getByRole("button", { name: "发现时间" }),
  ).toHaveAttribute("aria-pressed", "true");

  // 4. KnowledgeLibrary: Elements CompactSelect grid popover & Transformations 5-pill bar
  await page
    .getByRole("navigation", { name: "二级模式导航" })
    .getByRole("button", { name: "知识库", exact: true })
    .click();
  await page.getByRole("button", { name: "118 种元素", exact: true }).click();
  await assertNoNativeSelects(page, "portrait knowledge elements");

  const kbElFilter = page.getByRole("combobox", { name: "知识库筛选" });
  await kbElFilter.click();
  await assertPopoverWithinViewport(page, vp, "portrait knowledge elements");
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-kb-elements-expanded.png`,
  });
  await page.getByRole("option", { name: "稀有气体", exact: true }).click();
  await expect(kbElFilter).toContainText("稀有气体");
  await expect(kbElFilter).toBeFocused();
  await expect(
    page.locator(".element-library-card").filter({ hasText: "He" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "转化路径", exact: true }).click();
  await assertNoNativeSelects(page, "portrait knowledge transformations");
  const txFilterGroup = page.getByRole("group", { name: "知识库筛选" });
  await txFilterGroup
    .getByRole("button", { name: "已开放实验台", exact: true })
    .click();
  await expect(
    txFilterGroup.getByRole("button", { name: "已开放实验台", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  // 5. DiscoveryTree: portrait filter toolbar CompactSelect expanded state
  await page.goto("/#tree");
  const filterToggle = page.getByRole("button", { name: /筛选/ });
  await expect(filterToggle).toBeVisible();
  await assertNoNativeSelects(page, "portrait discovery tree");
  await filterToggle.click();
  const treeCat = page.getByRole("combobox", { name: "发现网络类别" });
  await treeCat.click();
  await assertPopoverWithinViewport(page, vp, "portrait tree category");
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-tree-category-expanded.png`,
  });
  await page.getByRole("option", { name: "气体", exact: true }).click();
  await expect(treeCat).toContainText("气体");
  await expect(treeCat).toBeFocused();

  // 6. History Ch.01 concise opening layout (unified era, no fictional narration label, expandable facts) + inline 3-gas radiogroup & Ch.02 inline 3-unit radiogroup
  await page.goto("/#history/hist_01");
  const openingPanel = page.locator(".history-opening-panel");
  await expect(openingPanel).toBeVisible();
  await expect(openingPanel).toContainText("1770 年代");
  await expect(openingPanel).not.toContainText(
    /虚构教学旁白|时代背景线索（|RESEARCH QUESTION|18 世纪 70 年代/,
  );
  const factsToggle = page.getByRole("button", { name: /时代背景/ });
  await expect(factsToggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: "开始提出假设" }),
  ).toBeInViewport();
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-history-ch01-opening.png`,
  });
  await factsToggle.click();
  await expect(factsToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".history-facts-list")).toContainText("1770 年代");
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-history-ch01-opening-facts-expanded.png`,
  });

  await page.getByRole("button", { name: "开始提出假设" }).click();
  await page.getByRole("button", { name: /助燃气体将显著增强燃烧/ }).click();
  await page.getByRole("button", { name: "开始实验" }).click();
  await assertNoNativeSelects(page, "portrait history ch01");
  const gasGroupA = page.getByRole("radiogroup", { name: "气瓶甲气体指认" });
  await expect(gasGroupA).toBeVisible();
  await gasGroupA.getByRole("radio", { name: /二氧化碳/ }).click();
  await expect(
    gasGroupA.getByRole("radio", { name: /二氧化碳/ }),
  ).toHaveAttribute("aria-checked", "true");
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-history-ch01-radio.png`,
  });

  await page.goto("/#history/hist_02");
  await page.getByRole("button", { name: "章节背景与材料" }).click();
  await page.getByRole("button", { name: "进阶定量模式" }).click();
  await page.getByRole("button", { name: "关闭章节信息" }).click();
  await page.getByRole("button", { name: "开始提出假设" }).click();
  await page.getByRole("button", { name: /天平总示数保持不变/ }).click();
  await page.getByRole("button", { name: "开始实验" }).click();
  await page
    .getByRole("button", { name: "放置精密天平并执行称量" })
    .first()
    .click();
  await page.getByRole("button", { name: "放置精密天平并执行称量" }).click();
  await page.getByRole("button", { name: /密闭系统/ }).click();
  await page.getByRole("button", { name: "放置精密天平并执行称量" }).click();
  await page.getByRole("tab", { name: "2. 守恒结论" }).click();
  await assertNoNativeSelects(page, "portrait history ch02");
  const unitGroup = page.getByRole("radiogroup", { name: "质量单位" });
  await expect(unitGroup).toBeVisible();
  await unitGroup.getByRole("radio", { name: /kg/ }).click();
  await expect(unitGroup.getByRole("radio", { name: /kg/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.screenshot({
    path: `${SHOT_DIR}/portrait-390-history-ch02-unit.png`,
  });

  expect(errors).toEqual([]);
});

test("Mobile Landscape (844x390): zero native selects, expanded popovers stay inside short viewport and clear left rail", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const vp = { width: 844, height: 390 };
  await page.setViewportSize(vp);

  // 1. Landscape Lab materials pills & sort chip
  await page.goto("/#lab");
  await assertNoNativeSelects(page, "landscape lab materials");
  const catGroup = page.getByRole("group", { name: "物质类别筛选" });
  await catGroup.getByRole("button", { name: "自然材料", exact: true }).click();
  await expect(
    catGroup.getByRole("button", { name: "自然材料", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "切换物质排序" }).click();
  await expect(
    page.getByRole("button", { name: "切换物质排序" }),
  ).toHaveAttribute("aria-pressed", "true");

  // 2. Landscape Balancing searchable CompactSelect expanded state
  await page.getByRole("button", { name: /进阶模式/ }).click();
  await page.getByRole("button", { name: "方程式配平研究" }).click();
  await assertNoNativeSelects(page, "landscape balancing");
  const balTrigger = page.getByRole("combobox", { name: "选择配平方程式" });
  await balTrigger.click();
  await assertPopoverWithinViewport(page, vp, "landscape balancing picker", 60);
  await page.screenshot({
    path: `${SHOT_DIR}/landscape-844-balancing-expanded.png`,
  });
  await page.keyboard.press("Escape");
  await expect(balTrigger).toBeFocused();

  // 3. Landscape Encyclopedia CompactSelect expanded state
  await page.goto("/#book");
  await assertNoNativeSelects(page, "landscape encyclopedia");
  const bookCat = page.getByRole("combobox", { name: "图鉴分类" });
  await bookCat.click();
  await assertPopoverWithinViewport(
    page,
    vp,
    "landscape encyclopedia category",
    60,
  );
  await page.screenshot({
    path: `${SHOT_DIR}/landscape-844-book-category-expanded.png`,
  });
  await page.getByRole("option", { name: "气体", exact: true }).click();
  await expect(bookCat).toContainText("气体");

  // 4. Landscape DiscoveryTree side-pane CompactSelect expanded state (must not clip!)
  await page.goto("/#tree");
  await assertNoNativeSelects(page, "landscape discovery tree");
  const treeCat = page.getByRole("combobox", { name: "发现网络类别" });
  await treeCat.click();
  await assertPopoverWithinViewport(page, vp, "landscape tree category", 60);
  await page.screenshot({
    path: `${SHOT_DIR}/landscape-844-tree-category-expanded.png`,
  });
  await page.keyboard.press("Escape");
  await expect(treeCat).toBeFocused();

  // 5. Landscape History Ch.01 concise opening layout
  await page.goto("/#history/hist_01");
  await expect(page.locator(".history-opening-panel")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "开始提出假设" }),
  ).toBeInViewport();
  await page.screenshot({
    path: `${SHOT_DIR}/landscape-844-history-ch01-opening.png`,
  });

  expect(errors).toEqual([]);
});
