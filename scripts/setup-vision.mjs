import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'public/vision');
const packageRoot = path.join(root, 'node_modules/@mediapipe/tasks-vision');
const manifestPath = path.join(destination, 'assets-manifest.json');
const modelUrl = 'https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task';
const modelSha256 = 'e2dab61191e2dcd0a15f943d8e3ed1dce13c82dfa597b9dd39f562975a50c3f8';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const copyList = [
  ['vision_bundle.js', 'vendor/vision_bundle.js'],
  ...['vision_wasm_internal', 'vision_wasm_nosimd_internal', 'vision_wasm_module_internal']
    .flatMap(name => ['js', 'wasm'].map(extension => ['wasm/' + name + '.' + extension, 'wasm/' + name + '.' + extension])),
];

async function check() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.packageVersion !== '1.0.1') throw new Error('Versi aset tidak cocok.');
  for (const item of manifest.files) {
    const absolute = path.resolve(destination, item.path);
    if (!absolute.startsWith(destination + path.sep)) throw new Error('Path manifest tidak valid.');
    const bytes = await readFile(absolute);
    if (bytes.length !== item.bytes || digest(bytes) !== item.sha256) throw new Error('Aset hilang/berubah: ' + item.path);
  }
  const model = await readFile(path.join(destination, 'models/holistic_landmarker.task'));
  if (digest(model) !== modelSha256) throw new Error('Hash model tidak sesuai sumber yang dipin.');
  console.log('Aset MediaPipe 1.0.1 dan model lokal terverifikasi (' + manifest.files.length + ' file).');
}

async function setup() {
  const packageInfo = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  if (packageInfo.version !== '1.0.1') throw new Error('Jalankan npm ci: versi MediaPipe harus 1.0.1.');
  const files = [];
  for (const [from, to] of copyList) {
    const target = path.join(destination, to);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(packageRoot, from), target);
    const bytes = await readFile(target);
    files.push({ path: to, bytes: bytes.length, sha256: digest(bytes), source: '@mediapipe/tasks-vision@1.0.1/' + from });
  }
  const modelPath = path.join(destination, 'models/holistic_landmarker.task');
  await mkdir(path.dirname(modelPath), { recursive: true });
  let model;
  try {
    await access(modelPath);
    const existing = await readFile(modelPath);
    if (existing.length > 1_000_000 && (digest(existing) === modelSha256)) model = existing;
  } catch { /* Download a missing asset, never a user video. */ }
  if (!model) {
    console.log('Mengunduh model posisi tubuh dari sumber resmi Google...');
    const response = await fetch(modelUrl, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error('Unduhan model gagal: HTTP ' + response.status);
    model = Buffer.from(await response.arrayBuffer());
    if (model.length < 1_000_000) throw new Error('Unduhan bukan model task yang valid.');
    if (digest(model) !== modelSha256) throw new Error('Hash unduhan tidak sesuai model yang dipin.');
    await writeFile(modelPath, model);
  }
  files.push({ path: 'models/holistic_landmarker.task', bytes: model.length, sha256: digest(model), source: modelUrl });
  await writeFile(manifestPath, JSON.stringify({
    schemaVersion: 1,
    packageVersion: '1.0.1',
    model: 'MediaPipe Holistic Landmarker float16 revision 1 (position detection, not BISINDO)',
    files,
  }, null, 2) + '\n');
  console.log('Model: ' + model.length + ' bytes; SHA-256 ' + digest(model));
  await check();
}

try { await (process.argv.includes('--check') ? check() : setup()); }
catch (error) {
  console.error('Aset kamera belum siap: ' + error.message + '\nJalankan npm run setup:vision setelah npm ci.');
  process.exitCode = 1;
}
