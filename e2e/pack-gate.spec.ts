import { expect, test, type Page } from '@playwright/test';

async function startKiosk(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mulai sesi komunikasi' }).click();
  await page.getByRole('button', { name: 'Bahasa isyarat', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Siapkan ruang isyaratmu.' })).toBeVisible();
}

async function goToStudio(page: Page) {
  await page.getByRole('link', { name: /Studio Dataset/ }).click();
  await expect(page.getByRole('heading', { name: 'Registry pack · BOT Chain' })).toBeVisible();
}

async function goBackToKiosk(page: Page) {
  await page.getByRole('button', { name: 'Kembali ke SAPA' }).click();
  await expect(page.getByRole('button', { name: 'Mulai sesi komunikasi' })).toBeVisible();
  await page.getByRole('button', { name: 'Mulai sesi komunikasi' }).click();
}

test('pack terverifikasi: kiosk menampilkan persetujuan dan mengizinkan kamera', async ({ page }) => {
  await startKiosk(page);

  await expect(page.getByTestId('pack-gate-verified')).toBeVisible();
  await expect(page.getByText(/Model contoh cocok dengan pack aktif/)).toBeVisible();
  await expect(page.getByText(/2 dari 3 validator/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aktifkan kamera' })).toBeVisible();

  await page.getByRole('button', { name: 'Mengenal SAPA' }).click();
  await expect(page.getByTestId('about-pack-status')).toContainText('Aktif');
});

test('file model yang berubah memblokir pengenalan dan menyediakan jatuh kembali', async ({ page }) => {
  await startKiosk(page);
  await expect(page.getByTestId('pack-gate-verified')).toBeVisible();

  await goToStudio(page);
  await page.getByRole('button', { name: /simulasikan file model berubah/ }).click();
  await expect(page.getByRole('button', { name: /kiosk memblokir/ })).toBeVisible();
  await goBackToKiosk(page);

  await page.getByRole('button', { name: 'Bahasa isyarat', exact: true }).click();
  await expect(page.getByTestId('pack-gate-blocked')).toBeVisible();
  await expect(page.getByText(/File model telah berubah/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aktifkan kamera' })).toHaveCount(0);

  const blocked = page.getByTestId('pack-gate-blocked');
  await blocked.getByRole('button', { name: 'Gunakan frasa' }).click();
  await expect(page.getByText('Pilih frasa, periksa pesannya, lalu tunjukkan ke petugas.', { exact: true })).toBeVisible();

  await goToStudio(page);
  await page.getByRole('button', { name: /kiosk memblokir/ }).click();
  await goBackToKiosk(page);
  await page.getByRole('button', { name: 'Bahasa isyarat', exact: true }).click();
  await expect(page.getByTestId('pack-gate-verified')).toBeVisible();
});

test('deprecation kuorum memblokir kiosk, pack pengganti mengembalikannya', async ({ page }) => {
  await page.goto('/');
  await goToStudio(page);
  await expect(page.getByTestId('current-pack')).toContainText('Active');

  await page.getByRole('button', { name: 'Proposal deprecation' }).click();
  await expect(page.getByText(/Proposal deprecation dibuat oleh validator-a/)).toBeVisible();

  await page.getByRole('button', { name: 'B · penutur BISINDO' }).click();
  await page.getByRole('button', { name: 'Setujui deprecation' }).click();
  await expect(page.getByText(/Deprecation disetujui validator-b/)).toBeVisible();
  await expect(page.getByTestId('current-pack')).toContainText('Deprecated');
  await expect(page.getByText(/Kiosk: tanpa pack aktif/)).toBeVisible();

  await goBackToKiosk(page);
  await page.getByRole('button', { name: 'Bahasa isyarat', exact: true }).click();
  await expect(page.getByTestId('pack-gate-blocked')).toBeVisible();
  await expect(page.getByText(/Belum ada pack aktif/)).toBeVisible();

  await goToStudio(page);
  await page.getByRole('button', { name: 'Usulkan versi baru' }).click();
  await expect(page.getByText(/menunggu 2 persetujuan validator/)).toBeVisible();

  await page.getByRole('button', { name: 'Setujui pack' }).click();
  await page.getByRole('button', { name: 'B · penutur BISINDO' }).click();
  await page.getByRole('button', { name: 'Setujui pack' }).click();
  await expect(page.getByText(/Kiosk: pack aktif/)).toBeVisible();

  await goBackToKiosk(page);
  await page.getByRole('button', { name: 'Bahasa isyarat', exact: true }).click();
  await expect(page.getByTestId('pack-gate-verified')).toBeVisible();
});