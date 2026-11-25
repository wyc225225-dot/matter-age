import { test, expect } from "@playwright/test";

test("mobile selection keeps materials in view and returns to the workbench", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#lab");
  await page.getByRole("button", { name: "物质槽位 1", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "选择实验物质" });
  await expect(picker).toBeVisible();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await expect(
    picker.getByRole("button", { name: "移除已选水", exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "搜索物质", exact: true }).fill("铁");
  await page.getByRole("button", { name: "添加铁", exact: true }).click();
  await expect(picker.locator(".picker-selection")).toContainText("2/4");
  await page.screenshot({
    path: "output/playwright/mobile-material-picker.png",
  });
  await page.getByRole("button", { name: "完成选择", exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "移除水", exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "移除铁", exact: true }).click();
  await page.getByRole("button", { name: "冷却", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(
    page.getByRole("button", { name: "执行当前实验", exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "执行当前实验", exact: true }).click();
  await expect(page.getByText("发现新物质", { exact: true })).toBeVisible();
  await page.screenshot({ path: "output/playwright/mobile-workbench.png" });
  await page.locator(".dock-materials").click();
  await page.getByRole("textbox", { name: "搜索物质", exact: true }).fill("冰");
  await expect(
    page.getByRole("button", { name: "添加冰", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator(".warehouse")).toBeVisible();
  await expect(page.locator(".mobile-experiment-dock")).toBeHidden();
});
