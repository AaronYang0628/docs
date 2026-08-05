import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createServer } from "node:http"
import { createInterface } from "node:readline"
import test from "node:test"

const serverScript = new URL("./server.mjs", import.meta.url)

async function startFixture() {
  let balance = 10
  const history = []
  const observed = []
  const user = () => ({
    id: 1,
    email: "alice@example.com",
    username: "alice",
    role: "user",
    status: "active",
    balance,
    frozen_balance: 0,
    concurrency: 5,
    rpm_limit: 60
  })

  const api = createServer(async (request, response) => {
    const chunks = []
    for await (const chunk of request) {
      chunks.push(chunk)
    }
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null
    observed.push({ method: request.method, url: request.url, headers: request.headers, body })

    const send = (status, payload) => {
      response.writeHead(status, { "Content-Type": "application/json" })
      response.end(JSON.stringify(payload))
    }

    if (request.url === "/health") {
      send(200, { status: "ok" })
      return
    }
    if (request.headers["x-api-key"] !== "admin-test-key-1234567890") {
      send(401, { code: 401, message: "unauthorized" })
      return
    }
    if (request.url === "/api/v1/admin/system/version") {
      send(200, { code: 0, message: "success", data: { version: "0.1.168" } })
      return
    }
    if (request.url?.startsWith("/api/v1/admin/users?")) {
      send(200, { code: 0, message: "success", data: { items: [user()], total: 1, page: 1, page_size: 100, pages: 1 } })
      return
    }
    if (request.url === "/api/v1/admin/users/1" && request.method === "GET") {
      send(200, { code: 0, message: "success", data: user() })
      return
    }
    if (request.url === "/api/v1/admin/users/1/balance" && request.method === "POST") {
      balance += body.balance
      history.unshift({
        id: 9,
        type: "admin_balance",
        value: body.balance,
        status: "used",
        used_by: 1,
        notes: body.notes
      })
      send(200, { code: 0, message: "success", data: user() })
      return
    }
    if (request.url?.startsWith("/api/v1/admin/users/1/balance-history?")) {
      send(200, { code: 0, message: "success", data: { items: history, total: history.length, page: 1, page_size: 20, pages: 1 } })
      return
    }
    send(404, { code: 404, message: "not found" })
  })

  await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve))
  const address = api.address()
  const child = spawn(process.execPath, [serverScript.pathname], {
    env: {
      ...process.env,
      SUB2API_BASE_URL: `http://127.0.0.1:${address.port}`,
      SUB2API_ALLOWED_HOST: "127.0.0.1",
      SUB2API_ADMIN_API_KEY: "admin-test-key-1234567890",
      SUB2API_TIMEOUT_MS: "2000",
      SUB2API_MAX_RECHARGE: "100"
    },
    stdio: ["pipe", "pipe", "pipe"]
  })

  const pending = new Map()
  const stderr = []
  let nextId = 1
  createInterface({ input: child.stdout }).on("line", (line) => {
    const message = JSON.parse(line)
    const handler = pending.get(message.id)
    if (handler) {
      pending.delete(message.id)
      handler.resolve(message)
    }
  })
  child.stderr.on("data", (chunk) => stderr.push(chunk.toString("utf8")))

  const request = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId
    nextId += 1
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`MCP request timed out: ${method}; stderr=${stderr.join("")}`))
    }, 3000)
    pending.set(id, {
      resolve: (message) => {
        clearTimeout(timer)
        resolve(message)
      }
    })
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`)
  })

  await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test", version: "1" }
  })

  return {
    observed,
    request,
    async close() {
      child.stdin.end()
      child.kill("SIGTERM")
      await new Promise((resolve) => api.close(resolve))
    }
  }
}

function parsedToolResult(message) {
  return JSON.parse(message.result.content[0].text)
}

test("lists scoped tools and serves allowlisted reads", async (t) => {
  const fixture = await startFixture()
  t.after(() => fixture.close())

  const listed = await fixture.request("tools/list")
  const names = listed.result.tools.map((tool) => tool.name)
  assert.ok(names.includes("recharge"))
  assert.ok(names.includes("read"))
  assert.ok(!names.includes("mutate"))

  const health = parsedToolResult(await fixture.request("tools/call", { name: "health", arguments: {} }))
  assert.deepEqual(health, { status: 200, data: { status: "ok" } })

  const version = parsedToolResult(await fixture.request("tools/call", {
    name: "read",
    arguments: { path: "/api/v1/admin/system/version" }
  }))
  assert.equal(version.data.version, "0.1.168")
})

test("rejects path traversal and non-allowlisted reads before HTTP", async (t) => {
  const fixture = await startFixture()
  t.after(() => fixture.close())
  const before = fixture.observed.length

  const traversal = await fixture.request("tools/call", {
    name: "read",
    arguments: { path: "/api/v1/admin/../auth/me" }
  })
  assert.equal(traversal.result.isError, true)

  const settings = await fixture.request("tools/call", {
    name: "read",
    arguments: { path: "/api/v1/admin/settings" }
  })
  assert.equal(settings.result.isError, true)
  assert.equal(fixture.observed.length, before)
})

test("recharges one exact user with a stable idempotency key and audit evidence", async (t) => {
  const fixture = await startFixture()
  t.after(() => fixture.close())

  const preview = parsedToolResult(await fixture.request("tools/call", {
    name: "preview_recharge",
    arguments: { email: "Alice@example.com", amount: 5 }
  }))
  assert.equal(preview.user.id, 1)
  assert.equal(preview.current_balance, 10)
  assert.equal(preview.expected_balance_without_concurrent_usage, 15)

  const operationKey = "recharge-test-00000001"
  const recharge = parsedToolResult(await fixture.request("tools/call", {
    name: "recharge",
    arguments: {
      email: "alice@example.com",
      user_id: 1,
      amount: 5,
      notes: "test recharge",
      idempotency_key: operationKey,
      confirmed: true
    }
  }))
  assert.equal(recharge.outcome, "verified")
  assert.equal(recharge.before_balance, 10)
  assert.equal(recharge.after_balance, 15)
  assert.equal(recharge.matching_balance_history_record.value, 5)

  const mutation = fixture.observed.find((request) => request.url === "/api/v1/admin/users/1/balance")
  assert.equal(mutation.headers["idempotency-key"], operationKey)
  assert.equal(mutation.body.operation, "add")
  assert.match(mutation.body.notes, /\[idempotency:recharge-test-00000001\]$/)
})
