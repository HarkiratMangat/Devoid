/* Advice with undo — PLAN.md 5.3.
 *
 * "Every suggestion paired with a one-click revert of exactly what it changed.
 * A suggestion without one does not ship." (CLAUDE.md)
 *
 * This file is the MECHANISM, not any particular suggestion. A caller supplies
 * the text, a function that applies the change, and a function that reverts it.
 * The revert is handed back exactly what apply() returned — the prior value —
 * so the undo cannot drift from what was actually changed: there is nowhere
 * else for it to get its idea of "before" from.
 *
 *   Devoid.suggest("the erosion ate a thin stroke — try 1?",
 *                  () => { const was = ctl.value; ctl.set(1); return was; },
 *                  (was) => ctl.set(was));
 *
 * Standalone on purpose: it appends its own <style> once and builds its own DOM,
 * so it depends on no class in web/app.css and collides with no other module's
 * edits to that shared file. It reads app.css's tokens when they exist and falls
 * back to literal colours when they do not.
 *
 * Written 2026-09-04 EDT.
 */
(function () {
  "use strict";

  var STYLE_ID = "devoid-advice-style";
  var RAIL_CLASS = "devoid-advice-rail";

  /* ⚠️ NO `var(--token, fallback)` FALLBACKS HERE (2026-09-07 00:55 EDT). Every token
     this file names is defined in app.css, so the fallback half never painted
     -- it was a second palette nobody maintained, a generation behind the
     first (#E7EDEB/#9DAEAA were the previous --graphite pair) and invisible to
     every review because it never rendered. The detector saw it, which is the
     only reason it was found. The one that DID paint was the dismiss button's
     radius, off the --r scale unconditionally (the literal is deliberately not
     repeated here: the detector reads comments, and naming it re-created the
     finding this sentence is about). If a token here ever stops existing,
     the right failure is a visible one. */
  var CSS = [
    "." + RAIL_CLASS + "{display:flex;flex-direction:column;gap:6px;align-items:flex-start}",
    ".devoid-advice{display:inline-flex;align-items:center;gap:10px;",
    "  max-width:100%;padding:7px 8px 7px 12px;border-radius:var(--r);",
    "  background:var(--cyan-bg);color:var(--graphite);",
    "  border:1px solid var(--score-2);",
    "  font:inherit;font-size:12px;line-height:1.35;",
    "  transition:opacity 160ms var(--ease)}",
    ".devoid-advice[data-applied='true']{background:var(--ok-bg)}",
    ".devoid-advice__text{flex:1 1 auto;min-width:0}",
    ".devoid-advice__action{flex:0 0 auto;cursor:pointer;",
    "  padding:3px 9px;border-radius:var(--r-sm);font:inherit;font-size:12px;",
    "  color:var(--graphite);background:transparent;",
    "  border:1px solid var(--mark)}",
    ".devoid-advice__action:hover{background:var(--score)}",
    ".devoid-advice__dismiss{flex:0 0 auto;cursor:pointer;",
    "  width:20px;height:20px;padding:0;border:0;border-radius:var(--r-xs);",
    "  background:transparent;color:var(--graphite-2);",
    "  font:inherit;font-size:14px;line-height:1}",
    ".devoid-advice__dismiss:hover{color:var(--graphite)}",
    ".devoid-advice__action:focus-visible,.devoid-advice__dismiss:focus-visible{",
    "  outline:2px solid var(--cyan);outline-offset:2px}",
    "@media (prefers-reduced-motion:reduce){.devoid-advice{transition:none}}"
  ].join("");

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function ensureRail(host) {
    var rail = host.querySelector(":scope > ." + RAIL_CLASS);
    if (!rail) {
      rail = document.createElement("div");
      rail.className = RAIL_CLASS;
      host.appendChild(rail);
    }
    return rail;
  }

  /* suggest(label, applyFn, undoFn, options) -> handle
   *
   * options.host      element to render into (default: #advice-host, else body)
   * options.applyText label for the apply action  (default "apply")
   * options.undoText  label for the undo action   (default "undo")
   * options.onDismiss called when the chip goes away, with "dismissed" |
   *                   "undone"
   *
   * handle: { element, applied(), apply(), undo(), dismiss() }
   */
  function suggest(label, applyFn, undoFn, options) {
    if (typeof applyFn !== "function" || typeof undoFn !== "function") {
      // Refused loudly rather than rendered without an undo: a suggestion
      // whose revert is missing is exactly what this rule forbids shipping.
      throw new TypeError("Devoid.suggest needs both an apply and an undo");
    }
    var opts = options || {};
    ensureStyle();

    var host =
      opts.host || document.getElementById("advice-host") || document.body;
    var rail = ensureRail(host);

    var chip = document.createElement("div");
    chip.className = "devoid-advice";
    chip.setAttribute("role", "status");
    chip.dataset.applied = "false";

    var text = document.createElement("span");
    text.className = "devoid-advice__text";
    text.textContent = label;

    var action = document.createElement("button");
    action.type = "button";
    action.className = "devoid-advice__action";
    action.textContent = opts.applyText || "apply";

    var dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "devoid-advice__dismiss";
    dismiss.textContent = "×";
    dismiss.setAttribute("aria-label", "dismiss this suggestion");

    chip.appendChild(text);
    chip.appendChild(action);
    chip.appendChild(dismiss);
    rail.appendChild(chip);

    var applied = false;
    var prior; // whatever applyFn returned — the ONLY record of "before"
    var gone = false;

    function remove(reason) {
      if (gone) return;
      gone = true;
      if (chip.parentNode) chip.parentNode.removeChild(chip);
      if (typeof opts.onDismiss === "function") opts.onDismiss(reason);
    }

    function doApply() {
      if (applied || gone) return;
      prior = applyFn();
      applied = true;
      chip.dataset.applied = "true";
      text.textContent = label + " — applied";
      action.textContent = opts.undoText || "undo";
      dismiss.setAttribute("aria-label", "keep this change and dismiss");
    }

    function doUndo() {
      if (!applied || gone) return;
      undoFn(prior); // exactly what it changed, and nothing else
      applied = false;
      remove("undone");
    }

    action.addEventListener("click", function () {
      if (applied) doUndo();
      else doApply();
    });

    dismiss.addEventListener("click", function () {
      remove(applied ? "kept" : "dismissed");
    });

    return {
      element: chip,
      applied: function () {
        return applied;
      },
      apply: doApply,
      undo: doUndo,
      dismiss: function () {
        remove("dismissed");
      }
    };
  }

  window.Devoid = window.Devoid || {};
  window.Devoid.suggest = suggest;
})();
