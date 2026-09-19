import copy
from backend.audit_dataset import audit_samples
from backend.schemas import INTENTS

def sample(signer="signer-01", split="train", label="INT-01", variation=0):
    frame = lambda t: {"timestampMs": t, "pose": [], "leftHand": [], "rightHand": [], "face": []}
    return {"schemaVersion": 1, "signerId": signer, "consentReference": "consent-01",
            "region": "example-region", "intentId": label, "split": split, "reviewStatus": "approved",
            "source": {"extractor": "MediaPipe Holistic", "version": "1.0.1", "coordinateSpace": "normalized-image", "mirrored": False},
            "frames": [frame(0), frame(100 + variation)]}

def codes(report):
    return {item["code"] for item in report["issues"]}

def test_detects_signer_leakage_and_duplicate_sequences():
    report = audit_samples([("a.json", sample()), ("b.json", sample(split="test"))])
    assert {"SIGNER_SPLIT_LEAK", "DUPLICATE_SEQUENCE"} <= codes(report)
    assert not report["metadataChecksPassed"]

def test_pending_or_unassigned_is_not_training_ready():
    value = sample(); value.update(reviewStatus="pending", region="unassigned")
    assert {"REVIEW_REQUIRED", "REGION_REQUIRED"} <= codes(audit_samples([("a.json", value)]))

def test_corrupt_samples_are_reported_without_coordinates():
    report = audit_samples([("bad.json", {"secret": "private-value"})])
    assert "INVALID_SAMPLE" in codes(report)
    assert "private-value" not in str(report)

def test_complete_metadata_is_not_claimed_as_language_accuracy():
    items = []
    for signer, split in enumerate(["train", "validation", "test"]):
        for index, intent in enumerate(sorted(INTENTS)):
            items.append((f"{signer}-{intent}.json", sample(f"signer-{signer}", split, intent, signer * 10 + index)))
    report = audit_samples(items)
    assert report["metadataChecksPassed"]
    assert report["sampleCount"] == 30
    assert report["warnings"]
    assert "do not prove language accuracy" in report["note"]
