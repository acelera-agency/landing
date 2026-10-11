const { createHash, randomBytes } = require("node:crypto");
const { loadConfig } = require("../lib/scheduling/config.js");
const { createSchedulingService } = require("../lib/scheduling/service.js");

const MAX_BODY_BYTES = 8 * 1024;
function header(req, name) {
  const value = req.headers?.get ? req.headers.get(name) : req.headers?.[name];
  return typeof value === "string" ? value : "";
}
function send(res, status, data, extra = {}) {
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...extra };
  for (const [key, value] of Object.entries(headers)) res.setHeader?.(key, value);
  if (typeof res.status === "function" && typeof res.json === "function") return res.status(status).json(data);
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}

function allowedOrigin(req, env) {
  if (header(req, "sec-fetch-site").toLowerCase() === "cross-site") return false;
  const supplied = header(req, "origin");
  if (!supplied || supplied === "null") return false;
  let url;
  try { url = new URL(supplied); } catch { return false; }
  if (supplied !== url.origin) return false;
  const defaults = ["https://acelera.agency", "https://www.acelera.agency"];
  if (env.NODE_ENV !== "production" && env.VERCEL !== "1") {
    const port = /^\d{1,5}$/.test(env.PORT || "") ? env.PORT : "4173";
    defaults.push(`http://127.0.0.1:${port}`, `http://localhost:${port}`);
  }
  const configured = (env.SCHEDULING_ORIGINS || defaults.join(",")).split(",");
  // Never derive trust from Host, forwarded headers, or request parameters.
  return configured.some(value => {
    try {
      const origin = new URL(value.trim());
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
      return origin.origin === supplied && !origin.username && !origin.password && (origin.protocol === "https:" || (origin.protocol === "http:" && local && env.VERCEL !== "1" && env.NODE_ENV !== "production"));
    } catch { return false; }
  });
}

async function readBody(req) {
  const contentLength = header(req, "content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)) throw Object.assign(new Error("body_too_large"), { status: 413 });
  if (req.body !== undefined) {
    const text = typeof req.body === "string" ? req.body : Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw Object.assign(new Error("body_too_large"), { status: 413 });
    return JSON.parse(text);
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const timer = setTimeout(() => finish(Object.assign(new Error("body_timeout"), { status: 408 })), 5000);
    function cleanup() {
      clearTimeout(timer);
      req.removeListener("data", onData); req.removeListener("end", onEnd); req.removeListener("error", onError); req.removeListener("aborted", onAborted);
    }
    function finish(error, body) { cleanup(); if (error) { req.resume?.(); reject(error); } else resolve(body); }
    function onData(chunk) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > MAX_BODY_BYTES) return finish(Object.assign(new Error("body_too_large"), { status: 413 }));
      chunks.push(bytes);
    }
    function onEnd() { try { finish(null, JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch (error) { finish(error); } }
    function onError(error) { finish(error); }
    function onAborted() { finish(new Error("body_aborted")); }
    req.on("data", onData); req.on("end", onEnd); req.on("error", onError); req.on("aborted", onAborted);
  });
}

function parseBooking(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const text = (key, max, required = false) => {
    if (value[key] === undefined && !required) return "";
    if (typeof value[key] !== "string" || value[key].length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value[key])) return null;
    return value[key].trim();
  };
  const name = text("name", 80, true), email = text("email", 120, true), company = text("company", 80), note = text("note", 500), website = text("website", 200);
  const requestId = text("requestId", 36, true);
  const iso = text("start", 35, true);
  if (!name || name.length < 2 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || company === null || note === null || website === null) return null;
  if (!requestId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) return null;
  if (!iso || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(iso)) return null;
  const start = new Date(iso);
  if (!Number.isFinite(start.getTime())) return null;
  return { start, name, email: email.toLowerCase(), company, note, website, requestId: requestId.toLowerCase() };
}

function createLimiter(env, clock = Date.now) {
  const buckets = new Map(), accepted = new Map();
  const salt = env.RATE_LIMIT_SALT || randomBytes(16).toString("hex");
  function identityFor(req) {
    // Only the Vercel platform may supply this header; local servers use the socket.
    const address = env.VERCEL === "1" ? header(req, "x-vercel-forwarded-for") || "unknown" : req.socket?.remoteAddress || "unknown";
    return createHash("sha256").update(`${salt}:${address}`).digest("hex");
  }
  function retryKey(identity, input) { return createHash("sha256").update(JSON.stringify([identity, input])).digest("hex"); }
  const check = (req, kind, input) => {
    const time = clock(), windowMs = kind === "GET" ? 60_000 : 3_600_000;
    for (const [key, value] of buckets) if (value.expires <= time) buckets.delete(key);
    for (const [key, expires] of accepted) if (expires <= time) accepted.delete(key);
    const identity = identityFor(req);
    const retry = input ? retryKey(identity, input) : "";
    if (buckets.size >= 4997) return 60;
    // Idempotent retries do not spend another booking, but still have a request cap.
    if (kind === "POST") {
      const burstKey = `burst:${identity}`;
      const burst = buckets.get(burstKey) || { count: 0, expires: time + 60_000 };
      if (burst.count >= 30) return Math.ceil((burst.expires - time) / 1000);
      burst.count++; buckets.set(burstKey, burst);
    }
    if (retry && accepted.has(retry)) return 0;
    const specs = kind === "GET" ? [[`${kind}:${identity}`, 120], [`${kind}:all`, 1200]] : [[`${kind}:${identity}`, 6], [`${kind}:all`, 60]];
    for (const [key, limit] of specs) {
      const bucket = buckets.get(key);
      if (bucket?.count >= limit) return Math.ceil((bucket.expires - time) / 1000);
    }
    for (const [key] of specs) {
      const bucket = buckets.get(key) || { count: 0, expires: time + windowMs };
      bucket.count++; buckets.set(key, bucket);
    }
    return 0;
  };
  return { check, confirm(req, input) { accepted.set(retryKey(identityFor(req), input), clock() + 3_600_000); } };
}

function createHandler({ env = process.env, service = createSchedulingService(), clock } = {}) {
  // Process-local protection only; production replicas need shared limits at the edge.
  const rateLimit = createLimiter(env, clock);
  return async (req, res) => {
    if (!["GET", "POST"].includes(req.method)) return send(res, 405, { error: "invalid_request" }, { allow: "GET, POST" });
    if (req.method === "POST" && (!allowedOrigin(req, env) || !/^application\/json(?:\s*;|$)/i.test(header(req, "content-type")))) return send(res, 403, { error: "invalid_request" });
    let input;
    if (req.method === "POST") {
      try { input = parseBooking(await readBody(req)); } catch (error) { return send(res, error.status || 400, { error: "invalid_request" }); }
      if (!input) return send(res, 400, { error: "invalid_request" });
    }
    const retryAfter = rateLimit.check(req, req.method, input);
    if (retryAfter) return send(res, 429, { error: "rate_limited" }, { "retry-after": String(retryAfter) });
    if (input?.website) return send(res, 400, { error: "invalid_request" });
    const config = loadConfig(env);
    const signal = AbortSignal.timeout(22_000);
    try {
      if (req.method === "GET") return send(res, 200, await service.availability(config, signal));
      const result = await service.book(config, input, signal);
      if (result.ok) { rateLimit.confirm(req, input); return send(res, 200, result); }
      return send(res, result.reason === "slot_taken" ? 409 : 503, { error: result.reason });
    } catch (error) {
      // Do not log provider payloads, account identifiers, tokens, or visitor details.
      return send(res, error.name === "TimeoutError" || error.name === "AbortError" ? 504 : 502, { error: "calendar_unavailable" });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
