# Persiapan dataset SAPA

Folder ini berisi spesifikasi Studio Dataset TERPISAH yang tersedia di `/#dataset`. Kamera sesi pasien tidak mengekspor dataset. Studio hanya mengambil sampel setelah persetujuan dan tindakan Mulai ambil sampel; JSON diunduh secara sengaja, tanpa unggahan otomatis.

- `manifest.template.json`: status awal yang jujur; varian dan reviewer masih kosong.
- `sequence.schema.json`: JSON Schema untuk calon ekspor sequence berizin.
- [Panduan pengumpulan dan review](../docs/PERSIAPAN-DATASET.md).

Jangan memasukkan video, foto wajah, identitas, formulir persetujuan, atau sequence peserta ke repositori publik. Landmark juga merupakan data gerak seseorang, bukan otomatis anonim. Simpan data riset pada lokasi terpisah dengan akses terbatas; gunakan ID samaran pada manifest.

Skema memakai koordinat sensor asli (tidak dicerminkan). Tampilan kamera boleh dicerminkan dengan CSS. `timestampMs` pada berkas dataset harus dihitung relatif terhadap awal sequence, dimulai dari nol dan meningkat ketat. Studio mengonversi waktu monoton browser menjadi waktu relatif saat mengambil sampel.

Validasi tambahan di luar JSON Schema: timestamp meningkat, consentReference benar-benar ada, semua sequence dari signer yang sama memakai split yang sama, tinjauan gestur disetujui, dan nilai JSON finite. Tidak ada contoh gesture buatan yang dianggap sebagai BISINDO.

## Mengambil sampel

1. Buka SAPA lalu pilih **Studio Dataset untuk tim**.
2. Isi ID samaran, kode referensi persetujuan, varian daerah, intent, dan split. Gunakan `unassigned` hanya untuk uji alat; sampel ini belum siap training.
3. Setelah memperoleh persetujuan kontributor, centang persetujuan, aktifkan kamera, lalu pilih **Mulai ambil sampel**.
4. Rekam setidaknya 1 detik dan 10 frame dengan tangan serta bahu terlihat. Batas koleksi adalah 6 detik atau 80 frame.
5. Pilih **Selesaikan sampel**, periksa ringkasannya, lalu **Unduh JSON**. Semua ekspor berstatus `pending`; reviewer masih harus meninjau gerakannya.
6. Pembatalan membuang sampel yang belum selesai. Kamera berhenti setelah selesai; keluar dari studio membersihkan sampel dalam memori, tetapi tidak menghapus berkas yang sudah diunduh.

Audit folder privat yang secara khusus berisi sampel JSON dari root proyek:

```powershell
.venv/Scripts/python.exe -m backend.audit_dataset "C:/lokasi-privat/sampel"
```

Audit memeriksa format, duplikasi, penutur antar split, cakupan intent, region, dan status review. Exit code 1 berarti ada masalah metadata atau data belum siap. Lulus audit tidak membuktikan keaslian consent, ketepatan bahasa, atau akurasi model.
