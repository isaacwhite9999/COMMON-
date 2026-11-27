"""Loopback-only static preview with an isolated, public-only member configuration."""
import argparse
import io
import json
import os
import re
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

DOCS = Path(__file__).resolve().parents[1] / "docs"


def preview_config():
    url = os.getenv("COMMON_PREVIEW_SUPABASE_URL", "").rstrip("/")
    key = os.getenv("COMMON_PREVIEW_SUPABASE_PUBLISHABLE_KEY", "")
    if bool(url) != bool(key):
        raise ValueError("Set both preview Supabase variables or leave both unset.")
    if url:
        origin = urlsplit(url)
        valid_scheme = origin.scheme == "https" or (
            origin.scheme == "http" and origin.hostname in {"localhost", "127.0.0.1", "::1"}
        )
        if (not valid_scheme or not origin.hostname or origin.username or origin.password
                or origin.path or origin.query or origin.fragment):
            raise ValueError("Use an isolated HTTPS Supabase origin or a loopback HTTP origin.")
        if not re.fullmatch(r"sb_publishable_[A-Za-z0-9_-]+", key):
            raise ValueError("A Supabase publishable key is required.")
        if url in (DOCS / "config.js").read_text(encoding="utf-8"):
            raise ValueError("Use a separate Supabase project for preview.")
    return {
        "supabaseUrl": url,
        "supabaseAnonKey": key,
        "communityBackendReady": bool(url),
        "researchAgentEnabled": False,
        "externalLedgerEnabled": False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    try:
        config = f"window.COMMON_CONFIG = {json.dumps(preview_config())};\n".encode()
    except ValueError as error:
        parser.error(str(error))

    class PreviewHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=DOCS, **kwargs)

        def send_head(self):
            if Path(self.translate_path(self.path)) == DOCS / "config.js":
                self.send_response(200)
                self.send_header("Content-Type", "text/javascript; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(config)))
                self.end_headers()
                return io.BytesIO(config)
            return super().send_head()

    with ThreadingHTTPServer(("127.0.0.1", args.port), PreviewHandler) as server:
        print(f"COMMON preview at http://127.0.0.1:{server.server_port}/", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
