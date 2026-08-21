import base64
import hashlib
import importlib.util
import json
import os
import sqlite3
import tempfile
import threading
import unittest
from http.client import HTTPResponse
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen


APP_PATH = os.path.join(os.path.dirname(__file__), "app.py")


def load_app(db_path):
    os.environ["PORTAL_DATA_DB"] = db_path
    os.environ["PORTAL_DATA_PASSWORD_HASH"] = make_password_hash("correct horse")
    os.environ["PORTAL_DATA_SYNC_TOKEN"] = "sync-token-for-tests"
    spec = importlib.util.spec_from_file_location("portal_data_test_app", APP_PATH)
    app = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(app)
    return app


def make_password_hash(password):
    iterations = 100_000
    salt = b"test-salt-123456"
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    encode = lambda value: base64.urlsafe_b64encode(value).decode().rstrip("=")
    return f"pbkdf2_sha256${iterations}${encode(salt)}${encode(digest)}"


class PortalDataTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "portal.db")
        self.app = load_app(self.db_path)
        self.app.write_attempts.clear()
        self.app.auth_attempts.clear()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_legacy_schema_migrates_without_losing_data(self):
        connection = sqlite3.connect(self.db_path)
        connection.executescript(
            """
            CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
            CREATE TABLE countdowns (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                target TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO meta VALUES ('seeded', '1');
            INSERT INTO countdowns VALUES ('legacy-id', '旧倒计时', '2043-10-19', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
            INSERT INTO tasks VALUES ('legacy-task', '旧任务', 0, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
            """
        )
        connection.commit()
        connection.close()

        self.app.initialize_db()
        data = self.app.get_data()
        countdown = next(item for item in data["countdowns"] if item["id"] == "legacy-id")
        task = next(item for item in data["tasks"] if item["id"] == "legacy-task")
        self.assertEqual(countdown["calendar"], "gregorian")
        self.assertIsNone(task["dueDate"])

    def test_calendar_and_due_date_validation(self):
        self.assertEqual(self.app.validate_countdown_target("08-15", "lunar"), "08-15")
        self.assertEqual(self.app.validate_countdown_target("2043-10-19", "gregorian"), "2043-10-19")
        self.assertEqual(self.app.validate_due_date("2026-12-31"), "2026-12-31")
        self.assertIsNone(self.app.validate_due_date(None))
        with self.assertRaises(ValueError):
            self.app.validate_countdown_target("13-01", "lunar")
        with self.assertRaises(ValueError):
            self.app.validate_due_date("2026-02-30")

    def test_password_verification(self):
        self.assertTrue(self.app.verify_password("correct horse"))
        self.assertFalse(self.app.verify_password("wrong password"))

    def test_http_auth_and_allowlist_sync(self):
        self.app.initialize_db()
        server = ThreadingHTTPServer(("127.0.0.1", 0), self.app.PortalHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base_url = f"http://127.0.0.1:{server.server_port}{self.app.BASE_PATH}"
        try:
            status, created = self.call(base_url + "/countdowns", "POST", {
                "label": "测试",
                "target": "2043-10-19",
                "calendar": "gregorian",
            })
            self.assertEqual(status, 201)
            countdown_id = created["countdown"]["id"]

            status, _ = self.call(base_url + f"/countdowns/{countdown_id}", "PATCH", {
                "label": "未授权修改",
            })
            self.assertEqual(status, 401)

            status, _ = self.call(
                base_url + f"/countdowns/{countdown_id}",
                "PATCH",
                {"label": "密码修改"},
                {"X-Portal-Password": "correct horse"},
            )
            self.assertEqual(status, 200)

            status, _ = self.call(
                base_url + "/allowlist",
                "POST",
                {"source": "72602", "ip": "203.0.113.10"},
                {"Authorization": "Bearer " + "-".join(("sync", "token", "for", "tests"))},
            )
            self.assertEqual(status, 200)
            self.assertIn("203.0.113.10", self.app.allowed_ips())

            status, _ = self.call(
                base_url + f"/countdowns/{countdown_id}",
                "PATCH",
                {"label": "白名单修改"},
                {"X-Real-IP": "203.0.113.10"},
            )
            self.assertEqual(status, 200)

            status, task = self.call(base_url + "/tasks", "POST", {
                "title": "DDL 测试",
                "dueDate": "2099-12-31",
            })
            self.assertEqual(status, 201)
            self.assertEqual(task["task"]["dueDate"], "2099-12-31")
        finally:
            server.shutdown()
            thread.join(timeout=5)
            server.server_close()

    @staticmethod
    def call(url, method, payload=None, headers=None):
        body = None
        request_headers = dict(headers or {})
        if payload is not None:
            body = json.dumps(payload).encode()
            request_headers["Content-Type"] = "application/json"
        request = Request(url, data=body, headers=request_headers, method=method)
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, PortalDataTests.read_response(response)
        except HTTPError as error:
            try:
                return error.code, PortalDataTests.read_response(error)
            finally:
                error.close()

    @staticmethod
    def read_response(response: HTTPResponse):
        body = response.read()
        return json.loads(body.decode()) if body else None


if __name__ == "__main__":
    unittest.main()
