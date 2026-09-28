import { test, expect } from "@playwright/test";
test("weighted checkout persists and staff can fulfil the same order", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your local shop. Now at your door." }),
  ).toBeVisible();
  await page
    .locator(".product-image img")
    .evaluateAll((images) =>
      images.forEach((img) => ((img as HTMLImageElement).loading = "eager")),
    );
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".product-image img")].every(
      (img) => (img as HTMLImageElement).complete,
    ),
  );
  await page.screenshot({ path: `artifacts/home-${info.project.name}.png`, fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.goto("/product/prd_1");
  await page.getByRole("button", { name: "1.5 kg" }).click();
  await expect(page.locator(".detail-subtotal")).toContainText("M18.00");
  await page
    .locator(".product-detail")
    .getByRole("button", { name: "Add to basket", exact: true })
    .click();
  await page.goto("/product/prd_12");
  await page
    .locator(".product-detail")
    .getByRole("button", { name: "Add to basket", exact: true })
    .click();
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Your basket (2)" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your basket (2)" })).toBeVisible();
  await page.getByRole("link", { name: "Checkout", exact: true }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Mpho Test");
  await page.getByLabel("Phone number", { exact: true }).fill("+266 5888 9999");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Street / delivery address").fill("42 Mabote Road");
  await page.getByLabel("Nearest landmark", { exact: true }).fill("Near the primary school");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("I have the exact amount").uncheck();
  await page.getByLabel("Cash amount (M)").fill("150");
  await expect(page.getByText("M18.80", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.screenshot({ path: `artifacts/checkout-${info.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Place order", exact: true }).click();
  await expect(page.getByRole("heading", { name: "We’ve got your order." })).toBeVisible();
  const id = page.url().split("/").pop()!;
  await page.getByRole("link", { name: "Track your order", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "#ORD-1043" })).toBeVisible();
  await page.goto(`/admin/orders/${id}`);
  await page.getByRole("button", { name: "Enter staff demo" }).click();
  await expect(page.getByText("Mpho Test", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Confirm order", exact: true }).click();
  await page.getByRole("button", { name: "Start preparing", exact: true }).click();
  await page.getByRole("button", { name: "Ready for delivery", exact: true }).click();
  await page.getByLabel("Driver name").fill("Moshe Test");
  await page.getByRole("button", { name: "Assign driver", exact: true }).click();
  await page.getByRole("button", { name: "Dispatch order", exact: true }).click();
  await page.getByRole("button", { name: "Record payment received", exact: true }).click();
  await page.getByRole("button", { name: "Mark delivered", exact: true }).click();
  await page.goto(`/orders/${id}`);
  await expect(page.getByRole("heading", { name: "Delivered with care." })).toBeVisible();
  await page.getByRole("button", { name: "Buy again", exact: true }).click();
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Your basket (2)" })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Good things are growing." })).toBeVisible();
  await page.screenshot({ path: `artifacts/admin-${info.project.name}.png`, fullPage: true });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
test("catalogue filters and all main routes work", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("textbox", { name: "Search products", exact: true }).fill("tomatoes");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("textbox", { name: "Search products", exact: true }).fill("nothing exists");
  await expect(page.getByRole("heading", { name: "No products found" })).toBeVisible();
  for (const path of [
    "/categories",
    "/category/fresh-produce",
    "/category/specials",
    "/account",
    "/orders",
    "/cart",
    "/checkout",
  ]) {
    await page.goto(path);
    await expect(page.locator("main")).not.toContainText("This page didn’t load");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path,
    ).toBeTruthy();
  }
  await page.goto("/admin");
  await page.getByRole("button", { name: "Enter staff demo" }).click();
  for (const path of [
    "/admin/products",
    "/admin/products/new",
    "/admin/inventory",
    "/admin/categories",
    "/admin/promotions",
    "/admin/customers",
    "/admin/deliveries",
    "/admin/reports",
    "/admin/settings",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path,
    ).toBeTruthy();
  }
});

test("staff catalogue edits persist and affect the storefront", async ({ page }) => {
  await page.goto("/admin/products/new");
  await page.getByRole("button", { name: "Enter staff demo" }).click();
  await page.getByLabel("Product name", { exact: true }).fill("Local Honey Test");
  await page.getByLabel("Price (M)", { exact: true }).fill("40");
  await page.getByLabel("Stock quantity", { exact: true }).fill("12");
  await page.getByLabel("Description", { exact: true }).fill("Neighbourhood honey for this test.");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Products", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Edit Local Honey Test" }).click();
  await expect(page.getByLabel("Product name", { exact: true })).toHaveValue("Local Honey Test");
  await page.getByLabel("Special price (optional)").fill("35");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page.goto("/shop?q=Local%20Honey%20Test");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await expect(page.locator(".product-card")).toContainText("M35.00");
  await page.goto("/admin/inventory");
  await page.getByRole("textbox", { name: "Find stock" }).fill("Local Honey Test");
  await page.getByLabel("Stock for Local Honey Test", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await page.goto("/shop?q=Local%20Honey%20Test");
  await expect(page.getByRole("button", { name: "Add to basket", exact: true })).toBeDisabled();
});
test("mobile money stays pending and cancellation restores stock once", async ({ page }) => {
  await page.goto("/product/prd_12");
  await page
    .locator(".product-detail")
    .getByRole("button", { name: "Add to basket", exact: true })
    .click();
  await page.goto("/checkout");
  await page.getByLabel("Full name", { exact: true }).fill("Lerato Test");
  await page.getByLabel("Phone number", { exact: true }).fill("58889998");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Street / delivery address").fill("12 Market Street");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: "Mobile money Choose your provider below" }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Place order", exact: true }).click();
  await expect(page.getByRole("heading", { name: "We’ve got your order." })).toBeVisible();
  const id = page.url().split("/").pop()!;
  await page.goto(`/admin/orders/${id}`);
  await page.getByRole("button", { name: "Enter staff demo" }).click();
  await expect(page.getByText("Status: pending", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel order", exact: true }).click();
  await page.getByRole("button", { name: "Yes, cancel order", exact: true }).click();
  await expect(page.getByText("This order is cancelled.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Cancel order", exact: true })).toHaveCount(0);
  await page.goto("/admin/inventory");
  await page.getByRole("textbox", { name: "Find stock" }).fill("Maize Meal");
  await expect(page.getByLabel("Stock for Maize Meal 10kg", { exact: true })).toHaveValue("40");
});
