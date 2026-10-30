import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.env.TEST_URL || "http://127.0.0.1:5173/personal-page/";

// 当前清晰可交互的场景（所有幕都在舞台上，同一时刻最多一幕处于 is-active）
const activeScene = (page) =>
  page.locator(".scene-panel.is-active").getAttribute("aria-label");
const waitForScene = (page, label) =>
  page.waitForFunction(
    (label) => {
      const panels = document.querySelectorAll(".scene-panel.is-active");
      return panels.length === 1 && panels[0].getAttribute("aria-label") === label;
    },
    label,
    { timeout: 6000 },
  );
// 每一幕在轨道上占的滚动距离，以及第 i 幕停稳时的滚动位置（轨道最前面还有一段“联系”的副本）
const sceneLen = (page) =>
  page.evaluate(() => {
    const a = document.querySelectorAll(".scene-anchor");
    return a[1].offsetTop - a[0].offsetTop;
  });
const settledAt = async (page, i) => {
  const L = await sceneLen(page);
  await page
    .waitForFunction((top) => Math.abs(window.scrollY - top) < 2, (i + 1) * L, { timeout: 5000 })
    .catch(async (error) => {
      const p = await page.evaluate((L) => window.scrollY / L - 1, L);
      throw new Error(`没有停在第 ${i} 幕，当前进度 ${p.toFixed(3)}`, { cause: error });
    });
};
const dialog = (page) => page.getByRole("dialog");

// 验证访问者真实操作路径，避免只检查实现细节或静态文案。
test("单屏场景式作品集：滚动切换、浮层详情、直达链接与移动端", async (t) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  await page.goto(url);
  await waitForScene(page, "开始");

  await t.test("主题可切换并在刷新后保留", async () => {
    await page
      .getByRole("button", { name: "切换为暗色" })
      .click({ timeout: 3000 });
    await page.reload();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.getByRole("button", { name: "切换为亮色" }).click();
  });

  await t.test("连续滚动：滚动量连续推进，停手后顺着方向吸附到一幕", async () => {
    await waitForScene(page, "开始");
    await settledAt(page, 0);
    const L = await sceneLen(page);
    await page.mouse.move(720, 450);
    // 只轻轻滚一点点：停手后弹回原来那一幕
    await page.mouse.wheel(0, L * 0.05);
    await page.waitForTimeout(150);
    await settledAt(page, 0);
    await waitForScene(page, "开始");
    // 一次轻扫（三分之一幕）：停手后顺着方向落到下一幕，而不是被拉回
    await page.mouse.wheel(0, L * 0.3);
    await page.waitForTimeout(150);
    await settledAt(page, 1);
    await waitForScene(page, "交织");
    // 舞台始终贴在视口上，变化的只有场景内容
    assert.equal(
      await page.evaluate(() => document.querySelector(".stage").getBoundingClientRect().top),
      0,
    );
    await page.mouse.wheel(0, -L * 0.3);
    await page.waitForTimeout(150);
    await settledAt(page, 0);
    await waitForScene(page, "开始");
  });

  await t.test("首尾相接：联系再往下滚回到开头，开头往上滚绕到联系", async () => {
    const L = await sceneLen(page);
    await page.getByRole("button", { name: "跳到：联系" }).click();
    await waitForScene(page, "联系");
    await settledAt(page, 11);
    await page.mouse.wheel(0, L * 0.7);
    await page.waitForTimeout(150);
    // 越过结尾后滚动位置平移一整圈，停在真正的开头
    await settledAt(page, 0);
    await waitForScene(page, "开始");
    await page.mouse.wheel(0, -L * 0.7);
    await page.waitForTimeout(150);
    await settledAt(page, 11);
    await waitForScene(page, "联系");
    await page.getByRole("button", { name: "回到起点" }).click();
    await settledAt(page, 0);
    await waitForScene(page, "开始");
  });

  await t.test("场景导航点与首屏分支节点都能直达对应项目", async () => {
    await page.getByRole("button", { name: "跳到：单词拼读王" }).click();
    await waitForScene(page, "单词拼读王");
    await page.getByRole("button", { name: "跳到：四个宇宙" }).click();
    await waitForScene(page, "四个宇宙");
    // WebGL 可用时，四个宇宙节点长好后可以聚焦和点击
    if ((await page.locator(".universe-node").count()) === 4) {
      const node = page.getByRole("button", { name: /悦读小达人：第 01 号宇宙/ });
      await page.waitForFunction(
        () => document.querySelector(".universe-node")?.getAttribute("tabindex") === "0",
        null,
        { timeout: 5000 },
      );
      await node.click();
      await waitForScene(page, "悦读小达人");
    }
  });

  await t.test("详情以浮层打开，关闭后仍停在原来的场景", async () => {
    await page.getByRole("button", { name: "跳到：单词拼读王" }).click();
    await waitForScene(page, "单词拼读王");
    await settledAt(page, 4);
    const before = await page.evaluate(() => window.scrollY);
    const opener = page.getByRole("button", { name: "查看单词拼读王项目" });
    await opener.click();
    await page.waitForURL(/#\/work\/phonics$/);
    await dialog(page).waitFor({ state: "visible" });
    const card = dialog(page);
    assert.match(await card.innerText(), /素材产能/);
    assert.match(await card.innerText(), /A\/B/);
    await card.getByRole("button", { name: /猫咪上新/ }).click();
    await card.locator(".gallery img").evaluate((image) => image.decode());
    assert.match(await card.locator(".gallery img").getAttribute("alt"), /风格探索/);
    const notes = await card
      .getByRole("link", { name: "查看项目说明" })
      .getAttribute("href");
    const response = await page.request.get(new URL(notes, page.url()).href);
    assert.equal(response.status(), 200);
    assert.match(await response.text(), /单词拼读王/);

    await page.keyboard.press("Escape");
    await dialog(page).waitFor({ state: "detached" });
    assert.doesNotMatch(page.url(), /#\/work\//);
    assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - before) < 2);
    assert.equal(await activeScene(page), "单词拼读王");
    // 焦点回到打开浮层的按钮上，键盘用户不会丢失位置
    assert.equal(await opener.evaluate((el) => el === document.activeElement), true);
  });

  await t.test("数据切换改变所选指标且保留来源与归因限制", async () => {
    await page.getByRole("button", { name: "跳到：悦读小达人" }).click();
    await waitForScene(page, "悦读小达人");
    await page.getByRole("button", { name: "查看悦读小达人项目" }).click();
    await dialog(page).waitFor({ state: "visible" });
    await page.getByRole("tab", { name: "日均启动次数" }).click({ timeout: 3000 });
    assert.equal(
      await page.getByRole("tab", { name: "日均启动次数" }).getAttribute("aria-selected"),
      "true",
    );
    assert.match(await page.getByRole("tabpanel").innerText(), /48,445/);
    assert.match(await page.locator("#impact").innerText(), /不能.*归因/);
    await dialog(page).getByRole("button", { name: "继续浏览" }).click();
    await dialog(page).waitFor({ state: "detached" });
    assert.equal(await activeScene(page), "悦读小达人");
  });

  await t.test("研究画廊标明竞品来源，点浮层外部可关闭", async () => {
    await page.getByRole("button", { name: "跳到：竞品研究" }).click();
    await waitForScene(page, "竞品研究");
    await page.getByRole("button", { name: "查看从竞品观察到产品判断项目" }).click();
    const card = dialog(page);
    await card.waitFor({ state: "visible" });
    await card.getByRole("button", { name: /叫叫 App/ }).click({ timeout: 2000 });
    assert.match(await card.locator(".gallery img").getAttribute("alt"), /竞品/);
    assert.match(
      await card.getByRole("link", { name: "打开交互 Demo" }).getAttribute("href"),
      /demos\/research-map\.html$/,
    );
    await page.locator(".detail-overlay").click({ position: { x: 8, y: 8 } });
    await card.waitFor({ state: "detached" });
    assert.equal(await activeScene(page), "竞品研究");
  });

  await t.test("项目场景的小交互可用，且只用项目自己的材料", async () => {
    await page.getByRole("button", { name: "跳到：悦读小达人" }).click();
    await waitForScene(page, "悦读小达人");
    const reading = page.locator(".scene-panel.is-active .play-reading");
    assert.match(await reading.innerText(), /13,079/);
    await reading.getByRole("slider").fill("100");
    assert.match(await reading.innerText(), /16,135/);
    assert.match(await reading.innerText(), /不能直接归因/);

    await page.getByRole("button", { name: "跳到：单词拼读王" }).click();
    await waitForScene(page, "单词拼读王");
    for (const l of ["c", "a", "t"]) await page.getByRole("button", { name: `拼入字母 ${l}` }).click();
    assert.match(await page.locator(".scene-panel.is-active .play-phonics").innerText(), /cat/);

    await page.getByRole("button", { name: "跳到：竞品研究" }).click();
    await waitForScene(page, "竞品研究");
    await page.getByRole("button", { name: "伴鱼绘本：分级课程型" }).focus();
    assert.match(await page.locator(".scene-panel.is-active .play-research").innerText(), /同类 3 个/);

    await page.getByRole("button", { name: "跳到：Agent 工作流" }).click();
    await waitForScene(page, "Agent 工作流");
    await page.getByRole("button", { name: "跑一遍流程" }).click();
    await page.waitForFunction(
      () => /不用整条重跑/.test(document.querySelector(".scene-panel.is-active .play-agent").innerText),
      null,
      { timeout: 6000 },
    );
  });

  await t.test("直达项目链接：浮层打开，背后停在该项目的场景", async () => {
    const direct = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await direct.goto(`${url}#/work/agent`);
    await dialog(direct).waitFor({ state: "visible" });
    assert.equal(
      await dialog(direct).getByRole("heading", { level: 2, name: "Agent 动画工作流" }).isVisible(),
      true,
    );
    // 刷新也不会 404（HashRouter）
    await direct.reload();
    await dialog(direct).waitFor({ state: "visible" });
    await direct.getByRole("button", { name: "关闭项目详情" }).click();
    await dialog(direct).waitFor({ state: "detached" });
    await waitForScene(direct, "Agent 工作流");
    await direct.close();
  });

  await t.test("减少动态偏好下内容完整，移动导航可用且没有横向溢出", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    await waitForScene(page, "开始");
    assert.equal(await page.locator(".scroll-cue").count(), 0);
    const menuButton = page.getByRole("button", { name: "打开导航" });
    await menuButton.click({ timeout: 3000 });
    await page.getByRole("navigation", { name: "主导航" }).getByRole("link", { name: "关于" }).click();
    assert.equal(await menuButton.getAttribute("aria-expanded"), "false");
    await waitForScene(page, "经历");
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
  });

  await t.test("移动端导航菜单展开时锁定焦点且可用 Escape 关闭", async () => {
    const menuButton = page.getByRole("button", { name: "打开导航" });
    await menuButton.click({ timeout: 3000 });
    const nav = page.getByRole("navigation", { name: "主导航" });
    await nav.getByRole("link", { name: "精选作品" }).waitFor();
    assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
    await page.keyboard.press("Escape");
    assert.equal(await menuButton.getAttribute("aria-expanded"), "false");
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
  });

  await t.test("移动端可点元素具有足够触控区域", async () => {
    await page.getByRole("button", { name: "跳到：联系" }).click();
    await waitForScene(page, "联系");
    for (const selector of [".theme-toggle", ".contact-links a", ".contact-links button"]) {
      assert.ok(
        await page
          .locator(selector)
          .first()
          .evaluate((el) => el.getBoundingClientRect().height >= 44),
        selector,
      );
    }
    assert.ok(
      await page
        .locator(".scene-dots button")
        .first()
        .evaluate((el) => el.getBoundingClientRect().height >= 24),
      ".scene-dots button",
    );
  });
  await browser.close();
});
