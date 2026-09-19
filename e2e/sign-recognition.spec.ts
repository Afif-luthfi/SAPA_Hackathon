import { expect, test, type Page } from '@playwright/test';

import { buildDemoPatternFrames } from '../src/intent/demoPattern';
import { mockCamera } from './support/mockCamera';

async function openSignMode(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mulai sesi komunikasi' }).click();
  await page.getByRole('button', { name: 'Bahasa isyarat', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Siapkan ruang isyaratmu.' })).toBeVisible();
  await page.getByRole('button', { name: 'Aktifkan kamera' }).click();
  await expect(page.getByText('Kamera aktif', { exact: true })).toBeVisible();
}

async function record(page: Page, durationMs: number) {
  const button = page.getByTestId('sign-record');
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect(page.getByText('Sedang merekam isyarat')).toBeVisible();
  await page.waitForTimeout(durationMs);
  await page.mouse.up();
}

async function stubSpeech(page: Page) {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    Reflect.set(window, '__spoken', spoken);
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true, value: class SpeechSynthesisUtterance { text: string; constructor(text: string) { this.text = text; } },
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true, value: {
        speak: (utterance: { text: string }) => spoken.push(utterance.text),
        cancel: () => {},
        getVoices: () => [],
        pause: () => {}, resume: () => {}, paused: false, speaking: false,
      },
    });
  });
}

test('an unrecognized signal shows the honest low-confidence fallback and sends nothing', async ({ page }) => {
  await mockCamera(page);
  await openSignMode(page);
  await expect(page.getByText('0 pesan', { exact: true })).toBeVisible();

  await record(page, 1100);

  await expect(page.getByTestId('sign-result')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Belum dikenali' })).toBeVisible();
  await expect(page.getByText('Aplikasi tidak menebak isyarat yang tidak dikenali.')).toBeVisible();
  const resultBox = page.getByTestId('sign-result');
  await expect(resultBox.getByRole('button', { name: 'Pilih frasa' })).toBeVisible();
  await expect(resultBox.getByRole('button', { name: 'Ketik pesan' })).toBeVisible();
  await expect(resultBox.getByRole('button', { name: 'Minta penerjemah' })).toBeVisible();
  await expect(page.getByRole('log').getByText('Saya ingin mendaftar.')).toHaveCount(0);
  await expect(page.getByText('0 pesan', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Ulangi isyarat' }).click();
  await expect(page.getByTestId('sign-result')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tahan untuk mulai isyarat' })).toBeVisible();
});

test('a confident demo pattern asks for confirmation before showing the message', async ({ page }) => {
  await stubSpeech(page);
  await mockCamera(page, 'granted', 'ready', buildDemoPatternFrames());
  await openSignMode(page);
  await expect(page.getByText('0 pesan', { exact: true })).toBeVisible();

  await record(page, 2600);

  await expect(page.getByTestId('sign-result')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Hasil isyarat' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Benar/ })).toBeVisible();
  await expect(page.getByText('0 pesan', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Benar/ }).click();

  await expect(page.getByTestId('sign-result')).toHaveCount(0);
  await expect(page.getByRole('log').getByText('Saya ingin mendaftar.', { exact: true })).toBeVisible();
  await expect(page.getByText('1 pesan', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, '__spoken'))).toEqual(['Saya ingin mendaftar.']);
  await expect(page.getByRole('button', { name: 'Tahan untuk mulai isyarat' })).toBeVisible();
});

test('ending the session clears a pending sign result', async ({ page }) => {
  await mockCamera(page, 'granted', 'ready', buildDemoPatternFrames());
  await openSignMode(page);

  await record(page, 2600);
  await expect(page.getByTestId('sign-result')).toBeVisible();

  await page.getByRole('button', { name: 'Akhiri sesi', exact: true }).click();
  await page.getByRole('button', { name: 'Hapus dan akhiri sesi' }).click();

  await expect(page.getByRole('button', { name: 'Mulai sesi komunikasi' })).toBeVisible();
  await expect(page.getByTestId('sign-result')).toHaveCount(0);
});