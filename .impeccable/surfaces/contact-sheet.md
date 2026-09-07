---
slug: contact-sheet
primary_target: web/index.html
related_targets: ["web/app.js", "web/app.css"]
---

# The contact sheet — every asset, state first

**Mode: Operate.** The person is completing a task. Scanability, consistency, native expectations and the real usage scene outrank expression; brand lives in precise details. All three of this app's surfaces are Operate — `docs/PRODUCT.md` records the scene as *Harkirat, usually mid-task on something else and wanting to be finished*, with a deliberate batch and engine-regression testing as the secondary scenes. Labelling was offered as a scene and **declined**, so `labels/protection.jsonl` is a byproduct of answering, never a workflow to design around.

⚠️ **Written 2026-09-07 02:19 EDT, and the mode is the only thing here that was not already decided.** Every command reads this file for the surface's mode before anything else; without one each command re-infers it, which the skill's own docs name as the source of generic advice. The rest of this brief points at the documents that own each decision rather than restating them, because a brief that repeats `DESIGN.md` is a second copy to keep in sync.

**What success looks like:** the person sees which asset needs them without reading a word, and clicks it.

**The one rule that is load-bearing here.** STATE sets the hierarchy, never the source art's own colours. That was the F36 defect: the needs-you card was loud by coincidence, and six already-cut assets would have left no focal point at all. `check_greyscale.py` measures it as a squint in both lighting states — the void separates by **72.8**, emitting by **10.7 to 25.8** against a floor of 8.0.

⚠️ **The field recedes in opposite directions in the two lighting states.** On the void it darkens; on the emitting ground darkening makes it LOUDER, so it washes toward the ground instead. Two depth strategies coexist here by deliberate design (`.interface-design/system.md`), and this surface is where the exception costs the most.

**Measured, so it does not need re-deciding:** the tile is 262px at 8, 20, 60 and 200 assets, and first paint is flat across that range (`scripts/measure_scale.mjs`). Whether 262px is right at twenty is an open judgement, not a bug.

**Off limits:** dimming on the stage. Nothing dims where an edge is actually judged — showing you something you are not going to get is worse than a flat sheet.
