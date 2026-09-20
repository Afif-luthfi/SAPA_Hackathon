# Input suara petugas

Fitur ini membantu membuat draf balasan, bukan penerjemah BISINDO atau transkripsi medis. Lokasi implementasi: `src/components/StaffSpeechInput.tsx`. Bahasa: `id-ID`, satu ucapan per percobaan, tanpa restart otomatis.

## Pemrosesan dan batas

SpeechRecognition atau webkitSpeechRecognition ditawarkan hanya pada secure context dan bila API tersedia. Ketersediaan API tidak menjamin penyedia mendukung layanan atau bahasa pada perangkat tersebut. Browser mengelola izin mikrofon dan layanan pengenalan. Audio dapat diproses di server penyedia; SAPA tidak mengklaim pemrosesan lokal atau offline dan tidak menyimpan rekaman audio.

Hasil sementara terlihat tetapi tidak dapat digunakan. Hasil final baru ditambahkan ke draf atas tindakan petugas. Gabungan draf dibatasi 1.000 karakter. Template dan ketikan tetap dapat digunakan tanpa mikrofon. Setelah mengirim pesan, akhir sesi/refresh membersihkan percakapan seperti sebelumnya.

Pembatalan memutus handler dan mengabaikan callback dari percobaan lama. Abort juga dipanggil saat komponen dilepas, halaman tersembunyi, atau keluar halaman. Tidak ada permintaan mikrofon pada pembukaan aplikasi. Fitur tidak menjalankan `getUserMedia` tambahan sehingga tidak menciptakan stream audio kedua.

## Verifikasi di perangkat demo

1. Gunakan data fiktif: “Silakan ke meja informasi.” Pastikan izin belum diminta sebelum menekan Mulai ucapan.
2. Periksa hasil, tambahkan ke draf, edit satu kata, lalu kirim. Pastikan hasil asli tidak lebih dahulu masuk percakapan.
3. Uji izin ditolak dan layanan tidak tersedia; template dan ketikan harus tetap berfungsi.
4. Batalkan saat mendengarkan, sembunyikan tab, dan akhiri sesi. Periksa indikator mikrofon browser berhenti; tidak ada restart otomatis.
5. Catat browser, versi, perangkat, hasil aktual, dan masalah. Belum ada hasil uji mikrofon fisik yang dicatat pada penyerahan ini.

Delapan tes browser otomatis menggunakan pengganti SpeechRecognition dan tidak mengirim audio ke penyedia. Tes ini mencakup persetujuan, hasil sementara/final, koreksi, izin ditolak, jaringan gagal, callback terlambat, penghentian, batas waktu, kapasitas draf, dan tampilan sempit.

Referensi perilaku API: [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [abort](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/abort), dan [stop](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/stop). Menurut dokumentasi MDN, beberapa browser memakai pengenalan berbasis server; abort membatalkan hasil, sedangkan stop mencoba menyelesaikan hasil yang sudah ditangkap.
