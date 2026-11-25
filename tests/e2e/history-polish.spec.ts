import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

mkdirSync("output/playwright/history-polish", { recursive: true });

test("Challenge History full 5-chapter real walkthrough (incl. Ch02 Advanced + reload persistence + archives + museum/tech links + screenshots)", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/#history");
  await expect(
    page.getByRole("heading", { name: /挑战历史：化学史时间线/ }),
  ).toBeVisible();
  await expect(page.locator(".history-card")).toHaveCount(10);
  await page.screenshot({
    path: "output/playwright/history-polish/desktop-timeline.png",
    fullPage: true,
  });

  // === CHAPTER 01: 空气中的秘密 (Simple + Evidence-gap check + Mid-chapter reload persistence) ===
  await page
    .locator(".history-card")
    .filter({ hasText: "空气中的秘密" })
    .getByRole("button", { name: /进入历史现场/ })
    .click();
  // Stage 3/4/5 must be disabled before completing Stage 1/2
  await expect(
    page.getByRole("button", { name: "3. 经典实验" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /进入阶段 2/ }).click();
  await page.getByRole("button", { name: /助燃气体将显著增强燃烧/ }).click();
  await page.getByRole("button", { name: /进入阶段 3/ }).click();

  // Do 2 tests, then RELOAD browser to verify persistent resumable session!
  await page
    .locator(".gas-flask-card")
    .filter({ hasText: "气瓶甲" })
    .getByRole("button", { name: "通入澄清石灰水" })
    .click();
  await page
    .locator(".gas-flask-card")
    .filter({ hasText: "气瓶乙" })
    .getByRole("button", { name: "伸入带火星木条" })
    .click();

  await page.reload();
  // Must automatically restore Chapter 01 Stage 3 with both tests still checked!
  await expect(
    page.getByRole("heading", { name: /证据实验台 · 空气中的秘密/ }),
  ).toBeVisible();
  await expect(
    page
      .locator(".gas-flask-card")
      .filter({ hasText: "气瓶甲" })
      .getByRole("button", { name: "✓ 通入澄清石灰水" }),
  ).toBeVisible();

  // Complete remaining tests on Flask C (burning splint + limewater)
  await page
    .locator(".gas-flask-card")
    .filter({ hasText: "气瓶丙" })
    .getByRole("button", { name: "伸入燃着木条" })
    .click();
  await page
    .locator(".gas-flask-card")
    .filter({ hasText: "气瓶丙" })
    .getByRole("button", { name: "通入澄清石灰水" })
    .click();

  await page
    .getByRole("combobox", { name: "气瓶甲气体指认" })
    .selectOption("carbon_dioxide");
  await page
    .getByRole("combobox", { name: "气瓶乙气体指认" })
    .selectOption("oxygen");
  await page
    .getByRole("combobox", { name: "气瓶丙气体指认" })
    .selectOption("nitrogen");
  await page.getByRole("button", { name: "提交实验检验" }).click();
  await expect(page.locator(".stage-feedback")).toContainText("准确鉴别");
  await page.screenshot({
    path: "output/playwright/history-polish/desktop-ch01-gas.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /进入阶段 4/ }).click();
  await page
    .getByRole("button", { name: /外观相同的无色气体具有截然不同/ })
    .click();
  await page.getByRole("button", { name: /完成推理并揭晓历史真相/ }).click();
  await expect(page.getByText(/氧气的发现与化学革命序幕/)).toBeVisible();
  await page.screenshot({
    path: "output/playwright/history-polish/desktop-ch01-discovery.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /返回 10 章时间线/ }).click();

  // === CHAPTER 02: 消失的质量 (FULL ADVANCED MODE + Unit conversion 0.044 kg) ===
  await page
    .locator(".history-card")
    .filter({ hasText: "消失的质量" })
    .getByRole("button", { name: /进入历史现场/ })
    .click();
  await page.getByRole("button", { name: "进阶定量模式" }).click();
  await page.getByRole("button", { name: /进入阶段 2/ }).click();
  await page.getByRole("button", { name: /天平总示数保持不变/ }).click();
  await page.getByRole("button", { name: /进入阶段 3/ }).click();

  // Weigh both open-system trials
  const weighBtns = page.getByRole("button", {
    name: "放置精密天平并执行称量",
  });
  await weighBtns.first().click();
  await page.getByRole("button", { name: "放置精密天平并执行称量" }).click();
  // Switch to closed system & weigh
  await page.getByRole("button", { name: /密闭系统/ }).click();
  await page.getByRole("button", { name: "放置精密天平并执行称量" }).click();
  await page
    .getByRole("button", { name: /质量守恒在两个体系中均成立/ })
    .click();
  // Submit 0.044 kg (tests real kg -> g unit conversion!)
  await page
    .getByRole("spinbutton", { name: "逸散二氧化碳质量" })
    .fill("0.044");
  await page.getByRole("combobox", { name: "质量单位" }).selectOption("kg");
  await page.getByRole("button", { name: "提交实验检验" }).click();
  await expect(page.locator(".stage-feedback")).toContainText(
    "单位核算全部通过",
  );
  await page.screenshot({
    path: "output/playwright/history-polish/desktop-ch02-mass-advanced.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /进入阶段 4/ }).click();
  await page
    .getByRole("button", { name: /分析质量变化必须先界定体系边界/ })
    .click();
  await page.getByRole("button", { name: /完成推理并揭晓历史真相/ }).click();
  await expect(
    page.getByRole("heading", { name: /质量守恒定律/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /返回 10 章时间线/ }).click();

  // === CHAPTER 03: 水的真正身份 (Shared execute + ratio) ===
  await page
    .locator(".history-card")
    .filter({ hasText: "水的真正身份" })
    .getByRole("button", { name: /进入历史现场/ })
    .click();
  await page.getByRole("button", { name: /进入阶段 2/ }).click();
  await page
    .getByRole("button", { name: /既能由两种不同气体化合生成纯水/ })
    .click();
  await page.getByRole("button", { name: /进入阶段 3/ }).click();
  await page
    .getByRole("button", { name: /执行共享反应：氢氧点燃合成水/ })
    .click();
  await page.getByRole("button", { name: "氢气 : 氧气 = 2 : 1" }).click();
  await page.getByRole("button", { name: "提交实验检验" }).click();
  await expect(page.locator(".stage-feedback")).toContainText("组成判断通过");
  await page.getByRole("button", { name: /进入阶段 4/ }).click();
  await page
    .getByRole("button", { name: /证明了传统「四元素」中的水/ })
    .click();
  await page.getByRole("button", { name: /完成推理并揭晓历史真相/ }).click();
  await expect(
    page.getByRole("heading", { name: /古典四元素说终结/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /返回 10 章时间线/ }).click();

  // === CHAPTER 04: 人类的第一块电池 (1800 Zn-Ag prototype + reorder controls) ===
  await page
    .locator(".history-card")
    .filter({ hasText: "人类的第一块电池" })
    .getByRole("button", { name: /进入历史现场/ })
    .click();
  await page.getByRole("button", { name: /进入阶段 2/ }).click();
  await page.getByRole("button", { name: /必须由两种不同金属/ }).click();
  await page.getByRole("button", { name: /进入阶段 3/ }).click();
  await page.getByRole("button", { name: /锌 \+ 银（1800 历史原型）/ }).click();
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "+ 锌片 (Zn)" }).click();
    await page
      .getByRole("button", { name: "+ 盐水湿布/纸板（电解质）" })
      .click();
    await page.getByRole("button", { name: "+ 银片 (Ag)" }).click();
  }
  await page.getByRole("button", { name: "提交实验检验" }).click();
  await expect(page.locator(".stage-feedback")).toContainText("1.6 V");
  await page.screenshot({
    path: "output/playwright/history-polish/desktop-ch04-voltaic.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /进入阶段 4/ }).click();
  await page
    .getByRole("button", { name: /它首次提供了持续可控的直流电流/ })
    .click();
  await page.getByRole("button", { name: /完成推理并揭晓历史真相/ }).click();
  await page.getByRole("button", { name: /返回 10 章时间线/ }).click();

  // === CHAPTER 07: 尚未发现的元素 (via Deep Link #history/hist_07) ===
  await page.goto("/#history/hist_07");
  await expect(
    page.getByRole("heading", { name: "尚未发现的元素", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /进入阶段 2/ }).click();
  await page
    .getByRole("button", { name: /坚持同族化学性质一致的原则/ })
    .click();
  await page.getByRole("button", { name: /进入阶段 3/ }).click();

  // Place all 4 cards + explicitly mark gap under Al
  await page.getByRole("button", { name: /Na 钠/ }).click();
  await page.getByRole("button", { name: "第3周期第1族槽位" }).click();
  await page.getByRole("button", { name: /Al 铝/ }).click();
  await page.getByRole("button", { name: "第3周期第3族槽位" }).click();
  await page.getByRole("button", { name: /Si 硅/ }).click();
  await page.getByRole("button", { name: "第3周期第4族槽位" }).click();
  await page.getByRole("button", { name: /K 钾/ }).click();
  await page.getByRole("button", { name: "第4周期第1族槽位" }).click();
  await page.getByRole("button", { name: "标记铝下方未知空位" }).click();
  await page.getByRole("button", { name: /相对原子质量约 68–70/ }).click();
  await page.getByRole("button", { name: "提交实验检验" }).click();
  await expect(page.locator(".stage-feedback")).toContainText("预言通过");
  await page.screenshot({
    path: "output/playwright/history-polish/desktop-ch07-periodic.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /进入阶段 4/ }).click();
  await page.getByRole("button", { name: /门捷列夫因大胆留白/ }).click();
  await page.getByRole("button", { name: /完成推理并揭晓历史真相/ }).click();
  await expect(page.getByText(/1875 年布瓦博德朗发现的镓/)).toBeVisible();

  // Jump directly from Stage 5 reward CTA to Science Museum and verify all 5 historical exhibits unlocked!
  await page.getByRole("button", { name: /前往科学博物馆查看藏品/ }).click();
  await expect(
    page.getByRole("heading", { name: "科学博物馆", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /1869 周期表留白手稿复制件/ }),
  ).toBeVisible();

  // Check Unlocked Scientist Archives tab inside #history
  await page.goto("/#history");
  await page.getByRole("button", { name: /返回时间线/ }).click();
  await page.getByRole("tab", { name: /科学家档案与历史手稿/ }).click();
  await expect(
    page.getByRole("heading", { name: "玛丽-安娜·保尔兹·拉瓦锡" }),
  ).toBeVisible();
  await page.screenshot({
    path: "output/playwright/history-polish/desktop-archives.png",
    fullPage: true,
  });

  // Responsive checks & screenshots at 390px and 768px (zero horizontal overflow)
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#history");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `history timeline at ${width}px`,
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "output/playwright/history-polish/mobile-timeline.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({
    path: "output/playwright/history-polish/tablet-timeline.png",
    fullPage: true,
  });

  expect(errors).toEqual([]);
});
