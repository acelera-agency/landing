const { createHash, createSign } = require("node:crypto");
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_URL = "https://www.googleapis.com/calendar/v3";

class GoogleCalendarError extends Error {
  constructor(status, reason = "calendar_request_failed") {
    super(reason);
    this.name = "GoogleCalendarError";
    this.status = status;
  }
}

function createGoogleClient({ fetch: fetcher = (...args) => fetch(...args), timeoutMs = 10_000 } = {}) {
  const tokens = new Map();
  async function request(url, init, signal) {
    const timeout = AbortSignal.timeout(timeoutMs);
    const response = await fetcher(url, { ...init, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new GoogleCalendarError(response.status);
    return data;
  }

  async function accessToken(credentials, signal) {
    const key = createHash("sha256").update(JSON.stringify(credentials)).digest("hex");
    const cached = tokens.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    let body;
    if (credentials.kind === "refresh_token") {
      body = new URLSearchParams({ grant_type: "refresh_token", client_id: credentials.clientId, client_secret: credentials.clientSecret, refresh_token: credentials.refreshToken });
    } else {
      const iat = Math.floor(Date.now() / 1000);
      const head = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
      const claims = Buffer.from(JSON.stringify({ iss: credentials.clientEmail, sub: credentials.impersonate, scope: "https://www.googleapis.com/auth/calendar", aud: TOKEN_URL, iat, exp: iat + 3600 })).toString("base64url");
      const signature = createSign("RSA-SHA256").update(`${head}.${claims}`).sign(credentials.privateKey.replace(/\\n/g, "\n")).toString("base64url");
      body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claims}.${signature}` });
    }
    const data = await request(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body }, signal);
    if (typeof data.access_token !== "string") throw new GoogleCalendarError(502, "token_unavailable");
    if (tokens.size > 4) tokens.clear();
    tokens.set(key, { value: data.access_token, expiresAt: Date.now() + Math.max(0, Number(data.expires_in || 3600) - 60) * 1000 });
    return data.access_token;
  }

  async function calendar(config, path, method, body, signal, query = {}) {
    const token = await accessToken(config.google, signal);
    const url = new URL(CALENDAR_URL + path);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    return request(url.toString(), {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }, signal);
  }

  return {
    async eventIds(config, signal) {
      // Only IDs are read: no titles, notes, attendees or other calendar content.
      // Include tombstones and events moved outside the availability window: their
      // old deterministic IDs still cannot be inserted again. Fail closed if the
      // bounded index is incomplete, rather than advertising an unbookable slot.
      const ids = new Set();
      let pageToken;
      for (let page = 0; page < 8; page++) {
        const data = await calendar(config, `/calendars/${encodeURIComponent(config.calendarId)}/events`, "GET", undefined, signal, {
          showDeleted: "true", singleEvents: "false", maxResults: "2500",
          fields: "nextPageToken,items(id)", ...(pageToken ? { pageToken } : {}),
        });
        if (data.items !== undefined && !Array.isArray(data.items)) throw new GoogleCalendarError(502, "event_index_invalid");
        for (const event of data.items || []) {
          if (typeof event.id !== "string") throw new GoogleCalendarError(502, "event_index_invalid");
          ids.add(event.id);
        }
        if (!data.nextPageToken) return ids;
        pageToken = data.nextPageToken;
      }
      throw new GoogleCalendarError(502, "event_index_incomplete");
    },
    async busy(config, window, signal) {
      const data = await calendar(config, "/freeBusy", "POST", {
        timeMin: window.start.toISOString(), timeMax: window.end.toISOString(), items: [{ id: config.calendarId }],
      }, signal);
      const entry = data.calendars?.[config.calendarId];
      if (!entry || entry.errors?.length || !Array.isArray(entry.busy)) throw new GoogleCalendarError(502, "availability_unavailable");
      return entry.busy.map(b => {
        const start = new Date(b.start), end = new Date(b.end);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new GoogleCalendarError(502, "availability_invalid");
        return { start, end };
      });
    },
    async getEvent(config, id, signal) {
      try { return await calendar(config, `/calendars/${encodeURIComponent(config.calendarId)}/events/${id}`, "GET", undefined, signal); }
      catch (error) {
        if (error.status === 404) return null;
        if (error.status === 410) return { id, status: "cancelled" };
        throw error;
      }
    },
    async insertEvent(config, event, signal) {
      return calendar(config, `/calendars/${encodeURIComponent(config.calendarId)}/events`, "POST", event, signal, { sendUpdates: "all", conferenceDataVersion: "1" });
    },
  };
}

module.exports = { createGoogleClient, GoogleCalendarError };
