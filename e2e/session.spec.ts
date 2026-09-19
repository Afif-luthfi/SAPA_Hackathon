import { expect, test, type Page } from '@playwright/test';

const patientText = 'Saya ingin mendaftar.';
const staffText = 'Silakan menuju loket pendaftaran di sebelah kanan meja informasi. (Lokasi contoh)';

const conversation = (page: Page) =>
  page.getByRole('log', { name: 'Percakapan pasien dan petugas' });

async function startSession(page: Page) {
  await page.getByRole('button', { name: 'Mulai sesi komunikasi' }).click();
  await expect(conversation(page)).toBeVisible();
}

async function sendPatientPhrase(page: Page) {
  await page.getByRole('button', { name: patientText, exact: true }).click();
  await page.getByRole('button', { name: 'Ya, tampilkan pesan' }).click();
  await expect(conversation(page).getByText(patientText, { exact: true })).toBeVisible();
}

async function requestInterpreter(page: Page) {
  await page.getByRole('button', { name: 'Minta bantuan' }).click();
  await page.getByRole('dialog').getByRole('button', {
    name: 'Saya perlu penerjemah BISINDO',
  }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('welcome opens an empty session and requires confirmation before showing either side of the conversation', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Mulai sesi komunikasi' })).toBeVisible();
  await expect(conversation(page)).toHaveCount(0);
  await startSession(page);

  const log = conversation(page);
  await expect(log.getByRole('heading', { name: 'Dimulai dari satu sapaan.' })).toBeVisible();
  await expect(page.getByText('0 pesan', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ya, tampilkan pesan' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Kirim balasan' })).toBeDisabled();

  await page.getByRole('button', { name: patientText, exact: true }).click();
  await expect(page.locator('#patient-draft')).toHaveValue(patientText);
  await expect(log.getByText(patientText, { exact: true })).toHaveCount(0);
  await expect(page.getByText('0 pesan', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Ya, tampilkan pesan' }).click();
  await expect(log.getByText(patientText, { exact: true })).toBeVisible();
  await expect(page.locator('#patient-draft')).toHaveValue('');
  await expect(page.getByText('1 pesan', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Arah pendaftaran', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Balasan petugas', exact: true })).toHaveValue(staffText);
  await expect(log.getByText(staffText, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Kirim balasan' }).click();
  await expect(log.getByText(staffText, { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Balasan petugas', exact: true })).toHaveValue('');
  await expect(page.getByText('2 pesan', { exact: true })).toBeVisible();
});

test('cancelling exit preserves the session while confirmed exit clears transcript, drafts, and assistance', async ({ page }) => {
  await startSession(page);
  await sendPatientPhrase(page);
  await page.locator('#patient-draft').fill('Draf pasien belum dikirim');
  await page.getByRole('textbox', { name: 'Balasan petugas', exact: true }).fill('Draf petugas belum dikirim');
  await requestInterpreter(page);

  await page.getByRole('button', { name: 'Akhiri sesi', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Lanjutkan sesi' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(conversation(page).getByText(patientText, { exact: true })).toBeVisible();
  await expect(page.locator('#patient-draft')).toHaveValue('Draf pasien belum dikirim');
  await expect(page.getByRole('textbox', { name: 'Balasan petugas', exact: true })).toHaveValue('Draf petugas belum dikirim');
  await expect(page.getByText('Penerjemah BISINDO dibutuhkan', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Akhiri sesi', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hapus dan akhiri sesi' }).click();
  await expect(page.getByRole('button', { name: 'Mulai sesi komunikasi' })).toBeVisible();
  await expect(conversation(page)).toHaveCount(0);

  await startSession(page);
  await expect(page.getByText('0 pesan', { exact: true })).toBeVisible();
  await expect(conversation(page).getByText(patientText, { exact: true })).toHaveCount(0);
  await expect(page.locator('#patient-draft')).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'Balasan petugas', exact: true })).toHaveValue('');
  await expect(page.getByText('Penerjemah BISINDO dibutuhkan', { exact: true })).toHaveCount(0);
});

test('reloading clears the transcript, unsent drafts, and help request', async ({ page }) => {
  await startSession(page);
  await sendPatientPhrase(page);
  await page.locator('#patient-draft').fill('Draf sementara pasien');
  await page.getByRole('textbox', { name: 'Balasan petugas', exact: true }).fill('Draf sementara petugas');
  await requestInterpreter(page);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Mulai sesi komunikasi' })).toBeVisible();
  await expect(conversation(page)).toHaveCount(0);
  await startSession(page);
  await expect(page.getByText('0 pesan', { exact: true })).toBeVisible();
  await expect(conversation(page).getByText(patientText, { exact: true })).toHaveCount(0);
  await expect(page.locator('#patient-draft')).toHaveValue('');
  await expect(page.getByRole('textbox', { name: 'Balasan petugas', exact: true })).toHaveValue('');
  await expect(page.getByText('Penerjemah BISINDO dibutuhkan', { exact: true })).toHaveCount(0);
});

test('interpreter assistance clearly stays on this screen and can be marked handled', async ({ page }) => {
  await startSession(page);
  await sendPatientPhrase(page);
  const outgoingWrites: string[] = [];
  page.on('request', request => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) outgoingWrites.push(request.url());
  });

  await page.getByRole('button', { name: 'Minta bantuan' }).click();
  const helpDialog = page.getByRole('dialog', { name: 'Kami bantu sampaikan.' });
  await expect(helpDialog.getByText('Prototipe belum terhubung ke layanan pemanggilan.', { exact: false })).toBeVisible();
  await helpDialog.getByRole('button', { name: 'Saya perlu penerjemah BISINDO' }).click();
  await expect(helpDialog).toHaveCount(0);

  const helpBanner = page.getByRole('status').filter({ hasText: 'Penerjemah BISINDO dibutuhkan' });
  await expect(helpBanner).toBeVisible();
  await expect(helpBanner).toContainText('Permintaan hanya tampil di layar ini. Petugas perlu mengatur bantuan secara langsung.');
  await helpBanner.getByRole('button', { name: 'Petugas: tandai ditangani' }).click();
  await expect(helpBanner).toHaveCount(0);
  await expect(conversation(page).getByText(patientText, { exact: true })).toBeVisible();
  expect(outgoingWrites).toEqual([]);
});

test('keyboard users can start a session, stay inside dialogs, and return focus with Escape', async ({ page }) => {
  const startButton = page.getByRole('button', { name: 'Mulai sesi komunikasi' });
  await startButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Apa yang kamu butuhkan?' })).toBeFocused();

  const helpButton = page.getByRole('button', { name: 'Minta bantuan' });
  await helpButton.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Kami bantu sampaikan.' });
  const closeButton = dialog.getByRole('button', { name: 'Tutup dialog' });
  await expect(closeButton).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Saya perlu penerjemah BISINDO' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(closeButton).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(helpButton).toBeFocused();

  const endButton = page.getByRole('button', { name: 'Akhiri sesi', exact: true });
  await endButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Selesaikan percakapan?' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(endButton).toBeFocused();
  await expect(conversation(page)).toBeVisible();
});

test('360px layout remains usable with large text, high contrast, and an unbroken message', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole('button', { name: 'Perbesar teks' }).click();
  await page.getByRole('button', { name: 'Kontras tinggi' }).click();
  await expect(page.getByRole('button', { name: 'Perbesar teks' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Kontras tinggi' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(361);

  await startSession(page);
  await page.getByRole('button', { name: 'Ketik pesan', exact: true }).click();
  const longMessage = 'A'.repeat(800);
  await page.locator('#patient-draft').fill(longMessage);
  await page.getByRole('button', { name: 'Ya, tampilkan pesan' }).click();
  const sentMessage = conversation(page).getByText(longMessage, { exact: true });
  await expect(sentMessage).toBeVisible();
  await sentMessage.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(361);
  const messageBounds = await sentMessage.boundingBox();
  expect(messageBounds).not.toBeNull();
  expect(messageBounds!.x).toBeGreaterThanOrEqual(0);
  expect(messageBounds!.x + messageBounds!.width).toBeLessThanOrEqual(361);
});

test('opening the sign camera panel never requests media before an explicit action', async ({ page }) => {
  await page.addInitScript(() => {
    const requests = { count: 0 };
    Object.defineProperty(window, '__sapaMediaRequests', { value: requests });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async () => {
        requests.count += 1;
        throw new Error('Opening the panel must not request camera or microphone access');
      },
    });
  });
  await page.reload();
  await startSession(page);
  await page.getByRole('button', { name: 'Bahasa isyarat', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Siapkan ruang isyaratmu.' })).toBeVisible();
  await expect(page.getByText('Bukan terjemahan BISINDO tervalidasi', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aktifkan kamera' })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, '__sapaMediaRequests').count)).toBe(0);

  await page.getByRole('button', { name: 'Gunakan frasa', exact: true }).click();
  await expect(page.getByRole('button', { name: patientText, exact: true })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, '__sapaMediaRequests').count)).toBe(0);
});

test('tablet navigation stays named and mobile About remains accessible without overflowing the header', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1000 });
  await expect(page.getByRole('link', { name: 'Komunikasi', exact: true })).toBeVisible();
  const tabletAbout = page.getByRole('button', { name: 'Mengenal SAPA', exact: true });
  await expect(tabletAbout).toBeVisible();
  await tabletAbout.click();
  const aboutDialog = page.getByRole('dialog', { name: 'Mengenal SAPA Care' });
  await expect(aboutDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(aboutDialog).toHaveCount(0);
  await expect(tabletAbout).toBeFocused();

  await page.setViewportSize({ width: 360, height: 800 });
  const mobileAbout = page.getByRole('button', { name: 'Tentang SAPA', exact: true });
  await expect(mobileAbout).toBeVisible();
  await mobileAbout.click();
  await expect(aboutDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(aboutDialog).toHaveCount(0);
  await expect(mobileAbout).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(361);
  const header = page.getByRole('banner');
  expect(await header.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
});
