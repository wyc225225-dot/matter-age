import { test, expect } from "@playwright/test";

test("discover, repeat, refresh, search, import/export and multi-step isolated challenge", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /从一滴水/ })).toBeVisible();
  await page.getByRole("button", { name: "进入实验室" }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "冷却", exact: true }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(page.getByText("发现新物质", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "添加冰", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "跳过动画" }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(page.getByText("实验成功", { exact: true })).toBeVisible();
  await expect(page.getByText("发现新物质", { exact: true })).toHaveCount(0);

  // Switch notebook tab to completed reactions (real interactive tab)
  await page.getByRole("button", { name: /已成反应/ }).click();
  await expect(page.locator(".history-list")).toContainText("水的凝固");

  await page.reload();
  await expect(
    page.getByRole("button", { name: "添加冰", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "搜索物质", exact: true })
    .fill("H2O");
  await expect(
    page.getByRole("button", { name: "添加冰", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "添加铁", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "查看冰详情" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("同化学实体已收集形态");
  await page.getByRole("button", { name: "收藏物质" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Multi-step isolated challenge: c12 生石灰熟化之路 (CaCO3 -> CaO -> Ca(OH)2)
  await page.getByRole("button", { name: "目标挑战", exact: true }).click();
  await page.getByRole("button", { name: /生石灰熟化之路/ }).click();
  // Free-exploration discovery ("冰") must NOT leak into challenge inventory
  await expect(
    page.getByRole("button", { name: "添加冰", exact: true }),
  ).toHaveCount(0);
  // Step 1 hint must be localized & executable (no raw "high_heat")
  await page.getByRole("button", { name: /实验提示/ }).click();
  await page.getByRole("button", { name: /实验提示/ }).click();
  await page.getByRole("button", { name: /实验提示/ }).click();
  await expect(page.locator(".hint-message")).toContainText("高温");
  await expect(page.locator(".hint-message")).not.toContainText("high_heat");

  // Step 1: CaCO3 + high_heat -> CaO + CO2
  await page.getByRole("button", { name: "添加碳酸钙", exact: true }).click();
  await page.getByRole("button", { name: "高温", exact: true }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "添加氧化钙", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "跳过动画" }).click();

  // Quick-use CaO onto workbench + add water + mix -> Ca(OH)2
  await page.getByRole("button", { name: "快速使用氧化钙" }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "混合", exact: true }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(page.getByText(/目标达成！成绩已保存/)).toBeVisible();
  await page.getByRole("button", { name: "返回自由探索" }).click();
  // Challenge products (氧化钙 / 氢氧化钙) must NOT leak into free-exploration inventory
  await expect(
    page.getByRole("button", { name: "添加氧化钙", exact: true }),
  ).toHaveCount(0);

  // Export, reset with confirmation, cancel, reset, re-import
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出存档", exact: true }).click();
  const downloaded = await dl;
  await expect(downloaded.suggestedFilename()).toMatch(/matter-age/);
  await page.getByRole("button", { name: "重置进度", exact: true }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "确认清除全部进度" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "重置进度", exact: true }).click();
  await page.getByRole("button", { name: "确认清除全部进度" }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles((await downloaded.path())!);
  await expect(page.getByRole("status")).toHaveText("存档已校验并恢复。");
  await page.getByRole("button", { name: "自由探索", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "添加冰", exact: true }),
  ).toBeVisible();
});

test("360px layout and true missing-condition feedback", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/#lab");
  await page.getByRole("button", { name: "物质槽位 1", exact: true }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "完成选择", exact: true }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(page.getByText(/组合有已收录路径/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "output/playwright/mobile-lab.png",
    fullPage: true,
  });
});
