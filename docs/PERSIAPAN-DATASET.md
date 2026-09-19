# Persiapan dataset BISINDO SAPA

**Status:** tim belum memiliki reviewer dan belum menetapkan varian daerah. Tahap kamera dapat dicoba, tetapi model penerjemah belum dilatih. Model MediaPipe hanya menemukan posisi; hasilnya tidak menyatakan makna suatu isyarat.

## 1. Tentukan cakupan bersama penutur

Hubungi calon kolaborator komunitas Tuli/penutur BISINDO untuk meninjau kebutuhan komunikasi meja informasi. Tim perlu menyepakati satu varian daerah, tujuan demo, persetujuan berkontribusi, dan kompensasi/peran kolaborator jika relevan. Panduan ini bukan klaim bahwa kerja sama tersebut sudah ada.

Gunakan daftar intent PRD sebagai pertanyaan kebutuhan, bukan instruksi untuk menciptakan gesture sendiri:

| ID | Kebutuhan yang perlu ditinjau |
|---|---|
| INT-01 | Saya ingin mendaftar. |
| INT-02 | Saya sudah memiliki janji. |
| INT-03 | Saya membawa surat rujukan. |
| INT-04 | Saya menggunakan BPJS. |
| INT-05 | Di mana loket pendaftaran? |
| INT-06 | Di mana apotek? |
| INT-07 | Di mana laboratorium? |
| INT-08 | Saya membutuhkan penerjemah BISINDO. |
| INT-09 | Saya belum mengerti. Tolong ulangi atau tuliskan. |
| INT-10 | Terima kasih. |

Reviewer boleh mengganti susunan frasa, memecah intent, atau menyarankan penggunaan kartu teks. Jangan menyamakan satu kalimat bahasa Indonesia dengan satu gesture tanpa tinjauan bahasa.

## 2. Persetujuan pengumpulan terpisah

Sesi pasien tidak menjadi sumber data latihan. Alat koleksi, jika dibuat, harus mempunyai alur persetujuan tersendiri sebelum merekam atau mengekspor data.

Jelaskan kepada setiap kontributor:

- Data yang dikumpulkan: apakah video, landmark tangan/tubuh/wajah, atau keduanya.
- Tujuan: pengembangan prototype intent terbatas, siapa yang boleh mengakses, dan apakah akan dipresentasikan.
- Lokasi penyimpanan, durasi retensi, penggunaan ulang yang diperbolehkan, dan kontak permintaan penghapusan.
- Apakah wajah, nama, atau video akan ditampilkan publik; izin publikasi harus terpisah.
- Cara menghentikan kontribusi dan batas penarikan setelah data telah dipakai melatih model.

Simpan dokumen persetujuan secara privat. Berkas sequence hanya merujuk kode persetujuan, tidak berisi nama atau nomor kontak. Landmark bukan data yang otomatis anonim.

## 3. Format dan rancangan pengumpulan

Target awal PRD: 10 intent × 15 sequence × sedikitnya 3 penutur = 450 sequence. Ini target pengumpulan awal, bukan jaminan jumlah data sudah memadai. Jangan mengejar angka dengan duplikasi video.

- Bagi data berdasarkan penutur sebelum pelatihan: penutur test tidak boleh muncul dalam training atau validation.
- Bila penutur hanya tiga, dokumentasikan keterbatasan pembagian dan evaluasi; tambah penutur untuk menilai generalisasi.
- Rekam tiap gerakan sebagai satu sequence dengan awal/akhir yang jelas, beberapa pengulangan alami, jarak/pencahayaan/latar berbeda.
- Catat varian daerah, intent, ID samaran penutur, sumber persetujuan, versi extractor, serta status review.
- Kumpulkan contoh gerakan di luar cakupan dan tidak ada gerakan untuk menguji penolakan model; rancangan labelnya ditetapkan sebelum training.
- Jangan menilai hasil hanya dari orang yang ikut melatih model.

Skema awal ada di [sequence.schema.json](../datasets/sequence.schema.json). Per frame: 33 titik pose, 21 tiap tangan, 478 wajah, atau array kosong jika bagian tidak ditemukan. Simpan koordinat asli; jangan mencerminkan satu sisi saja. Ekspresi wajah dapat membawa informasi bahasa sehingga keputusan mengurangi fitur perlu dibahas dengan reviewer.

Titik MediaPipe menggunakan koordinat relatif gambar. Kedalaman titik dari kelompok berbeda tidak otomatis berada dalam sistem koordinat fisik yang sama. Normalisasi terhadap bahu dan penyatuan fitur untuk model perlu didefinisikan serta diuji pada tahap 3. Jangan menggabungkan semua nilai z sebagai ukuran jarak tubuh yang setara.

## 4. Pemeriksaan sebelum training

1. Setiap sequence mempunyai persetujuan yang sah untuk tujuan yang disepakati.
2. Reviewer menyetujui label, varian, awal/akhir gesture, dan contoh ambigu.
3. Penutur tidak bocor antar split; tidak ada salinan sequence yang sama di train dan test.
4. Timestamp relatif dimulai dari nol dan meningkat; nilai numerik finite, jumlah titik sesuai skema.
5. Sequence tanpa tangan/bahu atau terlalu terpotong ditandai untuk review; jangan mengganti titik hilang dengan data yang tampak seolah pengamatan nyata.
6. Simpan mask keberadaan titik saat merancang input model, serta dokumentasikan augmentasi dan normalisasi.
7. Model card mencatat jumlah nyata penutur/sample, varian, confusion matrix, macro F1, dan keterbatasan.

## 5. Keputusan melanjutkan

Saat ini manifest berstatus `not-ready`. Dataset, model BISINDO, serta validasi komunitas belum tersedia. Tanpa reviewer, lanjutkan pengujian kamera dan komunikasi manual. Tahap 3 boleh dimulai dari persiapan pipeline, tetapi jangan mengklaim translator BISINDO tervalidasi atau membuat label gesture pengganti sendiri.

Referensi teknis: [MediaPipe Holistic Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/holistic_landmarker) dan [API Web](https://developers.google.com/edge/mediapipe/solutions/vision/holistic_landmarker/web_js). Model posisi ini terpisah dari model pengenalan intent yang akan dibangun tim.
