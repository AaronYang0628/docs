#!/usr/bin/env python3
"""Small public JSON API for Homepage's personal portal tools."""

import json
import os
import re
import secrets
import sqlite3
import threading
import time
import unicodedata
from datetime import date, datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit


BASE_PATH = "/api/portal-tools"
DB_PATH = os.environ.get("PORTAL_DATA_DB", "/data/portal.db")
PORT = int(os.environ.get("PORT", "8080"))
MAX_BODY_BYTES = 16 * 1024
MAX_COUNTDOWNS = 100
MAX_TASKS = 200
WRITE_LIMIT = 30
WRITE_WINDOW_SECONDS = 60
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
BIDI_CONTROLS = {
    0x061C,
    0x200E,
    0x200F,
    0x202A,
    0x202B,
    0x202C,
    0x202D,
    0x202E,
    0x2066,
    0x2067,
    0x2068,
    0x2069,
}

rate_lock = threading.Lock()
write_attempts = {}


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def connect_db():
    parent = os.path.dirname(DB_PATH)
    if parent:
        os.makedirs(parent, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=5)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


def initialize_db():
    connection = connect_db()
    try:
        connection.execute("PRAGMA journal_mode = WAL")
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS countdowns (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                target TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        seeded = connection.execute("SELECT value FROM meta WHERE key = 'seeded'").fetchone()
        if seeded is None:
            timestamp = now_iso()
            connection.execute(
                "INSERT OR IGNORE INTO countdowns "
                "(id, label, target, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                ("retirement-countdown", "退休", "2043-10-19", timestamp, timestamp),
            )
            connection.execute("INSERT INTO meta (key, value) VALUES ('seeded', '1')")
        connection.commit()
    finally:
        connection.close()


def row_to_countdown(row):
    return {
        "id": row["id"],
        "label": row["label"],
        "target": row["target"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def row_to_task(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "done": bool(row["done"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def get_data():
    connection = connect_db()
    try:
        countdowns = connection.execute(
            "SELECT * FROM countdowns ORDER BY target ASC, created_at ASC"
        ).fetchall()
        tasks = connection.execute(
            "SELECT * FROM tasks ORDER BY done ASC, created_at DESC"
        ).fetchall()
        return {
            "countdowns": [row_to_countdown(row) for row in countdowns],
            "tasks": [row_to_task(row) for row in tasks],
            "updatedAt": now_iso(),
        }
    finally:
        connection.close()


def validate_text(value, field, max_length):
    if not isinstance(value, str):
        raise ValueError(f"{field} must be text")
    value = unicodedata.normalize("NFC", value).strip()
    if not value:
        raise ValueError(f"{field} cannot be empty")
    if len(value) > max_length:
        raise ValueError(f"{field} is too long")
    for character in value:
        codepoint = ord(character)
        if codepoint < 0x20 or 0x7F <= codepoint <= 0x9F:
            raise ValueError(f"{field} contains unsupported control characters")
        if character in "<>":
            raise ValueError(f"{field} accepts plain text and emoji only")
        if codepoint in BIDI_CONTROLS:
            raise ValueError(f"{field} contains unsupported formatting characters")
    return value


def validate_target(value):
    if not isinstance(value, str) or not DATE_RE.fullmatch(value):
        raise ValueError("target must be an ISO date such as 2043-10-19")
    try:
        date.fromisoformat(value)
    except ValueError as error:
        raise ValueError("target is not a valid date") from error
    return value


def new_id():
    return secrets.token_urlsafe(12)


def validate_id(value):
    if not isinstance(value, str) or not ID_RE.fullmatch(value):
        raise ValueError("invalid item id")
    return value


def request_ip(handler):
    forwarded = handler.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",", 1)[0].strip()[:80]
    return handler.headers.get("X-Real-IP", "")[:80] or handler.client_address[0]


def allow_write(ip):
    current = time.monotonic()
    with rate_lock:
        attempts = [stamp for stamp in write_attempts.get(ip, []) if current - stamp < WRITE_WINDOW_SECONDS]
        if len(attempts) >= WRITE_LIMIT:
            write_attempts[ip] = attempts
            return False
        attempts.append(current)
        write_attempts[ip] = attempts
        if len(write_attempts) > 1000:
            write_attempts.clear()
        return True


class PortalHandler(BaseHTTPRequestHandler):
    server_version = "PortalData/1.0"

    def log_message(self, format_string, *args):
        print(f"{self.address_string()} - {format_string % args}", flush=True)

    def send_json(self, status, payload, extra_headers=None):
        body = b"" if status == 204 else json.dumps(
            payload, ensure_ascii=False, separators=(",", ":")
        ).encode("utf-8")
        self.send_response(status)
        if status != 204:
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        if extra_headers:
            for name, value in extra_headers.items():
                self.send_header(name, value)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def send_error_json(self, status, message, extra_headers=None):
        self.send_json(status, {"error": message}, extra_headers)

    def do_OPTIONS(self):
        if self.path.startswith(BASE_PATH):
            self.send_response(204)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
        else:
            self.send_error(404)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == f"{BASE_PATH}/healthz":
            self.send_json(200, {"status": "ok"})
            return
        if path == BASE_PATH or path == f"{BASE_PATH}/":
            self.send_json(200, get_data())
            return
        self.send_error_json(404, "not found")

    def do_POST(self):
        if not allow_write(request_ip(self)):
            self.send_error_json(429, "too many writes", {"Retry-After": str(WRITE_WINDOW_SECONDS)})
            return
        try:
            payload = self.read_json()
            path = self.api_path()
            if path == ["countdowns"]:
                self.create_countdown(payload)
            elif path == ["tasks"]:
                self.create_task(payload)
            else:
                self.send_error_json(404, "not found")
        except ValueError as error:
            self.send_error_json(400, str(error))
        except sqlite3.Error:
            self.send_error_json(503, "storage temporarily unavailable")

    def do_PATCH(self):
        if not allow_write(request_ip(self)):
            self.send_error_json(429, "too many writes", {"Retry-After": str(WRITE_WINDOW_SECONDS)})
            return
        try:
            payload = self.read_json()
            path = self.api_path()
            if len(path) == 2 and path[0] == "countdowns":
                self.update_countdown(path[1], payload)
            elif len(path) == 2 and path[0] == "tasks":
                self.update_task(path[1], payload)
            else:
                self.send_error_json(404, "not found")
        except ValueError as error:
            self.send_error_json(400, str(error))
        except sqlite3.Error:
            self.send_error_json(503, "storage temporarily unavailable")

    def do_DELETE(self):
        if not allow_write(request_ip(self)):
            self.send_error_json(429, "too many writes", {"Retry-After": str(WRITE_WINDOW_SECONDS)})
            return
        try:
            path = self.api_path()
            if len(path) == 2 and path[0] == "countdowns":
                self.delete_item("countdowns", path[1])
            elif len(path) == 2 and path[0] == "tasks":
                self.delete_item("tasks", path[1])
            else:
                self.send_error_json(404, "not found")
        except ValueError as error:
            self.send_error_json(400, str(error))
        except sqlite3.Error:
            self.send_error_json(503, "storage temporarily unavailable")

    def api_path(self):
        path = urlsplit(self.path).path
        if not path.startswith(f"{BASE_PATH}/"):
            raise ValueError("not found")
        suffix = path[len(BASE_PATH) :].strip("/")
        if not suffix:
            return []
        return [unquote(part) for part in suffix.split("/")]

    def read_json(self):
        content_type = self.headers.get("Content-Type", "")
        if not content_type.lower().startswith("application/json"):
            raise ValueError("Content-Type must be application/json")
        try:
            length = int(self.headers.get("Content-Length", "-1"))
        except ValueError as error:
            raise ValueError("invalid request body") from error
        if length < 0 or length > MAX_BODY_BYTES:
            raise ValueError("request body is too large")
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValueError("request body must be valid JSON") from error
        if not isinstance(payload, dict):
            raise ValueError("request body must be an object")
        return payload

    def create_countdown(self, payload):
        label = validate_text(payload.get("label"), "label", 48)
        target = validate_target(payload.get("target"))
        connection = connect_db()
        try:
            if connection.execute("SELECT COUNT(*) FROM countdowns").fetchone()[0] >= MAX_COUNTDOWNS:
                raise ValueError("too many countdowns")
            timestamp = now_iso()
            item = (new_id(), label, target, timestamp, timestamp)
            connection.execute(
                "INSERT INTO countdowns (id, label, target, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                item,
            )
            connection.commit()
            self.send_json(201, {"countdown": row_to_countdown(connection.execute("SELECT * FROM countdowns WHERE id = ?", (item[0],)).fetchone())})
        finally:
            connection.close()

    def update_countdown(self, item_id, payload):
        item_id = validate_id(item_id)
        if "label" not in payload and "target" not in payload:
            raise ValueError("nothing to update")
        connection = connect_db()
        try:
            current = connection.execute("SELECT * FROM countdowns WHERE id = ?", (item_id,)).fetchone()
            if current is None:
                self.send_error_json(404, "countdown not found")
                return
            label = validate_text(payload.get("label", current["label"]), "label", 48)
            target = validate_target(payload.get("target", current["target"]))
            timestamp = now_iso()
            connection.execute(
                "UPDATE countdowns SET label = ?, target = ?, updated_at = ? WHERE id = ?",
                (label, target, timestamp, item_id),
            )
            connection.commit()
            updated = connection.execute("SELECT * FROM countdowns WHERE id = ?", (item_id,)).fetchone()
            self.send_json(200, {"countdown": row_to_countdown(updated)})
        finally:
            connection.close()

    def create_task(self, payload):
        title = validate_text(payload.get("title"), "title", 140)
        connection = connect_db()
        try:
            if connection.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] >= MAX_TASKS:
                raise ValueError("too many tasks")
            timestamp = now_iso()
            item = (new_id(), title, 0, timestamp, timestamp)
            connection.execute(
                "INSERT INTO tasks (id, title, done, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                item,
            )
            connection.commit()
            created = connection.execute("SELECT * FROM tasks WHERE id = ?", (item[0],)).fetchone()
            self.send_json(201, {"task": row_to_task(created)})
        finally:
            connection.close()

    def update_task(self, item_id, payload):
        item_id = validate_id(item_id)
        if "title" not in payload and "done" not in payload:
            raise ValueError("nothing to update")
        connection = connect_db()
        try:
            current = connection.execute("SELECT * FROM tasks WHERE id = ?", (item_id,)).fetchone()
            if current is None:
                self.send_error_json(404, "task not found")
                return
            title = validate_text(payload.get("title", current["title"]), "title", 140)
            done = payload.get("done", bool(current["done"]))
            if not isinstance(done, bool):
                raise ValueError("done must be boolean")
            timestamp = now_iso()
            connection.execute(
                "UPDATE tasks SET title = ?, done = ?, updated_at = ? WHERE id = ?",
                (title, int(done), timestamp, item_id),
            )
            connection.commit()
            updated = connection.execute("SELECT * FROM tasks WHERE id = ?", (item_id,)).fetchone()
            self.send_json(200, {"task": row_to_task(updated)})
        finally:
            connection.close()

    def delete_item(self, table, item_id):
        item_id = validate_id(item_id)
        connection = connect_db()
        try:
            result = connection.execute(f"DELETE FROM {table} WHERE id = ?", (item_id,))
            connection.commit()
            if result.rowcount == 0:
                self.send_error_json(404, "item not found")
                return
            self.send_json(204, {})
        finally:
            connection.close()


def main():
    initialize_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), PortalHandler)
    print(f"portal-data listening on {PORT}, database={DB_PATH}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
