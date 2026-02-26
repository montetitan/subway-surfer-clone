#!/usr/bin/env python3.14
import json
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
HIGHSCORE_FILE = DATA_DIR / "highscore.json"
HIGHSCORE_LOCK = threading.Lock()


def normalize_record(data: dict) -> dict:
    try:
        score = int(data.get("high_score", 0) or 0)
    except (TypeError, ValueError):
        score = 0
    user = str(data.get("high_score_user", "-") or "-").strip() or "-"
    return {"high_score": max(0, score), "high_score_user": user}


def read_high_score() -> dict:
    if not HIGHSCORE_FILE.exists():
        return {"high_score": 0, "high_score_user": "-"}
    try:
        data = json.loads(HIGHSCORE_FILE.read_text(encoding="utf-8"))
        if isinstance(data, int):
            return {"high_score": max(0, int(data)), "high_score_user": "-"}
        if isinstance(data, dict):
            return normalize_record(data)
        return {"high_score": 0, "high_score_user": "-"}
    except Exception:
        return {"high_score": 0, "high_score_user": "-"}


def write_high_score(record: dict) -> dict:
    normalized = normalize_record(record)
    HIGHSCORE_FILE.write_text(
        json.dumps(normalized, indent=2),
        encoding="utf-8",
    )
    return normalized


class GameHandler(SimpleHTTPRequestHandler):
    @staticmethod
    def _normalized_path(raw_path: str) -> str:
        parsed = urlsplit(raw_path)
        path = parsed.path.rstrip("/")
        return path or "/"

    def _write_json(self, status: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self._normalized_path(self.path) == "/api/highscore":
            self._write_json(200, read_high_score())
            return
        super().do_GET()

    def do_POST(self):
        if self._normalized_path(self.path) != "/api/highscore":
            self.send_error(404, "Not Found")
            return
        content_len = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_len) if content_len > 0 else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._write_json(400, {"error": "Invalid JSON"})
            return

        incoming = normalize_record(payload if isinstance(payload, dict) else {})
        with HIGHSCORE_LOCK:
            current = read_high_score()
            if incoming["high_score"] > current["high_score"]:
                updated = write_high_score(incoming)
            else:
                updated = current
        self._write_json(200, updated)


def main():
    port = 8080
    httpd = ThreadingHTTPServer(("0.0.0.0", port), GameHandler)
    print(f"Serving on http://localhost:{port}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
