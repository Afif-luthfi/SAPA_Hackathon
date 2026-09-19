# Persiapan dataset SAPA

Folder ini berisi spesifikasi untuk alat pengumpulan data TERPISAH yang belum dibuat. Kamera layanan SAPA tahap 2 hanya menampilkan titik gerak sementara; tidak menulis sequence atau dataset ke folder ini.

- `manifest.template.json`: status awal yang jujur; varian dan reviewer masih kosong.
- `sequence.schema.json`: JSON Schema untuk calon ekspor sequence berizin.
- [Panduan pengumpulan dan review](../docs/PERSIAPAN-DATASET.md).

Jangan memasukkan video, foto wajah, identitas, formulir persetujuan, atau sequence peserta ke repositori publik. Landmark juga merupakan data gerak seseorang, bukan otomatis anonim. Simpan data riset pada lokasi terpisah dengan akses terbatas; gunakan ID samaran pada manifest.

Skema memakai koordinat sensor asli (tidak dicerminkan). Tampilan kamera boleh dicerminkan dengan CSS. `timestampMs` pada berkas dataset harus dihitung relatif terhadap awal sequence, dimulai dari nol dan meningkat ketat. Runtime pratinjau saat ini memakai waktu monoton browser; itu harus dikonversi jika alat koleksi terpisah nanti dibuat.

Validasi tambahan di luar JSON Schema: timestamp meningkat, consentReference benar-benar ada, semua sequence dari signer yang sama memakai split yang sama, tinjauan gestur disetujui, dan nilai JSON finite. Tidak ada contoh gesture buatan yang dianggap sebagai BISINDO.
