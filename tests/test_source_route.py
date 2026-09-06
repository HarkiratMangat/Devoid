"""``GET /api/assets/{id}/source`` — the registered input file's own bytes.

⚠️ **The bug this route closes.** ``web/app.js`` built every image URL as
``assets/<basename>``, so any file outside ``web/assets/`` 404'd and the app
showed a blank frame — on the contact sheet AND in the open view, where there
was no error handler at all. ``docs/DEVLOG.md``'s "first real use" celebrates a
completed run on a file from ``~/Downloads``; nobody checked whether the person
could see the picture, and they could not. So these tests deliberately serve a
file from ``tmp_path`` — **outside the repo** — because a corpus asset passes
through the old basename path too and would prove nothing.

The registry is the only door in: the route takes an asset id, never a path, so
it cannot be steered at an arbitrary file on disk. ``test_source_route_cannot_be
_steered_at_an_unregistered_file`` is the falsifier for that claim.
"""
from __future__ import annotations

from pathlib import Path

import pytest
from starlette.testclient import TestClient

from server import assets as registry
from server.app import app
from tests.conftest import ASSETS


@pytest.fixture()
def client(isolated_logs):
    registry.clear()
    with TestClient(app) as c:
        yield c


def test_source_route_serves_a_registered_file(client, tmp_path):
    src = tmp_path / "outside.gif"
    src.write_bytes((ASSETS / "rocket.gif").read_bytes())
    asset = client.post("/api/assets", json={"paths": [str(src)]}).json()[0]
    assert asset["url"] == f"/api/assets/{asset['id']}/source"
    r = client.get(asset["url"])
    assert r.status_code == 200
    assert r.content[:6] in (b"GIF87a", b"GIF89a")


def test_source_route_404s_for_an_unknown_asset(client):
    assert client.get("/api/assets/nope/source").status_code == 404


def test_source_route_cannot_be_steered_at_an_unregistered_file(client, tmp_path):
    """A real, readable file that was never registered has no id, so no URL.

    The traversal-shaped ids are the shapes an attacker would reach for first;
    each must 404 as "unknown asset" rather than resolving to a path.
    """
    secret = tmp_path / "secret.txt"
    secret.write_text("not yours")
    for probe in ("../../etc/passwd", str(secret), str(secret).lstrip("/"), "..", "."):
        r = client.get(f"/api/assets/{probe}/source")
        assert r.status_code == 404, f"{probe} resolved to {r.status_code}"
        assert b"not yours" not in r.content


def test_source_route_reports_a_file_that_disappeared(client, tmp_path):
    """``input_missing`` is the app's existing word for a source that moved.

    ⚠️ Registration succeeds and the file vanishes afterwards, so ``state`` is
    ``loading``, not ``blocked`` — the route has to re-check the path itself.
    """
    src = tmp_path / "gone.gif"
    src.write_bytes((ASSETS / "rocket.gif").read_bytes())
    asset = client.post("/api/assets", json={"paths": [str(src)]}).json()[0]
    assert asset["state"] == "loading"
    Path(src).unlink()
    r = client.get(asset["url"])
    assert r.status_code == 404
    assert r.json()["error"] == "input_missing"
