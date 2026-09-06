"""The validation boundary — PLAN.md 1.1.

⚠️ ONE function takes the skill's raw JSON, asserts what it needs, and returns a
typed object. **Nothing downstream touches the raw dict.** The CLI ancestor
(``~/.config/dior``'s ``gif_wizard.py``) learned this the expensive way: four call
sites assumed the shape without verifying it, and the lesson was then fixed in
exactly one of them. HANDOFF.md names all four, and each has a check here:

  * ``recommend()``'s list/dict sniffing        -> normalised in one place below
  * a bbox fallback that silently became a degenerate rectangle -> rejected
  * direct subscripts on the fade dict          -> every key asserted
  * an ``index()+1`` on a flag list             -> ``suggested_flag_tokens``

Test the boundary; do not test every consumer.
"""
from __future__ import annotations

import shlex
from dataclasses import dataclass, field
from typing import Any

VALID_FORMATS = ("gif-ok", "webp-or-apng", "webp-or-avif")


class RecommendShapeError(ValueError):
    """The engine's JSON is not the shape this app was built against.

    Raised with the offending path and value, so a failure names what moved
    rather than surfacing three frames later as a KeyError on a dict nobody
    remembers building.
    """


def _fail(where: str, why: str, got: Any = None) -> None:
    detail = "" if got is None else f" (got {got!r})"
    raise RecommendShapeError(f"recommend(): {where} {why}{detail}")


def _require_dict(value: Any, where: str) -> dict:
    if not isinstance(value, dict):
        _fail(where, "must be an object", value)
    return value


@dataclass(frozen=True)
class AmbiguousRegion:
    """One coin-flip enclosure the engine refused to decide.

    ⚠️ Keyed per REGION; the engine's ``--assume-protect``/``--assume-remove``
    flags are keyed per outline COLOUR (PLAN.md 3.0a). Two of these can share
    ``outline_color`` and then cannot be answered differently.
    """

    region_id: int
    outline_color: str
    bbox_xyxy: tuple[int, int, int, int]
    frames_enclosed: int
    frames_checked: int
    enclosure_ratio: float

    def as_dict(self) -> dict:
        return {
            "region_id": self.region_id,
            "outline_color": self.outline_color,
            "bbox_xyxy": list(self.bbox_xyxy),
            "frames_enclosed": self.frames_enclosed,
            "frames_checked": self.frames_checked,
            "enclosure_ratio": self.enclosure_ratio,
        }


@dataclass(frozen=True)
class NameableFade:
    color: str
    faint_px: int
    frame_index: int

    def as_dict(self) -> dict:
        return {
            "color": self.color,
            "faint_px": self.faint_px,
            "frame_index": self.frame_index,
        }


@dataclass(frozen=True)
class RecommendResult:
    recommended_format: str
    suggested_command: str | None
    not_applicable_reason: str | None
    alternative_command: str | None
    ambiguous_protection: tuple[AmbiguousRegion, ...]
    nameable_fade: NameableFade | None
    evidence: tuple[str, ...]
    #: ``suggested_command`` split into the flag tokens after ``py script in out``.
    #: Empty when the engine refused (``suggested_command is None``).
    suggested_flag_tokens: tuple[str, ...] = ()
    #: The whole-asset report, kept for callers that need the calibration
    #: (the preview must inherit it -- PLAN.md 3.2). Deliberately NOT validated
    #: field by field: this boundary owns the recommendation, and a consumer that
    #: reaches in here is doing so knowingly.
    analysis: dict = field(default_factory=dict, repr=False)

    @property
    def refused(self) -> bool:
        return self.not_applicable_reason is not None

    @property
    def needs_you(self) -> bool:
        return bool(self.ambiguous_protection) or self.nameable_fade is not None

    @property
    def state(self) -> str:
        """One of DESIGN.md's eleven, as the analyze route reports it."""
        if self.refused:
            return "refused"
        return "needs-you" if self.needs_you else "ready"

    @property
    def outline_colors(self) -> tuple[str, ...]:
        """Distinct ambiguous colours, in first-seen order. The engine's granularity."""
        return tuple(dict.fromkeys(a.outline_color for a in self.ambiguous_protection))

    def questions(self) -> dict:
        """Exactly API-CONTRACT.md's ``questions`` object."""
        return {
            "ambiguous_protection": [a.as_dict() for a in self.ambiguous_protection],
            "nameable_fade": self.nameable_fade.as_dict() if self.nameable_fade else None,
            "recommended_format": self.recommended_format,
            "not_applicable_reason": self.not_applicable_reason,
            "alternative_command": self.alternative_command,
            # ⚠️ ADDITIVE, 2026-09-06 17:55 EDT. ``suggested_flag_tokens`` was parsed, typed,
            # documented and never sent to anyone -- the same reachability class
            # this remediation exists to close. The advice rail needs the
            # engine's per-flag opinion to spot a row you took over that the
            # engine would not have chosen; nothing else on the client carries
            # it. Adding a key is backwards compatible; the two exact-key-set
            # assertions are updated with it.
            "suggested_flag_tokens": list(self.suggested_flag_tokens),
        }


def _bbox(raw: Any, where: str) -> tuple[int, int, int, int]:
    """⚠️ A degenerate rectangle is the bug this exists to catch.

    The ancestor's fallback silently produced ``[0,0,0,0]`` and every consumer
    downstream drew, measured and logged a zero-area region without complaint.
    """
    if not isinstance(raw, (list, tuple)) or len(raw) != 4:
        _fail(where, "must be a 4-element [x0,y0,x1,y1]", raw)
    try:
        x0, y0, x1, y1 = (int(v) for v in raw)
    except (TypeError, ValueError):
        _fail(where, "must hold four integers", raw)
    if x1 <= x0 or y1 <= y0:
        _fail(where, "is degenerate (x1<=x0 or y1<=y0)", raw)
    return x0, y0, x1, y1


def _int(raw: Any, where: str) -> int:
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        _fail(where, "must be a number", raw)
    if isinstance(raw, float) and not raw.is_integer():
        _fail(where, "must be a whole number", raw)
    return int(raw)


def _hex_color(raw: Any, where: str) -> str:
    if not isinstance(raw, str) or not raw:
        _fail(where, "must be a non-empty hex colour string", raw)
    s = raw.lstrip("#").lower()
    if len(s) != 6 or any(c not in "0123456789abcdef" for c in s):
        _fail(where, "must be six hex digits", raw)
    return s


def _flag_tokens(command: str) -> tuple[str, ...]:
    """The flags out of ``suggested_command``, which is a shell STRING.

    ⚠️ PLAN.md's edge-case table assigns "filenames with spaces or quotes" to
    this boundary. ``--auto`` builds its flags by ``shlex.split``-ing this string
    and dropping the first four tokens (``python3 script input output``) -- see
    the skill's own ``rec_tokens = shlex.split(rec['suggested_command'])[4:]``.
    A quote a Finder drag introduces makes that split raise or mis-count, and the
    corpus has no such filename, so nothing would otherwise catch it here.
    """
    try:
        tokens = shlex.split(command)
    except ValueError as exc:
        _fail("suggested_command", f"is not shell-splittable ({exc})", command)
    if len(tokens) < 4:
        _fail(
            "suggested_command",
            "has fewer than the four leading tokens (interpreter, script, input, output) "
            "the engine's own --auto path slices off",
            command,
        )
    return tuple(tokens[4:])


def parse_recommend(raw: dict) -> RecommendResult:
    """Assert the shape of ``recommend()``'s JSON and return a typed object.

    Accepts either the object ``recommend()`` returns in-process or the
    single-element list the CLI emits for a multi-path invocation -- the
    normalisation happens HERE, once, instead of being sniffed at four call
    sites (HANDOFF.md, "carry forward from that CLI").
    """
    if isinstance(raw, list):
        if len(raw) != 1:
            _fail("payload", "is a list of length != 1; pass one asset's result", len(raw))
        first = _require_dict(raw[0], "payload[0]")
        raw = _require_dict(first.get("recommendation", first), "payload[0].recommendation")
    raw = _require_dict(raw, "payload")

    for key in (
        "recommended_format",
        "suggested_command",
        "not_applicable_reason",
        "alternative_command",
        "ambiguous_protection",
        "nameable_fade",
        "evidence",
    ):
        if key not in raw:
            _fail(key, "is missing")

    fmt = raw["recommended_format"]
    if fmt is not None and fmt not in VALID_FORMATS:
        _fail("recommended_format", f"must be one of {VALID_FORMATS} or null", fmt)

    suggested = raw["suggested_command"]
    if suggested is not None and not isinstance(suggested, str):
        _fail("suggested_command", "must be a string or null", suggested)

    not_applicable = raw["not_applicable_reason"]
    if not_applicable is not None and not isinstance(not_applicable, str):
        _fail("not_applicable_reason", "must be a string or null", not_applicable)

    alternative = raw["alternative_command"]
    if alternative is not None and not isinstance(alternative, str):
        _fail("alternative_command", "must be a string or null", alternative)

    if not_applicable is not None and (suggested is not None or alternative is not None):
        # ⚠️ The engine deliberately nulls BOTH on a refusal -- "a refusal with an
        # escape hatch stapled to it" is the defect its own comment records. If
        # that ever regresses, it regresses here rather than in the UI.
        _fail(
            "not_applicable_reason",
            "is set while a runnable command is still present, which is a refusal "
            "with an escape hatch stapled to it",
            {"suggested": suggested, "alternative": alternative},
        )

    amb_raw = raw["ambiguous_protection"]
    if not isinstance(amb_raw, list):
        _fail("ambiguous_protection", "must be a list", amb_raw)
    regions = []
    for i, entry in enumerate(amb_raw):
        where = f"ambiguous_protection[{i}]"
        entry = _require_dict(entry, where)
        for key in (
            "region_id",
            "outline_color",
            "bbox_xyxy",
            "frames_enclosed",
            "frames_checked",
            "enclosure_ratio",
        ):
            if key not in entry:
                _fail(f"{where}.{key}", "is missing")
        checked = _int(entry["frames_checked"], f"{where}.frames_checked")
        enclosed = _int(entry["frames_enclosed"], f"{where}.frames_enclosed")
        if checked <= 0:
            _fail(f"{where}.frames_checked", "must be positive", checked)
        if not 0 <= enclosed <= checked:
            _fail(f"{where}.frames_enclosed", "must be within [0, frames_checked]", enclosed)
        ratio = entry["enclosure_ratio"]
        if not isinstance(ratio, (int, float)) or isinstance(ratio, bool):
            _fail(f"{where}.enclosure_ratio", "must be a number", ratio)
        if not 0.0 < float(ratio) < 1.0:
            # By construction this list holds only the coin-flip band, strictly
            # between 0 and 1. A 0.0 or 1.0 here means the engine's own gate moved.
            _fail(f"{where}.enclosure_ratio", "must be strictly between 0 and 1", ratio)
        regions.append(
            AmbiguousRegion(
                region_id=_int(entry["region_id"], f"{where}.region_id"),
                outline_color=_hex_color(entry["outline_color"], f"{where}.outline_color"),
                bbox_xyxy=_bbox(entry["bbox_xyxy"], f"{where}.bbox_xyxy"),
                frames_enclosed=enclosed,
                frames_checked=checked,
                enclosure_ratio=float(ratio),
            )
        )

    fade_raw = raw["nameable_fade"]
    fade = None
    if fade_raw is not None:
        fade_raw = _require_dict(fade_raw, "nameable_fade")
        for key in ("color", "faint_px", "frame_index"):
            if key not in fade_raw:
                _fail(f"nameable_fade.{key}", "is missing")
        fade = NameableFade(
            color=_hex_color(fade_raw["color"], "nameable_fade.color"),
            faint_px=_int(fade_raw["faint_px"], "nameable_fade.faint_px"),
            frame_index=_int(fade_raw["frame_index"], "nameable_fade.frame_index"),
        )
        if fade.frame_index < 0:
            _fail("nameable_fade.frame_index", "must not be negative", fade.frame_index)

    evidence = raw["evidence"]
    if not isinstance(evidence, list) or any(not isinstance(e, str) for e in evidence):
        _fail("evidence", "must be a list of strings", evidence)

    analysis = raw.get("analysis")
    if analysis is not None and not isinstance(analysis, dict):
        _fail("analysis", "must be an object or absent", analysis)

    return RecommendResult(
        recommended_format=fmt,
        suggested_command=suggested,
        not_applicable_reason=not_applicable,
        alternative_command=alternative,
        ambiguous_protection=tuple(regions),
        nameable_fade=fade,
        evidence=tuple(evidence),
        suggested_flag_tokens=_flag_tokens(suggested) if suggested else (),
        analysis=analysis or {},
    )
