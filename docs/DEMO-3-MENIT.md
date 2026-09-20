# Demo SAPA Care — tiga menit

Status 20 September 2026: prototipe lokal untuk komunikasi layanan awal. Pengenalan gerakan masih contoh berbasis aturan, registry masih simulasi, draf suara petugas tersedia secara opsional pada browser yang mendukung. Naskah ini tidak mengklaim akurasi BISINDO atau deployment blockchain.

## Persiapan

Jalankan `npm run dev` dan buka http://127.0.0.1:5173. Gunakan data fiktif. Coba kamera fisik, suara pembaca pesan, dan ukuran layar sebelum latihan; hasil kamera nyata belum dievaluasi oleh tes otomatis. Siapkan operator pasien dan petugas pada satu perangkat. Refresh sebelum demo untuk mengosongkan percakapan serta mengembalikan registry contoh.

## Urutan presentasi

| Waktu | Tindakan | Narasi |
|---|---|---|
| 0:00–0:20 | Tampilkan halaman awal | “SAPA membantu pasien Tuli dan petugas menyampaikan kebutuhan layanan awal, seperti pendaftaran dan arah lokasi.” |
| 0:20–1:00 | Mulai sesi, pilih frasa pendaftaran, periksa draf, konfirmasi, lalu balas sebagai petugas | “Pasien memeriksa pesan sebelum dikirim. Petugas dapat membalas melalui teks di layar yang sama.” |
| 1:00–1:35 | Pilih Bahasa isyarat, aktifkan kamera, tunjukkan landmark; tahan tombol untuk satu percobaan lalu lepas | “Ini contoh teknis pemrosesan gerakan lokal. Model BISINDO belum tervalidasi. Bila hasil tersedia, pasien harus mengonfirmasi; bila belum dikenali, jalur frasa dan ketik tetap tersedia.” |
| 1:35–2:15 | Buka Studio Dataset, gulir ke Registry pack, klik simulasi file model berubah; kembali ke SAPA, mulai sesi dan pilih Bahasa isyarat | “Simulasi ini menunjukkan pemeriksaan integritas paket. Perubahan file mengunci pengenalan, sementara komunikasi manual tetap tersedia. Kontrak belum di-deploy.” |
| 2:15–2:40 | Gunakan frasa pada layar penolakan; kirim satu pesan | “Kegagalan pengenalan atau paket tidak menghentikan komunikasi. Pasien tetap mengendalikan pesan yang disampaikan.” |
| 2:40–3:00 | Akhiri sesi dan konfirmasi penghapusan | “Langkah berikutnya adalah review bersama penutur BISINDO, pengumpulan data berizin, evaluasi, dan deployment. Hari ini kami mendemonstrasikan alur komunikasi serta pemeriksaan paket secara lokal.” |

Jangan refresh ketika berpindah dari Studio ke kiosk: registry simulasi hanya berada dalam memori halaman. Gunakan tombol **Kembali ke SAPA**. Berpindah ke Studio mengakhiri konteks tampilan sesi; gunakan sesi fiktif baru ketika kembali.

## Jika demonstrasi terganggu

- Izin kamera ditolak atau perangkat tidak tersedia: langsung pilih frasa/ketik, lalu lanjutkan demo registry.
- Gerakan belum dikenali: tunjukkan fallback. Jangan mengulang berkali-kali demi memperoleh hasil yang diinginkan.
- Suara tidak keluar: gunakan teks percakapan yang sudah tampil.
- Simulasi masih dalam keadaan ditolak dari latihan sebelumnya: pilih **Kembalikan contoh** pada Registry pack sebelum memulai ulang.
- Rekaman cadangan belum dibuat. Jika dibuat nanti, tampilkan label “rekaman demonstrasi”; jangan menyajikannya sebagai kamera langsung.

## Bukti yang perlu dilengkapi sebelum submission

- Reviewer, varian daerah, dataset berizin, dan evaluasi penutur terpisah untuk klaim BISINDO.
- Jaringan testnet, deployment nyata, alamat kontrak dan explorer untuk klaim on-chain.
- URL HTTPS publik dan uji perangkat demo untuk klaim aplikasi online.
- Ketentuan submission terbaru perlu diperiksa kembali terhadap guidebook resmi sebelum mengirim.

Materi ini siap untuk latihan internal. Demonstrasi BISINDO publik masih bergantung pada review gesture yang diwajibkan PRD.
