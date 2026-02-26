#!/usr/bin/env python3.14
import json
import tempfile
import threading
import time
import unittest
from http.client import HTTPConnection
from pathlib import Path

import server


class HighScoreApiSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmpdir = tempfile.TemporaryDirectory()
        cls._old_file = server.HIGHSCORE_FILE
        cls._old_lock = server.HIGHSCORE_LOCK
        cls._highscore_path = Path(cls._tmpdir.name) / "highscore.json"
        server.HIGHSCORE_FILE = cls._highscore_path
        server.HIGHSCORE_LOCK = threading.Lock()

        cls._httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.GameHandler)
        cls._port = cls._httpd.server_address[1]
        cls._thread = threading.Thread(target=cls._httpd.serve_forever, daemon=True)
        cls._thread.start()

        for _ in range(20):
            if cls._thread.is_alive():
                break
            time.sleep(0.01)

    @classmethod
    def tearDownClass(cls):
        cls._httpd.shutdown()
        cls._httpd.server_close()
        cls._thread.join(timeout=2)
        server.HIGHSCORE_FILE = cls._old_file
        server.HIGHSCORE_LOCK = cls._old_lock
        cls._tmpdir.cleanup()

    def setUp(self):
        if self._highscore_path.exists():
            self._highscore_path.unlink()

    def _request(self, method, path, payload=None):
        conn = HTTPConnection("127.0.0.1", self._port, timeout=2)
        headers = {}
        body = None
        if payload is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(payload)
        conn.request(method, path, body=body, headers=headers)
        res = conn.getresponse()
        data = res.read().decode("utf-8")
        conn.close()
        parsed = json.loads(data) if data else {}
        return res.status, parsed

    def test_get_returns_default(self):
        status, payload = self._request("GET", "/api/highscore")
        self.assertEqual(status, 200)
        self.assertEqual(payload["high_score"], 0)
        self.assertEqual(payload["high_score_user"], "-")

    def test_invalid_score_type_is_handled(self):
        status, payload = self._request(
            "POST",
            "/api/highscore",
            {"high_score": "abc", "high_score_user": "bad"},
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["high_score"], 0)
        self.assertEqual(payload["high_score_user"], "-")

    def test_higher_score_wins(self):
        status, payload = self._request(
            "POST",
            "/api/highscore",
            {"high_score": 321, "high_score_user": "alice"},
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["high_score"], 321)
        self.assertEqual(payload["high_score_user"], "alice")

        status, payload = self._request(
            "POST",
            "/api/highscore",
            {"high_score": 20, "high_score_user": "bob"},
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["high_score"], 321)
        self.assertEqual(payload["high_score_user"], "alice")


if __name__ == "__main__":
    unittest.main()
