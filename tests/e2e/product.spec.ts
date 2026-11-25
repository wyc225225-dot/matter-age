import { test, expect } from "@playwright/test";

test("all pages are real, responsive and free of runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "home",
      "lab",
      "book",
      "challenge",
      "tree",
      "eras",
      "achievements",
      "settings",
    ]) {
      await page.goto("/#" + route);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}px`,
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
  await page.goto("/#lab");
  await expect(
    page.getByRole("heading", { name: /自由探索实验室/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/playwright/desktop-lab.png",
    fullPage: true,
  });
  await page.goto("/#challenge");
  await page.screenshot({
    path: "output/playwright/desktop-challenges.png",
    fullPage: true,
  });
});

test("drag, clear, supply, catalyst, executable hint and encyclopedia alias search", async ({
  page,
}) => {
  await page.goto("/#lab");
  await page
    .getByRole("button", { name: "添加水", exact: true })
    .dragTo(page.getByRole("button", { name: "物质槽位 1" }));
  await expect(page.getByRole("button", { name: "移除水" })).toBeVisible();
  await page.getByRole("button", { name: "移除水" }).click();
  await expect(
    page.getByRole("button", { name: "开始实验", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /实验提示/ }).click();
  await expect(page.locator(".hint-message")).toContainText("自然材料");
  await page.getByRole("button", { name: /领取实验室标本/ }).click();
  const dialog = page.getByRole("dialog", { name: "标本补给" });
  await dialog.getByRole("button", { name: "过氧化氢 领取标本" }).click();
  await dialog.getByRole("button", { name: "二氧化锰 领取标本" }).click();
  await dialog.getByRole("button", { name: "碳酸氢钠 领取标本" }).click();
  await page.getByRole("button", { name: "关闭补给" }).click();
  await page.getByRole("button", { name: "添加过氧化氢", exact: true }).click();
  await page.getByRole("button", { name: "混合", exact: true }).click();
  await page
    .getByRole("combobox", { name: "选择催化剂" })
    .selectOption("manganese_dioxide");
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(page.locator(".result-area")).toContainText("过氧化氢催化分解");
  await expect(
    page.getByRole("button", { name: "添加氧气", exact: true }),
  ).toBeVisible();

  // Verify Encyclopedia alias search ("小苏打" -> 碳酸氢钠) and rich P0 detail
  await page.getByRole("button", { name: "物质图鉴", exact: true }).click();
  await page
    .getByRole("textbox", { name: "图鉴搜索", exact: true })
    .fill("小苏打");
  await expect(page.getByRole("button", { name: /碳酸氢钠/ })).toBeVisible();
  await page.getByRole("button", { name: /碳酸氢钠/ }).click();
  await expect(page.getByRole("dialog")).toContainText("物理性质与外观");
  await expect(page.getByRole("dialog")).not.toContainText(
    /PubChem|知识来源|参考资料/,
  );
  await page.keyboard.press("Escape");

  // Verify DiscoveryTree shows catalyst edge & focus controls cleanly
  await page.getByRole("button", { name: "发现网络", exact: true }).click();
  await expect(
    page.locator(".react-flow__node").filter({ hasText: "氧气" }),
  ).toBeVisible();
  await page.getByLabel("未知前沿").check();
  await expect(
    page.locator(".react-flow__node").filter({ hasText: "未知新物质" }).first(),
  ).toBeVisible();
});

test("production PWA serves PNG icons, reloads and performs experiments offline", async ({
  page,
  context,
}) => {
  await page.goto("http://127.0.0.1:4174/");
  await expect(page.getByRole("button", { name: "进入实验室" })).toBeVisible();

  // Check webmanifest includes PNG icons (192 & 512)
  const manifestResp = await page.request.get(
    "http://127.0.0.1:4174/manifest.webmanifest",
  );
  expect(manifestResp.ok()).toBe(true);
  const manifest = await manifestResp.json();
  expect(
    manifest.icons.some(
      (i: { sizes: string; type: string }) =>
        i.sizes === "192x192" && i.type === "image/png",
    ),
  ).toBe(true);
  expect(
    manifest.icons.some(
      (i: { sizes: string; type: string }) =>
        i.sizes === "512x512" && i.type === "image/png",
    ),
  ).toBe(true);
  const iconResp = await page.request.get(
    "http://127.0.0.1:4174/icons/icon-192.png",
  );
  expect(iconResp.ok()).toBe(true);
  expect(iconResp.headers()["content-type"]).toContain("image/png");

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "进入实验室" }).click();
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "冷却", exact: true }).click();
  await page.getByRole("button", { name: "开始实验", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "添加冰", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "发现网络", exact: true }).click();
  await expect(
    page.locator(".react-flow__node").filter({ hasText: "冰" }),
  ).toBeVisible();
  await context.setOffline(false);
});
