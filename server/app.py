from pathlib import Path

from starlette.applications import Starlette
from starlette.routing import Mount
from starlette.staticfiles import StaticFiles

WEB_DIR = Path(__file__).resolve().parent.parent / "web"

app = Starlette(
    routes=[
        Mount("/", app=StaticFiles(directory=WEB_DIR, html=True), name="web"),
    ]
)

