import process from "node:process"

const SERVER_INFO = { name: "sub2api-72602-admin", version: "1.0.0" }
const BASE_URL = parseBaseUrl(process.env.SUB2API_BASE_URL)
const TIMEOUT_MS = parsePositiveInteger(process.env.SUB2API_TIMEOUT_MS, 30000)
const MAX_RECHARGE = parsePositiveNumber(process.env.SUB2API_MAX_RECHARGE, 10000)
const ADMIN_PATH_PREFIX = "/api/v1/admin/"
const SAFE_READ_PATHS = [
  /^\/api\/v1\/admin\/dashboard\/(?:snapshot-v2|stats|realtime|trend|models|groups|api-keys-trend|users-trend|users-ranking|user-breakdown)\/?$/,
  /^\/api\/v1\/admin\/ops\/(?:concurrency|user-concurrency|account-availability|realtime-traffic|system-logs\/health)\/?$/,
  /^\/api\/v1\/admin\/ops\/dashboard\/(?:snapshot-v2|overview|throughput-trend|latency-histogram|error-trend|error-distribution|openai-token-stats)\/?$/,
  /^\/api\/v1\/admin\/users(?:\/\d+)?\/?$/,
  /^\/api\/v1\/admin\/users\/\d+\/(?:usage|balance-history|subscriptions|attributes)\/?$/,
  /^\/api\/v1\/admin\/groups(?:\/\d+)?\/?$/,
  /^\/api\/v1\/admin\/groups\/(?:all|usage-summary|capacity-summary)\/?$/,
  /^\/api\/v1\/admin\/groups\/\d+\/(?:stats|rate-multipliers|subscriptions)\/?$/,
  /^\/api\/v1\/admin\/accounts(?:\/\d+)?\/?$/,
  /^\/api\/v1\/admin\/accounts\/\d+\/(?:stats|usage|today-stats|temp-unschedulable|models|scheduled-test-plans)\/?$/,
  /^\/api\/v1\/admin\/usage(?:\/stats|\/search-users|\/search-api-keys)?\/?$/,
  /^\/api\/v1\/admin\/settings\/(?:admin-api-key|overload-cooldown|stream-timeout|rectifier|beta-policy)\/?$/,
  /^\/api\/v1\/admin\/system\/(?:version|check-updates)\/?$/
]

const MODEL_CONTROL_GUIDANCE = {
  exact_model_rpm: {
    supported: false,
    explanation: "Sub2API v0.1.168 has no admin-configurable per-model RPM limit. RPM is scoped to a user, group, or user-group override."
  },
  user_rpm: {
    method: "PUT",
    path: "/api/v1/admin/users/:id",
    body: { rpm_limit: "non-negative integer; 0 follows backend unlimited/default semantics" }
  },
  group_rpm: {
    method: "PUT",
    path: "/api/v1/admin/groups/:id",
    body: { rpm_limit: "non-negative integer" }
  },
  temporary_unavailability: [
    "For a model served only by dedicated accounts, set every affected account schedulable=false; this disables every model on those accounts.",
    "For a restricted channel, remove the exact model from the channel pricing/model list while restrict_models=true.",
    "For a composite public model, disable the exact composite route.",
    "Changing models_list_config only hides discovery output and does not block direct requests."
  ],
  runtime_effect: "Scheduling and limit changes affect new requests. They do not cancel requests or streams already in progress."
}

const TOOLS = [
  {
    name: "describe",
    description: "Describe the scoped Sub2API operations available through this server and their safety constraints.",
    inputSchema: objectSchema({})
  },
  {
    name: "health",
    description: "Check the unauthenticated Sub2API /health route through the configured internal service URL.",
    inputSchema: objectSchema({})
  },
  {
    name: "read",
    description: "Call one allowlisted authenticated GET route for dashboard, ops, user, group, account, usage, safe settings metadata, or version state. Sensitive fields are recursively redacted.",
    inputSchema: objectSchema({
      path: { type: "string", description: "Absolute admin API path beginning with /api/v1/admin/." },
      query: { type: "object", additionalProperties: true }
    }, ["path"])
  },
  {
    name: "find_user",
    description: "Resolve exactly one Sub2API user by normalized email and return a minimal, redacted account summary.",
    inputSchema: objectSchema({
      email: { type: "string", minLength: 3 }
    }, ["email"])
  },
  {
    name: "preview_recharge",
    description: "Preview an additive user balance recharge without changing data. Returns the exact user id, status, current balance, and expected balance.",
    inputSchema: objectSchema({
      email: { type: "string", minLength: 3 },
      amount: { type: "number", exclusiveMinimum: 0 }
    }, ["email", "amount"])
  },
  {
    name: "recharge",
    description: "Add USD-style internal credit to one exact user with backend idempotency, identity revalidation, and post-change verification.",
    inputSchema: objectSchema({
      email: { type: "string", minLength: 3 },
      user_id: { type: "integer", minimum: 1 },
      amount: { type: "number", exclusiveMinimum: 0 },
      notes: { type: "string", minLength: 3, maxLength: 350 },
      idempotency_key: { type: "string", minLength: 16, maxLength: 128 },
      allow_inactive: { type: "boolean", default: false },
      confirmed: { type: "boolean", description: "Must be true only after the user confirms the previewed user id, email, and amount." }
    }, ["email", "user_id", "amount", "notes", "idempotency_key", "confirmed"])
  },
  {
    name: "update_user_limits",
    description: "Update global per-user RPM and/or concurrency after exact email and id verification. This is not a per-model limit.",
    inputSchema: objectSchema({
      email: { type: "string", minLength: 3 },
      user_id: { type: "integer", minimum: 1 },
      rpm_limit: { type: "integer", minimum: 0 },
      concurrency: { type: "integer", minimum: 0 },
      operation_key: { type: "string", minLength: 16, maxLength: 128 },
      reason: { type: "string", minLength: 3 },
      confirmed: { type: "boolean" }
    }, ["email", "user_id", "operation_key", "reason", "confirmed"])
  },
  {
    name: "set_account_schedulable",
    description: "Enable or disable scheduling for an entire upstream account. This affects all models served by that account and only new requests.",
    inputSchema: objectSchema({
      account_id: { type: "integer", minimum: 1 },
      schedulable: { type: "boolean" },
      operation_key: { type: "string", minLength: 16, maxLength: 128 },
      reason: { type: "string", minLength: 3 },
      confirmed: { type: "boolean" }
    }, ["account_id", "schedulable", "operation_key", "reason", "confirmed"])
  },
  {
    name: "model_control_options",
    description: "Explain the supported rate-limit scopes and safe ways to make a model temporarily unavailable in Sub2API v0.1.168.",
    inputSchema: objectSchema({})
  }
]

function objectSchema(properties, required = []) {
  return {
    type: "object",
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false
  }
}

function parseBaseUrl(value) {
  if (!value) {
    throw new Error("SUB2API_BASE_URL is required")
  }

  const url = new URL(value)
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("SUB2API_BASE_URL must use http or https")
  }

  const allowedHost = process.env.SUB2API_ALLOWED_HOST || "sub2api.application.svc.cluster.local"
  if (url.hostname !== allowedHost) {
    throw new Error(`SUB2API_BASE_URL host must be ${allowedHost}`)
  }

  url.pathname = url.pathname.replace(/\/+$/, "")
  return url
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function requireString(value, name, minimum = 1) {
  if (typeof value !== "string" || value.trim().length < minimum) {
    throw new Error(`${name} must be a string with at least ${minimum} characters`)
  }
  return value.trim()
}

function requirePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}

function requireBoolean(value, name) {
  if (typeof value !== "boolean") {
    throw new Error(`${name} must be a boolean`)
  }
  return value
}

function requireConfirmation(value) {
  if (value !== true) {
    throw new Error("confirmed must be true after the user confirms the exact mutation")
  }
}

function validateAmount(value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("amount must be greater than zero")
  }
  if (value > MAX_RECHARGE) {
    throw new Error(`amount exceeds the configured single-recharge maximum of ${MAX_RECHARGE}`)
  }
  return value
}

function validateAdminPath(path) {
  const normalized = requireString(path, "path")
  if (!normalized.startsWith(ADMIN_PATH_PREFIX) || /[?#\\]/.test(normalized)) {
    throw new Error(`path must begin with ${ADMIN_PATH_PREFIX} and query parameters must use the query object`)
  }
  if (/%(?:2e|2f|5c)/i.test(normalized) || normalized.split("/").some((segment) => segment === "." || segment === "..")) {
    throw new Error("path must not contain encoded separators or dot segments")
  }
  const url = new URL(normalized, BASE_URL)
  if (url.origin !== BASE_URL.origin || url.pathname !== normalized) {
    throw new Error("path normalization must not change the configured Sub2API origin or pathname")
  }
  return normalized
}

function validateSafeReadPath(path) {
  const normalized = validateAdminPath(path)
  if (!SAFE_READ_PATHS.some((pattern) => pattern.test(normalized))) {
    throw new Error("this admin GET route is not in the reviewed read allowlist")
  }
  return normalized
}

function validateOperationKey(value, name) {
  const key = requireString(value, name, 16)
  if (key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new Error(`${name} must be 16-128 URL-safe characters`)
  }
  return key
}

function appendQuery(url, query) {
  if (query === undefined) {
    return
  }
  if (!query || typeof query !== "object" || Array.isArray(query)) {
    throw new Error("query must be an object")
  }

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === null) {
      continue
    }
    const values = Array.isArray(rawValue) ? rawValue : [rawValue]
    for (const value of values) {
      const serialized = typeof value === "object" ? JSON.stringify(value) : String(value)
      url.searchParams.append(key, serialized)
    }
  }
}

async function parseResponse(response) {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function unwrapEnvelope(payload, status) {
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "code" in payload) {
    if (payload.code !== 0) {
      throw new ApiError(status, payload.message || "Sub2API returned an error", payload.data)
    }
    return payload.data
  }
  return payload
}

class ApiError extends Error {
  constructor(status, message, data) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

async function rawRequest(method, path, { query, body, headers = {} } = {}) {
  const url = new URL(path, BASE_URL)
  if (url.origin !== BASE_URL.origin) {
    throw new Error("request URL escaped the configured Sub2API origin")
  }
  appendQuery(url, query)

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })
  const payload = await parseResponse(response)
  if (!response.ok) {
    const message = payload && typeof payload === "object" ? payload.message : String(payload || response.statusText)
    throw new ApiError(response.status, message || `HTTP ${response.status}`, payload)
  }
  return { status: response.status, data: unwrapEnvelope(payload, response.status) }
}

function authHeaders() {
  const apiKey = requireString(process.env.SUB2API_ADMIN_API_KEY, "SUB2API_ADMIN_API_KEY", 16)
  return { "x-api-key": apiKey }
}

async function adminRequest(method, path, options = {}) {
  validateAdminPath(path)
  const headers = {
    ...authHeaders(),
    ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {})
  }
  return rawRequest(method, path, { ...options, headers })
}

function redact(value, seen = new WeakSet()) {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen))
  }
  if (!value || typeof value !== "object") {
    return value
  }
  if (seen.has(value)) {
    return "<circular>"
  }
  seen.add(value)

  const redacted = {}
  for (const [key, item] of Object.entries(value)) {
    if (/(?:password|secret|token|authorization|cookie|credential|api[_-]?key|private[_-]?key|access[_-]?key)/i.test(key)) {
      redacted[key] = "<redacted>"
    } else {
      redacted[key] = redact(item, seen)
    }
  }
  return redacted
}

function safeUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    balance: user.balance,
    frozen_balance: user.frozen_balance,
    concurrency: user.concurrency,
    rpm_limit: user.rpm_limit
  }
}

function safeAccount(account) {
  if (!account || typeof account !== "object") {
    return null
  }
  return {
    id: account.id,
    name: account.name,
    platform: account.platform,
    type: account.type,
    status: account.status,
    schedulable: account.schedulable,
    concurrency: account.concurrency,
    current_concurrency: account.current_concurrency,
    priority: account.priority
  }
}

function unwrapRecord(data, key) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return data
  }
  return data[key] && typeof data[key] === "object" ? data[key] : data
}

function extractItems(data) {
  if (Array.isArray(data)) {
    return data
  }
  if (!data || typeof data !== "object") {
    return []
  }
  for (const key of ["items", "users", "list", "records"]) {
    if (Array.isArray(data[key])) {
      return data[key]
    }
  }
  return []
}

async function findExactUser(email) {
  const normalizedEmail = requireString(email, "email", 3).toLowerCase()
  const exactMatches = []

  for (let page = 1; page <= 10; page += 1) {
    const result = await adminRequest("GET", "/api/v1/admin/users", {
      query: { search: normalizedEmail, page, page_size: 100 }
    })
    const items = extractItems(result.data)
    exactMatches.push(...items.filter((user) => String(user.email || "").trim().toLowerCase() === normalizedEmail))
    if (items.length < 100) {
      break
    }
  }

  const uniqueMatches = [...new Map(exactMatches.map((user) => [String(user.id), user])).values()]
  if (uniqueMatches.length !== 1) {
    throw new Error(`expected exactly one user matching ${normalizedEmail}; found ${uniqueMatches.length}`)
  }
  return uniqueMatches[0]
}

async function getUserById(id) {
  const result = await adminRequest("GET", `/api/v1/admin/users/${requirePositiveInteger(id, "user_id")}`)
  const user = unwrapRecord(result.data, "user")
  if (!user || typeof user !== "object") {
    throw new Error(`Sub2API returned no user for id ${id}`)
  }
  return user
}

function assertUserIdentity(user, email, userId) {
  const normalizedEmail = requireString(email, "email", 3).toLowerCase()
  if (Number(user.id) !== userId || String(user.email || "").trim().toLowerCase() !== normalizedEmail) {
    throw new Error("user id and exact normalized email no longer identify the same account")
  }
}

async function callTool(name, args) {
  const input = args && typeof args === "object" && !Array.isArray(args) ? args : {}

  switch (name) {
    case "describe":
      return {
        server: SERVER_INFO,
        authentication: "admin_api_key",
        safeguards: [
          "Only the configured cluster-local Sub2API host is accepted.",
          "Authenticated GET requests use a route allowlist and sensitive fields are recursively redacted.",
          "Mutations require OpenCode permission approval and confirmed=true.",
          "Recharge is additive only, exact-email/id matched, amount capped, and idempotency-key protected.",
          "Only dedicated mutation tools are exposed; generic authenticated writes are not available."
        ],
        tools: TOOLS.map(({ name: toolName, description }) => ({ name: toolName, description }))
      }

    case "health": {
      const result = await rawRequest("GET", "/health")
      return { status: result.status, data: redact(result.data) }
    }

    case "read": {
      const path = validateSafeReadPath(input.path)
      const result = await adminRequest("GET", path, { query: input.query })
      return { method: "GET", path, status: result.status, data: redact(result.data) }
    }

    case "find_user": {
      const user = await findExactUser(input.email)
      return { match: safeUser(user) }
    }

    case "preview_recharge": {
      const amount = validateAmount(input.amount)
      const user = await findExactUser(input.email)
      const balance = Number(user.balance)
      if (!Number.isFinite(balance)) {
        throw new Error("the matched user has a non-numeric balance")
      }
      return {
        operation: "add",
        unit: "USD-style internal credit",
        user: safeUser(user),
        amount,
        current_balance: balance,
        expected_balance_without_concurrent_usage: balance + amount
      }
    }

    case "recharge": {
      requireConfirmation(input.confirmed)
      const userId = requirePositiveInteger(input.user_id, "user_id")
      const amount = validateAmount(input.amount)
      const idempotencyKey = validateOperationKey(input.idempotency_key, "idempotency_key")
      const notes = requireString(input.notes, "notes", 3)
      const auditNotes = `${notes} [idempotency:${idempotencyKey}]`
      const matched = await findExactUser(input.email)
      assertUserIdentity(matched, input.email, userId)
      const before = await getUserById(userId)
      assertUserIdentity(before, input.email, userId)
      if (before.status !== "active" && input.allow_inactive !== true) {
        throw new Error(`user ${userId} is ${before.status}; set allow_inactive only after explicit confirmation`)
      }

      let mutation
      try {
        mutation = await adminRequest("POST", `/api/v1/admin/users/${userId}/balance`, {
          body: { balance: amount, operation: "add", notes: auditNotes },
          idempotencyKey
        })
      } catch (error) {
        error.message = `${error.message}. Retry only with the same idempotency_key ${idempotencyKey}`
        throw error
      }

      let after = null
      let auditRecord = null
      const verificationWarnings = []
      try {
        after = await getUserById(userId)
        assertUserIdentity(after, input.email, userId)
      } catch (error) {
        verificationWarnings.push(`user verification failed after accepted mutation: ${error.message}`)
      }
      try {
        const historyResult = await adminRequest("GET", `/api/v1/admin/users/${userId}/balance-history`, {
          query: { page: 1, page_size: 20, type: "admin_balance" }
        })
        auditRecord = extractItems(historyResult.data).find((record) =>
          record.type === "admin_balance" &&
          Number(record.used_by) === userId &&
          record.notes === auditNotes &&
          Math.abs(Number(record.value) - amount) < 1e-9
        ) || null
        if (!auditRecord) {
          verificationWarnings.push("the accepted mutation was not found in the best-effort admin balance history")
        }
      } catch (error) {
        verificationWarnings.push(`balance history verification failed: ${error.message}`)
      }

      const mutationUser = unwrapRecord(mutation.data, "user")
      const responseMatches = mutationUser && typeof mutationUser === "object" &&
        Number(mutationUser.id) === userId &&
        String(mutationUser.email || "").trim().toLowerCase() === String(before.email).trim().toLowerCase()
      const outcome = auditRecord ? "verified" : "accepted_unverified"

      return {
        outcome,
        operation: "add",
        unit: "USD-style internal credit",
        user_id: userId,
        email: String(before.email).trim().toLowerCase(),
        amount,
        before_balance: before.balance,
        after_balance: after?.balance,
        idempotency_key: idempotencyKey,
        mutation_status: mutation.status,
        mutation_response_user: responseMatches ? safeUser(mutationUser) : null,
        matching_balance_history_record: redact(auditRecord),
        verification_warnings: verificationWarnings
      }
    }

    case "update_user_limits": {
      requireConfirmation(input.confirmed)
      const userId = requirePositiveInteger(input.user_id, "user_id")
      const operationKey = validateOperationKey(input.operation_key, "operation_key")
      const reason = requireString(input.reason, "reason", 3)
      const body = {}
      for (const field of ["rpm_limit", "concurrency"]) {
        if (input[field] !== undefined) {
          if (!Number.isInteger(input[field]) || input[field] < 0) {
            throw new Error(`${field} must be a non-negative integer`)
          }
          body[field] = input[field]
        }
      }
      if (!Object.keys(body).length) {
        throw new Error("at least one of rpm_limit or concurrency is required")
      }
      const matched = await findExactUser(input.email)
      assertUserIdentity(matched, input.email, userId)
      const before = await getUserById(userId)
      assertUserIdentity(before, input.email, userId)
      const mutation = await adminRequest("PUT", `/api/v1/admin/users/${userId}`, {
        body
      })
      const after = await getUserById(userId)
      assertUserIdentity(after, input.email, userId)
      const mismatches = Object.entries(body)
        .filter(([field, value]) => Number(after[field]) !== value)
        .map(([field, value]) => `${field}: expected ${value}, got ${after[field]}`)
      return {
        outcome: mismatches.length ? "accepted_unverified" : "verified",
        user_id: userId,
        email: String(after.email).trim().toLowerCase(),
        reason,
        operation_key: operationKey,
        retry_guidance: "This set operation has no confirmed backend idempotency replay. Re-read current state before any retry.",
        before: safeUser(before),
        after: safeUser(after),
        mutation_status: mutation.status,
        verification_warnings: mismatches
      }
    }

    case "set_account_schedulable": {
      requireConfirmation(input.confirmed)
      const accountId = requirePositiveInteger(input.account_id, "account_id")
      const schedulable = requireBoolean(input.schedulable, "schedulable")
      const operationKey = validateOperationKey(input.operation_key, "operation_key")
      const reason = requireString(input.reason, "reason", 3)
      const before = await adminRequest("GET", `/api/v1/admin/accounts/${accountId}`)
      if (Number(before.data?.id) !== accountId) {
        throw new Error(`Sub2API returned no matching account for id ${accountId}`)
      }
      const mutation = await adminRequest("POST", `/api/v1/admin/accounts/${accountId}/schedulable`, {
        body: { schedulable }
      })
      const after = await adminRequest("GET", `/api/v1/admin/accounts/${accountId}`)
      const verified = Number(after.data?.id) === accountId && after.data?.schedulable === schedulable
      return {
        outcome: verified ? "verified" : "accepted_unverified",
        account_id: accountId,
        schedulable,
        scope_warning: "This changes scheduling for every model served by the account and affects only new requests.",
        reason,
        operation_key: operationKey,
        retry_guidance: "This set operation has no confirmed backend idempotency replay. Re-read current state before any retry.",
        before: safeAccount(before.data),
        after: safeAccount(after.data),
        mutation_status: mutation.status,
        verification_warnings: verified ? [] : ["account id or schedulable state did not match the requested post-state"]
      }
    }

    case "model_control_options":
      return MODEL_CONTROL_GUIDANCE

    default:
      throw new Error(`unknown tool: ${name}`)
  }
}

function toolResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }]
  }
}

function toolError(error) {
  const payload = {
    error: error instanceof Error ? error.message : String(error)
  }
  if (error instanceof ApiError) {
    payload.status = error.status
    payload.data = redact(error.data)
  }
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    isError: true
  }
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

async function handleMessage(message) {
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return
  }
  if (message.id === undefined) {
    return
  }

  try {
    let result
    switch (message.method) {
      case "initialize":
        result = {
          protocolVersion: message.params?.protocolVersion || "2024-11-05",
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO
        }
        break
      case "ping":
        result = {}
        break
      case "tools/list":
        result = { tools: TOOLS }
        break
      case "tools/call":
        try {
          result = toolResult(await callTool(message.params?.name, message.params?.arguments))
        } catch (error) {
          result = toolError(error)
        }
        break
      case "resources/list":
        result = { resources: [] }
        break
      case "prompts/list":
        result = { prompts: [] }
        break
      default:
        send({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "Method not found" } })
        return
    }
    send({ jsonrpc: "2.0", id: message.id, result })
  } catch (error) {
    send({
      jsonrpc: "2.0",
      id: message.id,
      error: { code: -32603, message: error instanceof Error ? error.message : "Internal error" }
    })
  }
}

let inputBuffer = ""
process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk) => {
  inputBuffer += chunk
  while (inputBuffer.includes("\n")) {
    const newline = inputBuffer.indexOf("\n")
    const line = inputBuffer.slice(0, newline).trim()
    inputBuffer = inputBuffer.slice(newline + 1)
    if (line) {
      try {
        void handleMessage(JSON.parse(line))
      } catch {
        send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } })
      }
    }
  }
})
