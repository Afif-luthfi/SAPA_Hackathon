import { expect, test } from '@playwright/test';

test('real local MediaPipe worker initializes and processes a blank frame without external services', async ({ page, context }) => {
  test.setTimeout(90_000);
  const external: string[] = [];
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:5173') {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto('/');
  const result = await page.evaluate(() => new Promise<{ type: string; pose?: number; hands?: number; face?: number }>((resolve, reject) => {
    const worker = new Worker('/vision/landmark-worker.js');
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('Real worker timed out')); }, 65_000);
    worker.onerror = event => { clearTimeout(timer); worker.terminate(); reject(new Error(event.message)); };
    worker.onmessage = async event => {
      if (event.data.type === 'ready') {
        const canvas = new OffscreenCanvas(640, 480);
        canvas.getContext('2d')!.fillRect(0, 0, 640, 480);
        const bitmap = await createImageBitmap(canvas);
        worker.postMessage({ type: 'frame', bitmap, timestampMs: 1 }, [bitmap]);
      } else {
        clearTimeout(timer);
        worker.terminate();
        const data = event.data;
        resolve(data.type === 'result' ? {
          type: data.type, pose: data.frame.pose.length, hands: data.frame.leftHand.length + data.frame.rightHand.length, face: data.frame.face.length,
        } : data);
      }
    };
    worker.postMessage({ type: 'init' });
  }));
  expect(result).toEqual({ type: 'result', pose: 0, hands: 0, face: 0 });
  expect(external).toEqual([]);
});

test('real detector processes video from a synthetic camera through the actual UI', async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        const context = canvas.getContext('2d')!;
        const paint = () => { context.fillStyle = '#263d36'; context.fillRect(0, 0, 640, 480); };
        paint();
        const interval = setInterval(paint, 100);
        const stream = canvas.captureStream(10);
        Reflect.set(window, '__realVisionStream', stream);
        const track = stream.getVideoTracks()[0];
        const stop = track.stop.bind(track);
        track.stop = () => { clearInterval(interval); stop(); };
        return stream;
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Mulai sesi komunikasi' }).click();
  await page.getByRole('button', { name: 'Bahasa isyarat', exact: true }).click();
  await page.getByRole('button', { name: 'Aktifkan kamera' }).click();
  await expect(page.getByText('Kamera aktif', { exact: true })).toBeVisible({ timeout: 65_000 });
  await expect(page.getByText('Posisikan bahu dan tubuh bagian atas di dalam bingkai.', { exact: true })).toBeVisible({ timeout: 15_000 });
  expect(await page.getByTestId('landmark-overlay').evaluate(canvas => (canvas as HTMLCanvasElement).width)).toBe(640);
  await expect(page.getByText('0 pesan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Matikan kamera' }).click();
  expect(await page.evaluate(() => Reflect.get(window, '__realVisionStream').getVideoTracks()[0].readyState)).toBe('ended');
});

