import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.env.TEST_URL || "http://127.0.0.1:5173/personal-page/";

// 验证访问者真实操作路径，避免只检查实现细节或静态文案。
test("作品集的主题、项目阅读、数据切换与移动端访问", async (t) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    colorScheme: "light",
  });
  await page.goto(url);
  await t.test("主题可切换并在刷新后保留", async () => {
    await page
      .getByRole("button", { name: "切换为暗色" })
      .click({ timeout: 3000 });
    await page.reload();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.getByRole("button", { name: "切换为亮色" }).click();
  });
  await t.test("项目详情支持键盘退出并归还焦点", async () => {
    const opener = page.getByRole("button", { name: "查看悦读小达人项目" });
    await opener.click({ timeout: 3000 });
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    assert.match(await dialog.innerText(), /困难与解决/);
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await page.evaluate(() => !!document.activeElement.closest("dialog")),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(await dialog.count(), 0);
    assert.equal(
      await opener.evaluate((el) => el === document.activeElement),
      true,
    );
  });
  await t.test("数据切换改变所选指标且保留来源与归因限制", async () => {
    await page
      .getByRole("tab", { name: "日均启动次数" })
      .click({ timeout: 3000 });
    assert.equal(
      await page
        .getByRole("tab", { name: "日均启动次数" })
        .getAttribute("aria-selected"),
      "true",
    );
    assert.match(await page.getByRole("tabpanel").innerText(), /48,445/);
    assert.match(await page.locator("#impact").innerText(), /不能.*归因/);
  });
  await t.test("研究画廊标明竞品来源并能进入真实交互 Demo", async () => {
    await page
      .getByRole("button", { name: "查看从竞品观察到产品判断项目" })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: /叫叫 App/ })
      .click({ timeout: 2000 });
    assert.match(
      await dialog.locator(".gallery img").getAttribute("alt"),
      /竞品/,
    );
    const link = dialog.getByRole("link", { name: "打开交互 Demo" });
    assert.match(
      await link.getAttribute("href", { timeout: 2000 }),
      /demos\/research-map\.html$/,
    );
    await page.keyboard.press("Escape");
  });
  await t.test(
    "减少动态偏好下内容完整，移动导航可用且没有横向溢出",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.reload();
      await page
        .getByRole("button", { name: "打开导航" })
        .click({ timeout: 3000 });
      await page
        .getByRole("navigation")
        .getByRole("link", { name: "数据与验证" })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "打开导航" })
          .getAttribute("aria-expanded"),
        "false",
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.equal(await page.locator("#impact").isVisible(), true);
      assert.equal(await page.locator(".particle-field").count(), 0);
    },
  );
  await t.test("移动端次级链接具有足够触控区域", async () => {
    for (const selector of [
      ".theme-toggle",
      ".source-details summary",
      ".about-note a",
      "footer a:last-child",
    ]) {
      assert.ok(
        await page
          .locator(selector)
          .evaluate((el) => el.getBoundingClientRect().height >= 44),
        selector,
      );
    }
  });
  await browser.close();
});
