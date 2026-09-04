"""Put the repo root ahead of everything on `sys.path`.

pytest's prepend import mode inserts `tests/`, not the root, so `import server`
would otherwise resolve to whatever editable install happens to be in the venv —
which is not necessarily this checkout. Tests must exercise the tree they sit in.
"""

import sys
from pathlib import Path

ROOT = str(Path(__file__).resolve().parent.parent)
if ROOT in sys.path:
    sys.path.remove(ROOT)
sys.path.insert(0, ROOT)
