"""`/analyze` hands its analysis to the render, so `--auto` does not recompute it.

⚠️ MEASURED 2026-09-07 on `galaxy.gif` (743 KB, 8 frames), before this landed: one
`--auto` render called `analyze()` **twice** -- pass 1's `recommend()` and pass 3's
`verify()` -- for **5.73s of a 10.15s run**, on top of the 3.0s `/analyze` had just
paid for the identical report. With the engine's parameter and this handoff: **zero**
calls, **4.28s**, output bytes identical.

⚠️ EVERY ASSERTION HERE RUNS AGAINST THE STATE THAT SHOULD BREAK IT. The engine
refuses a document whose input, script or tolerance moved, so the tests that matter
are the ones where the handoff must NOT be used: an engine that cannot take the flag,
a document that no longer exists, and an asset that was never analysed.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from server import app as server_app
from server import assets as registry
from server import engine, render


def test_the_engine_actually_accepts_the_flag():
    """The capability check must be true against the engine this checkout resolves.

    ⚠️ If this fails, every assertion below would pass vacuously -- they would all be
    testing the graceful no-op path. It is first for that reason.
    """
    assert engine.supports_analysis_handoff(), (
        f"{engine.skill_path()} has no --analysis-json; the handoff cannot be tested "
        "and Devoid is correctly not sending it")


def test_the_document_is_written_and_the_engine_would_accept_it(fast_asset, tmp_path):
    doc = tmp_path / "a.json"
    report = engine.recommend(os.fspath(fast_asset))["analysis"]
    assert engine.write_analysis_handoff(doc, fast_asset, 15, report) is True
    d = json.loads(doc.read_text())
    assert d["schema"] == "gif-background-remover/analysis@1"
    assert d["input"]["path"] == os.path.abspath(fast_asset)
    assert d["tolerance"] == 15
    assert "candidate_regions" in d["analysis"]

    # and the engine's own loader takes it -- the only check that proves the two
    # halves agree. A Devoid-side shape assertion alone would pass on a document
    # the engine silently refuses.
    loaded = engine.load_skill().load_supplied_analysis(
        os.fspath(doc), os.fspath(fast_asset), 15)
    assert loaded is not None


def test_a_document_the_engine_would_refuse_is_still_written_here(fast_asset, tmp_path):
    """Devoid does not second-guess the engine's identity check, and must not.

    The tolerance is recorded, not validated, on this side; the engine refuses the
    mismatch loudly at render time. This asserts the division stays that way -- a
    Devoid-side copy of the rule is the drift the whole design avoids.
    """
    doc = tmp_path / "b.json"
    report = engine.recommend(os.fspath(fast_asset))["analysis"]
    assert engine.write_analysis_handoff(doc, fast_asset, 99, report) is True
    assert engine.load_skill().load_supplied_analysis(
        os.fspath(doc), os.fspath(fast_asset), 15) is None


def test_the_render_argv_carries_it(tmp_path):
    doc = tmp_path / "c.json"
    doc.write_text("{}")
    argv = render.build_render_argv("in.gif", "out.gif", {"analysis_json": os.fspath(doc)})
    assert "--analysis-json" in argv
    assert argv[argv.index("--analysis-json") + 1] == os.fspath(doc)
    # ⚠️ and it must sit BEFORE --auto's own flags rather than inside them: it is
    # plumbing, not an override, so it never passes through the tri-state layer.
    assert argv.index("--analysis-json") < argv.index("--auto")


@pytest.mark.parametrize("settings,why", [
    ({}, "an asset that was never analysed"),
    ({"analysis_json": None}, "an engine that cannot take the flag"),
    ({"analysis_json": "/nope/gone.json"}, "a document that no longer exists"),
])
def test_the_render_argv_omits_it_when_there_is_nothing_to_hand_over(settings, why):
    argv = render.build_render_argv("in.gif", "out.gif", settings)
    assert "--analysis-json" not in argv, why
    assert "--auto" in argv, "the tri-state contract survives every one of these"


def test_an_engine_without_the_flag_is_detected_not_assumed(monkeypatch):
    """⚠️ Devoid runs against whatever `skill_path()` resolves to. An engine that
    predates this flag would fail EVERY render with an argparse error if the flag
    went out blind, so the capability is asked of the engine's own parser."""
    class Old:
        pass

    monkeypatch.setattr(engine, "load_skill", lambda: Old())
    assert engine.supports_analysis_handoff() is False
    assert engine.write_analysis_handoff("/tmp/x.json", "in.gif", 15, {"a": 1}) is False


def test_a_writer_without_the_flag_is_still_refused(monkeypatch):
    """⚠️ The case the first draft missed entirely. ``Old`` above has no writer, so
    it short-circuits before the parser is ever consulted -- which left the parser
    check untested and a `return True` in its place passed the whole suite. THIS is
    an engine that could write the document and whose CLI would still reject the
    flag, which is the combination that would break every render."""
    import argparse

    class HalfThere:
        write_analysis_json = staticmethod(lambda *a, **k: None)

        @staticmethod
        def build_parser():
            p = argparse.ArgumentParser()
            p.add_argument("--tolerance", type=int, default=15)
            return p

    monkeypatch.setattr(engine, "load_skill", lambda: HalfThere())
    assert engine.supports_analysis_handoff() is False


def test_a_parserless_engine_is_refused(monkeypatch):
    class NoParser:
        write_analysis_json = staticmethod(lambda *a, **k: None)

    monkeypatch.setattr(engine, "load_skill", lambda: NoParser())
    assert engine.supports_analysis_handoff() is False


def test_analyze_route_records_the_handoff_on_the_asset(fast_asset, isolated_logs):
    """The wiring end to end, in the registry rather than over HTTP."""
    from starlette.requests import Request

    asset = registry.register(os.fspath(fast_asset))
    scope = {"type": "http", "path_params": {"id": asset.id}, "headers": []}
    server_app.analyze_asset(Request(scope))
    assert asset.analysis_json, "the route analysed but handed nothing on"
    assert Path(asset.analysis_json).is_file()
    d = json.loads(Path(asset.analysis_json).read_text())
    assert d["input"]["path"] == os.path.abspath(fast_asset)
    # ⚠️ The tolerance recorded must be the ENGINE's own default. Asserting it
    # equals ``_engine_tolerance()`` would compare that function with itself --
    # the first draft did exactly that and a hardcoded 999 passed. So the
    # expected value comes from the engine's parser, independently.
    engine_default = next(
        a.default for a in engine.load_skill().build_parser()._actions  # noqa: SLF001
        if "--tolerance" in a.option_strings)
    assert d["tolerance"] == engine_default
    assert server_app._engine_tolerance() == engine_default
