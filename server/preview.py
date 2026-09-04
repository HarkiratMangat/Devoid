"""The wipe's answer-pair renderer — API-CONTRACT.md "Preview", PLAN.md 3.0b/3.1/3.2.

⚠️ **The pair is answer-A against answer-B, never source against output.** A
before/after cannot discriminate, because both candidate answers look identical on
the source side. The prototype's seam compares the wrong pair and looks finished
(PLAN.md 3.3).

Technique, reusing exactly what ``scripts/measure_preview_fidelity.py`` already
proved: extract ONE frame from the source, save it as a single-frame temp GIF, then
invoke the skill CLI as a **subprocess** twice against that 1-frame file — once per
answer. Measured there: a 1-frame preview is *visually* identical to the 8-bit-alpha
full render (11 px of 409,600, max delta 3) and NOT literally identical; a GIF target
flips 8 whole pixels via the shared palette and Bayer dither (max delta 255), which
is what ``format_is_gif`` exists to say on the preview.

⚠️ **The preview inherits the calibration** (PLAN.md 3.2). The frame is the one
``analyze()``'s own sample nomination picked, so a single-frame render does not
re-derive erosion from itself. Measured: the curves differ and landed on the same
level *by luck*, not by guarantee.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

from . import cli, engine

log = logging.getLogger("devoid.preview")

#: Where the temp pairs live for the life of the process. Served by the app's
#: ``/api/preview-files`` mount; torn down by :func:`clear_cache`.
_CACHE_DIR = Path(tempfile.mkdtemp(prefix="devoid-preview-"))
_cache: dict[str, dict] = {}
_lock = threading.Lock()

#: PLAN.md 3.0b: below this, two renders look identical and the seam CANNOT help,
#: so the question card is the honest fallback. Expressed as differing alpha px as
#: a fraction of the disputed region's own area, measured on the preview pair.
#: ⚠️ **SUPERSEDED, left in place deliberately.** web/wipe.js does not read this
#: field at all -- it computes its own gate client-side (a conspicuity score:
#: differing-px-fraction times mean |Δalpha|/255, threshold 0.003, derived by
#: actually measuring the three real ambiguous-protection regions in this
#: corpus, plus a 0.02 region-fraction floor for the sub-half-opacity-fade case
#: this cruder single-number version cannot separate from a real answer -- see
#: wipe.js's own header for the full derivation). `seam_useful` stays exposed
#: as a second opinion for a future consumer that has no decoded frames to
#: measure from itself (a server-side batch view, say), not because it is the
#: one this app's UI actually trusts.
SEAM_THRESHOLD = 0.02


def cache_dir() -> Path:
    return _CACHE_DIR


def clear_cache() -> None:
    with _lock:
        _cache.clear()
    shutil.rmtree(_CACHE_DIR, ignore_errors=True)
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)


def sample_frame_index(analysis: dict | None, n_frames: int) -> int:
    """The frame the preview uses — ``analyze()``'s own nomination where it made one.

    ⚠️ Inheriting the nomination is the point: the calibration was measured on the
    whole asset, and re-deriving it from an arbitrary frame is PLAN.md 3.2's
    named failure. When the engine nominated nothing (an empty
    ``nominated_frames`` is common — the megaphone's is empty), the middle frame is
    used, which is what both measurement scripts already use.
    """
    nominated = (analysis or {}).get("nominated_frames") or []
    for entry in nominated:
        if isinstance(entry, dict) and isinstance(entry.get("frame"), int):
            return max(0, min(entry["frame"], n_frames - 1))
        if isinstance(entry, int):
            return max(0, min(entry, n_frames - 1))
    return max(0, n_frames // 2)


def _extract_one_frame(source: Path, index: int, dest: Path) -> int:
    """Write frame ``index`` of ``source`` as a single-frame GIF. Returns the index used."""
    from PIL import Image, ImageSequence

    with Image.open(source) as im:
        n = getattr(im, "n_frames", 1)
        index = max(0, min(index, n - 1))
        for i, frame in enumerate(ImageSequence.Iterator(im)):
            if i == index:
                frame.convert("RGB").save(dest, save_all=True, append_images=[], loop=0)
                return index
    raise ValueError(f"{source} has no frame {index}")


def frame_count(source: Path) -> int:
    from PIL import Image

    with Image.open(source) as im:
        return getattr(im, "n_frames", 1)


def _alpha(path: Path):
    import numpy as np
    from PIL import Image

    with Image.open(path) as im:
        return np.array(im.convert("RGBA"))[..., 3].astype("int16")


def _ledger(path: Path) -> dict:
    """``{bg, art, total}`` for one preview frame.

    ⚠️ ``art`` is ``None`` here on purpose. ``measure_ledger.py`` derives ``art``
    from the SOURCE's non-background pixels, and the preview's source is a
    re-encoded single frame — quoting a number measured against a different image
    would be exactly the "verification the run did not earn" ``PRODUCT.md``
    forbids. The seam compares ``bg``/``total`` between the two answers, which is
    what the question is actually about.
    """
    a = _alpha(path)
    opaque = a > 200
    return {"bg": int((~opaque).sum()), "art": None, "total": int(opaque.sum())}


def _key(asset_id: str, flag: str, value_a, value_b, regions) -> str:
    blob = json.dumps(
        [asset_id, flag, value_a, value_b, regions or []], sort_keys=True, default=str
    )
    return hashlib.sha256(blob.encode()).hexdigest()[:16]


def _answer_argv(flag: str, value) -> list[str]:
    """Flags for one side of the pair.

    ``assume_protect``/``assume_remove`` are the interview's own answers and take a
    colour; every other flag is an ordinary engine option routed through the same
    tri-state builder the render uses, so a preview can never diverge from what the
    render would do.
    """
    if flag in ("assume_protect", "assume_remove"):
        return ["--" + flag.replace("_", "-"), str(value)]
    return cli.build_argv({flag: value}, auto=True)


def render_pair(
    *,
    asset_id: str,
    source: str | os.PathLike,
    flag: str,
    value_a,
    value_b,
    regions: list | None = None,
    analysis: dict | None = None,
    target_format: str | None = None,
) -> dict:
    """Render both answers on one frame and return API-CONTRACT.md's preview payload."""
    key = _key(asset_id, flag, value_a, value_b, regions)
    with _lock:
        hit = _cache.get(key)
    if hit is not None:
        return hit

    src = Path(source)
    n = frame_count(src)
    index = sample_frame_index(analysis, n)

    work = _CACHE_DIR / key
    work.mkdir(parents=True, exist_ok=True)
    one = work / "frame.gif"
    used = _extract_one_frame(src, index, one)

    # ⚠️ Previews render to an 8-bit-alpha format even when the output is GIF
    # (PLAN.md 3.1) — measured visually identical there, while GIF flips whole
    # pixels through the shared palette and dither. `format_is_gif` tells the
    # frontend to say so rather than the preview quietly lying.
    ext = "webp"
    outs = {}
    for side, value in (("a", value_a), ("b", value_b)):
        dest = work / f"{side}.{ext}"
        argv = [sys.executable, os.fspath(engine.skill_path()), str(one), str(dest)]
        argv += _answer_argv(flag, value)
        argv += cli.region_argv(regions)
        proc = subprocess.run(argv, capture_output=True, text=True, start_new_session=True)
        if proc.returncode != 0 or not dest.is_file():
            first = next((l for l in (proc.stderr or "").splitlines() if l.strip()), "")
            raise RuntimeError(
                f"preview side {side} failed (exit {proc.returncode}): {first.strip()[:300]}"
            )
        outs[side] = dest

    import numpy as np

    a, b = _alpha(outs["a"]), _alpha(outs["b"])
    if a.shape == b.shape:
        differing = int((np.abs(a - b) > 0).sum())
        area = int(a.size)
    else:
        differing, area = -1, max(a.size, b.size)

    payload = {
        "a_url": f"/api/preview-files/{key}/a.{ext}",
        "b_url": f"/api/preview-files/{key}/b.{ext}",
        "ledger_a": _ledger(outs["a"]),
        "ledger_b": _ledger(outs["b"]),
        "format_is_gif": (target_format or src.suffix.lstrip(".")).lower() == "gif",
        "frame_index": used,
        "differing_alpha_px": differing,
        # ⚠️ Provisional threshold (see SEAM_THRESHOLD). False means the two
        # renders look identical and the question card is the honest fallback.
        "seam_useful": differing < 0 or (differing / max(area, 1)) >= SEAM_THRESHOLD,
        "engine_version": engine.engine_version(),
    }
    with _lock:
        _cache[key] = payload
    return payload
