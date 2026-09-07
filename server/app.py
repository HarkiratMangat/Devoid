"""Devoid's local server — static ``web/`` plus API-CONTRACT.md's ``/api/*`` routes.

Port 8732 (8731 is the prototype's static port and reusing it collides).

⚠️ **Every route that calls into the engine is a plain ``def``**, which Starlette
runs in a threadpool, or awaits ``run_in_threadpool`` explicitly. Never an
``async def`` doing the call directly: measured in PLAN.md 0.1, a static request
took 0.0016 s idle and 2.1128 s during an ``analyze()`` issued from an async
route — a 1,290x event-loop stall.

Re-measured 2026-09-04 against THIS server, live on 8732: eight ``GET /app.css``
requests issued while a 3.14 s ``POST /api/assets/{id}/analyze`` was in flight
returned in 1.6–7.7 ms (max 7.7 ms), against PLAN.md 0.1's 50 ms falsifier.
Reproduce by booting ``uvicorn server.app:app --port 8732``, POSTing an analyze
for ``web/assets/rocket.src.gif`` in the background, and timing ``curl`` on a
static path while it runs.
"""
from __future__ import annotations

import contextlib
import logging
import time
from pathlib import Path

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import FileResponse, JSONResponse
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

from . import assets as registry
from . import cli, concurrency, engine, flags, jobs as jobs_log, journal, labels, preview, render, validate

log = logging.getLogger("devoid.app")

WEB_DIR = Path(__file__).resolve().parent.parent / "web"


def _error(message: str, status: int = 400, **extra) -> JSONResponse:
    return JSONResponse({"error": message, **extra}, status_code=status)


# --------------------------------------------------------------------------
# Engine
# --------------------------------------------------------------------------


def engine_status(request: Request) -> JSONResponse:  # plain def -> threadpooled
    return JSONResponse(engine.status())


def api_flags(request: Request) -> JSONResponse:
    try:
        return JSONResponse(flags.flags())
    except (flags.ParserFactoryMissing, engine.EngineUnavailable) as exc:
        return _error(str(exc), 503)


def api_concurrency(request: Request) -> JSONResponse:
    """Not in the frozen contract; PLAN.md 1.5's number, surfaced so a run's log
    can say WHY it chose a worker count instead of leaving the reader to guess."""
    return JSONResponse(concurrency.describe())


# --------------------------------------------------------------------------
# Assets
# --------------------------------------------------------------------------


async def create_assets(request: Request) -> JSONResponse:
    body = await request.json()
    paths = body.get("paths")
    if not isinstance(paths, list) or not all(isinstance(p, str) for p in paths):
        return _error("paths must be a list of absolute paths")
    return JSONResponse([registry.register(p).public() for p in paths])


def list_assets(request: Request) -> JSONResponse:
    return JSONResponse([a.public() for a in registry.all_assets()])


def asset_source(request: Request):
    """The registered input file's own bytes — API-CONTRACT.md "Assets".

    ⚠️ **Why this exists.** ``web/app.js`` built every image URL as
    ``assets/<basename>``, so anything outside ``web/assets/`` 404'd and the app
    showed a blank frame — on the sheet AND in the open view, where there is no
    error handler at all. The corpus was the only input this app had a visible
    interface for, and the first real use, on a file from ``~/Downloads``
    (``docs/DEVLOG.md``), rendered nothing. A comment in ``app.js`` argued a
    thumbnail route would be a contract change; this IS that change, made
    deliberately rather than worked around.

    ⚠️ **The registry is the only door in.** This takes an asset id, never a
    path, so it cannot be steered at an arbitrary file on disk — the same
    reasoning as ``preview_file`` below, but enforced by construction instead of
    by a string check. ``tests/test_source_route.py`` is the falsifier.

    The path is re-checked here rather than trusted from ``register()``: a file
    that existed at registration can be moved before the browser asks for it,
    and ``input_missing`` is what the rest of the app already calls that.
    """
    asset = registry.get(request.path_params["id"])
    if asset is None:
        return _error("unknown asset", 404)
    path = Path(asset.path)
    if not path.is_file():
        return _error("input_missing", 404, path=asset.path)
    return FileResponse(path)


def analyze_asset(request: Request) -> JSONResponse:
    asset = registry.get(request.path_params["id"])
    if asset is None:
        return _error("unknown asset", 404)
    if asset.state == "blocked":
        return _error("input_missing", 404, path=asset.path)

    started = time.monotonic()
    try:
        raw = engine.recommend(asset.path)
    except engine.EngineUnavailable as exc:
        asset.state, asset.error = "failed", str(exc)
        return _error(str(exc), 503)
    except Exception as exc:  # noqa: BLE001 -- an engine crash is one asset's failure
        log.warning("devoid: recommend() failed on %s", asset.path, exc_info=True)
        asset.state, asset.error = "failed", f"{type(exc).__name__}: {exc}"
        return _error(asset.error, 500)

    try:
        result = validate.parse_recommend(raw)
    except validate.RecommendShapeError as exc:
        asset.state, asset.error = "failed", str(exc)
        return _error(str(exc), 502)

    asset.result = result
    asset.state = result.state
    asset.engine_version = engine.engine_version()
    asset.frames = (result.analysis or {}).get("n_frames_total")
    asset.took_ms = int((time.monotonic() - started) * 1000)
    return JSONResponse(
        {
            "state": asset.state,
            "questions": result.questions(),
            "engine_version": asset.engine_version,
            "took_ms": asset.took_ms,
        }
    )


# --------------------------------------------------------------------------
# Answers  (⚠️ route shape is final; Stage 5 hardens the label write)
# --------------------------------------------------------------------------


async def submit_answers(request: Request) -> JSONResponse:
    asset = registry.get(request.path_params["id"])
    if asset is None:
        return _error("unknown asset", 404)
    if asset.result is None:
        return _error("analyze the asset before answering", 409)

    body = await request.json()
    protection = body.get("ambiguous_protection") or {}
    if not isinstance(protection, dict):
        return _error("ambiguous_protection must be an object keyed by region_id")
    known = {a.region_id: a for a in asset.result.ambiguous_protection}
    verdicts: dict[int, str] = {}
    for key, verdict in protection.items():
        try:
            region_id = int(key)
        except (TypeError, ValueError):
            return _error(f"region id {key!r} is not an integer")
        if region_id not in known:
            return _error(f"region {region_id} is not one this asset asked about", 404)
        if verdict not in ("protect", "remove"):
            return _error(f"verdict for region {region_id} must be protect|remove")
        verdicts[region_id] = verdict

    fade = body.get("fade")
    if fade not in (None, "artwork", "not-artwork"):
        return _error("fade must be artwork|not-artwork|null")

    previous = dict(asset.region_answers)
    asset.region_answers.update(verdicts)
    try:
        colours = asset.colour_verdicts()
    except registry.ConflictingColour as exc:
        asset.region_answers = previous  # ⚠️ reject wholesale; never half-apply
        return _error("conflicting_colour", 400, outline_color=exc.outline_color)

    asset.fade_answer = fade
    written = []
    for region_id, verdict in verdicts.items():
        region = known[region_id]
        written.append(
            labels.record_verdict(
                asset_id=asset.id,
                outline_color=region.outline_color,
                enclosure_ratio=region.enclosure_ratio,
                frames_enclosed=region.frames_enclosed,
                frames_checked=region.frames_checked,
                bbox_xyxy=region.bbox_xyxy,
                verdict=verdict,
            )
        )

    answered_all = set(known) <= set(asset.region_answers)
    fade_answered = asset.result.nameable_fade is None or fade is not None
    if answered_all and fade_answered:
        asset.state = "ready"
    return JSONResponse(
        {
            "state": asset.state,
            "colour_verdicts": colours,
            "labels_written": len(written),
            "answers": {
                "ambiguous_protection": dict(asset.region_answers),
                "fade": asset.fade_answer,
            },
        }
    )


# --------------------------------------------------------------------------
# Preview
# --------------------------------------------------------------------------


async def preview_pair(request: Request) -> JSONResponse:
    asset = registry.get(request.path_params["id"])
    if asset is None:
        return _error("unknown asset", 404)
    body = await request.json()
    flag = body.get("flag")
    if not isinstance(flag, str) or not flag:
        return _error("flag is required")
    if "value_a" not in body or "value_b" not in body:
        return _error("value_a and value_b are required")

    from starlette.concurrency import run_in_threadpool

    try:
        payload = await run_in_threadpool(
            preview.render_pair,
            asset_id=asset.id,
            source=asset.path,
            flag=flag,
            value_a=body["value_a"],
            value_b=body["value_b"],
            regions=body.get("regions"),
            analysis=(asset.result.analysis if asset.result else None),
            target_format=(body.get("format") or asset.ext),
        )
    except cli.UnknownFlag as exc:
        return _error(str(exc), 400)
    except Exception as exc:  # noqa: BLE001
        log.warning("devoid: preview failed for %s", asset.path, exc_info=True)
        return _error(f"{type(exc).__name__}: {exc}", 500)
    return JSONResponse(payload)


def preview_file(request: Request):
    key = request.path_params["key"]
    name = request.path_params["name"]
    if "/" in key or "/" in name or ".." in key or ".." in name:
        return _error("bad preview path", 400)
    path = preview.cache_dir() / key / name
    if not path.is_file():
        return _error("no such preview", 404)
    return FileResponse(path)


# --------------------------------------------------------------------------
# Render and jobs
# --------------------------------------------------------------------------


async def start_render(request: Request) -> JSONResponse:
    asset = registry.get(request.path_params["id"])
    if asset is None:
        return _error("unknown asset", 404)
    if asset.state == "blocked":
        return _error("input_missing", 404, path=asset.path)
    body = await request.json()
    try:
        answers = asset.colour_verdicts()
    except registry.ConflictingColour as exc:
        return _error("conflicting_colour", 400, outline_color=exc.outline_color)
    settings = {
        "overrides": body.get("overrides") or {},
        "regions": body.get("regions") or [],
        "goal": body.get("goal") or {},
        "answers": answers,
    }
    job = render.start(asset.id, asset.path, settings)
    return JSONResponse({"job_id": job.id}, status_code=202)


def job_status(request: Request) -> JSONResponse:
    job = render.get(request.path_params["id"])
    if job is None:
        return _error("unknown job", 404)
    return JSONResponse(job.public())


def cancel_job(request: Request) -> JSONResponse:
    job = render.cancel(request.path_params["id"])
    if job is None:
        return _error("unknown job", 404)
    return JSONResponse(job.public())


# --------------------------------------------------------------------------
# History  (⚠️ Stage 5 owns this; the reader is here so the writer has a proof)
# --------------------------------------------------------------------------


def history(request: Request) -> JSONResponse:
    try:
        limit = int(request.query_params.get("limit", 50))
    except ValueError:
        return _error("limit must be an integer")
    return JSONResponse(render.read_history(max(1, min(limit, 1000))))


async def rerun_history_line(request: Request) -> JSONResponse:
    """``POST /api/history/{line_id}/rerun`` -- API-CONTRACT.md "History".

    Loads that jobs.jsonl line's settings back onto a freshly-registered asset
    for the same input path. 404s with ``input_missing`` when the source no
    longer exists, rather than failing later inside the engine.
    """
    line_id = request.path_params["line_id"]
    row = jobs_log.rerun_row(line_id)
    if row is None:
        return _error("no such history line", 404)
    input_path = row.get("input_path")
    if not input_path or not Path(input_path).is_file():
        return _error("input_missing", 404, path=input_path)
    asset = registry.register(input_path)
    # ⚠️ ADDITIVE, 2026-09-07 10:30 EDT. `engine_version` was RECORDED on every
    # row and never COMPARED, so two installs whose `--recommend` differ
    # semantically both passed — the validation boundary checks JSON shape, not
    # engine behaviour. A rerun is where that costs something: it replays a
    # run's settings against whatever engine is resolved now, which
    # `docs/PLAN.md` 0.2 notes may be the synced claude.ai bundle rather than
    # the checkout. The route reports both and says nothing about what to do;
    # the decision is the person's, and the UI puts it in front of them.
    then = row.get("engine_version")
    now = engine.engine_version()
    return JSONResponse({
        "asset": asset.public(),
        "settings": row.get("settings") or {},
        "engine_version": then,
        "engine_version_now": now,
        "engine_changed": bool(then) and then != now,
    })


routes = [
    Route("/api/engine/status", engine_status),
    Route("/api/engine/concurrency", api_concurrency),
    Route("/api/flags", api_flags),
    Route("/api/assets", create_assets, methods=["POST"]),
    Route("/api/assets", list_assets, methods=["GET"]),
    Route("/api/assets/{id}/source", asset_source),
    Route("/api/assets/{id}/analyze", analyze_asset, methods=["POST"]),
    Route("/api/assets/{id}/answers", submit_answers, methods=["POST"]),
    Route("/api/assets/{id}/preview", preview_pair, methods=["POST"]),
    Route("/api/assets/{id}/render", start_render, methods=["POST"]),
    Route("/api/preview-files/{key}/{name}", preview_file),
    Route("/api/jobs/{id}", job_status, methods=["GET"]),
    Route("/api/jobs/{id}", cancel_job, methods=["DELETE"]),
    Route("/api/history", history),
    Route("/api/history/{line_id}/rerun", rerun_history_line, methods=["POST"]),
    # ⚠️ The catch-all static mount stays LAST -- it matches everything.
    Mount("/", app=StaticFiles(directory=WEB_DIR, html=True), name="web"),
]

@contextlib.asynccontextmanager
async def _lifespan(app: Starlette):
    orphans = journal.recover_orphans()
    if orphans:
        log.warning("devoid: %d in-flight job(s) from a previous run were not "
                    "settled -- not auto-resumed, surfaced here so they are not "
                    "silently forgotten: %s", len(orphans), orphans)
    yield


app = Starlette(routes=routes, lifespan=_lifespan)
