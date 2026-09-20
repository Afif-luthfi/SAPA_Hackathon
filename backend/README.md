# Backend lokal SAPA

Backend merupakan kontrak API dan validator landmark; model BISINDO belum tersedia. Aplikasi utama serta Studio Dataset dapat digunakan tanpa backend. Tombol **Periksa layanan** di Studio memanggil health melalui proxy Vite ke port 8000.

Jalankan dari root proyek, pada terminal terpisah dari `npm run dev`:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements.lock.txt
.venv/Scripts/python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

| Endpoint | Perilaku saat ini |
|---|---|
| GET /api/v1/health | 200, model.available=false |
| GET /api/v1/packs/{region_id}/manifest | 404 PACK_NOT_AVAILABLE |
| POST /api/v1/inference/sign | Input valid: 503 MODEL_NOT_AVAILABLE; input tidak valid: 422; body melebihi 4 MiB: 413 |

Tidak ada training, penyimpanan dataset, atau hasil prediksi dari backend ini. Contoh pengenalan di kiosk berjalan di browser. Proxy `/api` tersedia pada dev server; hosting build statis belum menyediakan backend.

```powershell
.venv/Scripts/python.exe -m pytest backend/tests -q
```

Audit offline tersedia melalui `python -m backend.audit_dataset`; lihat [panduan dataset](../datasets/README.md). Dependensi test saat ini menghasilkan dua peringatan deprecation dari Starlette/AnyIO; pengujian tetap lulus.
