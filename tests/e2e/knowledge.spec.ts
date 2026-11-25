import { test, expect } from "@playwright/test";
test("browse local GitHub chemistry facts, searchable elements and source-linked transformations", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#book");
  await page.getByRole("button", { name: "118 种元素", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "元素资料库", exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "知识库搜索" }).fill("氦");
  await page.locator(".element-library-card").click();
  await expect(
    page.getByRole("heading", { name: "氦", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".element-summary")).toContainText("He");
  await page.getByRole("button", { name: "转化路径", exact: true }).click();
  await page.getByRole("textbox", { name: "知识库搜索" }).fill("H2O");
  await page.locator(".knowledge-reaction-list button").first().click();
  await expect(page.locator(".archive-detail h2")).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    /PubChem|GitHub|直接来源|commit/,
  );
  await expect(page.locator('main a[href^="http"]')).toHaveCount(0);
  await page.getByRole("button", { name: "物质资料", exact: true }).click();
  await expect(page.locator(".knowledge-species-grid button")).toHaveCount(24);
  await page.getByRole("button", { name: "学习任务", exact: true }).click();
  await page.locator(".lesson-choices button").first().click();
  await page.getByRole("button", { name: "检查答案", exact: true }).click();
  await expect(page.locator(".lesson-feedback")).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  for (const name of ["118 种元素", "物质资料", "转化路径", "学习任务"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name,
    ).toBe(true);
  }
  await page.getByRole("button", { name: "118 种元素", exact: true }).click();
  await page.screenshot({
    path: "output/playwright/knowledge-elements-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("new GitHub recipe is playable and its target appears in the warehouse", async ({
  page,
}) => {
  await page.goto("/#challenge");
  await page.getByRole("button", { name: /新物质：硫化亚铁/ }).click();
  await page.getByRole("button", { name: "添加铁", exact: true }).click();
  await page
    .getByRole("button", { name: "添加环状硫分子（S₈）", exact: true })
    .click();
  await page.getByRole("button", { name: "加热", exact: true }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "添加硫化亚铁", exact: true }),
  ).toBeVisible();
});
