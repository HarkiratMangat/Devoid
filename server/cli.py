"""Turn a tri-state override map into an argv list — PLAN.md 2.6, enforced server-side.

⚠️ **Only flags the person actually took over are passed explicitly.** Everything
else is left absent so ``--auto`` still applies its recommendation. A UI that sends
all 64 flags makes ``--auto`` a no-op and the tool stops thinking (``CLAUDE.md``,
"every control is tri-state"). This module is where that rule is *enforced*, not
merely intended: an override whose value equals the parser's own default is
dropped, and an unknown flag name is rejected rather than shelled out.
"""
from __future__ import annotations

from . import flags as flagmod


class UnknownFlag(ValueError):
    """An override naming a flag this engine does not have."""


def _by_dest_and_name() -> tuple[dict, dict]:
    rows = flagmod.flags()["flags"]
    return (
        {r["dest"]: r for r in rows if not r["positional"]},
        {r["name"]: r for r in rows if not r["positional"]},
    )


def _lookup(key: str, by_dest: dict, by_name: dict) -> dict:
    if key in by_name:
        return by_name[key]
    if key in by_dest:
        return by_dest[key]
    dashed = "--" + key.replace("_", "-")
    if dashed in by_name:
        return by_name[dashed]
    raise UnknownFlag(f"{key!r} is not a flag on this engine ({flagmod.engine.skill_path()})")


def build_argv(overrides: dict | None = None, *, auto: bool = True) -> list[str]:
    """Flag tokens (no interpreter, script or paths) for one render.

    ``overrides`` is ``{flag-or-dest: value}``; a ``None`` value, or a value equal to
    the parser's default, means "left at auto" and emits nothing.
    """
    by_dest, by_name = _by_dest_and_name()
    argv: list[str] = ["--auto"] if auto else []
    for key, value in (overrides or {}).items():
        row = _lookup(key, by_dest, by_name)
        if value is None or value == row["default"]:
            continue  # left at auto -- the whole point of the tri-state control
        if row["type"] == "bool":
            if value:
                argv.append(row["name"])
            continue
        if isinstance(value, (list, tuple)):
            for v in value:
                argv.extend([row["name"], str(v)])
            continue
        argv.extend([row["name"], str(value)])
    return argv


def answer_argv(answers: dict | None) -> list[str]:
    """``--assume-protect`` / ``--assume-remove`` from a per-colour verdict map.

    ⚠️ Keyed per COLOUR, because the engine's flags are (PLAN.md 3.0a). Callers
    must have already collapsed regions onto colours; :func:`server.answers.
    colour_verdicts` is the one place that does it and the one place that rejects
    a collision.
    """
    protect = [c for c, v in (answers or {}).items() if v == "protect"]
    remove = [c for c, v in (answers or {}).items() if v == "remove"]
    argv: list[str] = []
    if protect:
        argv += ["--assume-protect", ",".join(sorted(protect))]
    if remove:
        argv += ["--assume-remove", ",".join(sorted(remove))]
    return argv


def goal_argv(goal: dict | None) -> list[str]:
    """``target_kb`` / ``min_dim`` from a render goal.

    ⚠️ ``format`` is NOT translated into a flag here — the engine picks the output
    format from the output path's extension, and ``PRODUCT.md``'s "never infer a
    size target" means an absent ``target_kb`` stays absent rather than acquiring
    a plausible-sounding default.
    """
    argv: list[str] = []
    goal = goal or {}
    if goal.get("target_kb") is not None:
        argv += ["--target-kb", str(int(goal["target_kb"]))]
    if goal.get("min_dim") is not None:
        argv += ["--min-dimension", str(int(goal["min_dim"]))]
    return argv


def region_argv(regions: list | None) -> list[str]:
    """The six drawn region flags — PLAN.md 4.3.

    Each region is ``{"type": ..., "bbox_xyxy": [x0,y0,x1,y1]}``. The engine takes
    ``x0,y0,x1,y1`` as one comma-joined token per region flag.
    """
    mapping = {
        "protect": "--protect-region",
        "remove": "--remove-region",
        "remove-track": "--remove-region-track",
        "unprotect": "--unprotect-region",
        "translucent": "--translucent-region",
        "fade-protect": "--fade-protect-region",
    }
    argv: list[str] = []
    for region in regions or []:
        flag = mapping.get(region.get("type"))
        if flag is None:
            raise UnknownFlag(f"region type {region.get('type')!r} is not one of {sorted(mapping)}")
        box = region.get("bbox_xyxy")
        if not (isinstance(box, (list, tuple)) and len(box) == 4):
            raise ValueError(f"region {region!r} has no 4-element bbox_xyxy")
        argv += [flag, ",".join(str(int(v)) for v in box)]
    return argv
