"""How many jobs this machine can actually run — PLAN.md 1.5.

Reuses the harness's own ``machine.default_jobs()``: performance cores bounded by
free memory, computed at call time. One ``analyze()`` peaks near 488 MB RSS, so
naive eight-way parallelism on a 16 GB machine is slower, not faster.

⚠️ ``scripts/harness/`` is tracked but NOT packaged (PLAN.md 0.2), so the synced
claude.ai bundle has no ``machine.py`` at all. The fallback below is a VENDORED
copy of the three functions, not ``os.cpu_count()`` — that constant is wrong in
both directions on this machine at once (8 logical vs 6 performance cores, and no
memory term whatsoever). :data:`SOURCE` says which path was used, and the choice
is logged loudly either way.
"""
from __future__ import annotations

import importlib.util
import logging
import os
import subprocess
import sys
from pathlib import Path

from . import engine

log = logging.getLogger("devoid.concurrency")

#: Peak RSS of one analyze() on the corpus's largest asset (177 frames at
#: 640x640), measured 2026-08-20 with /usr/bin/time -l, quoted from the harness.
PER_WORKER_MB = 500
#: Never hand back fewer. One worker is always runnable.
MIN_JOBS = 2

#: ``harness`` when machine.py imported, ``vendored`` when the copy below ran.
SOURCE = "unresolved"

_machine = None


def _harness_dir() -> Path | None:
    """``scripts/harness`` beside the resolved skill script, if it exists."""
    try:
        return engine.skill_path().parent / "harness"
    except engine.EngineUnavailable:
        return None


def _load_harness_machine():
    d = _harness_dir()
    if d is None:
        return None
    path = d / "machine.py"
    if not path.is_file():
        return None
    try:
        spec = importlib.util.spec_from_file_location("devoid_harness_machine", path)
        if spec is None or spec.loader is None:
            return None
        mod = importlib.util.module_from_spec(spec)
        sys.modules["devoid_harness_machine"] = mod
        spec.loader.exec_module(mod)
    except Exception:  # noqa: BLE001 -- any import failure means "use the copy", loudly
        log.warning("devoid: harness machine.py at %s failed to import", path, exc_info=True)
        sys.modules.pop("devoid_harness_machine", None)
        return None
    for name in ("performance_cores", "available_mb", "default_jobs"):
        if not callable(getattr(mod, name, None)):
            log.warning("devoid: harness machine.py has no %s(); using the vendored copy", name)
            return None
    return mod


# --------------------------------------------------------------------------
# The vendored fallback. A verbatim-behaviour copy of the harness's three
# functions, kept short deliberately: it exists so an absent harness costs
# accuracy in nothing, and it must never silently become os.cpu_count().
# --------------------------------------------------------------------------


def _sysctl_int(name: str):
    try:
        return int(
            subprocess.run(
                ["sysctl", "-n", name], capture_output=True, text=True, timeout=5
            ).stdout.strip()
        )
    except Exception:  # noqa: BLE001
        return None


def _vendored_performance_cores() -> int:
    """P-cores on Apple Silicon; the logical count everywhere else."""
    return _sysctl_int("hw.perflevel0.logicalcpu") or os.cpu_count() or 1


def _vendored_available_mb():
    """free + inactive + speculative pages, in MB. ``None`` where vm_stat is absent."""
    try:
        out = subprocess.run(["vm_stat"], capture_output=True, text=True, timeout=5).stdout
    except Exception:  # noqa: BLE001
        return None
    page = 4096
    counts: dict[str, int] = {}
    for line in out.splitlines():
        if "page size of" in line:
            try:
                page = int(line.split("page size of")[1].split("bytes")[0].strip())
            except Exception:  # noqa: BLE001
                pass
        if ":" in line:
            k, _, v = line.partition(":")
            v = v.strip().rstrip(".")
            if v.isdigit():
                counts[k.strip()] = int(v)
    pages = sum(counts.get(k, 0) for k in ("Pages free", "Pages inactive", "Pages speculative"))
    return (pages * page) / (1024 * 1024) if pages else None


def _vendored_default_jobs(per_worker_mb: int = PER_WORKER_MB, explain: bool = False):
    cores = _vendored_performance_cores()
    mem = _vendored_available_mb()
    if mem is None:
        jobs, why = cores, f"{cores} performance cores (memory probe unavailable)"
    else:
        by_mem = int(mem // per_worker_mb)
        if by_mem < cores:
            jobs = max(MIN_JOBS, by_mem)
            why = (
                f"{jobs} = {mem:.0f} MB available / {per_worker_mb} MB per worker "
                f"(memory-bound; {cores} performance cores idle)"
            )
            if by_mem < MIN_JOBS:
                why += f" -- floored at MIN_JOBS={MIN_JOBS}, expect swapping"
        else:
            jobs, why = cores, f"{cores} performance cores (memory allows {by_mem})"
    return (jobs, why) if explain else jobs


def _machine_module():
    global _machine, SOURCE
    if _machine is not None:
        return _machine
    mod = _load_harness_machine()
    if mod is not None:
        SOURCE = "harness"
        log.warning(
            "devoid: concurrency from the harness's own machine.py (%s)",
            _harness_dir() / "machine.py",
        )
        _machine = mod
    else:
        SOURCE = "vendored"
        log.warning(
            "devoid: harness machine.py NOT found or unusable (looked in %s) -- using "
            "Devoid's VENDORED copy of performance_cores/available_mb/default_jobs. "
            "This is a deliberate fallback, never os.cpu_count().",
            _harness_dir(),
        )
        _machine = sys.modules[__name__]
    return _machine


def performance_cores() -> int:
    m = _machine_module()
    return m.performance_cores() if SOURCE == "harness" else _vendored_performance_cores()


def available_mb():
    m = _machine_module()
    return m.available_mb() if SOURCE == "harness" else _vendored_available_mb()


def default_jobs(per_worker_mb: int = PER_WORKER_MB, explain: bool = False):
    """Worker count for this machine, right now. ``explain=True`` also returns why."""
    m = _machine_module()
    if SOURCE == "harness":
        return m.default_jobs(per_worker_mb=per_worker_mb, explain=explain)
    return _vendored_default_jobs(per_worker_mb=per_worker_mb, explain=explain)


def describe() -> dict:
    jobs, why = default_jobs(explain=True)
    return {
        "jobs": jobs,
        "why": why,
        "source": SOURCE,
        "performance_cores": performance_cores(),
        "logical_cores": os.cpu_count(),
        "available_mb": available_mb(),
    }
