# SAPA Care

**Akses komunikasi sejak pintu pertama.**

SAPA membantu pasien Tuli dan petugas berkomunikasi pada layanan awal rumah sakit. Pengembangan mengikuti [PRD](PRD-SAPA.md) secara bertahap.

## Status saat ini

**Versi 0.4.0: alur isyarat → teks dengan konfirmasi dan pemeriksaan language pack (BOT Chain) tersedia sebagai contoh teknis.** Tahap 1 dan kamera tahap 2 tetap tersedia. Reviewer dan dataset khusus layanan rumah sakit belum tersedia. Eksperimen tiga kata memakai dataset publik Banten pada halaman terpisah; belum ada penerjemah BISINDO yang tervalidasi untuk SAPA; input suara petugas tersedia secara opsional pada browser yang mendukung; hasil menjadi draf yang wajib diperiksa.

Registry BOT Chain yang dipakai aplikasi adalah **simulasi lokal** yang menerapkan aturan kontrak (kuorum 2 dari 3 validator). Kontrak Solidity sudah disiapkan di `chain/LanguagePackRegistry.sol`, tetapi **belum di-deploy**; alamat testnet akan dirilis hanya setelah deployment nyata dilakukan. Tidak ada video, teks percakapan, identitas pasien, atau data kesehatan yang dicatat on-chain.

Pengenalan yang terpasang adalah model contoh berbasis aturan (`sapa-demo-handcraft-v1`) untuk menguji alur aplikasi. Hasil ragu tidak pernah ditebak, dan semua hasil harus dikonfirmasi pasien sebelum tampil di percakapan. Pendeteksi MediaPipe hanya menemukan titik gerak; hasil isyarat tidak diklaim sebagai terjemahan BISINDO tervalidasi.

## Eksperimen BISINDO dengan data nyata

Halaman terpisah **[Demo riset BISINDO](http://127.0.0.1:5173/#bisindo)** menggunakan model yang belajar dari subset WL-BISINDO varian Banten untuk tiga kata: **Maaf, Terima kasih, Di mana**. Halaman ini menyediakan input kamera dan video lokal, laporan evaluasi penutur terpisah, serta konfirmasi sebelum kata ditampilkan.

Model riset ini berbeda dari model aturan sepuluh intent di kiosk utama. Tidak ada pemetaan kata dataset menjadi kalimat rumah sakit. Belum ada validasi komunitas atau uji kamera fisik. Dataset berlisensi CC BY-NC 4.0; eksperimen ditujukan untuk riset nonkomersial lokal. Ikuti [panduan riset dan reproduksi](docs/RISET-BISINDO.md) untuk membangun model, membaca metrik, dan menyiapkan video uji. Model hasil pipeline tidak masuk Git.

## Fitur yang tersedia

- Sesi tanpa akun/wallet; frasa dan pengetikan dengan konfirmasi sebelum kirim.
- Balasan petugas dan bantuan lokal pada layar yang sama.
- Input suara petugas berbahasa Indonesia atas persetujuan: hasil sementara, tambah ke draf, edit, lalu kirim. Audio dapat diproses layanan penyedia browser; dukungan dan koneksi diperlukan.
- Kamera hanya setelah tombol Aktifkan kamera dan izin browser; mode kamera tidak meminta audio. Mikrofon untuk balasan petugas diaktifkan terpisah.
- Pratinjau bercermin dengan overlay tangan/tubuh serta panduan posisi.
- Pemrosesan MediaPipe di worker lokal; tidak mengunggah video atau landmark.
- Penghentian kamera saat stop, batal, pindah mode, akhir sesi, tab tersembunyi, meninggalkan halaman, atau error.
- Izin yang terlambat datang setelah pembatalan tidak membuat kamera terus menyala.
- **Mode Bahasa isyarat**: tahan tombol saat melakukan gerakan; hasil pengenalan muncul sebagai kartu dengan tingkat keyakinan.
- Kartu hasil menawarkan **Yakin / Perlu dipilih / Belum dikenali**; hasil ragu tidak ditebak dan selalu menawarkan frasa, ketik, atau penerjemah.
- Konfirmasi pasien wajib sebelum hasil isyarat masuk percakapan; pesan pasien dibacakan otomatis dan dapat diulang per pesan.
- **Pemeriksaan language pack**: sebelum mode isyarat aktif, kiosk mencocokkan hash file `model.json` dan `intents.json` dengan catatan pack yang aktif. Pack ditolak jika file berubah, pack dinonaktifkan, atau belum ada pack aktif; jatuh kembali ke frasa/ketik/penerjemah tetap tersedia.
- **Registry pack (simulasi)**: panel validator di Studio Dataset untuk mengusulkan pack, menyetujui dengan kuorum 2 dari 3, menonaktifkan, dan mensimulasikan file berubah. Perubahan langsung memicu pemeriksaan ulang di kiosk.
- Teks besar, kontras tinggi, tampilan responsif, dan dialog yang dapat digunakan dengan keyboard.

Semua lokasi pada contoh adalah fiktif. Permintaan bantuan hanya terlihat di layar ini; belum memanggil petugas/penerjemah atau menyinkronkan perangkat.

## Menjalankan

Prasyarat: Node.js 22.12+ dan browser dengan kamera, Worker, OffscreenCanvas, serta WebAssembly. Pengujian otomatis dijalankan pada Node 24 dan Microsoft Edge. Chrome/Edge desktop menjadi sasaran awal; dukungan perangkat lain perlu diuji.

```sh
npm ci
npm run setup:vision
npm run dev
```

Buka **http://127.0.0.1:5173**. Jika port dipakai aplikasi lain, gunakan `npm run dev -- --port 5174`. Kamera memerlukan localhost atau HTTPS; koneksi HTTP lewat IP jaringan biasa tidak memenuhi persyaratan browser.

Setup pertama mengunduh model posisi dari Google sekitar 13,7 MB dan menyalin runtime JS/WASM dari dependency. Setelah aset siap, runtime mengambil semuanya dari server SAPA sendiri. Kamera dan model contoh tidak membutuhkan kunci API, wallet, atau layanan inference eksternal. Input suara opsional menggunakan layanan pengenalan browser dan dapat memerlukan internet.

Build dan dev memeriksa checksum aset lokal. Jika aset belum siap atau berubah, jalankan ulang `npm run setup:vision`. Aset hasil persiapan ada di `public/vision` dan akan ikut disalin ke build.

## Cara mencoba kamera dan contoh isyarat

1. Mulai sesi komunikasi.
2. Pilih **Bahasa isyarat**. Kamera belum menyala pada langkah ini.
3. Baca keterangan privasi dan tekan **Aktifkan kamera**, lalu berikan izin browser.
4. Hadapkan bahu/tubuh bagian atas ke kamera; angkat tangan di depan tubuh.
5. Perhatikan garis titik gerak dan panduan posisi. Ini belum menghasilkan terjemahan.
6. Tahan tombol **Tahan untuk mulai isyarat** sambil melakukan gerakan, lalu lepas untuk melihat hasil.
7. Hasil yang meyakinkan ditampilkan sebagai kartu **Yakin** dengan tombol **Benar** untuk mengirim; hasil ragu masuk kartu **Perlu dipilih**; hasil tidak meyakinkan tampil sebagai **Belum dikenali** tanpa pesan.
8. Tidak ada pesan terkirim sebelum Anda menekan **Benar** pada kartu hasil.
9. Tekan **Matikan kamera**, pindah ke **Ketik pesan**, atau akhiri sesi. Indikator penggunaan kamera browser seharusnya berhenti.
10. Coba juga menolak izin dan kembali menggunakan **Gunakan frasa**.

Kamera fisik, pencahayaan, performa laptop/tablet, dan kecocokan panduan perlu diperiksa oleh tim pada perangkat demo. Uji otomatis menggunakan sumber video buatan; bukan evaluasi gerakan BISINDO pada peserta nyata.

## Mencoba ucapan petugas

1. Mulai sesi, lalu cari **Ucapkan balasan** pada panel petugas.
2. Baca penjelasan pemrosesan audio dan centang persetujuan.
3. Tekan **Mulai ucapan**, izinkan mikrofon jika diminta, lalu ucapkan satu balasan nonklinis dalam bahasa Indonesia.
4. Tekan **Selesai berbicara** atau tunggu layanan mengakhiri ucapan. Teks sementara belum dapat digunakan.
5. Tekan **Tambahkan ke draf**, koreksi teks pada kolom **Balasan petugas**, lalu **Kirim balasan**. Draf ketikan lama dipertahankan dan hasil suara ditambahkan setelahnya.
6. Gunakan **Batalkan ucapan** untuk membuang hasil. Mikrofon juga dihentikan saat persetujuan dicabut, mode/dialog berubah, halaman tersembunyi, pindah ke Studio, atau sesi berakhir.

Batas satu percobaan 30 detik; hasil yang belum dipakai dibuang jika batas tercapai. Penyelesaian yang macet dibatasi 5 detik. Jika browser tidak mendukung, izin ditolak, atau koneksi gagal, tetap gunakan template/ketik. Pengujian otomatis memakai layanan suara tiruan; akurasi ucapan dan mikrofon fisik belum diverifikasi.

## Pengujian

```sh
npm run check:vision
npm test
npm run test:e2e
npm run build
```

Edge perlu terpasang untuk Playwright. Pemeriksaan ulang integrasi pada 20 September 2026:

- 69 tes logika lulus: ekstraksi fitur, aturan keyakinan, model contoh, sesi, aturan registry (kuorum, supersede, deprecation), verifikasi pack, dan kesesuaian antara `public/language-pack` dengan kode aplikasi.
- 41 skenario browser lulus: 8 alur komunikasi, 7 siklus kamera, 3 skenario isyarat → konfirmasi → kirim, 2 runtime MediaPipe asli, 3 pemeriksaan pack (terverifikasi, file berubah, deprecation + pack pengganti), 6 skenario Studio Dataset, 8 skenario input suara petugas, dan 4 skenario demo riset BISINDO.
- Backend: 16 tes API dan audit dataset lulus; dua peringatan deprecation dependensi test masih ada.
- Tes lifecycle menggunakan kamera/worker tiruan untuk memicu kondisi gagal secara terkontrol.
- Dua tes runtime menjalankan worker dan model asli memakai gambar kosong serta stream buatan; keduanya tidak membuka kamera fisik.
- Tes worker memblokir permintaan keluar origin SAPA, sehingga pemrosesan aset lokal benar-benar diperiksa.
- Build dan checksum 8 aset lokal berhasil. Tes responsif memeriksa layar sempit; tampilan input suara pada 360 px dengan teks besar dan kontras tinggi juga diperiksa menggunakan screenshot.

Tes tersebut tidak mengukur akurasi BISINDO dan tidak menggantikan validasi bersama pengguna Tuli.

## Data dan batas penggunaan

Percakapan hanya berada dalam memori halaman, tanpa server, database, localStorage, atau pemulihan sesi setelah refresh. Akhiri sesi untuk menghapus percakapan. Kamera sesi pasien tidak memakai MediaRecorder dan tidak mengekspor sequence; landmark ditampung sementara untuk pengenalan lalu dibersihkan. Studio Dataset terpisah di `/#dataset` dapat menampung sampel berizin dan mengunduh JSON atas tindakan pengguna. Tidak ada unggahan otomatis atau penyimpanan video.

File model/runtime boleh masuk cache browser sebagai aset aplikasi. Isi kamera dan percakapan tidak dimasukkan ke cache tersebut. Input suara menggunakan SpeechRecognition browser: audio dapat dikirim ke layanan penyedia browser. SAPA tidak membuat file rekaman audio; kebijakan layanan penyedia tetap berlaku. Jangan menyebut input suara sebagai pemrosesan offline/lokal.

SAPA berfokus pada pendaftaran, lokasi, dan bantuan komunikasi. Diagnosis, dosis obat, hasil pemeriksaan, serta persetujuan tindakan medis berada di luar cakupan. Input manual tidak diperiksa kebenaran medisnya oleh aplikasi.

## Dokumen

- [Tahap pengembangan](docs/TAHAP-PENGEMBANGAN.md): progres dan batas tiap tahap.
- [Persiapan dataset](docs/PERSIAPAN-DATASET.md): urutan mencari reviewer, consent, label, dan evaluasi per penutur.
- [Studio dan spesifikasi dataset](datasets/README.md): pengambilan sampel berizin, ekspor JSON, dan audit offline.
- [Panduan demo tiga menit](docs/DEMO-3-MENIT.md): urutan demonstrasi dan batas klaim.
- [Backend lokal](backend/README.md): menjalankan API serta pengujian.
- [Input suara petugas](docs/INPUT-SUARA.md): batas pemrosesan dan uji mikrofon perangkat demo.
- [Aset dan arsitektur vision](docs/ASET-VISION.md): sumber, checksum, worker, dan privasi.
- [PRD](PRD-SAPA.md): sasaran MVP penuh; tidak berarti semua fiturnya sudah tersedia.

Tahap selanjutnya bergantung pada reviewer/varian serta data berizin, dan pada deployment kontrak yang nyata. Hingga kontrak benar-benar terbit di testnet, klaim yang valid hanyalah "registry simulasi lokal"; bukan "terverifikasi on-chain".
