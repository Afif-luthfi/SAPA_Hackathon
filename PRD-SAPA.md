# Product Requirements Document — SAPA Care

**Nama produk:** SAPA Care  
**Tagline:** Akses komunikasi sejak pintu pertama.  
**Versi dokumen:** 1.0  
**Tanggal:** 19 September 2026  
**Status:** Siap untuk prototyping hackathon  
**Target platform:** Web kiosk/PWA pada tablet atau laptop rumah sakit  
**Jaringan:** BOT Chain testnet, kemudian mainnet setelah kontrak stabil

---

## 1. Ringkasan produk

SAPA Care adalah aplikasi komunikasi dua arah untuk membantu pasien Tuli pengguna BISINDO berinteraksi dengan petugas pada area layanan publik rumah sakit. Aplikasi menerjemahkan sejumlah intent BISINDO nonklinis menjadi teks dan suara, mengubah respons suara petugas menjadi caption, menyediakan respons visual tervalidasi, dan mengalihkan percakapan yang tidak dikenali atau bersifat klinis kepada petugas atau penerjemah manusia.

SAPA Care tidak ditujukan untuk diagnosis, triase, instruksi obat, persetujuan tindakan medis, atau pengganti penerjemah BISINDO profesional. MVP berfokus pada pendaftaran, antrean, navigasi, dokumen administratif, dan permintaan bantuan komunikasi.

BOT Chain digunakan sebagai governance dan integrity layer untuk language pack. Setiap pack memiliki hash dataset, model, dan skema intent. Pack hanya dapat berstatus aktif setelah mendapat persetujuan minimal dua dari tiga validator. Kiosk menolak model yang belum disetujui, sudah dinonaktifkan, atau memiliki hash berbeda dari catatan on-chain.

---

## 2. Latar belakang masalah

Pasien Tuli dapat menghadapi hambatan komunikasi sejak tiba di rumah sakit, bahkan sebelum bertemu dokter. Informasi mengenai pendaftaran, antrean, lokasi laboratorium, apotek, kasir, dan dokumen yang diperlukan sering disampaikan melalui suara atau percakapan langsung.

Solusi umum seperti menulis di kertas atau menggunakan speech-to-text membantu, tetapi belum selalu menyediakan komunikasi dua arah yang sesuai dengan pilihan bahasa pasien. Di sisi lain, penerjemahan otomatis yang salah dalam konteks medis dapat menimbulkan risiko serius.

SAPA Care menyelesaikan bagian masalah yang dapat dibatasi dengan aman:

- Memberikan saluran BISINDO untuk kebutuhan nonklinis yang berulang.
- Menyediakan caption dan informasi visual bagi pasien.
- Menghindari tebakan ketika confidence rendah.
- Mengalihkan percakapan klinis kepada manusia.
- Memastikan model yang digunakan memiliki versi, provenance, dan persetujuan yang dapat diverifikasi.

---

## 3. Problem statement

Pasien Tuli pengguna BISINDO belum selalu memperoleh akses komunikasi yang cepat dan setara pada titik layanan awal rumah sakit. Petugas front desk mungkin tidak memahami BISINDO, sedangkan ketersediaan penerjemah profesional tidak selalu instan. Akibatnya, proses sederhana seperti mencari loket, mengonfirmasi janji, atau meminta bantuan dapat memerlukan pendamping dan waktu tambahan.

---

## 4. Solution statement

SAPA Care menyediakan kiosk komunikasi nonklinis berbasis BISINDO. Pasien menggunakan kamera untuk menyampaikan intent yang didukung, memeriksa hasil terjemahan, lalu mengirimkannya sebagai teks dan suara kepada petugas. Respons petugas ditampilkan sebagai caption, kartu visual, atau video BISINDO tervalidasi. Jika intent tidak dikenali atau pembicaraan memasuki konteks klinis, aplikasi menawarkan mengetik, quick phrase, atau permintaan penerjemah manusia.

---

## 5. Tujuan produk

### 5.1 Tujuan MVP

1. Menyediakan komunikasi dua arah untuk sepuluh intent nonklinis rumah sakit.
2. Menghasilkan terjemahan sign-to-intent dengan confidence dan konfirmasi pengguna.
3. Menyediakan speech-to-text untuk respons petugas.
4. Menampilkan fallback yang aman ketika prediksi tidak meyakinkan.
5. Memuat hanya language pack yang aktif dan tervalidasi di BOT Chain.
6. Tidak menyimpan video, wajah, transcript, atau informasi kesehatan pasien secara default.
7. Menyelesaikan demo end-to-end dalam waktu maksimal tiga menit.

### 5.2 Tujuan setelah hackathon

1. Menambah intent berdasarkan riset bersama komunitas Tuli.
2. Menyediakan beberapa regional language pack.
3. Mengintegrasikan permintaan interpreter jarak jauh.
4. Menyediakan deployment on-premise untuk fasilitas kesehatan.
5. Melakukan pilot terbatas bersama satu fasilitas kesehatan dan organisasi Tuli.

### 5.3 Non-goals MVP

MVP tidak mencakup:

- Penerjemahan BISINDO bebas atau continuous sign-language translation.
- Diagnosis, triase, atau interpretasi gejala.
- Penjelasan obat dan dosis.
- Hasil laboratorium atau rekam medis.
- Persetujuan operasi atau tindakan medis.
- Penerjemahan percakapan dokter-pasien.
- Avatar bahasa isyarat generatif.
- Penyimpanan video pasien untuk pelatihan otomatis.
- Integrasi langsung dengan SIMRS, BPJS, atau rekam medis.
- Penggunaan token baru, NFT, DAO, atau marketplace data.

---

## 6. Prinsip produk

1. **Human confirmation:** hasil AI selalu diperiksa pengguna sebelum dikirim.
2. **Fail safely:** confidence rendah menghasilkan fallback, bukan tebakan.
3. **Nonclinical by design:** hanya intent yang disetujui yang dapat diterjemahkan otomatis.
4. **Privacy by default:** tidak ada rekaman atau transcript yang disimpan tanpa consent terpisah.
5. **Community validated:** language pack memiliki validator dan varian regional yang jelas.
6. **Transparent provenance:** versi model dan dataset dapat diverifikasi.
7. **Accessible without a wallet:** pasien dan petugas tidak memerlukan aset kripto atau akun Web3.
8. **Visual first:** informasi penting tidak boleh hanya disampaikan melalui suara.

---

## 7. Persona

### 7.1 Pasien Tuli — Rani

- Pengguna BISINDO.
- Datang ke rumah sakit tanpa penerjemah.
- Membutuhkan informasi pendaftaran dan lokasi layanan.
- Tidak ingin data atau videonya disimpan.
- Membutuhkan hasil yang mudah dikoreksi bila salah.

**Kebutuhan utama:** berkomunikasi sejak tiba tanpa bergantung pada pendamping.

### 7.2 Petugas front desk — Dimas

- Tidak memahami BISINDO.
- Menangani antrean dan pertanyaan berulang.
- Membutuhkan alat yang cepat dan tidak mengganggu pekerjaan utama.
- Harus mengetahui kapan aplikasi tidak boleh digunakan.

**Kebutuhan utama:** memahami intent dasar pasien dan memberikan jawaban visual yang jelas.

### 7.3 Validator BISINDO — Maya

- Fasih BISINDO dan memahami variasi regional.
- Meninjau gesture, label, video respons, dan model card.
- Menggunakan wallet untuk menyetujui atau menolak language pack.

**Kebutuhan utama:** memastikan pack yang digunakan tidak diterbitkan sepihak oleh developer.

### 7.4 Administrator fasilitas — Arif

- Mengelola konfigurasi kiosk.
- Menentukan lokasi dan response card yang tersedia.
- Memantau versi model, bukan isi percakapan pasien.

**Kebutuhan utama:** memastikan kiosk menggunakan model aktif dan mengetahui kapan harus memperbarui pack.

---

## 8. Scope MVP

### 8.1 Sepuluh intent yang dikenali model

| ID | Intent | Teks keluaran |
|---|---|---|
| INT-01 | REGISTER_PATIENT | Saya ingin mendaftar. |
| INT-02 | HAS_APPOINTMENT | Saya sudah memiliki janji. |
| INT-03 | HAS_REFERRAL | Saya membawa surat rujukan. |
| INT-04 | USES_BPJS | Saya menggunakan BPJS. |
| INT-05 | ASK_REGISTRATION | Di mana loket pendaftaran? |
| INT-06 | ASK_PHARMACY | Di mana apotek? |
| INT-07 | ASK_LAB | Di mana laboratorium? |
| INT-08 | NEED_INTERPRETER | Saya membutuhkan penerjemah BISINDO. |
| INT-09 | NOT_UNDERSTAND | Saya belum mengerti. Tolong ulangi atau tuliskan. |
| INT-10 | THANK_YOU | Terima kasih. |

Daftar gesture wajib ditinjau oleh minimal satu penutur BISINDO sebelum dipakai dalam demo publik. Varian regional harus disebutkan pada model card dan UI.

### 8.2 Quick phrase tanpa model

- Di mana kasir?
- Di mana toilet?
- Di mana ruang tunggu?
- Berapa nomor antrean saya?
- Saya ingin menghubungi pendamping.
- Tolong tuliskan jawabannya.
- Saya membutuhkan bantuan petugas.

Quick phrase dipilih melalui kartu visual dan tidak membutuhkan computer vision.

### 8.3 Respons petugas yang didukung

- Silakan menuju loket pendaftaran.
- Silakan menunggu nomor antrean dipanggil.
- Apotek berada di lantai yang telah dikonfigurasi.
- Laboratorium berada di lokasi yang telah dikonfigurasi.
- Mohon siapkan kartu identitas, kartu BPJS, atau surat rujukan.
- Kami akan memanggil petugas atau penerjemah untuk membantu.

Respons harus berupa template yang dapat dikonfigurasi rumah sakit. Respons medis tidak boleh dimasukkan ke template MVP.

---

## 9. User journey

### 9.1 Pasien menyampaikan intent

1. Pasien membuka kiosk SAPA Care.
2. Pasien memilih `BISINDO ke teks/suara`.
3. Aplikasi menampilkan privacy notice singkat.
4. Pasien menekan dan menahan tombol `Mulai Isyarat`.
5. MediaPipe mengekstrak sequence landmark tanpa menyimpan video.
6. Model menghasilkan satu prediksi utama dan maksimal dua alternatif.
7. Aplikasi menampilkan teks dan confidence secara sederhana.
8. Pasien memilih `Benar`, alternatif lain, atau `Ulangi`.
9. Setelah dikonfirmasi, aplikasi menampilkan teks besar dan membacakannya kepada petugas.
10. Aplikasi menunggu respons petugas.

### 9.2 Petugas merespons

1. Petugas memilih template atau menekan `Bicara`.
2. Speech-to-text mengubah ucapan menjadi teks.
3. Petugas memeriksa dan mengoreksi teks.
4. Aplikasi menampilkan caption kepada pasien.
5. Jika tersedia, aplikasi menampilkan video BISINDO atau visual direction yang sesuai.
6. Pasien memilih `Mengerti`, `Ulangi`, atau `Minta bantuan`.

### 9.3 Confidence rendah

1. Model menghasilkan confidence di bawah threshold.
2. Aplikasi tidak mengucapkan hasil prediksi.
3. Pasien dapat memilih:
   - Mengulangi isyarat.
   - Memilih quick phrase.
   - Mengetik.
   - Meminta penerjemah manusia.

### 9.4 Percakapan memasuki konteks klinis

1. Petugas atau pasien memilih kategori klinis, atau sistem mendeteksi istilah terlarang pada respons bebas.
2. Aplikasi menghentikan penerjemahan otomatis.
3. Aplikasi menampilkan bahwa komunikasi memerlukan petugas atau penerjemah manusia.
4. Tombol eskalasi ditampilkan secara dominan.

### 9.5 Validator mengaktifkan language pack

1. Pengusul mengunggah manifest language pack.
2. Hash dataset, model, dan intent schema dihitung.
3. Pengusul memanggil `submitLanguagePack()`.
4. Tiga validator melihat model card dan bukti review.
5. Dua validator berbeda memanggil `approveLanguagePack()`.
6. Kontrak mengubah status pack menjadi `Active`.
7. Kiosk memverifikasi hash file lokal terhadap kontrak.
8. Pack hanya dimuat jika status aktif dan hash cocok.

---

## 10. Functional requirements

Prioritas:

- **P0:** wajib untuk demo dan submission.
- **P1:** dikerjakan setelah seluruh P0 stabil.
- **P2:** roadmap setelah hackathon.

### 10.1 Kiosk dan session

| ID | Prioritas | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-001 | P0 | Pengguna dapat memulai session tanpa login dan wallet. | Conversation screen terbuka tanpa autentikasi. |
| FR-002 | P0 | Aplikasi menampilkan privacy notice sebelum kamera digunakan. | Kamera baru aktif setelah pengguna menekan persetujuan session. |
| FR-003 | P0 | Session dapat diakhiri kapan saja. | Video buffer, landmark, dan transcript sementara dibersihkan saat session berakhir. |
| FR-004 | P0 | UI menyediakan mode BISINDO, quick phrase, mengetik, dan bantuan manusia. | Keempat mode dapat dipilih dari welcome screen. |
| FR-005 | P1 | Aplikasi kembali otomatis ke welcome screen setelah idle. | Session ditutup setelah periode idle yang dikonfigurasi. |

### 10.2 Sign recognition

| ID | Prioritas | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-010 | P0 | Kamera menampilkan guide agar tangan dan tubuh berada dalam frame. | UI memberi indikator jika landmark utama tidak terlihat. |
| FR-011 | P0 | Sistem mengenali sepuluh intent yang ditentukan. | Seluruh kelas tersedia pada model dan skema intent. |
| FR-012 | P0 | Hasil AI tidak dikirim sebelum dikonfirmasi pengguna. | Tombol `Benar` atau pilihan alternatif diperlukan. |
| FR-013 | P0 | Sistem menyediakan maksimal tiga kandidat. | Kandidat diurutkan berdasarkan confidence. |
| FR-014 | P0 | Prediksi di bawah threshold menghasilkan fallback. | TTS tidak berjalan dan tombol ulangi/ketik/interpreter ditampilkan. |
| FR-015 | P0 | Pengguna dapat membatalkan perekaman. | Buffer dibersihkan tanpa inference. |
| FR-016 | P1 | Sistem memberi panduan pencahayaan dan posisi. | Pesan muncul ketika keypoint terlalu sedikit atau tidak stabil. |

### 10.3 Respons petugas

| ID | Prioritas | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-020 | P0 | Petugas dapat memilih response template. | Template tampil sebagai caption dan visual card. |
| FR-021 | P0 | Petugas dapat menggunakan speech-to-text. | Transcript dapat diedit sebelum ditampilkan. |
| FR-022 | P0 | Respons yang mengandung kategori klinis memicu eskalasi. | Respons tidak dipetakan otomatis ke video BISINDO. |
| FR-023 | P0 | Informasi penting tersedia secara visual. | Tidak ada instruksi yang hanya berupa audio. |
| FR-024 | P1 | Rumah sakit dapat mengonfigurasi lokasi layanan. | Nama lantai/lokasi dapat diubah melalui file konfigurasi. |

### 10.4 Eskalasi

| ID | Prioritas | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-030 | P0 | Pasien dapat meminta penerjemah atau petugas manusia. | Request terlihat pada layar petugas. |
| FR-031 | P0 | Aplikasi menyediakan mode ketik sebagai fallback. | Pesan dapat ditulis tanpa kamera atau mikrofon. |
| FR-032 | P0 | Tersedia tombol bantuan yang tidak bergantung pada model. | Tombol selalu terlihat pada conversation screen. |
| FR-033 | P2 | Integrasi video interpreter jarak jauh. | Di luar MVP. |

### 10.5 Language pack dan BOT Chain

| ID | Prioritas | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-040 | P0 | Siapa pun dapat mengusulkan language pack. | Wallet publik dapat memanggil fungsi submit. |
| FR-041 | P0 | Hanya validator terdaftar yang dapat menyetujui pack. | Wallet lain mendapat revert. |
| FR-042 | P0 | Satu validator tidak dapat menyetujui pack dua kali. | Persetujuan kedua mendapat revert. |
| FR-043 | P0 | Pack aktif setelah quorum dua dari tiga. | Status dan event berubah saat approval kedua. |
| FR-044 | P0 | Kiosk memverifikasi model hash sebelum memuat pack. | File yang dimodifikasi ditolak. |
| FR-045 | P0 | Pack deprecated tidak dapat digunakan untuk session baru. | Kiosk menolak status deprecated. |
| FR-046 | P0 | Aktivasi pack baru menggantikan pack aktif lama untuk region yang sama. | Pack lama berstatus superseded/deprecated. |
| FR-047 | P1 | Deprecation membutuhkan quorum validator. | Dua validator menyetujui proposal deprecation. |

### 10.6 Privacy

| ID | Prioritas | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-050 | P0 | Video tidak disimpan secara default. | Tidak ada file video pada server atau storage setelah session. |
| FR-051 | P0 | Data pasien tidak ditulis ke blockchain. | Contract schema tidak memiliki nama, nomor pasien, diagnosis, transcript, atau video URI. |
| FR-052 | P0 | Transcript bersifat sementara. | Transcript hilang saat session berakhir atau halaman di-refresh. |
| FR-053 | P0 | Kontribusi dataset membutuhkan consent terpisah. | Tidak ada opt-in otomatis dari session layanan. |
| FR-054 | P1 | Statistik hanya berupa agregat anonim. | Dashboard tidak dapat menampilkan session individual. |

---

## 11. AI and machine learning requirements

### 11.1 Task definition

Model melakukan **isolated sign/phrase intent classification**, bukan continuous translation. Satu input terdiri dari sequence pendek yang dimulai dan dihentikan pengguna.

### 11.2 Input pipeline

1. Browser menangkap kamera.
2. MediaPipe Holistic mengekstrak landmark tangan, pose, dan wajah.
3. Landmark dinormalisasi terhadap posisi bahu atau torso.
4. Sequence di-resample atau dipad menjadi panjang tetap.
5. Hanya sequence landmark yang dikirim ke inference API.
6. Raw frame tidak dikirim atau disimpan pada konfigurasi default.

### 11.3 Baseline model

- Model utama: GRU atau LSTM ringan.
- Input: sequence landmark terstandardisasi.
- Output: sepuluh intent dan confidence.
- Format deployment: PyTorch/ONNX atau TensorFlow.
- Fallback teknis: model klasifikasi lebih sederhana jika sequence model tidak stabil.

### 11.4 Dataset minimum

- Sepuluh intent.
- Minimal tiga signer.
- Minimal 15 sequence per intent per signer.
- Total minimum 450 sequence.
- Satu signer tidak boleh masuk training dan digunakan sebagai held-out test.
- Pencahayaan dan jarak kamera dibuat bervariasi.
- Semua rekaman memerlukan consent eksplisit.
- Varian regional dicatat pada metadata.

### 11.5 Go/no-go model

- Target awal macro F1 pada held-out signer: minimal 0,75.
- Jika target tidak tercapai, jumlah intent dikurangi sampai model stabil.
- Model tidak boleh dipresentasikan sebagai translator universal.
- Setiap kelas dengan confusion tinggi harus digabung, dihapus, atau dipindahkan ke quick phrase.

### 11.6 Confidence policy

- Confidence ≥ 0,85: tampilkan prediksi utama dan minta konfirmasi.
- Confidence 0,60–0,84: tampilkan tiga kandidat dan minta pengguna memilih.
- Confidence < 0,60: jangan tampilkan prediksi sebagai terjemahan; gunakan fallback.

Threshold harus dikalibrasi dari validation set dan dapat disesuaikan sebelum demo.

### 11.7 Model card

Setiap language pack wajib memiliki:

- Nama dan versi.
- Varian regional.
- Daftar intent.
- Jumlah signer dan sample.
- Metode split data.
- Macro F1 dan confusion matrix.
- Known limitations.
- Tanggal training.
- Hash dataset, model, dan intent schema.
- Identitas atau pseudonim validator sesuai consent.

---

## 12. Smart contract requirements

### 12.1 State

```solidity
enum PackStatus {
    Proposed,
    Active,
    Rejected,
    Deprecated,
    Superseded
}

struct LanguagePack {
    address proposer;
    bytes32 datasetHash;
    bytes32 modelHash;
    bytes32 intentSchemaHash;
    uint8 regionId;
    string metadataURI;
    uint8 approvalCount;
    PackStatus status;
    uint64 createdAt;
    uint64 activatedAt;
}
```

### 12.2 Public interface

```solidity
function submitLanguagePack(
    bytes32 datasetHash,
    bytes32 modelHash,
    bytes32 intentSchemaHash,
    uint8 regionId,
    string calldata metadataURI
) external returns (uint256 packId);

function approveLanguagePack(uint256 packId) external;

function proposeDeprecation(
    uint256 packId,
    bytes32 reasonHash
) external;

function approveDeprecation(uint256 packId) external;

function getActivePack(uint8 regionId)
    external
    view
    returns (uint256 packId, bytes32 modelHash, string memory metadataURI);

function isValidator(address account) external view returns (bool);
```

### 12.3 Events

```solidity
event LanguagePackSubmitted(uint256 indexed packId, address indexed proposer, uint8 regionId);
event LanguagePackApproved(uint256 indexed packId, address indexed validator, uint8 approvalCount);
event LanguagePackActivated(uint256 indexed packId, uint8 indexed regionId);
event DeprecationProposed(uint256 indexed packId, address indexed validator, bytes32 reasonHash);
event LanguagePackDeprecated(uint256 indexed packId, uint8 indexed regionId);
```

### 12.4 Contract invariants

1. Validator tidak dapat menyetujui pack yang sama dua kali.
2. Proposer tidak otomatis dianggap validator.
3. Pack tidak aktif sebelum quorum terpenuhi.
4. Satu region hanya memiliki satu active pack.
5. Pack deprecated atau rejected tidak dapat kembali aktif.
6. Hash model tidak dapat diubah setelah submit.
7. Tidak ada informasi pasien atau file biometrik dalam contract storage.

### 12.5 Deployment

- Development: local EVM/Hardhat.
- Integration: BOT Chain testnet, Chain ID 968.
- Submission: BOT Chain mainnet, Chain ID 677, setelah test dan review.
- Contract address dan deployment block ditulis pada README serta konfigurasi frontend.
- Source contract diverifikasi pada block explorer jika tooling tersedia.

---

## 13. Sistem dan arsitektur

### 13.1 Frontend kiosk

- React + Vite.
- TypeScript.
- Tailwind CSS atau CSS modules.
- MediaPipe Holistic di browser.
- Web Speech API untuk prototype speech-to-text dan text-to-speech.
- viem atau ethers.js untuk membaca status language pack.
- Wallet hanya ditampilkan pada validator portal.

### 13.2 Backend

- FastAPI.
- Endpoint inference menerima sequence landmark.
- Tidak menerima file video pada flow default.
- Tidak menyimpan payload inference.
- Model dimuat berdasarkan manifest pack aktif.
- CORS dibatasi ke domain aplikasi.

### 13.3 Storage

- Model binary dan model card berada pada object storage/IPFS.
- Hash SHA-256 atau Keccak-256 dihitung sebelum publikasi.
- Video gesture respons yang telah mendapat consent disimpan off-chain.
- Tidak ada video pasien yang disimpan pada session layanan.

### 13.4 Blockchain

- Solidity contract pada BOT Chain.
- Validator portal membaca dan menulis status pack.
- Kiosk membaca active pack dan hash model.
- Kiosk menolak startup jika hash tidak cocok.

### 13.5 API minimum

```text
POST /api/v1/inference/sign
Input: normalized landmark sequence, active pack ID
Output: intent candidates, confidence, model version

GET /api/v1/packs/{regionId}/manifest
Output: metadata pack yang cocok dengan active on-chain pack

GET /api/v1/health
Output: service status dan model version
```

---

## 14. UX requirements

1. Teks utama berukuran besar dan memiliki kontras tinggi.
2. Tidak ada informasi penting yang hanya disampaikan melalui audio.
3. Tombol bantuan manusia selalu terlihat.
4. Camera guide menunjukkan area tangan dan tubuh.
5. Hasil prediksi menggunakan bahasa sederhana.
6. Confidence tidak hanya ditampilkan sebagai angka; gunakan label `Yakin`, `Perlu dipilih`, atau `Belum dikenali`.
7. Semua animasi bersifat opsional dan menghormati reduced motion.
8. Status transaksi validator menampilkan `waiting`, `confirmed`, dan `failed`.
9. Kiosk tidak menampilkan jargon blockchain kepada pasien.
10. UI dapat digunakan dengan keyboard dan layar sentuh.

---

## 15. Safety and privacy requirements

### 15.1 Data yang dilarang masuk blockchain

- Nama pasien.
- Nomor rekam medis.
- NIK.
- Nomor BPJS.
- Wajah atau biometric template.
- Video atau foto pasien.
- Transcript percakapan.
- Diagnosis, gejala, hasil laboratorium, dan data pengobatan.

### 15.2 Data session

- Raw frame hanya berada di memori browser selama session.
- Sequence landmark dihapus setelah inference selesai.
- Transcript dihapus saat session ditutup.
- Server tidak menulis request body inference ke log.
- Error log tidak boleh memasukkan payload pengguna.

### 15.3 Consent untuk dataset

Mode kontribusi dataset harus terpisah dari mode layanan. Kontributor harus mengetahui:

- Data apa yang direkam.
- Tujuan penggunaan.
- Varian regional dan label gesture.
- Lokasi penyimpanan.
- Apakah kontribusi bersifat publik atau terbatas.
- Cara meminta penarikan data off-chain.

Hanya hash consent dan metadata nonpribadi yang dapat dicatat on-chain.

### 15.4 Human escalation

Jika terdapat ketidakpastian, topik klinis, kondisi darurat, atau permintaan pengguna, aplikasi harus mengarahkan komunikasi kepada manusia. SAPA Care tidak boleh membuat atau menerjemahkan instruksi medis secara otomatis pada MVP.

---

## 16. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-001 | Waktu inference setelah sequence selesai ditargetkan di bawah dua detik pada perangkat demo. |
| NFR-002 | UI dapat digunakan pada lebar minimal 360 px dan kiosk tablet landscape. |
| NFR-003 | Tidak ada secret atau private key di repository/frontend. |
| NFR-004 | Smart contract mengikuti checks-effects-interactions dan memiliki access control yang diuji. |
| NFR-005 | Aplikasi menampilkan error yang dapat dipahami saat kamera, mikrofon, RPC, atau inference API gagal. |
| NFR-006 | Model version, pack ID, network, dan contract address tersedia pada halaman About/Model Provenance. |
| NFR-007 | Website tersedia melalui domain aktif. |
| NFR-008 | README menjelaskan batas penggunaan nonklinis secara eksplisit. |

---

## 17. Success metrics

### 17.1 Hackathon metrics

- Sepuluh intent tersedia; jumlah dapat dikurangi jika reliability tidak memenuhi target.
- Macro F1 held-out signer minimal 0,75.
- Seluruh prediksi memerlukan konfirmasi pengguna.
- Semua input confidence rendah masuk fallback.
- Pack dengan satu approval tidak dapat aktif.
- Pack aktif setelah approval validator kedua.
- File model yang dimodifikasi gagal diverifikasi.
- Pack deprecated tidak dapat dimuat.
- Tidak ada video atau transcript tersimpan setelah session.
- Demo utama selesai kurang dari tiga menit.

### 17.2 Pilot metrics setelah hackathon

- Task completion rate untuk kebutuhan nonklinis.
- Persentase session yang memerlukan fallback.
- Persentase koreksi prediksi oleh pengguna.
- Median waktu penyelesaian interaction.
- Kepuasan pasien Tuli dan petugas.
- Jumlah intent dengan performa rendah pada signer baru.

Metrics tidak boleh menyimpan isi percakapan atau identitas pasien.

---

## 18. Acceptance test scenarios

### 18.1 Happy path sign-to-text

1. Active pack memiliki hash valid.
2. Pasien melakukan gesture `ASK_LAB`.
3. Model mengembalikan confidence di atas threshold.
4. Pasien mengonfirmasi.
5. Teks dan audio `Di mana laboratorium?` tampil.

### 18.2 Low-confidence fallback

1. Pasien melakukan gesture di luar kelas.
2. Confidence berada di bawah 0,60.
3. Aplikasi tidak membacakan prediksi.
4. Tombol ulangi, ketik, quick phrase, dan bantuan manusia tampil.

### 18.3 Alternative selection

1. Confidence berada antara 0,60 dan 0,84.
2. Tiga kandidat ditampilkan.
3. Pasien memilih kandidat yang benar.
4. Hanya hasil terpilih yang dikirim ke petugas.

### 18.4 Clinical escalation

1. Petugas mengucapkan respons terkait diagnosis atau dosis.
2. Sistem menandai konteks di luar scope.
3. Aplikasi tidak memetakan respons menjadi video BISINDO otomatis.
4. Aplikasi meminta keterlibatan manusia.

### 18.5 Pack approval

1. Pack baru disubmit.
2. Validator pertama menyetujui; status tetap Proposed.
3. Validator pertama mencoba menyetujui lagi; transaksi revert.
4. Validator kedua menyetujui; status menjadi Active.

### 18.6 Unauthorized approval

1. Wallet nonvalidator mencoba approve.
2. Transaksi revert.
3. Approval count tidak berubah.

### 18.7 Tampered model

1. Model aktif diunduh.
2. File model diubah.
3. Hash lokal tidak cocok dengan on-chain hash.
4. Kiosk menolak memuat model dan menampilkan fallback.

### 18.8 Session privacy

1. Session digunakan untuk dua pesan.
2. Session diakhiri.
3. Kamera berhenti.
4. Buffer landmark dan transcript dibersihkan.
5. Server/storage tidak memiliki video atau transcript session.

---

## 19. Test plan

### 19.1 Smart contract

- Submit pack dengan input valid.
- Reject zero hash dan metadata kosong.
- Approve oleh validator.
- Reject approval oleh nonvalidator.
- Reject duplicate approval.
- Aktivasi tepat pada quorum.
- Supersede pack aktif lama.
- Deprecation flow.
- Event emission.
- Network dan address configuration.

### 19.2 Model

- Train/validation/test dipisah berdasarkan signer.
- Confusion matrix per intent.
- Uji pencahayaan terang dan redup.
- Uji tangan sebagian keluar frame.
- Uji background berbeda.
- Uji gesture tidak dikenal.
- Uji latency pada perangkat demo.

### 19.3 Frontend integration

- Permission kamera ditolak.
- Kamera tidak tersedia.
- Mikrofon ditolak.
- Inference API gagal.
- RPC gagal.
- Salah network pada validator portal.
- User menolak hasil prediksi.
- Session timeout.

### 19.4 Accessibility

- Keyboard navigation.
- Touch target pada tablet.
- High contrast.
- Tidak bergantung pada warna saja.
- Caption dan visual untuk seluruh audio penting.
- Reduced motion.

---

## 20. Demo script

### 0:00–0:25 — Masalah

> Aksesibilitas rumah sakit tidak berhenti pada ramp dan lift. Pasien Tuli masih dapat mengalami hambatan sejak meja informasi.

### 0:25–0:55 — Pack governance

- Tampilkan pack berstatus Proposed.
- Validator kedua memberi approval.
- Status berubah menjadi Active.
- Kiosk memuat model setelah hash cocok.

### 0:55–1:35 — Pasien ke petugas

- Lakukan gesture `Saya sudah memiliki janji`.
- Konfirmasi hasil.
- Aplikasi menampilkan teks dan TTS.

### 1:35–2:05 — Petugas ke pasien

- Petugas berkata `Silakan menuju loket pendaftaran`.
- Caption dan visual direction tampil.

### 2:05–2:30 — Safe failure

- Lakukan gesture yang tidak dikenal.
- Aplikasi menolak menebak dan menawarkan ulangi/ketik/interpreter.

### 2:30–2:50 — Integrity failure

- Gunakan model file yang telah dimodifikasi.
- Kiosk menolak karena hash tidak cocok.

### 2:50–3:00 — Penutup

> SAPA Care membantu komunikasi nonklinis, tahu kapan harus berhenti, dan memastikan model yang digunakan telah divalidasi serta tidak diubah diam-diam.

---

## 21. Pembagian tugas tim

### Anggota 1 — AI/computer vision

- Dataset dan consent.
- MediaPipe pipeline.
- Model GRU/LSTM.
- Confidence calibration.
- Held-out signer testing.
- Inference API.

### Anggota 2 — Frontend/accessibility

- Kiosk UI.
- Conversation flow.
- Quick phrase dan visual direction.
- Speech-to-text dan TTS.
- Error/fallback states.
- Responsive dan accessibility testing.

### Anggota 3 — Blockchain/backend/deployment

- Language pack registry contract.
- Validator portal.
- Hash verification.
- BOT Chain deployment.
- Storage/manifest.
- Website deployment dan README.

Ketiga anggota bertanggung jawab bersama atas validasi BISINDO, pengujian end-to-end, demo, dan pitch.

---

## 22. Timeline 48 jam

### Jam 0–4

- Konfirmasi sepuluh intent dan varian regional.
- Review scope bersama penutur BISINDO.
- Kunci schema dataset, contract, dan wireframe.
- Siapkan tiga wallet validator demo.

### Jam 4–12

- Rekam atau siapkan dataset.
- Bangun MediaPipe pipeline.
- Bangun kiosk shell dan quick phrase.
- Implementasikan contract pack registry.

### Jam 12–20

- Latih baseline model.
- Implementasikan validator portal.
- Tambahkan sign-to-text, TTS, dan speech-to-text.
- Siapkan model card serta manifest.

### Jam 20–28

- Integrasikan frontend, inference API, dan contract.
- Tambahkan confidence policy dan fallback.
- Deploy kontrak testnet.
- Uji dua-wallet approval.

### Jam 28–36

- Uji held-out signer.
- Kurangi intent dengan confusion tinggi.
- Implementasikan hash verification.
- Tambahkan safe clinical escalation.

### Jam 36–42

- Uji privacy dan session cleanup.
- Uji kamera buruk, API gagal, wrong network, dan tampered model.
- Polish UI dan visual direction.

### Jam 42–48

- Deploy website.
- Deploy/verify contract final.
- Lengkapi README dan alamat kontrak.
- Rekam video cadangan.
- Buat posting X dan latihan demo.

---

## 23. Fallback plan 24 jam

Jika waktu hanya 24 jam:

- Gunakan delapan intent terbaik.
- Satu regional pack.
- Hapus hospital analytics.
- Gunakan response template tanpa generative translation.
- Pertahankan camera recognition, confidence fallback, speech-to-text, pack approval, dan hash verification.
- Demo hanya pada loket pendaftaran.

---

## 24. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Tidak ada reviewer BISINDO | Validitas produk lemah | Jadikan akses ke reviewer sebagai go/no-go sebelum finalisasi dataset. |
| Model hanya akurat pada anggota tim | Demo gagal pada pengguna baru | Gunakan held-out signer dan kurangi jumlah intent. |
| Variasi regional | Terjemahan tidak sesuai | Label region dengan jelas dan jangan mengklaim cakupan nasional. |
| Confidence terlalu optimistis | Salah terjemahan | Kalibrasi threshold dan selalu minta konfirmasi. |
| Percakapan klinis masuk sistem | Risiko keselamatan | Whitelist intent dan eskalasi manusia. |
| Video pasien tersimpan | Risiko privasi | Ekstrak landmark di browser dan nonaktifkan persistence. |
| Blockchain terlihat dipaksakan | Nilai inovasi turun | Kiosk harus benar-benar menolak pack tidak aktif/tampered. |
| RPC atau internet gagal | Kiosk tidak dapat memverifikasi pack | MVP fail closed; roadmap menyediakan cache manifest yang ditandatangani. |
| Staff menganggap aplikasi sebagai interpreter medis | Penyalahgunaan | Tampilkan boundary dan training singkat pada UI/admin. |

---

## 25. Go/no-go checklist

Proyek dilanjutkan sebagai SAPA Care jika:

- Ada minimal satu penutur BISINDO yang bersedia meninjau intent dan gesture.
- Tim dapat memperoleh atau membuat dataset dengan consent.
- Baseline model mengenali minimal delapan intent pada held-out signer.
- Tim dapat menjalankan MediaPipe dan inference pada perangkat demo.
- Contract governance selesai sebelum UI polish.

Jika reviewer BISINDO tidak tersedia, tim tidak boleh mengklaim gesture sebagai representasi BISINDO yang tervalidasi. Jika model tidak mencapai target, MVP dialihkan menjadi quick phrase + speech caption dengan prototype recognition terbatas dan keterbatasan tersebut disebutkan secara eksplisit.

---

## 26. Roadmap setelah hackathon

### Fase 1 — Validasi komunitas

- Co-design dengan organisasi Tuli.
- Tambah signer dan variasi kondisi.
- Audit label serta UX.

### Fase 2 — Pilot fasilitas

- Satu tablet di loket informasi.
- Deployment on-premise.
- Pelatihan petugas.
- Pengukuran completion dan fallback rate.

### Fase 3 — Regional packs

- Beberapa varian BISINDO.
- Validator regional.
- Model routing berdasarkan pilihan pengguna.

### Fase 4 — Human interpreter integration

- Video interpreter request.
- Jadwal interpreter.
- Handoff context tanpa menyimpan data klinis di blockchain.

### Fase 5 — Integrasi layanan

- Integrasi antrean dan peta internal rumah sakit setelah review keamanan dan privasi.
- Tidak mengintegrasikan rekam medis sebelum compliance, threat modeling, dan perjanjian pemrosesan data selesai.

---

## 27. Assumptions

- Demo menggunakan data sintetis dan lingkungan rumah sakit simulasi.
- Tidak ada pasien nyata yang direkam selama hackathon tanpa consent formal.
- Pasien tidak memiliki atau membutuhkan wallet.
- Tiga wallet validator demo merepresentasikan peran validator, bukan validasi komunitas produksi.
- Regional pack pertama ditentukan setelah tersedia reviewer; dataset publik Banten dapat digunakan sebagai baseline teknis, bukan klaim cakupan nasional.
- Aplikasi hanya dipakai pada area layanan nonklinis.
- Mainnet deployment dilakukan setelah testnet dan pengujian kontrak selesai.

---

## 28. Referensi

- Build Week Hackathon Vol.2 Guidebook: https://www.girlmeetstech.org/guidebook-build-week-hackathon-vol2
- WHO — Disability-inclusive Health Services Toolkit: https://iris.who.int/bitstream/handle/10665/336857/9789290618928-eng.pdf?sequence=1
- WHO — Deaf and hard-of-hearing friendly communication: https://www.who.int/news-room/questions-and-answers/item/how-to-be-hearing-loss-friendly
- Permenkes No. 19 Tahun 2024: https://jdih.kemkes.go.id/storage/documents/pdfs/2024permenkes019.pdf
- UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi: https://peraturan.bpk.go.id/details/229798/uu-no-27-
- WL-BISINDO dataset and baseline: https://github.com/AceKinnn/WL-BISINDO



## Catatan eksperimen dataset publik — 20 September 2026

Tim menyatakan belum memiliki penutur BISINDO dan menyetujui pendekatan dataset publik dengan cakupan kecil. Eksperimen di `/#bisindo` memakai WL-BISINDO Banten untuk Maaf, Terima kasih, dan Di mana. Eksperimen ini tidak menggantikan kriteria penerimaan MVP sepuluh intent rumah sakit atau validasi komunitas. Cakupan dan evaluasi dijelaskan pada [panduan riset](docs/RISET-BISINDO.md). Demonstrasi internal dari video uji dipisahkan dari kamera langsung; kesiapan demo publik harus dijelaskan sesuai bukti dan penggunaan lisensi.
