"""Fetch a fixed WL-BISINDO v1 research subset. CC BY-NC 4.0; no redistribution here."""
import concurrent.futures, hashlib, json, time, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'datasets/private/wl-bisindo/videos'
LABELS = {6: 'Maaf', 10: 'Terima kasih', 15: 'Di mana'}
# Label 7 (Makan) is a held-out vocabulary rejection probe, never a target class.
import re
INVENTORY = json.loads((ROOT / 'datasets/wl-bisindo/file-list.json').read_text(encoding='utf-8'))['files']
FILES = [item['name'] for item in INVENTORY if re.fullmatch(r'signer[0-4]_label(?:6|10|15|7)_sample[0-9]+\.mp4', item['name'])]
def fetch(name):
    path = DEST / name
    if not path.exists():
        url = f'https://www.kaggle.com/api/v1/datasets/download/glennleonali/wl-bisindo/{name}?datasetVersionNumber=1'
        for attempt in range(3):
            try:
                with urllib.request.urlopen(url, timeout=60) as response: data = response.read()
                if b'ftyp' not in data[:32]: raise ValueError('not MP4')
                path.write_bytes(data)
                break
            except Exception:
                if attempt == 2: raise
                time.sleep(1 + attempt)
    data = path.read_bytes()
    if b'ftyp' not in data[:32]: raise ValueError('invalid cached MP4')
    return {'file': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
def main():
    DEST.mkdir(parents=True, exist_ok=True)
    records, failures = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        jobs = {pool.submit(fetch, name): name for name in FILES}
        for future in concurrent.futures.as_completed(jobs):
            try: records.append(future.result())
            except Exception as exc: failures.append({'file': jobs[future], 'error': str(exc)})
            if (len(records) + len(failures)) % 20 == 0: print(f'Downloaded {len(records)}/200; failed {len(failures)}', flush=True)
    report = {'source': 'https://www.kaggle.com/datasets/glennleonali/wl-bisindo', 'version': 1, 'license': 'CC BY-NC 4.0', 'labels': LABELS, 'rejectionProbe': {'7': 'Makan'}, 'files': sorted(records, key=lambda x:x['file']), 'failures': failures}
    (DEST.parent / 'downloads.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({'downloaded': len(records), 'failed': len(failures), 'bytes': sum(x['bytes'] for x in records)}))
    return bool(failures)
if __name__ == '__main__': raise SystemExit(main())
