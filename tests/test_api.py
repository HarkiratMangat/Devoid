"""The routes, against a REAL corpus asset, through Starlette's TestClient.

⚠️ No socket is bound; the client drives the ASGI app directly. That is enough to
prove the contract's shapes, which is what this file is for.
"""
from __future__ import annotations

import copy

import pytest
from starlette.testclient import TestClient

from server import assets as registry
from server import preview
from server.app import app
from tests.conftest import AMBIGUOUS_ASSET


@pytest.fixture()
def client(isolated_logs):
    registry.clear()
    with TestClient(app) as c:
        yield c


def test_engine_status_shape(client):
    r = client.get("/api/engine/status")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {
        "available",
        "missing",
        "avif",
        "gifsicle",
        "pngquant",
        "webpmux",
        "engine_version",
        "skill_path",
    }


def test_flags_route_is_generated(client):
    body = client.get("/api/flags").json()
    assert len(body["flags"]) >= 60
    assert {"name", "dest", "type", "choices", "default", "help", "group"} <= set(body["flags"][0])


def test_static_mount_still_serves_the_front_end(client):
    """Stage 0's static mount must survive the API routes being added in front."""
    assert client.get("/").status_code == 200
    assert client.get("/app.css").status_code == 200


def test_end_to_end_register_then_analyze(client, fast_asset):
    created = client.post("/api/assets", json={"paths": [str(fast_asset)]}).json()
    assert len(created) == 1
    # ``url`` joined the shape when GET /api/assets/{id}/source landed — the
    # frontend can no longer derive an image URL from the basename.
    assert set(created[0]) == {"id", "path", "ext", "state", "url"}
    assert created[0]["state"] == "loading"
    asset_id = created[0]["id"]

    r = client.post(f"/api/assets/{asset_id}/analyze")
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == {"state", "questions", "engine_version", "took_ms"}
    assert body["state"] in ("needs-you", "refused", "ready")
    q = body["questions"]
    assert set(q) == {
        "ambiguous_protection",
        "nameable_fade",
        "recommended_format",
        "not_applicable_reason",
        "alternative_command",
        "suggested_flag_tokens",
    }
    assert isinstance(q["ambiguous_protection"], list)
    assert body["took_ms"] >= 0

    listed = client.get("/api/assets").json()
    assert listed[0]["id"] == asset_id
    assert listed[0]["state"] == body["state"]


def test_unknown_asset_and_missing_file(client):
    assert client.post("/api/assets/nope/analyze").status_code == 404
    created = client.post("/api/assets", json={"paths": ["/nope/missing.gif"]}).json()
    assert created[0]["state"] == "blocked"
    r = client.post(f"/api/assets/{created[0]['id']}/analyze")
    assert r.status_code == 404
    assert r.json()["error"] == "input_missing"


def test_answers_reject_a_conflicting_colour(client, monkeypatch):
    """⚠️ PLAN.md 3.0a. Two regions sharing one outline colour cannot be answered
    differently — answering them so would emit ``--assume-protect X`` and
    ``--assume-remove X`` at once.

    The corpus's megaphone has ONE ambiguous region, so the second same-colour
    region is synthesised from the real one: the collision is what is under test,
    not the engine's ability to produce two.
    """
    from server import engine
    from server.validate import parse_recommend

    raw = copy.deepcopy(engine.recommend(str(AMBIGUOUS_ASSET)))
    entry = raw["ambiguous_protection"][0]
    twin = copy.deepcopy(entry)
    twin["region_id"] = entry["region_id"] + 1
    twin["bbox_xyxy"] = [v + 5 for v in entry["bbox_xyxy"]]
    raw["ambiguous_protection"].append(twin)

    created = client.post("/api/assets", json={"paths": [str(AMBIGUOUS_ASSET)]}).json()[0]
    asset = registry.get(created["id"])
    asset.result = parse_recommend(raw)
    asset.state = asset.result.state
    assert asset.state == "needs-you"

    a, b = entry["region_id"], twin["region_id"]
    r = client.post(
        f"/api/assets/{asset.id}/answers",
        json={"ambiguous_protection": {str(a): "protect", str(b): "remove"}},
    )
    assert r.status_code == 400
    assert r.json() == {"error": "conflicting_colour", "outline_color": entry["outline_color"]}
    # ⚠️ Rejected wholesale — a half-applied answer would be worse than none.
    assert asset.region_answers == {}

    ok = client.post(
        f"/api/assets/{asset.id}/answers",
        json={"ambiguous_protection": {str(a): "protect", str(b): "protect"}},
    )
    assert ok.status_code == 200, ok.text
    body = ok.json()
    assert body["state"] == "ready"
    assert body["colour_verdicts"] == {entry["outline_color"]: "protect"}
    assert body["labels_written"] == 2

    from server import labels

    assert labels.LABELS_PATH.is_file()
    assert len(labels.LABELS_PATH.read_text().splitlines()) == 2


def test_answers_reject_an_unknown_region(client, fast_asset):
    created = client.post("/api/assets", json={"paths": [str(fast_asset)]}).json()[0]
    client.post(f"/api/assets/{created['id']}/analyze")
    r = client.post(
        f"/api/assets/{created['id']}/answers",
        json={"ambiguous_protection": {"999": "protect"}},
    )
    assert r.status_code == 404


def test_render_then_poll_then_cancel(client, tmp_path, fast_asset):
    import shutil

    src = tmp_path / fast_asset.name
    shutil.copyfile(fast_asset, src)
    created = client.post("/api/assets", json={"paths": [str(src)]}).json()[0]
    r = client.post(
        f"/api/assets/{created['id']}/render",
        json={"overrides": {}, "regions": [], "goal": {"format": "webp"}},
    )
    assert r.status_code == 202
    job_id = r.json()["job_id"]

    status = client.get(f"/api/jobs/{job_id}").json()
    assert status["state"] in ("loading", "running", "done", "failed")
    assert status["verify"] == "not-checked"

    killed = client.delete(f"/api/jobs/{job_id}").json()
    assert killed["state"] in ("cancelled", "done")
    assert client.get("/api/jobs/nope").status_code == 404


def test_preview_pair_on_a_real_asset(client, fast_asset, monkeypatch):
    """⚠️ Answer-A against answer-B on ONE frame, via the CLI — the exact technique
    ``scripts/measure_preview_fidelity.py`` proved. Never source-against-output."""
    preview.clear_cache()
    created = client.post("/api/assets", json={"paths": [str(fast_asset)]}).json()[0]
    client.post(f"/api/assets/{created['id']}/analyze")
    r = client.post(
        f"/api/assets/{created['id']}/preview",
        json={"flag": "edge_cleanup_erosion", "value_a": 0, "value_b": 3},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert {"a_url", "b_url", "ledger_a", "ledger_b", "format_is_gif"} <= set(body)
    assert body["format_is_gif"] is True  # the source is a .gif
    for side in ("ledger_a", "ledger_b"):
        assert set(body[side]) == {"bg", "art", "total"}
        assert body[side]["total"] > 0
    # The two answers must actually differ, or the seam has nothing to show.
    assert body["ledger_a"] != body["ledger_b"]
    assert client.get(body["a_url"]).status_code == 200
    assert client.get(body["b_url"]).status_code == 200
    assert client.get("/api/preview-files/deadbeef/a.webp").status_code == 404


def test_preview_frame_inherits_the_nomination():
    """PLAN.md 3.2: the preview must not re-derive the calibration from one frame."""
    assert preview.sample_frame_index({"nominated_frames": [{"frame": 7}]}, 50) == 7
    assert preview.sample_frame_index({"nominated_frames": []}, 50) == 25
    assert preview.sample_frame_index(None, 50) == 25
    assert preview.sample_frame_index({"nominated_frames": [{"frame": 999}]}, 50) == 49


def test_history_reads_newest_first(client, tmp_path, fast_asset):
    from server import render

    for i in range(3):
        render._journal(
            render.Job(
                id=f"j{i}",
                asset_id="a",
                input_path=str(fast_asset),
                settings={},
                state="done",
                output_path=f"/tmp/out{i}.webp",
                engine_version="sha256:test",
            )
        )
    rows = client.get("/api/history?limit=2").json()
    assert len(rows) == 2
    assert rows[0]["output_path"] == "/tmp/out2.webp"
