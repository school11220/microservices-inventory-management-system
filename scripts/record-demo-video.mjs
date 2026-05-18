import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.DEMO_BASE_URL ?? 'http://localhost:8080';
const outputPath =
  process.env.DEMO_VIDEO_OUTPUT ??
  path.resolve(process.cwd(), 'docs/Microservices_Inventory_Management_System_Demo.webm');
const videoDir = path.resolve(process.cwd(), '.tmp/demo-video');
const viewport = { width: 1280, height: 720 };

async function settle(page, selector, timeout = 12_000) {
  await page.waitForSelector(selector, { timeout }).catch(() => undefined);
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
}

async function scene(page, seconds, action) {
  if (action) await action();
  await page.waitForTimeout(seconds * 1000);
}

async function goto(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
}

await rm(videoDir, { recursive: true, force: true });
await mkdir(videoDir, { recursive: true });
await mkdir(path.dirname(outputPath), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport,
  recordVideo: {
    dir: videoDir,
    size: viewport,
  },
});
const page = await context.newPage();

try {
  await scene(page, 12, async () => {
    await goto(page, '/public');
    await settle(page, 'text=Catalog');
  });

  await scene(page, 12, async () => {
    await page.getByPlaceholder('Search catalog...').fill('scanner');
  });

  await scene(page, 10, async () => {
    await page.getByText('Add to Demo Cart').first().click().catch(() => undefined);
  });

  await scene(page, 12, async () => {
    await page.getByPlaceholder('Search catalog...').fill('');
    await page.locator('select').first().selectOption({ label: 'Warehouse Equipment' }).catch(
      () => undefined,
    );
  });

  await scene(page, 14, async () => {
    await goto(page, '/login');
    await settle(page, 'text=Sign In');
  });

  await scene(page, 10, async () => {
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/products', { timeout: 12_000 }).catch(() => undefined);
    await settle(page, 'text=Products');
  });

  await scene(page, 13, async () => {
    await page.getByPlaceholder('Search products...').fill('sensor');
  });

  await scene(page, 12, async () => {
    await page.getByPlaceholder('Search products...').fill('');
    await page.locator('select').first().selectOption({ label: 'IoT Inventory' }).catch(
      () => undefined,
    );
  });

  await scene(page, 14, async () => {
    await goto(page, '/orders');
    await settle(page, 'text=Orders');
  });

  await scene(page, 16, async () => {
    await page.getByRole('button', { name: 'New Order' }).click();
    await settle(page, 'text=Create New Order');
  });

  await scene(page, 16, async () => {
    await page.getByLabel('Buyer Name').fill(`Demo Buyer ${Date.now().toString().slice(-4)}`);
    await page.getByLabel('Buyer Email').fill('demo.buyer@example.com');
    await page.getByLabel('Address').fill('Demo fulfilment address, Bengaluru');
  });

  await scene(page, 18, async () => {
    await page.getByRole('button', { name: 'Create Order' }).last().click();
    await page.waitForSelector('text=Order submitted to inventory saga.', { timeout: 12_000 }).catch(
      () => undefined,
    );
  });

  await scene(page, 18, async () => {
    await page.waitForTimeout(1_000);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await settle(page, 'text=Orders');
  });

  await scene(page, 16, async () => {
    await goto(page, '/reports');
    await settle(page, 'text=Reports & Analytics');
  });

  await scene(page, 12, async () => {
    await page.mouse.wheel(0, 420);
  });

  await scene(page, 14, async () => {
    await goto(page, '/products');
    await settle(page, 'text=Products');
  });

  await scene(page, 12, async () => {
    await page.mouse.wheel(0, 520);
  });
} finally {
  const video = page.video();
  await context.close();
  await browser.close();

  if (!video) {
    throw new Error('Playwright did not create a video artifact.');
  }

  await copyFile(await video.path(), outputPath);
  console.log(`Demo video written to ${outputPath}`);
}
