import { expect, test, type Page } from '@playwright/test';

import { mockCamera } from './support/mockCamera';

async function openCamera(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mulai sesi komunikasi' }).click();
  await page.getByRole('button', { name: 'Bahasa isyarat', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Siapkan ruang isyaratmu.' })).toBeVisible();
}
async function activate(page: Page) {
  await page.getByRole('button', { name: 'Aktifkan kamera' }).click();
  await expect(page.getByText('Kamera aktif', { exact: true })).toBeVisible();
}
async function expectStopped(page: Page, count: number) {
  await expect.poll(() => page.evaluate(() => Reflect.get(window, '__cameraProbe').stopped)).toBe(count);
}

test('opening camera is opt-in, denied permission can be retried, and audio is never requested', async ({ page }) => {
  await mockCamera(page, 'denied');
  await openCamera(page);
  expect(await page.evaluate(() => Reflect.get(window, '__cameraProbe').requests.length)).toBe(0);
  await page.getByRole('button', { name: 'Aktifkan kamera' }).click();
  await expect(page.getByRole('alert')).toContainText('Izin kamera belum diberikan');
  await page.evaluate(() => { Reflect.get(window, '__cameraProbe').permission = 'granted'; });
  await activate(page);
  expect(await page.evaluate(() => Reflect.get(window, '__cameraProbe').requests)).toEqual([
    { audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } },
    { audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } },
  ]);
  expect(await page.evaluate(() => Reflect.get(window, '__cameraProbe').streams[0].getAudioTracks().length)).toBe(0);
});

test('landmark preview sends no conversation and stop clears stream and overlay', async ({ page }) => {
  await mockCamera(page);
  await openCamera(page);
  const writes: string[] = [];
  page.on('request', request => { if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(request.url()); });
  await activate(page);
  await expect(page.getByText('553 titik terlihat')).toBeVisible();
  await expect(page.getByText('0 pesan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Matikan kamera' }).click();
  await expectStopped(page, 1);
  expect(await page.evaluate(() => Reflect.get(window, '__cameraProbe').terminated)).toBe(1);
  expect(await page.getByTestId('camera-video').evaluate(video => (video as HTMLVideoElement).srcObject)).toBeNull();
  expect(await page.getByTestId('landmark-overlay').evaluate(canvas => {
    const element = canvas as HTMLCanvasElement;
    return element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data.some(value => value !== 0);
  })).toBe(false);
  await expect(page.getByText('553 titik terlihat')).toHaveCount(0);
  expect(writes).toEqual([]);
});

test('leaving sign mode and ending a session release camera tracks', async ({ page }) => {
  await mockCamera(page);
  await openCamera(page);
  await activate(page);
  await page.getByRole('button', { name: 'Ketik pesan', exact: true }).click();
  await expectStopped(page, 1);
  await page.getByRole('button', { name: 'Bahasa isyarat', exact: true }).click();
  await activate(page);
  await page.getByRole('button', { name: 'Akhiri sesi', exact: true }).click();
  await page.getByRole('button', { name: 'Hapus dan akhiri sesi' }).click();
  await expectStopped(page, 2);
  await expect(page.getByRole('button', { name: 'Mulai sesi komunikasi' })).toBeVisible();
});

test('late permission after cancellation is stopped without attaching a video', async ({ page }) => {
  await mockCamera(page, 'late');
  await openCamera(page);
  await page.getByRole('button', { name: 'Aktifkan kamera' }).click();
  await page.getByRole('button', { name: 'Batalkan', exact: true }).click();
  await page.evaluate(() => Reflect.get(window, '__cameraProbe').resolveLate());
  await expectStopped(page, 1);
  expect(await page.getByTestId('camera-video').evaluate(video => (video as HTMLVideoElement).srcObject)).toBeNull();
  await expect(page.getByText('Kamera aktif', { exact: true })).toHaveCount(0);
});

test('a failed detector shuts down the camera and the manual fallback still works', async ({ page }) => {
  await mockCamera(page, 'granted', 'error');
  await openCamera(page);
  await page.getByRole('button', { name: 'Aktifkan kamera' }).click();
  await expect(page.getByRole('alert')).toContainText('Pendeteksi gerakan belum dapat dimuat');
  await expectStopped(page, 1);
  await page.getByRole('button', { name: 'Gunakan frasa', exact: true }).click();
  await page.getByRole('button', { name: 'Saya ingin mendaftar.', exact: true }).click();
  await page.getByRole('button', { name: 'Ya, tampilkan pesan' }).click();
  await expect(page.getByRole('log').getByText('Saya ingin mendaftar.', { exact: true })).toBeVisible();
});

test('hiding or leaving the page stops the camera, without automatically restarting', async ({ page }) => {
  await mockCamera(page);
  await openCamera(page);
  await activate(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expectStopped(page, 1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('Kamera aktif', { exact: true })).toHaveCount(0);
  await activate(page);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expectStopped(page, 2);
});

test('missing camera is explained and the preview fits 360px with larger text', async ({ page }) => {
  await mockCamera(page, 'missing');
  await page.setViewportSize({ width: 360, height: 800 });
  await openCamera(page);
  await page.getByRole('button', { name: 'Perbesar teks' }).click();
  await page.getByRole('button', { name: 'Aktifkan kamera' }).click();
  await expect(page.getByRole('alert')).toContainText('Kamera tidak ditemukan');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(361);
});
