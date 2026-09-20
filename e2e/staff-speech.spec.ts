import { expect, test, type Page } from '@playwright/test';

async function prepare(page: Page, supported = true) {
  await page.addInitScript(({ supported }) => {
    const probe = { starts: 0, aborts: 0, stops: 0, instances: [] as MockRecognition[] };
    class MockRecognition {
      lang = ''; continuous = true; interimResults = false; maxAlternatives = 0;
      onstart: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      savedStart: (() => void) | null = null;
      savedResult: ((event: unknown) => void) | null = null;
      start() { probe.starts++; this.savedStart = this.onstart; this.savedResult = this.onresult; }
      stop() { probe.stops++; }
      abort() { probe.aborts++; }
      result(text: string, final = true) { this.onresult?.({ results: [{ isFinal: final, 0: { transcript: text } }] }); }
    }
    Reflect.set(window, '__speechProbe', probe);
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: supported ? MockRecognition : undefined });
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
    const Original = MockRecognition;
    if (supported) Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: class extends Original { constructor() { super(); probe.instances.push(this); } } });
  }, { supported });
  await page.goto('/');
  await page.getByRole('button', { name: 'Mulai sesi komunikasi' }).click();
}
const consent = (page: Page) => page.getByRole('checkbox', { name: /Saya memahami pemrosesan audio/ });
const speech = (page: Page) => page.getByRole('region', { name: 'Draf dari suara petugas' });
async function start(page: Page, activate = true) {
  await consent(page).check();
  await page.getByRole('button', { name: 'Mulai ucapan', exact: true }).click();
  if (activate) await page.evaluate(() => Reflect.get(window, '__speechProbe').instances.at(-1).onstart());
}
async function result(page: Page, text: string, final = true) {
  await page.evaluate(({ text, final }) => Reflect.get(window, '__speechProbe').instances.at(-1).result(text, final), { text, final });
}
async function end(page: Page) {
  await page.evaluate(() => Reflect.get(window, '__speechProbe').instances.at(-1).onend());
}

test('microphone requires consent and speech remains editable before explicit send', async ({ page }) => {
  await prepare(page);
  expect(await page.evaluate(() => Reflect.get(window, '__speechProbe').starts)).toBe(0);
  await expect(speech(page)).toContainText('Audio dapat dikirim oleh browser');
  await expect(page.getByRole('button', { name: 'Mulai ucapan', exact: true })).toBeDisabled();
  await page.locator('#staff-draft').fill('Selamat pagi.');
  await start(page);
  expect(await page.evaluate(() => Reflect.get(window, '__speechProbe').instances[0].lang)).toBe('id-ID');
  await result(page, 'Silakan ke loket.', false);
  await expect(page.getByRole('button', { name: 'Tambahkan ke draf' })).toBeDisabled();
  await expect(page.locator('#staff-draft')).toHaveValue('Selamat pagi.');
  await result(page, 'Silakan ke loket.');
  await page.getByRole('button', { name: 'Selesai berbicara' }).click();
  expect(await page.evaluate(() => Reflect.get(window, '__speechProbe').stops)).toBe(1);
  await end(page);
  await expect(page.getByText('0 pesan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tambahkan ke draf' }).click();
  await expect(page.locator('#staff-draft')).toHaveValue('Selamat pagi. Silakan ke loket.');
  await page.locator('#staff-draft').fill('Silakan ke meja informasi.');
  await expect(page.getByRole('log')).not.toContainText('Silakan ke meja informasi.');
  await page.getByRole('button', { name: 'Kirim balasan' }).click();
  await expect(page.getByRole('log')).toContainText('Silakan ke meja informasi.');
});

test('denied permission and network failure preserve the manual reply', async ({ page }) => {
  await prepare(page);
  await page.locator('#staff-draft').fill('Draf tetap ada.');
  await start(page, false);
  await page.evaluate(() => Reflect.get(window, '__speechProbe').instances.at(-1).onerror({ error: 'not-allowed' }));
  await expect(speech(page)).toContainText('Izin mikrofon ditolak.');
  await start(page);
  await page.evaluate(() => Reflect.get(window, '__speechProbe').instances.at(-1).onerror({ error: 'network' }));
  await expect(speech(page)).toContainText('Layanan suara tidak terhubung.');
  await expect(page.locator('#staff-draft')).toHaveValue('Draf tetap ada.');
  await page.getByRole('button', { name: 'Kirim balasan' }).click();
  await expect(page.getByRole('log')).toContainText('Draf tetap ada.');
});

test('cancel rejects a late permission and stale transcript, including after restart', async ({ page }) => {
  await prepare(page);
  await start(page, false);
  await page.getByRole('button', { name: 'Batalkan ucapan' }).click();
  await start(page);
  await page.evaluate(() => {
    const old = Reflect.get(window, '__speechProbe').instances[0];
    old.savedStart(); old.savedResult({ results: [{ isFinal: true, 0: { transcript: 'Hasil lama' } }] });
  });
  await expect(page.getByTestId('speech-transcript')).toHaveCount(0);
  await result(page, 'Hasil baru'); await end(page);
  await expect(page.getByTestId('speech-transcript')).toHaveText('Hasil baru');
  expect(await page.evaluate(() => Reflect.get(window, '__speechProbe').aborts)).toBeGreaterThanOrEqual(2);
});

test('hiding the page and ending the session abort speech and clear pending results', async ({ page }) => {
  await prepare(page); await start(page); await result(page, 'Belum dikirim');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByTestId('speech-transcript')).toHaveCount(0);
  await expect(speech(page)).toContainText('Mikrofon dihentikan');
  await page.evaluate(() => Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }));
  await start(page); await result(page, 'Rahasia sementara');
  await page.getByRole('button', { name: 'Akhiri sesi', exact: true }).click();
  await page.getByRole('button', { name: 'Hapus dan akhiri sesi' }).click();
  await page.evaluate(() => Reflect.get(window, '__speechProbe').instances.at(-1).savedResult({ results: [{ isFinal: true, 0: { transcript: 'Hasil terlambat' } }] }));
  await page.getByRole('button', { name: 'Mulai sesi komunikasi' }).click();
  await expect(consent(page)).not.toBeChecked();
  await expect(page.locator('#staff-draft')).toHaveValue('');
  await expect(page.getByTestId('speech-transcript')).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, '__speechProbe').aborts)).toBe(2);
});

test('unsupported browser keeps templates and typing usable', async ({ page }) => {
  await prepare(page, false);
  await expect(speech(page)).toContainText('Input suara tidak tersedia');
  await expect(page.getByRole('button', { name: 'Mulai ucapan', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Arah pendaftaran', exact: true }).click();
  await expect(page.locator('#staff-draft')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Kirim balasan' }).click();
  await expect(page.getByText('1 pesan', { exact: true })).toBeVisible();
});

test('speech timeout aborts without sending and stop cannot hang indefinitely', async ({ page }) => {
  await prepare(page); await page.clock.install(); await start(page);
  await page.clock.fastForward(30_001);
  await expect(speech(page)).toContainText('Batas 30 detik tercapai');
  await expect(page.getByText('0 pesan', { exact: true })).toBeVisible();
  await start(page); await result(page, 'Hasil tersedia');
  await page.getByRole('button', { name: 'Selesai berbicara' }).click();
  await page.clock.fastForward(5001);
  await expect(speech(page)).toContainText('Layanan belum menyelesaikan ucapan');
  await expect(page.getByRole('button', { name: 'Tambahkan ke draf' })).toBeEnabled();
  expect(await page.evaluate(() => Reflect.get(window, '__speechProbe').aborts)).toBe(2);
});

test('speech never overwrites a full draft and fits a narrow screen with large text', async ({ page }) => {
  await prepare(page); await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole('button', { name: 'Perbesar teks' }).click();
  await page.getByRole('button', { name: 'Kontras tinggi' }).click();
  await page.locator('#staff-draft').fill('a'.repeat(995));
  await start(page); await result(page, 'Balasan panjang'); await end(page);
  await expect(page.getByRole('button', { name: 'Tambahkan ke draf' })).toBeDisabled();
  await expect(page.locator('#staff-draft')).toHaveValue('a'.repeat(995));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/previews/04-staff-speech-mobile.png', fullPage: true });
  await start(page); await result(page, 'b'.repeat(1001)); await end(page);
  await expect(speech(page)).toContainText('Hasil dibatasi 1.000 karakter dan terpotong.');
  await expect(page.getByTestId('speech-transcript')).toHaveText('b'.repeat(1000));
});

test('revoking consent and leaving for dataset studio abort active speech', async ({ page }) => {
  await prepare(page); await start(page); await result(page, 'Hasil sementara');
  await consent(page).uncheck();
  await expect(page.getByTestId('speech-transcript')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Mulai ucapan', exact: true })).toBeDisabled();
  await start(page);
  await page.getByRole('link', { name: 'Studio Dataset untuk tim' }).click();
  await expect(page.getByRole('heading', { name: 'Bangun pemahaman, bersama.' })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, '__speechProbe').aborts)).toBe(2);
});
