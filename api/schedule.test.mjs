import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import schedule from "./schedule.js";
import configModule from "../lib/scheduling/config.js";
import slotsModule from "../lib/scheduling/slots.js";
import googleModule from "../lib/scheduling/google.js";
import serviceModule from "../lib/scheduling/service.js";

const { createHandler } = schedule;
const { loadConfig } = configModule;
const { createSchedulingService } = serviceModule;
const { createGoogleClient } = googleModule;
const NOW = new Date("2026-10-12T12:00:00Z");
const env = {
  GOOGLE_CALENDAR_CLIENT_ID: "test-client", GOOGLE_CALENDAR_CLIENT_SECRET: "test-secret",
  GOOGLE_CALENDAR_REFRESH_TOKEN: "test-refresh", GOOGLE_CALENDAR_ID: "test-calendar",
  SCHEDULING_MIN_NOTICE_HOURS: "0", SCHEDULING_DAYS_AHEAD: "1", SCHEDULING_HOURS: "10:00-12:00",
  NODE_ENV: "production", SCHEDULING_ORIGINS: "https://acelera.agency", RATE_LIMIT_SALT: "test-salt",
};
const config = loadConfig(env);
const booking = {
  start: "2026-10-12T13:00:00.000Z", name: "Ana Pérez", email: "ana@example.test", company: "Norte",
  requestId: "821ea9e1-9a1c-4b82-8971-843a28474a30",
};
const input = overrides => ({ ...booking, ...overrides, start: new Date(overrides?.start || booking.start) });

function fakeGoogle() {
  const events = new Map();
  const calls = { busy: 0, insert: 0, get: 0 };
  return {
    events, calls,
    async eventIds() { return new Set(events.keys()); },
    async busy() { calls.busy++; return [...events.values()].filter(e => e.status !== "cancelled").map(e => ({ start: new Date(e.start.dateTime), end: new Date(e.end.dateTime) })); },
    async getEvent(_, id) { calls.get++; return events.has(id) ? structuredClone(events.get(id)) : null; },
    async insertEvent(_, event) {
      calls.insert++;
      if (events.has(event.id)) throw Object.assign(new Error("exists"), { status: 409 });
      const saved = { ...structuredClone(event), status: "confirmed", hangoutLink: "https://meet.google.com/abc-defg-hij" };
      events.set(event.id, saved);
      return structuredClone(saved);
    },
  };
}

function response() {
  return { statusCode: 200, headers: {}, body: "", setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, writeHead(s, h) { this.statusCode = s; Object.assign(this.headers, h); }, end(body) { this.body = body; } };
}
async function call(handler, body, overrides = {}) {
  const req = { method: body === undefined ? "GET" : "POST", headers: { origin: "https://acelera.agency", "content-type": "application/json", "sec-fetch-site": "same-origin" }, socket: { remoteAddress: "192.0.2.1" }, body, ...overrides };
  const res = response();
  await handler(req, res);
  return { status: res.statusCode, headers: res.headers, data: JSON.parse(res.body) };
}
function setup(overrides = {}) {
  const google = fakeGoogle();
  const service = createSchedulingService({ google, now: () => NOW });
  return { google, service, handler: createHandler({ env: { ...env, ...overrides }, service }) };
}

test("unconfigured calendar returns no invented availability, even locally", async () => {
  const service = createSchedulingService({ google: { busy() { assert.fail("No Google call"); } } });
  const handler = createHandler({ env: { NODE_ENV: "development" }, service });
  const result = await call(handler);
  assert.deepEqual(result.data, { configured: false, timeZone: "America/Argentina/Buenos_Aires", slotMinutes: 30, slots: [] });
  const post = await call(handler, booking, { headers: { origin: "http://localhost:4173", "content-type": "application/json" } });
  assert.equal(post.status, 503);
  assert.equal(post.data.error, "calendar_unconfigured");
});

test("availability honors timezone, busy intervals and a bounded read cache", async () => {
  const { google, service } = setup();
  google.busy = async () => { google.calls.busy++; return [{ start: new Date("2026-10-12T13:10:00Z"), end: new Date("2026-10-12T13:40:00Z") }]; };
  const first = await service.availability(config);
  assert.deepEqual(first.slots, ["2026-10-12T14:00:00.000Z", "2026-10-12T14:30:00.000Z"]);
  await service.availability(config);
  assert.equal(google.calls.busy, 1);
  assert.equal(slotsModule.zonedTimeToUtc({ year: 2026, month: 7, day: 1 }, 600, "America/New_York").toISOString(), "2026-07-01T14:00:00.000Z");
  assert.equal(slotsModule.zonedTimeToUtc({ year: 2026, month: 1, day: 1 }, 600, "America/New_York").toISOString(), "2026-01-01T15:00:00.000Z");
});

test("booking rechecks availability and never accepts an off-grid instant", async () => {
  const { google, service } = setup();
  await service.availability(config);
  google.busy = async () => [{ start: new Date(booking.start), end: new Date("2026-10-12T13:30:00Z") }];
  assert.deepEqual(await service.book(config, input()), { ok: false, reason: "slot_taken" });
  assert.deepEqual(await service.book(config, input({ start: "2026-10-12T14:10:00Z" })), { ok: false, reason: "slot_taken" });
  assert.equal(google.calls.insert, 0);
});

test("booking creates only Acelera branding, an attendee and a Meet request", async () => {
  const { google, handler } = setup();
  const result = await call(handler, booking);
  assert.equal(result.status, 200);
  assert.equal(result.data.meetLink, "https://meet.google.com/abc-defg-hij");
  const event = [...google.events.values()][0];
  assert.match(event.id, /^[0-9a-f]{64}$/);
  assert.equal(event.summary, "Acelera × Ana Pérez");
  assert.equal(event.source.title, "Acelera");
  assert.equal(event.source.url, "https://acelera.agency/");
  assert.doesNotMatch(event.description, /Atrae/);
  assert.deepEqual(event.attendees, [{ email: booking.email, displayName: booking.name }]);
  assert.equal(event.conferenceData.createRequest.conferenceSolutionKey.type, "hangoutsMeet");
  assert.equal(result.headers["cache-control"], "no-store");
});

test("an identical retry returns the original event without another invitation", async () => {
  const { google, service } = setup();
  const first = await service.book(config, input());
  // A new service instance proves correctness does not rely on an in-memory success map.
  const restarted = createSchedulingService({ google, now: () => new Date("2026-10-13T12:00:00Z") });
  assert.deepEqual(await restarted.book(config, input()), first);
  assert.equal(google.calls.insert, 1);
  assert.deepEqual(await restarted.book(config, input({ email: "someone@example.test" })), { ok: false, reason: "slot_taken" });
});

test("concurrent same-slot requests in one worker are serialized", async () => {
  const { google, service } = setup();
  const results = await Promise.all([
    service.book(config, input()),
    service.book(config, input({ requestId: "955656ee-5baa-4e43-9716-2186bc271c38", email: "other@example.test" })),
  ]);
  assert.equal(results.filter(r => r.ok).length, 1);
  assert.equal(results.filter(r => r.reason === "slot_taken").length, 1);
  assert.equal(google.calls.insert, 1);
});

test("Google's duplicate-ID response reconciles races across separate workers", async () => {
  const google = fakeGoogle();
  const originalInsert = google.insertEvent;
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  let arrivals = 0;
  google.insertEvent = async (...args) => { if (++arrivals === 2) release(); await barrier; return originalInsert(...args); };
  const worker = () => createSchedulingService({ google, now: () => NOW });
  const results = await Promise.all([
    worker().book(config, input()),
    worker().book(config, input({ requestId: "955656ee-5baa-4e43-9716-2186bc271c38", email: "other@example.test" })),
  ]);
  assert.equal(arrivals, 2);
  assert.equal(google.events.size, 1);
  assert.equal(results.filter(r => r.ok).length, 1);
  assert.equal(results.filter(r => r.reason === "slot_taken").length, 1);
});

test("a lost insert response is reconciled by event ID, without retrying the write", async () => {
  const { google, service } = setup();
  const insert = google.insertEvent;
  google.insertEvent = async (...args) => { await insert(...args); throw new TypeError("network response lost"); };
  assert.equal((await service.book(config, input())).ok, true);
  assert.equal(google.calls.insert, 1);
});

test("cancelled or someone else's events cannot yield another attendee's confirmation", async () => {
  const { google, service } = setup();
  await service.book(config, input());
  const saved = [...google.events.values()][0];
  saved.status = "cancelled";
  assert.deepEqual(await service.book(config, input()), { ok: false, reason: "slot_taken" });
  assert.equal(google.calls.insert, 1);
});

test("cancelled and moved deterministic IDs are removed from availability after a restart", async () => {
  for (const change of ["cancelled", "moved"]) {
    const { google, service } = setup();
    await service.book(config, input());
    const event = [...google.events.values()][0];
    if (change === "cancelled") {
      // A deleted event may expose only its ID and status.
      google.events.set(event.id, { id: event.id, status: "cancelled" });
    } else {
      event.start.dateTime = "2027-01-12T13:00:00Z";
      event.end.dateTime = "2027-01-12T13:30:00Z";
    }
    const restarted = createSchedulingService({ google, now: () => NOW });
    const availability = await restarted.availability(config);
    assert.equal(availability.slots.includes(booking.start), false);
    assert.equal(availability.slots.includes("2026-10-12T13:30:00.000Z"), true);
    assert.deepEqual(await restarted.book(config, input()), { ok: false, reason: "slot_taken" });
    assert.equal(google.calls.insert, 1);
  }
});

test("CSRF rejects missing/foreign origins and ignores spoofed Host/forwarded headers", async () => {
  const { handler, google } = setup();
  for (const headers of [
    { "content-type": "application/json" },
    { origin: "https://evil.example", host: "evil.example", "x-forwarded-host": "evil.example", "content-type": "application/json" },
    { origin: "null", "content-type": "application/json" },
    { origin: "https://acelera.agency/path", "content-type": "application/json" },
    { origin: "https://acelera.agency", "sec-fetch-site": "cross-site", "content-type": "application/json" },
    { origin: "http://localhost:4173", "content-type": "application/json" },
    { origin: "https://acelera.agency", "content-type": "text/plain" },
  ]) assert.equal((await call(handler, booking, { headers })).status, 403);
  assert.equal(google.calls.insert, 0);
});

test("validation, honeypot and 8 KiB limit reject before touching Google", async () => {
  const { handler, google } = setup();
  for (const body of [null, [], { ...booking, email: "bad" }, { ...booking, name: "X" }, { ...booking, requestId: "not-a-uuid" }, { ...booking, start: "tomorrow" }, { ...booking, website: "bot.example" }]) {
    assert.equal((await call(handler, body)).status, 400);
  }
  assert.equal((await call(handler, { ...booking, note: "x".repeat(9000) }, { socket: { remoteAddress: "192.0.2.2" } })).status, 413);
  const req = Readable.from([Buffer.alloc(9000, 32)]);
  Object.assign(req, { method: "POST", headers: { origin: "https://acelera.agency", "content-type": "application/json" } });
  const res = response();
  await handler(req, res);
  assert.equal(res.statusCode, 413);
  assert.equal(google.calls.insert, 0);
});

test("per-caller booking limits cannot be bypassed by spoofing forwarded headers locally", async () => {
  const { handler } = setup();
  for (let i = 0; i < 6; i++) {
    const result = await call(handler, { ...booking, name: `Person ${i}`, start: "2026-10-12T22:00:00Z" }, { headers: { origin: "https://acelera.agency", "content-type": "application/json", "x-forwarded-for": `192.0.2.${i}` } });
    assert.equal(result.status, 409);
  }
  assert.equal((await call(handler, { ...booking, name: "Person 7" })).status, 429);
});

test("same successful request retries do not consume the booking quota again", async () => {
  const { handler, google } = setup();
  for (let i = 0; i < 8; i++) assert.equal((await call(handler, booking)).status, 200);
  assert.equal(google.calls.insert, 1);
});

test("definitively failed identical requests are not exempted from booking limits", async () => {
  const { handler } = setup();
  const unavailable = { ...booking, start: "2026-10-12T22:00:00Z" };
  for (let i = 0; i < 6; i++) assert.equal((await call(handler, unavailable)).status, 409);
  assert.equal((await call(handler, unavailable)).status, 429);
});

test("idempotent retries still have a bounded request rate", async () => {
  const { handler, google } = setup();
  for (let i = 0; i < 30; i++) assert.equal((await call(handler, booking)).status, 200);
  const rejected = await call(handler, booking);
  assert.equal(rejected.status, 429);
  assert.ok(Number(rejected.headers["retry-after"]) > 0);
  assert.equal(google.calls.insert, 1);
});

test("explicit local origins work without trusting a supplied host header", async () => {
  const { service } = setup();
  const handler = createHandler({ env: { ...env, NODE_ENV: "development", SCHEDULING_ORIGINS: "http://127.0.0.1:4173,http://localhost:4173" }, service });
  assert.equal((await call(handler, booking, { headers: { origin: "http://127.0.0.1:4173", "content-type": "application/json", host: "untrusted.example" } })).status, 200);
});

test("Google errors never expose provider details or pretend the calendar is free", async () => {
  const google = { async busy() { throw new Error("private Google detail"); }, async eventIds() { return new Set(); } };
  const handler = createHandler({ env, service: createSchedulingService({ google, now: () => NOW }) });
  assert.deepEqual((await call(handler)).data, { error: "calendar_unavailable" });
  const provider = createGoogleClient({ fetch: async url => ({ ok: true, json: async () => url.includes("oauth2") ? { access_token: "test-token" } : { calendars: { "test-calendar": { errors: [{ reason: "notFound" }], busy: [] } } } }) });
  await assert.rejects(provider.busy(config, { start: NOW, end: new Date(NOW.getTime() + 86400000) }), /availability_unavailable/);
});

test("Google transport requests invitation delivery, Meet and an abortable timeout", async () => {
  const calls = [];
  const google = createGoogleClient({ fetch: async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => url.includes("oauth2") ? { access_token: "test-token", expires_in: 3600 } : { id: "event" } };
  } });
  await google.insertEvent(config, { id: "abcde", summary: "Acelera" });
  const request = calls.at(-1);
  assert.match(request.url, /sendUpdates=all/);
  assert.match(request.url, /conferenceDataVersion=1/);
  assert.ok(request.init.signal instanceof AbortSignal);
  assert.equal(request.init.headers.authorization, "Bearer test-token");
});

test("Google event-ID index includes tombstones and paginates without requesting private event content", async () => {
  const calls = [];
  const google = createGoogleClient({ fetch: async (url, init) => {
    calls.push({ url, init });
    const data = url.includes("oauth2") ? { access_token: "test-token" } : url.includes("pageToken=") ? { items: [{ id: "moved" }] } : { items: [{ id: "deleted" }], nextPageToken: "next" };
    return { ok: true, json: async () => data };
  } });
  assert.deepEqual([...await google.eventIds(config)], ["deleted", "moved"]);
  for (const call of calls.filter(c => !c.url.includes("oauth2"))) {
    const url = new URL(call.url);
    assert.equal(url.searchParams.get("showDeleted"), "true");
    assert.equal(url.searchParams.get("fields"), "nextPageToken,items(id)");
    assert.equal(url.searchParams.has("timeMin"), false);
    assert.equal(url.searchParams.has("timeMax"), false);
    assert.equal(call.init.method, "GET");
  }
});

test("an incomplete Google event-ID index fails closed", async () => {
  const google = createGoogleClient({ fetch: async url => ({ ok: true, json: async () => url.includes("oauth2") ? { access_token: "test-token" } : { items: [], nextPageToken: "more" } }) });
  await assert.rejects(google.eventIds(config), /event_index_incomplete/);
});

test("service accounts without delegation are not advertised as bookable", () => {
  const base = { GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "service@example.test", private_key: "test-only" }) };
  assert.equal(loadConfig(base).google, null);
  assert.equal(loadConfig({ ...base, GOOGLE_CALENDAR_IMPERSONATE: "host@example.test" }).google.kind, "service_account");
});
