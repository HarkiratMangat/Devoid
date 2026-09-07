---
slug: open-view
primary_target: web/index.html
related_targets: ["web/app.js", "web/wipe.js", "web/canvas.js", "web/app.css"]
---

# The open view — the question, shown on the artwork

**Mode: Operate.** The person is completing a task. Scanability, consistency, native expectations and the real usage scene outrank expression; brand lives in precise details. All three of this app's surfaces are Operate — `docs/PRODUCT.md` records the scene as *Harkirat, usually mid-task on something else and wanting to be finished*, with a deliberate batch and engine-regression testing as the secondary scenes. Labelling was offered as a scene and **declined**, so `labels/protection.jsonl` is a byproduct of answering, never a workflow to design around.

⚠️ **Written 2026-09-07 02:19 EDT, and the mode is the only thing here that was not already decided.** Every command reads this file for the surface's mode before anything else; without one each command re-infers it, which the skill's own docs name as the source of generic advice. The rest of this brief points at the documents that own each decision rather than restating them, because a brief that repeats `DESIGN.md` is a second copy to keep in sync.

**What success looks like:** the person answers a coin-flip they could not have answered from text, in one gesture, and the tool keeps deciding everything else.

**This is the North Star's load-bearing surface** (linksee anchor #10). `PRODUCT.md` line 31: nobody can answer *"is the region at bbox [230,135,406,359] outlined in 002864 design or background?"* by reading it. They have to see it.

**The seam is the product's thesis as a gesture.** Two answers on one clock, compared by dragging the cut line. ⚠️ The disputed region's fill is CLIPPED at the seam and the seam opens on the bbox — before that fix the overlay painted both halves identically, so the comparison could not differ in the one rectangle it exists to reveal.

**Never two controls for one decision.** The group on the seam answers under the seam; the decision column carries the others and the evidence. Picking a side IS the answer — there is no submit button, and the undo is visible rather than a shortcut nobody was told about.

**The artwork is the focal element and there is a number on it:** `gate:ui` asserts ≥550px with a question open. A layout change that buys anything with those pixels has to justify it — one already tried and was reverted at 455px.
