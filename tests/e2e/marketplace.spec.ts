import { expect, test, type Page } from "@playwright/test";

const expectedConvexHost = new URL(process.env.E2E_EXPECTED_CONVEX_URL!).hostname;
const expectedAuthHost = expectedConvexHost.replace(/\.convex\.cloud$/i, ".convex.site");
const allowedConvexHosts = new Set([expectedConvexHost, expectedAuthHost]);
const convexUrlPattern = /^https?:\/\/[^/]+\.convex\.(?:cloud|site)(?::\d+)?(?:\/|$)/i;

type DeploymentObservation = {
  assertDevelopmentDeployment: () => Promise<void>;
};

async function openPreviewAndVerifyDeployment(page: Page): Promise<DeploymentObservation> {
  const observedHosts = new Set<string>();
  const unexpectedHosts = new Set<string>();

  const observeHost = (rawUrl: string) => {
    let hostname: string;
    try {
      hostname = new URL(rawUrl).hostname.toLowerCase();
    } catch {
      return;
    }
    if (!hostname.endsWith(".convex.cloud") && !hostname.endsWith(".convex.site")) return;
    observedHosts.add(hostname);
    if (!allowedConvexHosts.has(hostname)) unexpectedHosts.add(hostname);
  };

  page.on("request", (request) => observeHost(request.url()));
  page.on("websocket", (socket) => observeHost(socket.url()));
  await page.route(convexUrlPattern, async (route) => {
    const hostname = new URL(route.request().url()).hostname.toLowerCase();
    if (!allowedConvexHosts.has(hostname)) {
      unexpectedHosts.add(hostname);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });

  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "All products" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add", exact: true }).first()).toBeVisible();

  const assertDevelopmentDeployment = async () => {
    await expect
      .poll(() => observedHosts.has(expectedConvexHost), {
        message: "The preview did not connect to the expected development Convex deployment.",
      })
      .toBe(true);
    expect([...unexpectedHosts], "The preview contacted an unexpected Convex deployment").toEqual([]);
  };

  await assertDevelopmentDeployment();
  return { assertDevelopmentDeployment };
}

async function signIn(
  page: Page,
  email: string,
  password: string,
  workspace: "account" | "staff",
  expectedPath: "/account" | "/admin" | "/driver",
) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const workspaceChoice = page.getByRole("heading", { name: "Where would you like to go?" });
  if (await workspaceChoice.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await page.getByRole("button", { name: workspace === "account" ? "My account" : "Staff workspace" }).click();
  }
  await expect(page).toHaveURL(new RegExp(`${expectedPath}(?:\\?.*)?$`));
}

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus || page.isClosed()) return;
  const screenshot = await page
    .screenshot({
      fullPage: true,
      animations: "disabled",
      mask: [page.locator("input"), page.locator("textarea")],
    })
    .catch(() => undefined);
  if (screenshot) {
    await testInfo.attach("failure-screenshot.png", {
      body: screenshot,
      contentType: "image/png",
    });
  }
});

test("public preview loads the development marketplace in a phone viewport", async ({ page }) => {
  await openPreviewAndVerifyDeployment(page);
  await expect(page.getByRole("heading", { name: "All products" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add", exact: true }).first()).toBeVisible();
});

test("customer order is prepared, dispatched, and delivered by the assigned driver", async ({
  browser,
  page,
}, testInfo) => {
  const credentials = {
    customerEmail: process.env.E2E_CUSTOMER_EMAIL,
    customerPassword: process.env.E2E_CUSTOMER_PASSWORD,
    managerEmail: process.env.E2E_MANAGER_EMAIL,
    managerPassword: process.env.E2E_MANAGER_PASSWORD,
    driverEmail: process.env.E2E_DRIVER_EMAIL,
    driverPassword: process.env.E2E_DRIVER_PASSWORD,
    driverName: process.env.E2E_DRIVER_NAME,
  };
  const missingCredentials = Object.entries(credentials)
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);
  test.skip(
    missingCredentials.length > 0,
    `Set the development test account variables in .env.e2e.local: ${missingCredentials.join(", ")}.`,
  );

  const customerDeployment = await openPreviewAndVerifyDeployment(page);
  await customerDeployment.assertDevelopmentDeployment();
  await signIn(page, credentials.customerEmail!, credentials.customerPassword!, "account", "/account");
  await customerDeployment.assertDevelopmentDeployment();

  await page.goto("/shop");
  const addButton = page.getByRole("button", { name: "Add", exact: true }).first();
  await expect(addButton).toBeVisible();
  const card = addButton.locator("xpath=ancestor::div[contains(@class,'group')]");
  const productName = (await card.getByRole("link").nth(1).innerText()).trim();
  await addButton.click();
  await expect(page.getByRole("link", { name: "Cart", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Cart", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText(productName, { exact: true }).first()).toBeVisible();
  const checkoutLink = page.getByRole("link", { name: "Checkout", exact: true });
  for (let attempt = 0; attempt < 30 && (await checkoutLink.count()) === 0; attempt += 1) {
    await page.getByRole("button", { name: "Increase", exact: true }).click();
  }
  await expect(checkoutLink, "The test cart should meet the store minimum").toBeVisible();
  await checkoutLink.click();

  await page.getByLabel("Full name").fill(`E2E Customer ${Date.now()}`);
  await page.getByLabel("Phone number").fill("+266 555 0111");
  await page.getByRole("combobox").first().click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Delivery description or house / street").fill("E2E test delivery point");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  const cashOption = page.getByRole("radio", { name: /Cash on delivery/i });
  if (await cashOption.count()) await cashOption.check();
  else await page.getByRole("radio", { name: /Mobile money/i }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your order" })).toBeVisible();
  await page.getByRole("button", { name: /Place order/i }).click();
  await expect(page.getByText("CHECKOUT PLACED")).toBeVisible();

  const confirmationText = await page.locator("main").innerText();
  const orderNumber = confirmationText.match(/\bREE-[A-Z0-9]+-[A-Z0-9]+\b/)?.[0];
  expect(orderNumber, "The confirmation should show the created order number").toBeTruthy();
  await expect(page.locator("article").filter({ hasText: orderNumber! })).toContainText(/received/i);
  await page.reload();
  await expect(page.getByText("CHECKOUT PLACED")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: orderNumber! })).toContainText(/received/i);

  const managerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const driverContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const managerPage = await managerContext.newPage();
    const managerDeployment = await openPreviewAndVerifyDeployment(managerPage);
    await signIn(managerPage, credentials.managerEmail!, credentials.managerPassword!, "staff", "/admin");
    await managerDeployment.assertDevelopmentDeployment();
    await managerPage.goto("/staff/dispatch");
    await expect(managerPage.getByRole("heading", { name: "Plan the next stops" })).toBeVisible();

    const orderCard = managerPage.locator("article").filter({ hasText: orderNumber! });
    await expect(orderCard).toBeVisible();
    await expect(orderCard).toContainText(/received/i);
    await orderCard.getByRole("button", { name: /Mark confirmed/i }).click();
    await expect(orderCard.getByRole("button", { name: /Mark preparing/i })).toBeVisible();
    await orderCard.getByRole("button", { name: /Mark preparing/i }).click();
    await expect(orderCard.getByRole("button", { name: /Mark ready/i })).toBeVisible();
    await orderCard.getByRole("button", { name: /Mark ready/i }).click();

    const driverAssignment = orderCard.getByLabel(`Assign driver for ${orderNumber}`);
    await expect(driverAssignment).toBeVisible();
    await driverAssignment.selectOption({ label: credentials.driverName! });
    await managerPage.getByRole("button", { name: "Driver stops", exact: true }).click();
    const routeDriver = managerPage.getByRole("combobox", { name: "Driver" });
    await routeDriver.selectOption({ label: credentials.driverName! });
    const moveEarlier = managerPage.getByRole("button", { name: `Move ${orderNumber} earlier` });
    for (let move = 0; move < 50 && (await moveEarlier.isEnabled()); move += 1) {
      await moveEarlier.click();
    }
    const firstStop = managerPage.locator("ol").first().locator("li").first();
    await expect(firstStop).toContainText(orderNumber!);

    const driverPage = await driverContext.newPage();
    const driverDeployment = await openPreviewAndVerifyDeployment(driverPage);
    await signIn(driverPage, credentials.driverEmail!, credentials.driverPassword!, "staff", "/driver");
    await driverDeployment.assertDevelopmentDeployment();
    await driverPage.goto("/driver");
    const currentStop = driverPage.locator("section[aria-labelledby='current-stop-heading'] article");
    await expect(currentStop).toContainText(orderNumber!);
    await currentStop.getByRole("button", { name: "Start delivery" }).click();
    await expect(currentStop.getByRole("button", { name: "Mark delivered" })).toBeVisible();
    await currentStop.getByRole("button", { name: "Mark delivered" }).click();
    await expect(driverPage.getByText(orderNumber!)).toHaveCount(0);

    await page.goto("/orders");
    const customerOrder = page.locator("article").filter({ hasText: orderNumber! });
    await expect(customerOrder).toBeVisible();
    await expect(customerOrder).toContainText(/delivered/i);
  } finally {
    await managerContext.close();
    await driverContext.close();
  }

  testInfo.annotations.push({ type: "order", description: orderNumber });
});
