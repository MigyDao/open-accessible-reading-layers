import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => console.log("Browser error:", error.message));
  page.on("console", (message) => {
    if (message.type() === "error") console.log("Browser console:", message.text());
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    console.log("Reader snapshot:", await page.locator("body").ariaSnapshot());
  }
});

test("keeps future people hidden and reveals prior people after navigation", async ({
  page
}) => {
  await page.goto("/");

  const readingSupport = page.getByRole("button", {
    name: "Reading Support"
  });

  await expect(readingSupport).toBeVisible({
    timeout: 30_000
  });

  // Chapter 1 starts before Mara's introduction. Opening support here must
  // never leak her name from the ORL sidecar.
  await readingSupport.click();

  await expect(
    page.getByRole("heading", {
      name: "People"
    })
  ).toBeVisible();

  await expect(
    page.getByText("Mara", {
      exact: true
    })
  ).toHaveCount(0);

  await page.keyboard.press("Escape");

  // Move to the beginning of Chapter 2. Mara was introduced in Chapter 1,
  // while Jo's introduction is still ahead within Chapter 2.
  const tocButton = page.getByRole("button", {
    name: /table of contents/i
  });

  await expect(tocButton).toBeVisible();
  await tocButton.click();

  const chapterTwo = page.getByText("2. The Tank", {
    exact: true
  });

  await expect(chapterTwo).toBeVisible();
  await chapterTwo.click();

  // Allow Thorium's navigator position callback and ORL anchor resolution
  // to settle before reading the support panel.
  await expect(readingSupport).toBeVisible();
  await readingSupport.click();

  await expect(
    page.getByText("Mara", {
      exact: true
    })
  ).toBeVisible();

  await expect(
    page.getByText("Jo", {
      exact: true
    })
  ).toHaveCount(0);
});
