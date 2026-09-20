# Demo riset BISINDO dari dataset publik

Halaman: `http://127.0.0.1:5173/#bisindo`. Halaman ini terpisah dari simulasi sepuluh intent layanan pada kiosk SAPA. Tiga label dipertahankan sesuai sumber: **Maaf (6)**, **Terima kasih (10)**, **Di mana (15)**. Kata tidak diperluas menjadi kalimat layanan rumah sakit.

## Sumber dan penggunaan

WL-BISINDO, varian Banten, oleh Grace Oktaviani Kindy, Glenn Leonali, Henry Lucky. [Repositori penulis](https://github.com/AceKinnn/WL-BISINDO), [dataset Kaggle v1](https://www.kaggle.com/datasets/glennleonali/wl-bisindo), [paper](https://doi.org/10.1016/j.procs.2025.08.277). Lisensi yang dicantumkan penulis dan Kaggle: [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Eksperimen ini untuk riset nonkomersial lokal; atribusi disertakan. Lisensi bukan bukti dukungan penulis atau validasi komunitas atas SAPA. Pemakaian komersial harus ditinjau terpisah.

Video asli, salinan H.264, dan landmark ada pada `datasets/private/wl-bisindo/` yang diabaikan Git. Model turunan berisi contoh fitur pelatihan dan juga diabaikan Git (`public/research/`); jangan memasukkannya ke rilis umum tanpa meninjau tujuan dan lisensi. Server dev lokal dapat menyajikan model untuk menjalankan demo. Tidak ada video dataset yang disalin ke direktori public.

Inventaris Kaggle menunjukkan label 15 tidak mempunyai signer0. Contoh tambahan berada pada signer1 dan signer2 (masing-masing 15 contoh). Pipeline memakai nama file nyata dari inventaris, tanpa mengarang sepuluh file yang hilang. Total subset 200 video: 150 untuk tiga kelas, 50 kata Makan (label 7) untuk pemeriksaan penolakan.

## Reproduksi

Dari root proyek, setelah dependency aplikasi dan aset vision tersedia:

```powershell
.venv/Scripts/python.exe -m pip install -r backend/requirements-research.txt
.venv/Scripts/python.exe scripts/fetch-wl-bisindo.py
.venv/Scripts/python.exe scripts/convert-wl-bisindo.py
node scripts/extract-wl-bisindo.mjs
node scripts/train-wl-bisindo.mjs
npm run dev
```

Konverter membuat salinan H.264 640 px tanpa audio karena sebagian sumber HEVC tidak dapat didekode browser lokal. Sumber asli dan SHA-256 tetap disimpan. Ekstraksi memakai worker MediaPipe Holistic 1.0.1 yang sama dengan SAPA, 32 frame per video. Fitur menggunakan posisi bahu, siku, pergelangan dan tangan; wajah tidak disimpan. Ekstraksi di browser hanya mengakses origin lokal.

Model memakai jarak urutan DTW dan rata-rata tiga tetangga per kelas. Ini baseline supervised dari contoh data nyata, bukan model neural atau model BISINDO umum. Koordinat dinormalisasi terhadap bahu; urutan disampel ke 24 frame. Jarak bukan probabilitas. Jangan menampilkan jarak sebagai persentase keyakinan.

## Pemisahan dan evaluasi

- Pelatihan: signer0, signer1, signer2. Hanya label 6, 10, 15.
- Validasi dan pemilihan ambang: signer3. Makan hanya sebagai contoh di luar cakupan.
- Uji akhir: signer4. Tidak digunakan untuk memilih model atau ambang.
- Pembagian ini milik eksperimen SAPA, bukan reproduksi angka paper.

Ambang dipilih dari validasi dengan syarat akurasi hasil diterima minimal 90% dan penolakan Makan minimal 80%. Jika tidak ada ambang memenuhi syarat, model menolak semua hasil. Akurasi tiga kelas, macro F1, cakupan hasil diterima, dan uji Makan dicatat terpisah di `datasets/wl-bisindo/evaluation.json`.

Video tanpa landmark memadai dicatat dan dikeluarkan dari perhitungan klasifikasi; periksa daftar penolakan kualitas agar angka tidak dibaca sebagai keberhasilan seluruh input. Kegagalan ekstraksi berkas menghentikan training, dan duplikasi file lintas split diperiksa melalui hash.

## Mencoba

1. Buka halaman riset. Metrik harus termuat dan status menunjukkan model siap.
2. Untuk kamera, aktifkan atas izin, tekan Mulai isyarat, lakukan satu isyarat lalu Selesai isyarat. Input maksimal 6 detik/80 frame.
3. Untuk evaluasi rekaman, buka **Atau gunakan video uji lokal**, pilih video dari folder `datasets/private/wl-bisindo/browser-videos/` dengan awalan **signer4_**, lalu tekan Proses video pilihan. Ini inferensi pada rekaman uji, bukan kamera langsung. Pilih format H.264 yang sudah dikonversi.
4. Jika diterima, hasil tetap belum menjadi pesan sampai tombol Benar ditekan. Jika ragu, kembali ke frasa/ketik SAPA.
5. Hapus pesan atau kembali ke SAPA untuk membersihkan hasil sementara. Tidak ada unggahan kamera/video pilihan.

Belum ada uji kamera fisik, uji penutur baru di luar dataset, atau review komunitas SAPA. Penolakan satu kata Makan tidak membuktikan kemampuan menolak semua gerakan asing. Untuk demo publik, jelaskan seluruh batas ini dan tinjau kesesuaian penggunaan dataset dengan acara.


## Hasil baseline pertama — 20 September 2026

- 200 video berhasil diekstraksi; 38 tidak memenuhi pemeriksaan kualitas fitur. Model memakai 79 video pelatihan target yang memenuhi kualitas.
- Validasi signer3: akurasi tiga kelas 28/30, 7 hasil diterima dan seluruhnya benar; 10/10 Makan ditolak oleh ambang validasi.
- Uji signer4: dari 30 video target, 20 dikenali dan diterima benar (66,7% seluruh input target), 10 ditolak kualitas. Akurasi 100% hanya berlaku pada 20 target yang lolos kualitas; jangan mengiklankannya sebagai akurasi umum.
- Dari 10 video Makan pada uji, 6 ditolak kualitas; 4 yang lolos kualitas semuanya salah diterima. Penolakan luar kelas gagal berpindah ke penutur baru.
- Model/ambang tidak disesuaikan setelah melihat hasil uji ini. Data uji sudah diperiksa; iterasi selanjutnya membutuhkan evaluasi luar kelas yang lebih luas dan data uji baru atau protokol terpisah.

Gunakan halaman sebagai demo pengenalan kosakata yang ditentukan, dengan konfirmasi manusia. Belum layak mengklaim penolakan aman terhadap isyarat bebas. Angka tertulis harus dibaca bersama jumlah video yang ditolak kualitas dan batas satu penutur uji.
