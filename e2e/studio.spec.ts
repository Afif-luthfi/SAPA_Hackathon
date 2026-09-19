import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { mockCamera } from './support/mockCamera';

async function prepare(page: Page) {
  await mockCamera(page);
  await page.goto('/#dataset');
  await expect(page.getByRole('heading', { name: 'Bangun pemahaman, bersama.' })).toBeVisible();
  await page.getByLabel('ID samaran penutur').fill('signer-01');
  await page.getByLabel('Kode referensi persetujuan').fill('consent-01');
}
async function startCapture(page: Page) {
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Aktifkan kamera' }).click();
  await expect(page.getByText('Pratinjau aktif', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mulai ambil sampel' }).click();
}
async function sufficientFrames(page: Page) {
  await expect.poll(async () => {
    const text = await page.locator('.studio-recording strong').textContent();
    return Number(text?.split(' ')[0]);
  }).toBeGreaterThanOrEqual(13);
}

test('studio requires deliberate capture and exports a pending sequence without uploads', async ({ page }, testInfo) => {
  const writes: string[] = [];
  page.on('request', request => { if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.url()); });
  await prepare(page);
  expect(await page.evaluate(() => Reflect.get(window, '__cameraProbe').requests.length)).toBe(0);
  await page.getByRole('button', { name: 'Aktifkan kamera' }).click();
  await expect(page.getByText('Pratinjau aktif', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mulai ambil sampel' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Unduh JSON' })).toHaveCount(0);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Mulai ambil sampel' }).click();
  await expect(page.getByLabel('ID samaran penutur')).toBeDisabled();
  await sufficientFrames(page);
  await page.getByRole('button', { name: 'Selesaikan sampel' }).click();
  await expect(page.getByText('Pending — perlu penutur BISINDO')).toBeVisible();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, '__cameraProbe').stopped)).toBe(1);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Unduh JSON' }).click();
  const download = await downloadEvent;
  const output = testInfo.outputPath('synthetic-sequence.json');
  await download.saveAs(output);
  const data = JSON.parse(await readFile(output, 'utf8'));
  expect(data).toMatchObject({ signerId: 'signer-01', consentReference: 'consent-01', region: 'unassigned', reviewStatus: 'pending', intentId: 'INT-01', split: 'train' });
  expect(data.frames.length).toBeGreaterThanOrEqual(13);
  expect(data.frames[0].timestampMs).toBe(0);
  expect(data.frames.at(-1).timestampMs).toBeGreaterThanOrEqual(1000);
  expect(data.frames.every((frame: { timestampMs: number }, i: number) => i === 0 || frame.timestampMs > data.frames[i - 1].timestampMs)).toBe(true);
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Hapus sampel' }).click();
  await expect(page.getByRole('button', { name: 'Unduh JSON' })).toHaveCount(0);
  await page.getByLabel('ID samaran penutur').fill('signer-02');
  await expect(page.getByRole('checkbox')).not.toBeChecked();
});

test('cancelling or stopping camera discards an incomplete sample', async ({ page }) => {
  await prepare(page);
  await startCapture(page);
  await sufficientFrames(page);
  await page.getByRole('button', { name: 'Batalkan sampel', exact: true }).click();
  await expect(page.getByText('Sampel dibatalkan dan dibersihkan.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unduh JSON' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mulai ambil sampel' }).click();
  await page.getByRole('button', { name: 'Matikan kamera' }).click();
  await expect(page.getByText('Perekaman dibatalkan karena kamera berhenti. Tidak ada sampel yang disimpan.')).toBeVisible();
  await expect(page.locator('.studio-recording')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Unduh JSON' })).toHaveCount(0);
});

test('automatic capture limit stops camera and returning to kiosk discards sample', async ({ page }) => {
  await prepare(page);
  await startCapture(page);
  await expect(page.getByRole('button', { name: 'Unduh JSON' })).toBeVisible({ timeout: 9000 });
  await expect.poll(() => page.evaluate(() => Reflect.get(window, '__cameraProbe').stopped)).toBe(1);
  await page.getByRole('button', { name: 'Kembali ke SAPA' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Hapus dan keluar' }).click();
  await expect(page.getByRole('button', { name: 'Mulai sesi komunikasi' })).toBeVisible();
  await page.getByRole('link', { name: 'Studio Dataset untuk tim' }).click();
  await expect(page.getByRole('button', { name: 'Unduh JSON' })).toHaveCount(0);
  await expect(page.getByLabel('ID samaran penutur')).toHaveValue('');
});

test('hiding the page cancels capture and does not resume it', async ({ page }) => {
  await prepare(page);
  await startCapture(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => Reflect.get(window, '__cameraProbe').stopped)).toBe(1);
  await expect(page.locator('.studio-recording')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Unduh JSON' })).toHaveCount(0);
});

test('health is explicit and unavailable model or service does not disable studio', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/v1/health', route => {
    calls++;
    return route.fulfill({ json: { status: 'ok', model: { available: false } } });
  });
  await prepare(page);
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Periksa layanan' }).click();
  await expect(page.getByText('Layanan aktif. Model BISINDO belum tersedia.')).toBeVisible();
  await page.unroute('**/api/v1/health');
  await page.route('**/api/v1/health', route => route.abort());
  await page.getByRole('button', { name: 'Periksa layanan' }).click();
  await expect(page.getByText('Layanan belum terhubung. Studio tetap bisa digunakan tanpa layanan model.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aktifkan kamera' })).toBeEnabled();
});

test('studio fits a narrow screen and starts without permission requests', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await prepare(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Kembali ke SAPA' })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, '__cameraProbe').requests.length)).toBe(0);
});
