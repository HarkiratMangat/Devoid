"""Resolve the engine, import it once, and never let a call into it block the loop.

PLAN.md 0.2 ("find the engine, or fail loudly") and 1.2 ("in-process analysis").

Resolution order, and the resolved path is LOGGED with which rule produced it --
a silent fallback lets the app and the live skill disagree invisibly:

  1. ``$DEVOID_SKILL``                      -- source ``env``
  2. ``devoid.config.json`` at the repo root, key ``skill_path``  -- source ``config``
  3. the documented sibling checkout below  -- source ``fallback``

⚠️ EVERY call into the skill goes through ``run_in_threadpool`` (or a plain ``def``
route, which Starlette threadpools for you). Measured in PLAN.md 0.1: a static
request took 0.0016 s idle and 2.1128 s during an ``analyze()`` issued from an
``async def`` -- a 1,290x event-loop stall. The async wrappers here are the only
sanctioned way in.

⚠️ Import cost is 0.20 s warm, 3.82 s cold (PLAN.md 1.2). It is paid lazily, on
the first call, so importing this module is free and the server still binds fast.
"""
from __future__ import annotations

import hashlib
import importlib.util
import io
import json
import logging
import os
import pathlib
import shutil
import sys
import threading
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

from starlette.concurrency import run_in_threadpool

log = logging.getLogger("devoid.engine")

REPO_ROOT = Path(__file__).resolve().parent.parent

#: The documented last resort. Named here, once, so there is exactly one literal.
FALLBACK_SKILL = Path(
    "/Applications/Claude Code/Gif-Background-Remover/scripts/remove_gif_background.py"
)

#: External binaries the skill shells out to. AVIF is deliberately NOT in here --
#: it is a Pillow CAPABILITY, not a binary and not a package (PLAN.md 0.3).
REQUIRED_BINARIES = ("gifsicle", "pngquant", "webpmux")


class EngineUnavailable(RuntimeError):
    """The skill script could not be resolved or imported. A first-class state."""


def resolve_skill() -> tuple[Path, str]:
    """Return ``(path, source)`` where source is ``env`` | ``config`` | ``fallback``.

    Raises :class:`EngineUnavailable` if the winning candidate does not exist --
    an env var pointing at nothing is a configuration error, not a reason to
    quietly fall through to a different engine version.
    """
    env = os.environ.get("DEVOID_SKILL")
    if env:
        p = Path(env).expanduser()
        if not p.is_file():
            raise EngineUnavailable(f"$DEVOID_SKILL points at {p}, which is not a file")
        return p, "env"

    cfg = REPO_ROOT / "devoid.config.json"
    if cfg.is_file():
        try:
            raw = json.loads(cfg.read_text())
        except (OSError, ValueError) as exc:
            raise EngineUnavailable(f"{cfg} is not readable JSON: {exc}") from exc
        if raw.get("skill_path"):
            p = Path(raw["skill_path"]).expanduser()
            if not p.is_file():
                raise EngineUnavailable(
                    f"{cfg}'s skill_path points at {p}, which is not a file"
                )
            return p, "config"

    if FALLBACK_SKILL.is_file():
        return FALLBACK_SKILL, "fallback"
    raise EngineUnavailable(
        "no engine: $DEVOID_SKILL unset, no devoid.config.json skill_path, and the "
        f"documented fallback {FALLBACK_SKILL} does not exist"
    )


_lock = threading.Lock()
_module = None
_resolved: tuple[Path, str] | None = None


def skill_path() -> Path:
    return resolved()[0]


def resolved() -> tuple[Path, str]:
    global _resolved
    if _resolved is None:
        _resolved = resolve_skill()
        log.warning(
            "devoid: engine resolved to %s (via %s)", _resolved[0], _resolved[1]
        )
    return _resolved


def load_skill():
    """Import the skill script as a module, once per process.

    ⚠️ Imported under a private module name so it cannot collide with anything on
    ``sys.path``, and with stdout/stderr captured, because import-time chatter
    from the engine must never reach the server's own streams (1.2's "silence").
    """
    global _module
    if _module is not None:
        return _module
    with _lock:
        if _module is not None:
            return _module
        path, source = resolved()
        spec = importlib.util.spec_from_file_location("devoid_skill_engine", path)
        if spec is None or spec.loader is None:
            raise EngineUnavailable(f"cannot build an import spec for {path}")
        mod = importlib.util.module_from_spec(spec)
        sys.modules["devoid_skill_engine"] = mod
        out, err = io.StringIO(), io.StringIO()
        try:
            with redirect_stdout(out), redirect_stderr(err):
                spec.loader.exec_module(mod)
        except BaseException as exc:  # SystemExit included -- a bare sys.exit at
            sys.modules.pop("devoid_skill_engine", None)  # import time is a defect
            raise EngineUnavailable(f"importing {path} failed: {exc!r}") from exc
        if out.getvalue() or err.getvalue():
            log.warning(
                "devoid: engine printed at import time (captured, not leaked): %r / %r",
                out.getvalue()[:500],
                err.getvalue()[:500],
            )
        for name in ("analyze", "recommend"):
            if not callable(getattr(mod, name, None)):
                raise EngineUnavailable(f"{path} has no callable {name}()")
        log.warning("devoid: engine imported from %s (via %s)", path, source)
        _module = mod
        return _module


def engine_version() -> str:
    """A stable identity for the resolved script, recorded alongside every result.

    PLAN.md's edge-case table: two installs whose ``--recommend`` differ
    semantically both pass a *shape* check, so the shape check is not enough.
    """
    path = skill_path()
    h = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    return f"sha256:{h}"


def _call_quietly(fn, *args, **kwargs):
    """Run an engine call with its streams captured. Returns the value.

    The engine writes progress notes to stderr (``erosion calibrated ...``). In a
    CLI that is the point; in a server it is leakage into the parent's log.
    """
    out, err = io.StringIO(), io.StringIO()
    with redirect_stdout(out), redirect_stderr(err):
        value = fn(*args, **kwargs)
    noise = (out.getvalue(), err.getvalue())
    if any(noise):
        log.debug("devoid: engine noise captured: %r", noise)
    return value


def supports_analysis_handoff() -> bool:
    """Does the resolved engine accept ``--analysis-json``?

    ⚠️ A CAPABILITY, never a version string -- the same rule as
    :func:`avif_available`. Devoid runs against whatever engine
    ``skill_path()`` resolves to, and one that predates this flag would fail
    EVERY render with an argparse error if we passed it blind. So the question
    is asked of the engine's own parser, which is the thing that will refuse it.
    """
    mod = load_skill()
    if not callable(getattr(mod, "write_analysis_json", None)):
        return False
    factory = getattr(mod, "build_parser", None)
    if not callable(factory):
        return False
    return any("--analysis-json" in a.option_strings for a in factory()._actions)  # noqa: SLF001


def write_analysis_handoff(path, input_path, tolerance, report) -> bool:
    """Persist an analysis for the render subprocess to reuse. True if written.

    ⚠️ **THE ENGINE OWNS THE FORMAT AND DEVOID NEVER RE-IMPLEMENTS IT.** The
    document carries an identity check -- script SHA, the input's mtime and
    size, the tolerance -- and a Devoid-side copy of that shape would be one
    engine edit away from writing a document the engine silently refuses. This
    calls the engine's own writer with the report we already hold.
    """
    if not supports_analysis_handoff():
        return False
    if not isinstance(report, dict):
        return False
    try:
        pathlib.Path(path).parent.mkdir(parents=True, exist_ok=True)
        _call_quietly(load_skill().write_analysis_json,
                      os.fspath(path), os.fspath(input_path), tolerance, report)
    except Exception:  # noqa: BLE001 -- a handoff is an optimisation; it may never fail a run
        log.warning("devoid: could not write the analysis handoff", exc_info=True)
        return False
    return True


def analyze(input_path: str | os.PathLike, **kwargs):
    """Blocking. Call from a plain ``def`` route or through :func:`analyze_async`."""
    return _call_quietly(load_skill().analyze, os.fspath(input_path), **kwargs)


def recommend(input_path: str | os.PathLike, **kwargs):
    """Blocking. Call from a plain ``def`` route or through :func:`recommend_async`."""
    return _call_quietly(load_skill().recommend, os.fspath(input_path), **kwargs)


async def analyze_async(input_path, **kwargs):
    return await run_in_threadpool(analyze, input_path, **kwargs)


async def recommend_async(input_path, **kwargs):
    return await run_in_threadpool(recommend, input_path, **kwargs)


def avif_available() -> bool:
    """⚠️ A CAPABILITY, never a package (PLAN.md 0.3).

    ``import pillow_avif`` fails on this machine while AVIF works perfectly, and
    ``'AVIF' in Image.SAVE`` is False until ``Image.init()`` has run. Mirrors the
    skill's own ``_avif_available()`` rather than inventing a check.
    """
    try:
        from PIL import features

        return bool(features.check("avif"))
    except Exception:  # noqa: BLE001 -- an unimportable Pillow means "no", loudly below
        log.warning("devoid: AVIF capability probe failed", exc_info=True)
        return False


def status() -> dict:
    """The payload behind ``GET /api/engine/status`` (API-CONTRACT.md "Engine").

    ``skill_path`` isn't in the frozen contract, but main.js logs it on launch
    for the "two engine versions" edge case (PLAN.md) -- without it that log
    line always read "unreported", which defeated the diagnostic it exists for.
    """
    missing: list[str] = []
    available = True
    path = None
    try:
        path = str(skill_path())
        load_skill()
        version = engine_version()
    except EngineUnavailable as exc:
        available = False
        version = "unavailable"
        missing.append(f"engine: {exc}")

    for mod in ("PIL", "numpy", "scipy"):
        if importlib.util.find_spec(mod) is None:
            missing.append(mod)
            available = False

    bins = {name: shutil.which(name) is not None for name in REQUIRED_BINARIES}
    missing.extend(name for name, ok in bins.items() if not ok)

    avif = avif_available()
    if not avif:
        # ⚠️ Not a warning. AVIF absent means the Discord-emoji path is DEAD, and
        # PLAN.md 0.3 makes that a first-class failure state.
        missing.append("avif")

    return {
        "available": available,
        "missing": missing,
        "avif": avif,
        "gifsicle": bins["gifsicle"],
        "pngquant": bins["pngquant"],
        "webpmux": bins["webpmux"],
        "engine_version": version,
        "skill_path": path,
    }
