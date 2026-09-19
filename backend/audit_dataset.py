"""Offline audit: reads explicitly selected JSON files; never uploads or rewrites them."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
from pydantic import ValidationError
from .schemas import DatasetSample, INTENTS

def audit_samples(items):
    issues = []
    signers = defaultdict(set)
    coverage = defaultdict(set)
    labels = Counter()
    regions = set()
    seen = set()
    accepted = 0
    for name, payload in items:
        try:
            sample = DatasetSample.model_validate(payload)
        except ValidationError:
            issues.append({"file": name, "code": "INVALID_SAMPLE"})
            continue
        accepted += 1
        labels[sample.intentId] += 1
        signers[sample.signerId].add(sample.split)
        coverage[sample.split].add(sample.intentId)
        regions.add(sample.region)
        if sample.reviewStatus != "approved":
            issues.append({"file": name, "code": "REVIEW_REQUIRED"})
        if sample.region.lower() in {"unassigned", "unknown", "belum ditentukan"}:
            issues.append({"file": name, "code": "REGION_REQUIRED"})
        fingerprint = hashlib.sha256(json.dumps(
            [frame.model_dump(exclude_none=True) for frame in sample.frames], sort_keys=True, separators=(",", ":")
        ).encode()).hexdigest()
        if fingerprint in seen:
            issues.append({"file": name, "code": "DUPLICATE_SEQUENCE"})
        seen.add(fingerprint)
    if any(len(splits) != 1 for splits in signers.values()):
        issues.append({"code": "SIGNER_SPLIT_LEAK"})
    if len(regions) > 1:
        issues.append({"code": "MIXED_REGIONS"})
    if len(signers) < 3:
        issues.append({"code": "NEED_THREE_SIGNERS"})
    if any(coverage[split] != INTENTS for split in ("train", "validation", "test")):
        issues.append({"code": "INCOMPLETE_INTENT_COVERAGE"})
    return {
        "sampleCount": accepted, "signerCount": len(signers), "intentCounts": dict(labels),
        "metadataChecksPassed": accepted > 0 and not issues,
        "issues": issues,
        "warnings": ["Sample count below the PRD initial target of 450."] if accepted < 450 else [],
        "note": "Metadata checks do not prove language accuracy, consent authenticity, or model performance.",
    }

def main():
    parser = argparse.ArgumentParser(description="Audit an explicitly selected private dataset folder without uploading data.")
    parser.add_argument("folder", type=Path)
    args = parser.parse_args()
    if not args.folder.is_dir():
        parser.error("Folder tidak ditemukan.")
    items = []
    unreadable = []
    for file in sorted(args.folder.glob("*.json")):
        if file.stat().st_size > 16 * 1024 * 1024:
            unreadable.append({"file": file.name, "code": "FILE_TOO_LARGE"})
            continue
        try:
            items.append((file.name, json.loads(file.read_text(encoding="utf-8"))))
        except (OSError, ValueError):
            unreadable.append({"file": file.name, "code": "UNREADABLE_JSON"})
    report = audit_samples(items)
    report["issues"].extend(unreadable)
    report["metadataChecksPassed"] = report["metadataChecksPassed"] and not unreadable
    print(json.dumps(report, indent=2))
    return 0 if report["metadataChecksPassed"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
