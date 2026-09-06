"""The in-memory asset registry, and the per-colour answer collapse.

⚠️ **No database** (PLAN.md 5.2) — a module-level dict keyed by a generated id.
The append-only logs are the durable record; this is session state.
"""
from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from .validate import RecommendResult


class ConflictingColour(ValueError):
    """Two regions sharing an ``outline_color`` were given different verdicts.

    ⚠️ PLAN.md 3.0a. ``--assume-protect``/``--assume-remove`` take hex COLOURS and
    ``ambiguous_protection`` returns one entry per REGION, so answering two
    same-colour regions differently would emit ``--assume-protect X`` and
    ``--assume-remove X`` at once, which is incoherent. Not a corner case:
    ``--recommend`` on the 640px megaphone derives two colours, ``f0c850,002864``.
    """

    def __init__(self, outline_color: str):
        super().__init__(f"conflicting verdicts for outline colour {outline_color}")
        self.outline_color = outline_color


@dataclass
class Asset:
    id: str
    path: str
    ext: str
    state: str = "loading"
    result: RecommendResult | None = field(default=None, repr=False)
    #: ``{region_id: "protect"|"remove"}`` as answered by the person.
    region_answers: dict = field(default_factory=dict)
    #: ``"artwork"|"not-artwork"|None``
    fade_answer: str | None = None
    frames: int | None = None
    ledger: dict | None = None
    took_ms: int | None = None
    engine_version: str | None = None
    error: str | None = None

    def public(self, *, full: bool = False) -> dict:
        out = {"id": self.id, "path": self.path, "ext": self.ext, "state": self.state}
        # ⚠️ The frontend used to derive this from the basename, which only ever
        # resolved for files already inside ``web/assets/``. Publishing it here
        # means every consumer gets a URL that works for a file anywhere on disk.
        out["url"] = f"/api/assets/{self.id}/source"
        if self.frames is not None:
            out["frames"] = self.frames
        if self.result is not None:
            out["questions"] = self.result.questions()
        if self.ledger is not None:
            out["ledger"] = self.ledger
        if self.error:
            out["error"] = self.error
        if full:
            out["answers"] = {
                "ambiguous_protection": dict(self.region_answers),
                "fade": self.fade_answer,
            }
            out["engine_version"] = self.engine_version
        return out

    def colour_verdicts(self) -> dict:
        """``{outline_color: "protect"|"remove"}``, or raise :class:`ConflictingColour`.

        The single place regions are collapsed onto the engine's own granularity.
        """
        if self.result is None:
            return {}
        by_region = {a.region_id: a.outline_color for a in self.result.ambiguous_protection}
        out: dict[str, str] = {}
        for region_id, verdict in self.region_answers.items():
            colour = by_region.get(int(region_id))
            if colour is None:
                continue
            if colour in out and out[colour] != verdict:
                raise ConflictingColour(colour)
            out[colour] = verdict
        return out


_assets: dict[str, Asset] = {}
_lock = threading.Lock()


def register(path: str) -> Asset:
    p = Path(path)
    asset = Asset(id=uuid.uuid4().hex[:12], path=str(p), ext=p.suffix.lstrip("."))
    if not p.is_file():
        # ⚠️ Absent is not the same as deleted (PLAN.md's "source file moved").
        # `blocked` says the app cannot proceed and why, rather than failing later
        # inside the engine with a traceback.
        asset.state = "blocked"
        asset.error = f"{p} is not a file"
    with _lock:
        _assets[asset.id] = asset
    return asset


def get(asset_id: str) -> Asset | None:
    with _lock:
        return _assets.get(asset_id)


def all_assets() -> list[Asset]:
    with _lock:
        return list(_assets.values())


def clear() -> None:
    with _lock:
        _assets.clear()
