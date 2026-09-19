import copy
import json
import pytest
from fastapi.testclient import TestClient
from backend.app import app, MAX_BODY_BYTES

client = TestClient(app)
def frame(time=0):
    return {"timestampMs": time, "pose": [], "leftHand": [], "rightHand": [], "face": []}
def payload():
    return {"packId": "unassigned", "frames": [frame(0), frame(100)]}

def test_health_is_explicitly_unavailable():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["model"]["available"] is False
    assert response.json()["capabilities"]["inference"] is False
    assert response.headers["cache-control"] == "no-store"

def test_valid_request_never_fabricates_prediction():
    response = client.post("/api/v1/inference/sign", json=payload())
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "MODEL_NOT_AVAILABLE"
    assert "candidates" not in response.text

@pytest.mark.parametrize("change", [
    lambda p: p.update(patientName="private-person"),
    lambda p: p["frames"][0].update(timestampMs=10),
    lambda p: p["frames"][1].update(timestampMs=0),
    lambda p: p["frames"][1].update(timestampMs=10001),
    lambda p: p["frames"][0].update(pose=[{"x": .5, "y": .5, "z": 0}]),
    lambda p: p.update(frames=p["frames"] * 61),
])
def test_invalid_input_is_rejected_without_echo(change):
    value = payload(); change(value)
    response = client.post("/api/v1/inference/sign", json=value)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_INPUT"
    assert "private-person" not in response.text
    assert "timestampMs" not in response.text
    assert '"input"' not in response.text

def test_nonfinite_points_rejected():
    value = payload()
    value["frames"][0]["leftHand"] = [{"x": float("nan"), "y": .5, "z": 0}] * 21
    response = client.post("/api/v1/inference/sign", content=json.dumps(value), headers={"Content-Type": "application/json"})
    assert response.status_code == 422
    assert "NaN" not in response.text

def test_large_body_is_rejected_before_parsing():
    response = client.post("/api/v1/inference/sign", content=b"x" * (MAX_BODY_BYTES + 1))
    assert response.status_code == 413

def test_manifest_is_not_claimed_as_active():
    response = client.get("/api/v1/packs/unassigned/manifest")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PACK_NOT_AVAILABLE"

def test_cors_only_allows_configured_local_origin():
    response = client.options("/api/v1/inference/sign", headers={"Origin": "http://127.0.0.1:5173", "Access-Control-Request-Method": "POST"})
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"
    denied = client.options("/api/v1/inference/sign", headers={"Origin": "https://untrusted.invalid", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in denied.headers
