# Aset pendeteksian gerak tahap 2

SAPA memuat MediaPipe Holistic Landmarker secara lokal dalam worker terpisah. Browser mengambil file runtime/model dari origin SAPA sendiri. Frame dipindahkan ke worker dan bitmap ditutup setelah pemrosesan. UI hanya menyimpan ringkasan posisi; tidak mengumpulkan rekaman atau sequence untuk latihan.

## Sumber dan versi

- Package: `@mediapipe/tasks-vision@1.0.1`, dipin dalam package.json dan package-lock.json. Metadata package menyatakan lisensi Apache-2.0; lihat [repositori penerbit](https://github.com/google-ai-edge/mediapipe).
- Model posisi: [Holistic float16 revisi 1](https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/1/holistic_landmarker.task).
- Ukuran model: 13.683.609 byte.
- SHA-256: `e2dab61191e2dcd0a15f943d8e3ed1dce13c82dfa597b9dd39f562975a50c3f8`.
- [Dokumentasi penerbit](https://developers.google.com/edge/mediapipe/solutions/vision/holistic_landmarker/web_js).

Hak dan ketentuan aset mengikuti penerbit masing-masing. Model dan runtime adalah dependensi pihak ketiga, bukan model bahasa isyarat hasil pelatihan tim. File hasil unduhan tidak dimasukkan ke repositori; jalankan `npm run setup:vision` untuk menyiapkannya. Manifest checksum lokal disimpan sebagai catatan teknis. Pemeriksaan ini belum merupakan persetujuan validator atau verifikasi BOT Chain.

## Perilaku runtime

- Kamera diminta setelah tombol Aktifkan kamera, tanpa audio.
- Pengolahan memakai CPU dalam classic worker dan OffscreenCanvas.
- Maksimal satu frame menunggu hasil; pengiriman dibatasi hingga 10 kali per detik. Perangkat lambat dapat menghasilkan laju lebih rendah.
- Video asli dan koordinat tidak dicerminkan; video dan overlay sama-sama dicerminkan di tampilan.
- Overlay menampilkan tangan dan pose tubuh. Titik wajah ikut dihitung sementara oleh Holistic untuk persiapan fitur tahap berikutnya.
- Tidak ada hasil terjemahan, tingkat keyakinan BISINDO, perekaman, atau ekspor data.
- Worker dan stream dihentikan pada stop, pindah mode, akhir sesi, halaman tersembunyi, pagehide, atau error.
- Izin yang datang setelah pembatalan langsung dihentikan; stream tersebut tidak ditempel ke layar.

## Menyiapkan atau memeriksa ulang

```sh
npm ci
npm run setup:vision
npm run check:vision
```

Setup mengunduh model hanya jika file belum tersedia atau checksum salah. Salinan JS/WASM dibuat dari package yang terpasang. Mode `--check` bersifat offline. Model diunduh dari URL revisi tetap dan diperiksa dengan checksum yang dipin; unduhan berbeda akan gagal.

Aset browser boleh di-cache sebagai file aplikasi. Ini berbeda dari data kamera: aplikasi tidak menyimpan video, landmark sequence, maupun transcript ke cache/storage. Jalankan website lewat localhost atau HTTPS dan uji di perangkat sasaran sebelum demo.
