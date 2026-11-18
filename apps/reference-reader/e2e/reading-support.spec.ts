import { expect, test, type Page } from "@playwright/test";
import demoPackage from "../../../examples/demo-book/the-water-line.orl.json";

type LiveLocator = { href: string; locations: { cssSelector?: string; progression?: number } };

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => console.log("Browser error:", error.message));
  await page.addInitScript(() => {
    const observed: unknown[] = [];
    Object.assign(window, { orlObservedPositions: observed });
    window.addEventListener("orl:position-changed", (event) => {
      observed.push((event as CustomEvent).detail);
    });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    console.log("Reader snapshot:", await page.locator("body").ariaSnapshot());
    console.log("Live locators:", await positions(page));
  }
});

async function positions(page: Page): Promise<LiveLocator[]> {
  return page.evaluate(() => (window as unknown as { orlObservedPositions: LiveLocator[] }).orlObservedPositions);
}

const support = (page: Page) => page.getByRole("button", { name: "Reading Support", exact: true });
const panel = (page: Page) => page.getByRole("dialog", { name: "Reading Support", exact: true });

async function openReader(page: Page) {
  await page.goto("/");
  await expect(support(page)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Go forward", exact: true })).toBeEnabled({ timeout: 30_000 });
  await expect(page.frameLocator("iframe").first().getByRole("heading", { name: "1. Morning", exact: true })).toBeVisible();
  await expect.poll(async () => (await positions(page)).length).toBeGreaterThan(0);
}

async function chapter(page: Page, title: string) {
  await page.getByRole("button", { name: /table of contents/i }).click();
  await page.getByText(title, { exact: true }).click();
  await expect(page.getByRole("dialog", { name: /table of contents/i })).toHaveCount(0);
}

async function noFuturePeople(page: Page) {
  await expect(page.getByText("Mara", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Jo", { exact: true })).toHaveCount(0);
  // Include hidden DOM, attributes, labels and counts, not just visible text.
  const markup = await panel(page).evaluate((element) => element.outerHTML);
  expect(markup).not.toMatch(/Mara|person-mara|Jo|person-jo|2 locked|3 people/i);
}

test("renders EPUB and reveals Ari/Mara/Jo through live navigation", async ({ page }) => {
  await openReader(page);
  await support(page).click();
  await expect(panel(page).getByRole("heading", { name: "People", exact: true })).toBeVisible();
  await noFuturePeople(page);
  await page.keyboard.press("Escape");

  await chapter(page, "2. The Tank");
  await expect.poll(async () => (await positions(page)).at(-1)?.href).toContain("chapter-02.xhtml");
  await support(page).click();
  await expect(panel(page).getByText("Ari", { exact: true })).toBeVisible();
  await expect(panel(page).getByText("Mara", { exact: true })).toBeVisible();
  await expect(page.getByText("Jo", { exact: true })).toHaveCount(0);
  await expect(panel(page).locator("li")).toHaveCount(2);
  await page.keyboard.press("Escape");

  await chapter(page, "3. The Break");
  await support(page).click();
  await expect(panel(page).getByText("Jo", { exact: true })).toBeVisible();
  await expect(panel(page).locator("li")).toHaveCount(3);
});

test("reveals Mara at her actual introduction inside Chapter 1", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 360 });
  await openReader(page);
  await support(page).click();
  await noFuturePeople(page);
  await page.keyboard.press("Escape");
  let revealed = false;
  for (let step = 0; step < 8 && !revealed; step++) {
    const count = (await positions(page)).length;
    await page.getByRole("button", { name: "Go forward", exact: true }).click();
    await expect.poll(async () => (await positions(page)).length).toBeGreaterThan(count);
    const current = (await positions(page)).at(-1)!;
    expect(current.href).toContain("chapter-01.xhtml");
    await support(page).click();
    revealed = await panel(page).getByText("Mara", { exact: true }).isVisible();
    if (!revealed) await page.keyboard.press("Escape");
  }
  expect(revealed).toBe(true);
  await expect(panel(page).getByText("Ari", { exact: true })).toBeVisible();
  await expect(page.getByText("Jo", { exact: true })).toHaveCount(0);
  const current = (await positions(page)).at(-1)!;
  expect(current.locations.cssSelector).toBeTruthy();
  console.log("Mara revealed by live Chapter 1 locator:", current);
});

test("supports Tab, Enter, Escape and focus return without exposing locked people", async ({ page }) => {
  await openReader(page);
  for (let step = 0; step < 30 && !(await support(page).evaluate((el) => el === document.activeElement)); step++) {
    await page.keyboard.press("Tab");
  }
  await expect(support(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(panel(page)).toBeVisible();
  await noFuturePeople(page);
  for (let step = 0; step < 8; step++) {
    await page.keyboard.press("Tab");
    const name = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent ?? "");
    expect(name).not.toMatch(/Mara|Jo/);
  }
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
  await expect(support(page)).toBeFocused();
});

for (const scenario of ["malformed JSON", "invalid schema", "identifier mismatch", "unavailable sidecar"] as const) {
  test(`${scenario} never blocks ordinary EPUB reading`, async ({ page }) => {
    await page.route("**/api/reading-support", async (route) => {
      if (scenario === "unavailable sidecar") return route.abort();
      const mismatch = structuredClone(demoPackage);
      mismatch.publication.identifier = "urn:uuid:another-edition";
      await route.fulfill({
        contentType: "application/json",
        body: scenario === "malformed JSON" ? "{bad JSON"
          : JSON.stringify(scenario === "identifier mismatch" ? mismatch : { layers: [{ label: "Mara" }] })
      });
    });
    await openReader(page);
    await support(page).click();
    await expect(panel(page).getByText(/could not be activated/)).toBeVisible();
    await expect(panel(page).getByText(/continue reading/)).toBeVisible();
    await noFuturePeople(page);
    await page.keyboard.press("Escape");
    await chapter(page, "2. The Tank");
    await expect.poll(async () => (await positions(page)).at(-1)?.href).toContain("chapter-02.xhtml");
    await expect(page.getByRole("button", { name: "Go forward", exact: true })).toBeEnabled();
    await support(page).click();
    await expect(panel(page).getByText(/could not be activated/)).toBeVisible();
    await expect(panel(page).locator("li")).toHaveCount(0);
  });
}
