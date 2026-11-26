#!/usr/bin/env python3
"""Verify MCP Inspector's streaming path end-to-end over its own bridge API.

Flow (exactly what the browser UI does):
  1. POST /api/mcp/connect  -> spawn the stdio MCP server, get a sessionId
  2. GET  /api/mcp/events?sessionId=...  -> SSE stream (timestamps recorded)
  3. POST /api/mcp/send  -> initialize / initialized / tools/list / tools/call
  4. Assert >=2 notifications/progress arrive BEFORE the final tools/call result

Usage: verify_stream.py BASE_URL TOKEN [MCP_COMMAND [MCP_ARG...]]
"""
import json
import sys
import threading
import time
import ssl
import urllib.request

base, token = sys.argv[1].rstrip("/"), sys.argv[2]
# Internal endpoints: never route through ambient proxy env vars.
# Internal endpoints: never route through ambient proxy env vars;
# skip TLS verification for the self-signed deployment cert.
urllib.request.install_opener(urllib.request.build_opener(
    urllib.request.ProxyHandler({}),
    urllib.request.HTTPSHandler(context=ssl._create_unverified_context())))
command = sys.argv[3] if len(sys.argv) > 3 else "mcp-server-everything"
args = sys.argv[4:]

HDRS = {"x-mcp-remote-auth": f"Bearer {token}",
        "Content-Type": "application/json"}

events = []          # (monotonic_ts, parsed_event)
t_call = [None]      # ts of tools/call send
lock = threading.Lock()


def sse_reader(session_id):
    req = urllib.request.Request(
        f"{base}/api/mcp/events?sessionId={session_id}", headers=HDRS)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            print(f"[sse] connected status={resp.status}")
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
                rel = "" if t_call[0] is None else f" (+{(now - t_call[0]) * 1000:.0f}ms)"
                kind = evt.get("message", {}).get("method") or evt.get("type") or "?"
                print(f"[sse]{rel} event kind={kind}")
    except Exception as e:  # noqa: BLE001
        print(f"[sse] reader ended: {e}")


def send(session_id, message):
    body = json.dumps({"sessionId": session_id, "message": message}).encode()
    req = urllib.request.Request(f"{base}/api/mcp/send", data=body,
                                 headers=HDRS, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        out = json.loads(resp.read().decode())
    print(f"[send] id={message.get('id')} -> {json.dumps(out)[:200]}")
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


def main():
    # 1. connect
    cfg = {"config": {"type": "stdio", "command": command, "args": args},
           "serverName": "verify"}
    req = urllib.request.Request(f"{base}/api/mcp/connect",
                                 data=json.dumps(cfg).encode(),
                                 headers=HDRS, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        connect = json.loads(resp.read().decode())
    print(f"[connect] {json.dumps(connect)[:200]}")
    sid = connect.get("sessionId") or connect.get("session", {}).get("id")
    if not sid:
        print("FAIL: no sessionId in connect response")
        return 2

    # 2. SSE stream
    threading.Thread(target=sse_reader, args=(sid,), daemon=True).start()
    time.sleep(0.5)

    # 3. handshake
    send(sid, {"jsonrpc": "2.0", "id": 1, "method": "initialize",
               "params": {"protocolVersion": "2025-06-18",
                          "capabilities": {},
                          "clientInfo": {"name": "verify-script", "version": "0.1"}}})
    wait_for(lambda e: e.get("data", {}).get("id") == 1, 30, "initialize result")
    send(sid, {"jsonrpc": "2.0", "method": "notifications/initialized"})

    send(sid, {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
    ok = wait_for(lambda e: e.get("data", {}).get("id") == 2, 30, "tools/list result")
    tools = []
    with lock:
        for _, e in events:
            m = e.get("data", {})
            if m.get("id") == 2 and isinstance(m.get("result"), dict):
                tools = m["result"].get("tools", [])
                break
    names = [t.get("name") for t in tools]
    print(f"[tools] {names}")

    # 4. pick a progress-emitting tool
    prefs = ["longRunningOperation", "long_running", "runToolWithProgress",
             "startEphemeralTask", "slow", "progress", "stream"]
    chosen, call_args = None, {}
    for kw in prefs:
        for t in tools:
            blob = (t.get("name", "") + " " + (t.get("description") or "")).lower()
            if kw in blob:
                chosen = t
                break
        if chosen:
            break
    if not chosen:
        chosen = tools[0] if tools else None
    if chosen:
        schema = (chosen.get("inputSchema") or {}).get("properties", {})
        for k, v in schema.items():
            if v.get("type") == "integer":
                call_args[k] = min(v.get("maximum", 2), 3)
            elif v.get("type") == "string":
                call_args[k] = "verify"
            elif v.get("type") == "boolean":
                call_args[k] = False
    print(f"[call] tool={chosen.get('name') if chosen else None} args={call_args}")
    if not chosen:
        print("FAIL: no tools available")
        return 2

    t_call[0] = time.monotonic()
    send(sid, {"jsonrpc": "2.0", "id": 3, "method": "tools/call",
               "params": {"name": chosen["name"], "arguments": call_args,
                          "_meta": {"progressToken": "tok-verify-1"}}})

    got_result = wait_for(lambda e: e.get("data", {}).get("id") == 3, 60,
                          "tools/call result")

    time.sleep(0.5)
    with lock:
        m3 = [e for _, e in events if e.get("data", {}).get("id") == 3]
        result_ts = None
        for ts, e in events:
            if e.get("data", {}).get("id") == 3:
                result_ts = ts
                break
        prog = [(ts, e) for ts, e in events
                if e.get("data", {}).get("method") == "notifications/progress"
                and (result_ts is None or ts < result_ts)]
        logged = [(ts, e) for ts, e in events
                  if e.get("data", {}).get("method") == "notifications/message"]
        if result_ts:
            deltas = [f"{(ts - t_call[0]) * 1000:.0f}ms" for ts, _ in prog]
            print(f"[assert] notifications/progress BEFORE result: {len(prog)} at {deltas}")
            print(f"[assert] logging notifications: {len(logged)}")

    if got_result and len(prog) >= 2:
        print("PASS: streaming verified (multiple progress notifications "
              "arrived before the final result)")
        return 0
    print(f"FAIL: got_result={got_result} pre_result_progress={len(prog)}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
