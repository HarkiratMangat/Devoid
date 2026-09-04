#!/usr/bin/env python3
"""Does a 1-frame preview tell the truth about the full render?

PRODUCT.md and DESIGN.md both quote this result. A quoted number with no
re-runnable check is a claim, and this project's own history is that claims rot.
Run it whenever the skill's rendering path changes.

    python3 scripts/measure_preview_fidelity.py <source.gif> [frame]

Method: render the FULL asset and a single extracted frame with IDENTICAL
settings, then diff that frame's alpha plane in each. Anything that differs is
something a 1-frame preview would lie about.

Result at the time of writing, frame 62 of a 144-frame 640x640 asset:
    explicit flags -> WebP   0 / 409,600 differing alpha px   (pixel-exact)
    explicit flags -> GIF  104 / 409,600  (0.025%)  shared palette + Bayer dither
    --auto         -> GIF  242 / 409,600  (0.059%)  plus the calibration diverged

The --auto row is why the app passes the whole-asset calibration into the
preview instead of letting one frame re-derive it: the curves differed
(0:0.5407,1:0.0407,2:0.0135 vs 0:0.612,1:0.0354,2:0.0005) and landed on the same
level by luck, not by guarantee.
"""
import subprocess, sys, os, tempfile
from PIL import Image, ImageSequence
import numpy as np

SKILL = os.environ.get("DEVOID_SKILL",
    "/Applications/Claude Code/Gif-Background-Remover/scripts/remove_gif_background.py")

def alpha(path, idx):
    with Image.open(path) as im:
        for i, f in enumerate(ImageSequence.Iterator(im)):
            if i == idx:
                return np.array(f.convert("RGBA"))[..., 3].astype(np.int16)
    return None

def main(src, frame):
    if not os.path.isfile(SKILL):
        sys.exit(f"skill not found at {SKILL} — set DEVOID_SKILL")
    tmp = tempfile.mkdtemp(prefix="devoid-fid-")
    with Image.open(src) as im:
        n = im.n_frames
        frames = [f.convert("RGBA") for f in ImageSequence.Iterator(im)]
    frame = min(frame, n - 1)
    one = os.path.join(tmp, "one.gif")
    frames[frame].convert("RGB").save(one, save_all=True, append_images=[], loop=0)
    print(f"{os.path.basename(src)}: {n} frames, probing frame {frame}\n")

    def run(args):
        r = subprocess.run([sys.executable, SKILL] + args, capture_output=True, text=True)
        return r.returncode == 0, r.stderr

    for tag, flags, ext in (
        ("explicit -> webp", ["--edge-cleanup-erosion", "1"], "webp"),
        ("explicit -> gif",  ["--edge-cleanup-erosion", "1"], "gif"),
        ("--auto   -> gif",  ["--auto", "--assume-protect", "002864"], "gif"),
    ):
        full = os.path.join(tmp, f"full_{ext}_{tag[:4]}.{ext}")
        sing = os.path.join(tmp, f"one_{ext}_{tag[:4]}.{ext}")
        ok1, e1 = run([src, full] + flags)
        ok2, e2 = run([one, sing] + flags)
        if not (ok1 and ok2):
            print(f"  {tag:<18} FAILED"); continue
        af, ao = alpha(full, frame), alpha(sing, 0)
        if af is None or ao is None or af.shape != ao.shape:
            print(f"  {tag:<18} unreadable or shape mismatch"); continue
        d = np.abs(af - ao)
        print(f"  {tag:<18} {int((d>0).sum()):>7} / {d.size} differing alpha px "
              f"({100*(d>0).mean():.3f}%)  max delta {int(d.max())}")
        for e, who in ((e1, "full"), (e2, "one ")):
            for ln in (e or "").splitlines():
                if "erosion calibrated" in ln:
                    print(f"      {who}: {ln.strip()[:120]}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 62)
