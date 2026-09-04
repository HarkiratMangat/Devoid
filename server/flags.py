"""Flag METADATA, introspected from the engine's own parser — PLAN.md 1.6.

⚠️ **Generate the metadata, never the controls.** Introspecting argparse gives each
option's type, choices, default and help text, so a hand-authored control can never
drift from the flag it drives, and a *new* flag surfaces as a warning that a drawer
is missing one. Generating a control per flag would produce exactly the 63-control
passthrough form ``CLAUDE.md`` forbids and ``PRODUCT.md`` calls a failure of the
whole design. The drawers stay hand-authored, in the person's vocabulary.

Depends on ``build_parser()`` in the skill repo (branch ``feat/build-parser-factory``).
If the resolved engine predates it, :func:`flags` raises rather than falling back to
a hand-transcribed list — a transcribed list is the drift this task exists to end.
"""
from __future__ import annotations

import argparse
import logging

from . import engine

log = logging.getLogger("devoid.flags")


class ParserFactoryMissing(RuntimeError):
    """The resolved engine has no ``build_parser()``."""


def _type_name(action: argparse.Action) -> str:
    """A JSON-friendly name for what this option accepts."""
    if isinstance(action, argparse._StoreTrueAction):  # noqa: SLF001
        return "bool"
    if isinstance(action, argparse._StoreFalseAction):  # noqa: SLF001
        return "bool"
    if isinstance(action, argparse._CountAction):  # noqa: SLF001
        return "count"
    t = action.type
    if t is None:
        return "str"
    return getattr(t, "__name__", str(t))


def _jsonable(value):
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    return str(value)


def build_parser() -> argparse.ArgumentParser:
    mod = engine.load_skill()
    factory = getattr(mod, "build_parser", None)
    if not callable(factory):
        raise ParserFactoryMissing(
            f"{engine.skill_path()} has no build_parser(). It is added by the skill repo's "
            "feat/build-parser-factory branch; Devoid will not hand-transcribe the flags."
        )
    return factory()


def _group_titles(parser: argparse.ArgumentParser) -> dict[int, str]:
    """Best-effort ``action -> argument_group title``.

    The skill's parser adds every option to the parser directly, so in practice
    everything lands in argparse's own ``optional arguments``/``positional
    arguments`` groups. Those carry no editorial meaning, so they are reported as
    ``null`` rather than as a fake taxonomy — the drawer taxonomy is hand-authored
    (PLAN.md 2.7) and must not appear to come from the engine.
    """
    generic = {"positional arguments", "options", "optional arguments"}
    out: dict[int, str] = {}
    for group in parser._action_groups:  # noqa: SLF001
        title = group.title or ""
        if title.lower() in generic:
            continue
        for action in group._group_actions:  # noqa: SLF001
            out[id(action)] = title
    return out


def flags() -> dict:
    """The payload behind ``GET /api/flags`` (API-CONTRACT.md "Engine")."""
    parser = build_parser()
    groups = _group_titles(parser)
    rows = []
    for action in parser._actions:  # noqa: SLF001
        if isinstance(action, argparse._HelpAction):  # noqa: SLF001
            continue
        name = action.option_strings[0] if action.option_strings else action.dest
        rows.append(
            {
                "name": name,
                "aliases": list(action.option_strings[1:]),
                "dest": action.dest,
                "type": _type_name(action),
                "choices": _jsonable(list(action.choices)) if action.choices else None,
                "default": _jsonable(action.default),
                "help": action.help,
                "group": groups.get(id(action)),
                "positional": not action.option_strings,
                "nargs": _jsonable(action.nargs),
                "metavar": _jsonable(action.metavar),
            }
        )
    log.info("devoid: introspected %d flags from build_parser()", len(rows))
    return {"flags": rows, "engine_version": engine.engine_version()}


def defaults_by_dest() -> dict:
    """``dest -> default``, so the tri-state layer can tell "left at default" apart
    from "deliberately set to the default value".

    ⚠️ This distinction is the whole of PLAN.md 2.6 / PRODUCT.md's tri-state rule:
    ``--auto`` applies its recommendation only where an option was left at its
    default, so a UI that sends every flag makes ``--auto`` a no-op.
    """
    return {row["dest"]: row["default"] for row in flags()["flags"]}
