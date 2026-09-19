# Tahap Pengembangan SAPA Care

Dokumen ini menerjemahkan [PRD SAPA](../PRD-SAPA.md) menjadi pekerjaan bertahap. Setiap tahap menghasilkan sesuatu yang bisa dilihat dan dicoba sebelum pengembangan berikutnya dimulai.

**Tahap 1 selesai; bagian teknis kamera tahap 2 siap ditinjau; alur demo tahap 3 tersedia sebagai contoh teknis; tahap 4 tersedia sebagai simulasi registry (kontrak belum di-deploy).** Validasi bahasa dan dataset tahap 2 masih menunggu reviewer/varian daerah. Model pengenal tahap 3 adalah contoh berbasis aturan; bukan model BISINDO yang dilatih atau ditinjau. Tahap 5 belum dilaksanakan.

## Ringkasan tahapan

| Tahap | Hasil yang dituju | Status |
|---|---|---|
| 1 | Aplikasi komunikasi manual yang dapat dicoba dalam satu layar | Selesai; siap ditinjau |
| 2 | Pratinjau kamera, ekstraksi landmark, dan persiapan dataset yang ditinjau penutur BISINDO | Kamera selesai; reviewer dan dataset menunggu |
| 3 | Pengenalan intent terbatas, konfirmasi hasil, fallback, dan caption petugas | Alur demo selesai; model BISINDO dan caption menunggu |
| 4 | Persetujuan dan pemeriksaan integritas language pack melalui BOT Chain | Alur simulasi selesai; deployment kontrak menunggu |
| 5 | Pengujian menyeluruh, deployment, dan materi demo | Rencana |

## Tahap 1 — fondasi dan komunikasi manual

**Tujuan:** membuktikan alur pasien menyampaikan pesan dan petugas menjawab dengan tampilan yang mudah dipahami.

### Cakupan implementasi

- Aplikasi React, TypeScript, dan Vite.
- Halaman awal dengan penjelasan singkat cakupan prototype.
- Mulai sesi baru tanpa akun atau wallet.
- Pilihan kalimat nonklinis: semua, pendaftaran, arah lokasi, dan bantuan.
- Pemilihan kalimat mengisi draf; pasien dapat mengoreksi sebelum mengirim.
- Input teks pasien untuk kebutuhan yang tidak ada pada kartu.
- Panel petugas pada layar yang sama, dengan template dan input teks sendiri.
- Percakapan yang membedakan pesan pasien dan petugas.
- Permintaan bantuan lokal dan aksi petugas untuk menandainya ditangani.
- Ukuran teks lebih besar, kontras tinggi, dan tata letak responsif.
- Pengakhiran sesi dengan konfirmasi; percakapan berada dalam memori halaman.
- Dokumentasi penggunaan dan pengujian untuk alur inti.

### Batas tahap 1

Belum ada akses kamera/mikrofon, model BISINDO, inference AI, FastAPI, blockchain, wallet, pemanggilan penerjemah, atau koneksi sistem rumah sakit. Alur demonstrasi memakai data lokasi fiktif dan satu aplikasi pada satu perangkat.

Pasien dan petugas belum dapat membuka aplikasi di perangkat berbeda lalu berbagi sesi. Permintaan bantuan tidak dikirim ke layanan eksternal. Tidak ada transcript yang disimpan atau dipulihkan setelah halaman dimuat ulang.

### Kriteria selesai

- Pengguna dapat mulai sesi, mengirim pesan pasien, dan membalas sebagai petugas.
- Memilih kartu tidak langsung mengirim pesan; ada kesempatan memeriksa draf.
- Pesan kosong atau berisi spasi saja tidak dapat dikirim.
- Permintaan bantuan terlihat pada panel petugas dan statusnya dapat diperbarui.
- Pembatalan dialog akhir sesi mempertahankan percakapan.
- Konfirmasi akhir sesi menghapus pesan dan status bantuan; sesi baru dimulai kosong.
- Memuat ulang halaman tidak memulihkan transcript.
- Kontrol utama dapat dijangkau dengan keyboard dan tetap terbaca pada layar sempit.
- Demo menjelaskan bahwa lokasi fiktif dan pengenalan BISINDO belum tersedia.
- Build serta pengujian yang tersedia dijalankan; hasil dan kendala dilaporkan saat serah terima tahap.

### Verifikasi tahap 1 — 19 September 2026

- Build produksi dan pemeriksaan TypeScript: berhasil.
- Vitest: 15 pengujian logika sesi lulus.
- Playwright/Edge: 8 skenario lulus (7 alur utama dan 1 pemeriksaan navigasi responsif).
- Pratinjau desktop dan ponsel sudah diperiksa; tidak ada error JavaScript pada walkthrough yang diuji.
- Tidak ada model, kamera, API AI, blockchain, atau deployment publik pada tahap ini.
- Uji kegunaan bersama komunitas Tuli masih perlu dilakukan; hasil otomatis tidak menggantikan validasi tersebut.

### Yang ditinjau tim setelah tahap 1

1. Apakah pasien memahami urutan pilih/tulis, periksa, lalu kirim?
2. Apakah petugas menemukan pesan terbaru dan permintaan bantuan dengan cepat?
3. Apakah pembagian layar dan pilihan kalimat cocok untuk demo rumah sakit?
4. Apakah label, ukuran teks, warna, dan arah navigasi perlu diperbaiki?

Tahap ini menyediakan jalur komunikasi yang tetap dapat dipakai ketika fitur AI pada tahap berikutnya belum siap atau gagal mengenali isyarat.

## Tahap 2 — kamera, landmark, dan persiapan bahasa

### Hasil implementasi teknis

- Kamera atas izin eksplisit, tanpa audio; preview bercermin dengan overlay tangan/tubuh.
- MediaPipe Holistic 1.0.1 pada worker lokal, memakai model resmi untuk posisi; belum ada model BISINDO.
- Panduan posisi dan ringkasan jumlah titik, tanpa klaim confidence terjemahan.
- Semua jalur penghentian stream diuji, termasuk izin yang datang setelah pembatalan.
- Persiapan aset versi tetap dengan checksum, panduan reviewer, manifest kosong, dan skema calon dataset.
- 22 tes logika dan 17 skenario browser lulus. Runtime asli diuji dengan frame/video buatan; kamera fisik dan signer nyata belum dievaluasi.

**Bagian yang masih menunggu:** tim mengonfirmasi belum ada reviewer maupun varian daerah. Tidak ada dataset nyata, consent kontributor, atau review gesture yang dapat diklaim selesai. Alat koleksi dataset terpisah juga belum dibangun. Karena itu tahap 2 tidak dinyatakan selesai secara keseluruhan.

Panduan praktis ada di [Persiapan dataset](PERSIAPAN-DATASET.md), rincian teknis di [Aset vision](ASET-VISION.md). Pengembangan berhenti pada batas tahap ini untuk diuji tim.

**Tujuan:** memastikan video dapat diproses dan tersedia bahan untuk membangun model secara bertanggung jawab.

### Rencana pekerjaan

- Meminta izin kamera setelah pengguna memilih memulai, dengan pilihan menolak dan tetap memakai teks.
- Menampilkan pratinjau serta panduan posisi tangan/tubuh.
- Mengintegrasikan ekstraksi landmark pada browser dan memeriksa performanya di perangkat demo.
- Menghentikan kamera saat keluar dari mode kamera atau mengakhiri sesi.
- Menentukan varian regional BISINDO dan sepuluh intent awal bersama reviewer yang memahami BISINDO.
- Menyiapkan format dataset, persetujuan kontributor, label, pembagian data per penutur, dan catatan asal data.
- Memisahkan alat pengumpulan dataset dari sesi komunikasi pasien.

### Kriteria selesai

- Jalur izin diterima, ditolak, kamera tidak tersedia, dan kamera dihentikan dapat diuji.
- Landmark dapat diamati secara teknis tanpa diklaim sebagai hasil terjemahan.
- Daftar intent serta contoh isyarat ditinjau penutur BISINDO.
- Dataset dan data evaluasi memiliki asal-usul serta pembagian penutur yang jelas.
- Pengumpulan data dilakukan atas persetujuan kontributor, bukan otomatis dari pemakaian kiosk.

**Keputusan sebelum melanjutkan:** jika data atau reviewer belum tersedia, lanjutkan perbaikan komunikasi manual dan persiapan data. Jangan menggantikan BISINDO dengan gesture buatan lalu menyebutnya terjemahan BISINDO.

## Tahap 3 — pengenalan intent dan caption petugas

**Tujuan:** menambahkan bantuan AI dengan cakupan yang terbatas dan hasil yang dapat dikoreksi.

### Rencana pekerjaan

- Melatih model urutan landmark untuk intent yang sudah disepakati.
- Menyediakan layanan inference melalui FastAPI dengan validasi input dan penanganan kegagalan.
- Menghubungkan kamera, landmark, prediksi, dan draf pasien.
- Meminta konfirmasi pasien sebelum hasil pengenalan masuk percakapan.
- Menawarkan alternatif atau beralih ke ketik/kalimat cepat saat hasil tidak meyakinkan.
- Menampilkan varian regional, versi model, dan intent yang tersedia.
- Menambahkan caption dari ucapan petugas dengan izin mikrofon serta penjelasan tempat pemrosesan audio.
- Mempertahankan pengetikan sebagai jalur yang tersedia saat layanan suara atau inference tidak dapat digunakan.

### Kriteria selesai

- Evaluasi memakai penutur yang tidak muncul pada data pelatihan.
- Target macro F1 mengikuti PRD; angka hasil uji dilaporkan apa adanya.
- Ambang confidence dipilih melalui evaluasi, bukan dianggap sebagai jaminan ketepatan.
- Isyarat di luar cakupan, hasil ragu, dan kegagalan layanan memiliki fallback yang terlihat.
- Prediksi tidak langsung dikirim tanpa konfirmasi pasien.
- Audio tidak mulai direkam tanpa tindakan dan izin pengguna.
- Pengiriman landmark/audio ke layanan dijelaskan sesuai implementasi sebenarnya.

**Keputusan sebelum melanjutkan:** bila pengenalan belum andal, kecilkan cakupan intent dan beri label keterbatasannya. Demo tidak boleh menyamarkan respons manual atau rekaman contoh sebagai inference langsung.

### Hasil implementasi alur demo (contoh teknis)

Karena reviewer dan dataset belum tersedia, tahap 3 menyediakan **contoh teknis alur lengkap** dengan model berbasis aturan, bukan model yang dilatih. Pengganti demo ditandai jelas dan tidak pernah disebut sebagai terjemahan BISINDO.

- 10 intent awal mengikuti PRD (daftar di `src/intent/intents.ts`).
- Ekstraksi fitur dari landmark (jumlah tangan, energi gerak, posisi, bukaan, akhir gerakan, simetri) dinormalisasi ke bahu.
- Kartu hasil tiga band sesuai PRD: **Yakin** (≥0,85), **Perlu dipilih** (0,60–0,84), dan **Belum dikenali** (<0,60).
- Alur tahan → rekam → hasil → konfirmasi pengguna → tampil di percakapan; pesan pasien dibacakan dan dapat diulang.
- Isyarat pendek, buram, tidak meyakinkan, atau gagal tidak pernah diterjemahkan secara paksa; selalu ada frasa, ketik, atau penerjemah sebagai fallback.
- Kartu hasil menampilkan identitas model dan catatan asal-usul: `Contoh teknis untuk menguji alur. Belum ditinjau penutur BISINDO.`
- Model `sapa-demo-handcraft-v1` berjalan seluruhnya di browser; endpoint FastAPI tetap `503 MODEL_NOT_AVAILABLE` dan tidak menerima unggahan, sehingga klaim "deployed model" tidak dipertahankan.

### Verifikasi tahap 3 — 19 September 2026

- Build produksi dan pemeriksaan TypeScript: berhasil.
- Vitest: 46 pengujian logika lulus (fitur, aturan keyakinan, model contoh, sesi).
- Playwright/Edge: 26 skenario browser lulus, termasuk 3 skenario isyarat → konfirmasi → kirim dan jalur "belum dikenali".
- Prediksi tidak pernah masuk percakapan tanpa konfirmasi; pengujian menegaskan pesan tetap 0 sebelum tombol **Benar** ditekan.
- Belum ada evaluasi akurasi dengan penutur BISINDO, ambang yang divalidasi, maupun caption suara petugas. Uji otomatis tidak menggantikan validasi bersama komunitas Tuli.

## Tahap 4 — language pack di BOT Chain

**Tujuan:** memastikan kiosk memakai paket bahasa yang disetujui dan file yang sesuai dengan versi tersebut.

### Rencana pekerjaan

- Menyusun manifest yang mengikat model, skema intent, varian regional, serta materi paket yang relevan.
- Membuat kontrak registry dan alur pengajuan pack, persetujuan dua dari tiga validator, aktivasi, serta penghentian versi.
- Menyediakan panel pengelola/validator untuk wallet dan transaksi.
- Memeriksa hash file serta status pack sebelum inference.
- Menguji pack belum disetujui, file berubah, dan pack dinonaktifkan.
- Menentukan penanganan gangguan jaringan tanpa menyatakan pack sudah tervalidasi ketika pemeriksaan belum berhasil.
- Menerbitkan alamat kontrak testnet, ABI, dan panduan demonstrasi setelah deployment benar-benar dilakukan.

### Kriteria selesai

- Satu validator tidak dapat mengaktifkan pack sendiri.
- Persetujuan ganda oleh wallet yang sama tidak menambah jumlah persetujuan.
- Aksi tanpa hak ditolak kontrak.
- Kiosk menolak file dengan hash berbeda dan pack yang tidak boleh digunakan.
- Penolakan pack tetap menyediakan jalur komunikasi manual.
- Pasien serta petugas tidak memerlukan wallet.
- Video, transcript, identitas pasien, dan data kesehatan tidak masuk blockchain.

Demo validator harus menjelaskan apakah akun tersebut mewakili anggota tim atau reviewer sungguhan. Persetujuan teknis di kontrak tidak dengan sendirinya membuktikan kompetensi bahasa atau ketepatan model.

### Hasil implementasi simulasi tahap 4 (contoh teknis)

Karena tidak ada jaringan BOT Chain yang dipakai, tahap 4 menyediakan **simulasi registry lokal** yang menerapkan aturan kontrak, lengkap dengan sumber kontrak yang belum di-deploy. Semua tampilan menyebut status ini secara eksplisit.

- `chain/LanguagePackRegistry.sol`: sumber kontrak dengan enum `PackStatus`, struct `LanguagePack`, fungsi `submitLanguagePack`, `approveLanguagePack`, `proposeDeprecation`, `approveDeprecation`, `getActivePack`, `isValidator`, dan kuorum 2 dari 3. Kontrak **belum dikompilasi/di-deploy**; alat EVM belum tersedia dalam pengembangan.
- `src/chain/registry.ts`: cermin TypeScript yang menentukan dan menguji aturan yang sama — hash nol/metadata kosong ditolak, persetujuan ganda dan non-validator ditolak, aktivasi menunggu kuorum, pack aktif lama tersupersede untuk region yang sama, deprecation memerlukan proposer + validator kedua yang berbeda.
- `public/language-pack/`: manifest, `model.json` (salinan persis prototype classifier), dan `intents.json` (persis `INTENT_TEXTS`) dengan SHA-256 asli pada manifest. Dataset berstatus `none` dengan hash keadaan kosong.
- Kiosk sebelum mode isyarat mencocokkan hash file terpasang dengan pack aktif; hasil: **terverifikasi / menunggu validator / ditolak** (file berubah, dinonaktifkan, tak tercatat, tak ada pack aktif, atau pemeriksaan gagal). Pack ditolak mengunci mode isyarat dan menawarkan frasa/ketik/penerjemah.
- Panel **Registry pack** di Studio Dataset: memilih validator contoh (tim SAPA, penutur BISINDO, reviewer medis), menyetujui pack, proposal deprecation, menyetujui deprecation, mengusulkan versi baru, simulasi file model berubah, dan pemulihan. Perubahan state langsung memicu pemeriksaan ulang di kiosk (store tunggal + subscription).
- Tata letak memisahkan istilah blockchain dari pasien (UX-9): pasien hanya melihat hasil pemeriksaan dalam bahasa sehari-hari.

### Verifikasi tahap 4 — 19 September 2026

- Build produksi dan pemeriksaan TypeScript: berhasil (termasuk `@types/node` untuk pengujian drift).
- Vitest: 66 pengujian logika lulus, termasuk 20 pengujian baru untuk kuorum/supersede/deprecation, hasil verifikasi kiosk, dan **drift guard** yang memastikan `public/language-pack` tidak menyimpang dari `INTENT_TEXTS`/`PROTOTYPES` serta mengikat ulang hash manifest.
- Playwright/Edge: 29 skenario browser lulus, termasuk 3 skenario baru untuk gateway pack (terverifikasi, file berubah → blokir + jatuh kembali, deprecation + pack pengganti → pulih).
- Kontrak belum di-deploy; alamat testnet, ABI hasil kompilasi, dan panduan demonstrasi diterbitkan hanya setelah deployment nyata. Sampai saat itu satu-satunya klaim yang benar adalah "registry simulasi", bukan “terverifikasi on-chain”.

## Tahap 5 — integrasi, deployment, dan demo

**Tujuan:** menyiapkan satu alur yang stabil serta menjelaskan kemampuan produk secara akurat.

### Rencana pekerjaan

- Menguji alur utuh kamera → prediksi → konfirmasi → respons petugas → akhir sesi.
- Memeriksa fallback manual, izin ditolak, koneksi gagal, serta pack ditolak.
- Memeriksa keyboard, kontras, ukuran teks, layar sempit, dan perangkat demo.
- Memeriksa bahwa sesi serta stream kamera/mikrofon benar-benar berakhir.
- Menyiapkan konfigurasi lingkungan dan deployment web melalui HTTPS.
- Menyiapkan kontrak pada jaringan yang dipilih, tautan explorer, dan bukti pengujian.
- Melengkapi README dengan alamat yang benar-benar sudah aktif.
- Menyiapkan naskah demo tiga menit, data fiktif, serta rekaman cadangan yang diberi label.

### Kriteria selesai

- Demo langsung dapat diulang dengan hasil yang konsisten.
- AI gagal dan pack ditolak tetap menghasilkan aplikasi yang bisa dipakai berkomunikasi secara manual.
- Domain serta alamat kontrak di dokumentasi dapat diperiksa.
- Tim memahami fitur yang sudah tersedia, masih eksperimental, dan belum dibangun.
- Klaim model didukung hasil evaluasi; simulasi dan rekaman tidak dipresentasikan sebagai layanan langsung.

## Pembagian fokus tim

| Anggota | Tahap 1 | Tahap lanjutan |
|---|---|---|
| 1 | Fondasi aplikasi, state sesi, dan pengujian alur | Kontrak, wallet validator, dan pemeriksaan pack |
| 2 | Tampilan pasien/petugas dan aksesibilitas | Kamera, caption, serta integrasi pengalaman pengguna |
| 3 | Kalimat demo, dokumentasi, dan pengujian manual | Dataset/reviewer, model, FastAPI, serta evaluasi |

Pembagian ini dapat disesuaikan dengan kemampuan tim. Integrasi dilakukan pada setiap akhir tahap, bukan menunggu seluruh fitur selesai.

## Cara mencatat progres

Pada akhir setiap tahap, catat hasil nyata: fitur yang dapat dicoba, perintah pengujian dan hasilnya, kendala yang masih ada, serta cakupan tahap berikutnya. Ubah status menjadi selesai hanya setelah kriteria tahap diperiksa. PRD tetap menjadi acuan sasaran MVP penuh; penyesuaian produk yang disepakati dicatat secara terpisah sebelum mengubah persyaratannya.
