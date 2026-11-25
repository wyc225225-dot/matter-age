import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test("V1.5 real preview advanced mode: 3H2+2O2, balancing, finite catalyst challenge, Lv.2 research, inspector, v1 migration & 360px", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // 1. Home displays 3 difficulty modes with Hard locked; enter Advanced Mode directly (real preview rules)
  await page.goto("/");
  await expect(page.getByRole("button", { name: /困难模式/ })).toBeDisabled();
  await page.getByRole("button", { name: /进阶模式/ }).click();

  // 2. Real preview free exploration: electrolyze 4 water -> unlock H2 & O2, then test 1 H2 + 1 O2 (insufficient), missing condition, and 3 H2 + 2 O2 (partial)
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("spinbutton", { name: "水投入份数" }).fill("4");
  await page.getByRole("button", { name: "通电", exact: true }).click();
  await page.getByRole("button", { name: "执行定量实验" }).click();
  await expect(page.locator(".stoich-report")).toContainText("完全反应");
  await page.getByRole("button", { name: "跳过动画" }).click();

  // Test insufficient portions: 1 H2 + 1 O2 (ignite) -> 份数不足
  await page.getByRole("button", { name: "清空台面" }).click();
  await page.getByRole("button", { name: "添加氢气", exact: true }).click();
  await page.getByRole("button", { name: "添加氧气", exact: true }).click();
  await page.getByRole("button", { name: "点燃", exact: true }).click();
  await page.getByRole("button", { name: "执行定量实验" }).click();
  await expect(page.locator(".stoich-report")).toContainText("份数不足");

  // Test missing condition: 3 H2 + 2 O2 without 点燃 -> 缺条件
  await page.getByRole("button", { name: "添加氢气", exact: true }).click();
  await page.getByRole("button", { name: "增加氢气份数" }).click();
  await expect(
    page.getByRole("spinbutton", { name: "氢气投入份数" }),
  ).toHaveValue("3");
  await page.getByRole("spinbutton", { name: "氧气投入份数" }).fill("2");
  await page.getByRole("button", { name: "点燃", exact: true }).click(); // deselect
  await page.getByRole("button", { name: "执行定量实验" }).click();
  await expect(page.locator(".result-area")).toContainText("缺少：点燃");

  // Execute 3 H2 + 2 O2 + 点燃 -> extent 1, 2 H2O produced, 1 H2 + 1 O2 remaining, 60% portion vs mass util, 1 mol basis
  await page.getByRole("button", { name: "点燃", exact: true }).click();
  await page.getByRole("button", { name: "执行定量实验" }).click();
  await expect(page.locator(".stoich-report")).toContainText("部分反应");
  await expect(page.locator(".stoich-report")).toContainText("限制反应物");
  await expect(page.locator(".stoich-report")).toContainText("整数份数利用率");
  await expect(page.locator(".stoich-report")).toContainText("理论质量利用率");
  await expect(page.locator(".stoich-report")).toContainText("60%");
  await expect(page.locator(".stoich-report")).toContainText(
    "按 1 份 = 1 mol 理论基准换算",
  );
  await expect(page.locator(".stoich-report")).toContainText(
    "原子与电荷守恒（含剩余物）",
  );
  await page.getByRole("button", { name: "跳过动画" }).click();

  await page.screenshot({
    path: "output/playwright/desktop-advanced.png",
    fullPage: true,
  });

  // 3. Test salt crystal modelKind ("离子晶体化学式单位") & mixture strategy rejection (NaCl + H2O -> unsupported_strategy)
  await page.getByRole("button", { name: "清空台面" }).click();
  await page.getByRole("button", { name: /领取实验室标本/ }).click();
  const supplyDialog = page.getByRole("dialog", { name: "标本补给" });
  await supplyDialog.getByRole("button", { name: "盐酸 领取标本" }).click();
  await supplyDialog.getByRole("button", { name: "氧化钠 领取标本" }).click();
  await page.getByRole("button", { name: "关闭补给" }).click();
  // Synthesize NaCl via Na2O + 2HCl -> 2NaCl + H2O
  await page.getByRole("button", { name: "添加氧化钠", exact: true }).click();
  await page.getByRole("button", { name: "添加盐酸", exact: true }).click();
  await page.getByRole("spinbutton", { name: "盐酸投入份数" }).fill("2");
  await page.getByRole("button", { name: "混合", exact: true }).click();
  await page.getByRole("button", { name: "执行定量实验" }).click();
  await page.getByRole("button", { name: "跳过动画" }).click();

  await page.getByRole("button", { name: "清空台面" }).click();
  await page.getByRole("button", { name: "添加氯化钠", exact: true }).click();
  await expect(page.locator(".advanced-slot").first()).toContainText(
    "离子晶体化学式单位",
  );
  await page.getByRole("button", { name: "添加水", exact: true }).click();
  await page.getByRole("button", { name: "混合", exact: true }).click();
  await page.getByRole("button", { name: "执行定量实验" }).click();
  await expect(page.locator(".result-area")).toContainText(
    "不适用纯物质整数化学计量计算",
  );

  // 4. Real Equation Balancing Studio on r006: proportional (4:2 -> 4) then simplest (2:1 -> 2)
  await page.getByRole("button", { name: "方程式配平研究" }).click();
  await page.getByRole("combobox", { name: "选择配平方程式" }).click();
  await page.getByRole("option", { name: /R006/ }).click();
  await page.getByRole("spinbutton", { name: "氢气反应物系数" }).fill("4");
  await page.getByRole("spinbutton", { name: "氧气反应物系数" }).fill("2");
  await page.getByRole("spinbutton", { name: "水产物系数" }).fill("4");
  await page.getByRole("button", { name: "检验配平" }).click();
  await expect(page.locator(".studio-feedback")).toContainText(
    "等比例配平成立",
  );
  await expect(page.locator(".studio-feedback")).toContainText("公约数 2");

  await page.getByRole("spinbutton", { name: "氢气反应物系数" }).fill("2");
  await page.getByRole("spinbutton", { name: "氧气反应物系数" }).fill("1");
  await page.getByRole("spinbutton", { name: "水产物系数" }).fill("2");
  await page.getByRole("button", { name: "检验配平" }).click();
  await expect(page.locator(".studio-feedback")).toContainText("最简整数比");

  // 5. Real 30 Quantitative Challenges: multi-step finite inventory + preserved catalyst (q23) & reset
  await page.getByRole("button", { name: "目标挑战", exact: true }).click();
  await page.getByRole("button", { name: /进阶定量挑战/ }).click();
  await page.getByRole("button", { name: /催化留存：两步制氧化镁/ }).click();
  await expect(page.locator(".warehouse")).toContainText("剩 4 份");
  await page.getByRole("button", { name: "添加过氧化氢", exact: true }).click();
  await page.getByRole("spinbutton", { name: "过氧化氢投入份数" }).fill("4");
  await page.getByRole("button", { name: "混合", exact: true }).click();
  await page
    .getByRole("group", { name: "选择催化剂" })
    .getByRole("button", { name: "二氧化锰", exact: true })
    .click();
  await page.getByRole("button", { name: "执行定量实验" }).click();
  await page.getByRole("button", { name: "跳过动画" }).click();

  await expect(page.locator(".finite-catalyst-note")).toContainText("二氧化锰");
  await expect(
    page.getByRole("button", { name: "添加氧气", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "添加镁", exact: true }).click();
  await page.getByRole("spinbutton", { name: "镁投入份数" }).fill("4");
  await page.getByRole("button", { name: "添加氧气", exact: true }).click();
  await page.getByRole("spinbutton", { name: "氧气投入份数" }).fill("2");
  await page.getByRole("button", { name: "混合", exact: true }).click();
  await page.getByRole("button", { name: "点燃", exact: true }).click();
  await page
    .getByRole("group", { name: "选择催化剂" })
    .getByRole("button", { name: "不使用", exact: true })
    .click();
  await page.getByRole("button", { name: "执行定量实验" }).click();
  await expect(page.getByText(/定量挑战达成/)).toBeVisible();

  await page.getByRole("button", { name: "重置关卡库存" }).click();
  await expect(
    page.getByRole("button", { name: "添加过氧化氢", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "返回自由探索" }).click();

  // 6. Encyclopedia Lv.2 Quantitative Research & DiscoveryTree reaction node inspector
  await page.getByRole("button", { name: "物质图鉴", exact: true }).click();
  await page.getByRole("button", { name: "已定量研究", exact: true }).click();
  await expect(page.getByRole("button", { name: /水/ }).first()).toBeVisible();
  await page.getByRole("button", { name: /水/ }).first().click();
  await expect(page.getByRole("dialog")).toContainText(
    "已完成定量实验或配平研究",
  );
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "发现网络", exact: true }).click();
  await page
    .locator(".react-flow__node")
    .filter({ hasText: "氢的燃烧" })
    .click();
  await expect(
    page.getByRole("region", { name: "反应节点研究详情" }),
  ).toContainText("反应物比例");
  await expect(
    page.getByRole("region", { name: "反应节点研究详情" }),
  ).toContainText("氢氧 2:1 合成水");

  // 7. Browser v1 save JSON import migration test
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const v1File = join(tmpdir(), `matter-age-v1-migration-${Date.now()}.json`);
  writeFileSync(
    v1File,
    JSON.stringify({
      version: 1,
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
      challengeBest: { c1: { stars: 3, attempts: 1 } },
      challengeRun: null,
    }),
  );
  await page.locator("input[type=file]").setInputFiles(v1File);
  await expect(page.getByRole("status")).toHaveText("存档已校验并恢复。");
  await page.getByRole("button", { name: "自由探索", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "添加冰", exact: true }),
  ).toBeVisible();

  // 8. 360px & 768px responsive check in Advanced Mode
  for (const width of [360, 768]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/#lab");
    await page.getByRole("button", { name: /进阶模式/ }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `advanced lab at ${width}px`,
    ).toBe(true);
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({
    path: "output/playwright/mobile-advanced.png",
    fullPage: true,
  });

  expect(errors).toEqual([]);
});
