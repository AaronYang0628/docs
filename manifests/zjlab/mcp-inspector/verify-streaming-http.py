#!/usr/bin/env python3
"""Verify a URL-based (streamable-http) MCP server through Inspector's bridge.

Usage: verify_nanhu.py BASE_URL TOKEN MCP_URL
Drive: connect -> SSE -> initialize -> initialized -> tools/list -> one
read-only tool call. Print tool names and any streamed notifications with
timing. Read-only: never calls mutating tools.
"""
import json
import sys
import threading
import time
import ssl
import urllib.request

urllib.request.install_opener(urllib.request.build_opener(
    urllib.request.ProxyHandler({}),
    urllib.request.HTTPSHandler(context=ssl._create_unverified_context())))

base, token, mcp_url = sys.argv[1].rstrip("/"), sys.argv[2], sys.argv[3]
HDRS = {"x-mcp-remote-auth": f"Bearer {token}",
        "Content-Type": "application/json"}

events = []
t0 = [None]
lock = threading.Lock()


def sse_reader(session_id):
    req = urllib.request.Request(
        f"{base}/api/mcp/events?sessionId={session_id}", headers=HDRS)
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            for raw in resp:
                line = raw.decode("utf-8", "replace").strip()
                if not line.startswith("data:"):
                    continue
                payload = line[5:].strip()
                if not payload:
                    continue
                try:
                    evt = json.loads(payload)
                except json.JSONDecodeError:
                    evt = {"raw": payload[:200]}
                now = time.monotonic()
                with lock:
                    events.append((now, evt))
                d = evt.get("data", {})
                rel = "" if t0[0] is None else f" (+{(now - t0[0]) * 1000:.0f}ms)"
                kind = evt.get("type", "?")
                m = d.get("method") or (f"result id={d.get('id')}" if "id" in d else "")
                print(f"[sse]{rel} {kind} {m}")
    except Exception as e:  # noqa: BLE001
        print(f"[sse] reader ended: {e}")


def send(sid, message):
    body = json.dumps({"sessionId": sid, "message": message}).encode()
    req = urllib.request.Request(f"{base}/api/mcp/send", data=body,
                                 headers=HDRS, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        out = json.loads(resp.read().decode())
    print(f"[send] id={message.get('id')} {message.get('method')} -> {json.dumps(out)[:120]}")
    return out


def wait_for(pred, timeout=30, desc=""):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        with lock:
            if any(pred(e) for _, e in events):
                return True
        time.sleep(0.05)
    print(f"[wait] TIMEOUT waiting for {desc}")
    return False


def result_by_id(i):
    with lock:
        for _, e in events:
            d = e.get("data", {})
            if d.get("id") == i and "result" in d:
                return d["result"]
    return None


def main():
    cfg = {"config": {"type": "streamable-http", "url": mcp_url},
           "serverName": "nanhu"}
    req = urllib.request.Request(f"{base}/api/mcp/connect",
                                 data=json.dumps(cfg).encode(),
                                 headers=HDRS, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        connect = json.loads(resp.read().decode())
    print(f"[connect] {json.dumps(connect)[:160]}")
    sid = connect.get("sessionId")
    if not sid:
        print("FAIL: no sessionId")
        return 2

    threading.Thread(target=sse_reader, args=(sid,), daemon=True).start()
    time.sleep(0.3)
    t0[0] = time.monotonic()

    send(sid, {"jsonrpc": "2.0", "id": 1, "method": "initialize",
               "params": {"protocolVersion": "2025-06-18", "capabilities": {},
                          "clientInfo": {"name": "verify-script", "version": "0.1"}}})
    init_ok = wait_for(lambda e: e.get("data", {}).get("id") == 1, 30, "initialize")
    info = result_by_id(1) or {}
    print(f"[init] serverInfo={json.dumps(info.get('serverInfo', {}))[:120]} "
          f"protocol={info.get('protocolVersion')}")
    if not init_ok:
        return 2
    send(sid, {"jsonrpc": "2.0", "method": "notifications/initialized"})

    send(sid, {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
    wait_for(lambda e: e.get("data", {}).get("id") == 2, 30, "tools/list")
    result = result_by_id(2) or {}
    tools = result.get("tools", [])
    print(f"[tools] {len(tools)}: {[t.get('name') for t in tools]}")

    send(sid, {"jsonrpc": "2.0", "id": 3, "method": "tools/call",
               "params": {"name": "list_projects", "arguments": {}}})
    call_ok = wait_for(lambda e: e.get("data", {}).get("id") == 3, 30,
                       "list_projects result")
    res = result_by_id(3)
    content = (res or {}).get("content", [])
    snippet = json.dumps(content)[:150] if content else json.dumps(res)[:150]
    print(f"[call] list_projects -> isError={ (res or {}).get('isError')} {snippet}")

    time.sleep(0.5)
    with lock:
        notes = [e for _, e in events
                 if str(e.get("data", {}).get("method", "")).startswith("notifications/")
                 and e.get("data", {}).get("method") != "notifications/initialized"]
        kinds = {}
        for e in notes:
            kinds[e["data"]["method"]] = kinds.get(e["data"]["method"], 0) + 1
    print(f"[stream] notifications observed: {kinds or 'none (call completed synchronously)'}")

    if init_ok and call_ok and not (res or {}).get("isError"):
        print("PASS: nanhu reachable through Inspector over streamable-http; "
              "full JSON-RPC session works")
        return 0
    print("FAIL")
    return 1


if __name__ == "__main__":
    sys.exit(main())
