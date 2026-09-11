"""Vercel ASGI entrypoint for the CipherGuard management API.

The dashboard uses same-origin `/api/v1/*` requests in production. Vercel routes
those requests to this FastAPI app; no browser-facing URL needs to point at
localhost or an internal Docker service.
"""
from pathlib import Path
import sys

backend_root = Path(__file__).resolve().parents[1] / "services" / "cipherguard_api"
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.main import app  # noqa: E402
