import os, re, subprocess, sys
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTDIR = os.path.join(W, "web", "fonts")
os.makedirs(FONTDIR, exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
URL = ("https://fonts.googleapis.com/css2?"
       "family=Archivo:wdth,wght@62..125,400..700"
       "&family=Spline+Sans+Mono:wght@400;500&display=swap")
css = subprocess.run(["curl","-sS","-m","30","-A",UA,URL], capture_output=True, text=True, check=True).stdout
assert "@font-face" in css and "Archivo" in css and "Spline Sans Mono" in css, "unexpected CSS payload"

urls = sorted(set(re.findall(r"url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)", css)))
assert urls, "no woff2 urls found"
mapping = {}
for u in urls:
    fam = "archivo" if "/archivo/" in u else "spline-sans-mono"
    name = f"{fam}-{u.rsplit('/',1)[-1]}"
    dest = os.path.join(FONTDIR, name)
    subprocess.run(["curl","-sS","-m","60","-A",UA,"-o",dest,u], check=True)
    size = os.path.getsize(dest)
    assert size > 1000, f"{name} too small ({size} bytes)"
    # woff2 magic
    with open(dest,"rb") as f:
        assert f.read(4) == b"wOF2", f"{name} is not a woff2 file"
    mapping[u] = name
    print(f"  downloaded {name}  {size} bytes")

out = css
for u, name in mapping.items():
    out = out.replace(f"url({u})", f"url(fonts/{name})")
assert "fonts.gstatic.com" not in out, "a gstatic URL survived the rewrite"
assert out.count("font-display: swap") == out.count("@font-face"), "a face is missing font-display: swap"

header = (
    "/* Self-hosted Archivo + Spline Sans Mono — Stage 6, PLAN.md edge case \"Offline\".\n"
    "   Generated from Google Fonts' css2 API and rewritten to local files under web/fonts/.\n"
    "   Regenerate with scripts/fetch-fonts.py. Axes match what index.html used to request:\n"
    "   Archivo variable wdth 62..125 / wght 400..700, Spline Sans Mono 400 and 500. */\n\n"
)
with open(os.path.join(W, "web", "fonts.css"), "w") as f:
    f.write(header + out)
print(f"wrote web/fonts.css  ({len(mapping)} faces, {out.count('@font-face')} @font-face rules)")
