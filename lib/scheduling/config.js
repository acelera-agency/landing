const DEFAULT_ZONE = "America/Argentina/Buenos_Aires";

function integer(value, fallback, min, max) {
  const n = Number(value);
  return value !== undefined && Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

function minutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || "");
  if (!match) return null;
  const hour = Number(match[1]), minute = Number(match[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}

function loadCredentials(env) {
  const clientId = env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  const refreshToken = env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim();
  if (clientId && clientSecret && refreshToken) return { kind: "refresh_token", clientId, clientSecret, refreshToken };
  const raw = env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const account = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    const impersonate = env.GOOGLE_CALENDAR_IMPERSONATE?.trim();
    // Google refuses invitations from a service account without Workspace delegation.
    if (account.client_email && account.private_key && impersonate) {
      return { kind: "service_account", clientEmail: account.client_email, privateKey: account.private_key, impersonate };
    }
  } catch { /* Invalid configuration must never fabricate bookable slots. */ }
  return null;
}

function loadConfig(env = process.env) {
  let timeZone = env.SCHEDULING_TIME_ZONE?.trim() || DEFAULT_ZONE;
  try { new Intl.DateTimeFormat("en", { timeZone }).format(); } catch { timeZone = DEFAULT_ZONE; }
  const weekdays = [...new Set((env.SCHEDULING_WEEKDAYS || "1,2,3,4,5").split(",").map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 7))];
  const hours = (env.SCHEDULING_HOURS || "10:00-18:00").split("-");
  const start = minutes(hours[0]), end = minutes(hours[1]);
  const validHours = start !== null && end !== null && end > start;
  const sourceUrl = "https://acelera.agency/";
  return {
    google: loadCredentials(env),
    calendarId: env.GOOGLE_CALENDAR_ID?.trim() || "primary",
    hostName: "Acelera",
    sourceUrl,
    rules: {
      timeZone,
      weekdays: weekdays.length ? weekdays : [1, 2, 3, 4, 5],
      dayStartMinutes: validHours ? start : 600,
      dayEndMinutes: validHours ? end : 1080,
      slotMinutes: integer(env.SCHEDULING_SLOT_MINUTES, 30, 15, 120),
      daysAhead: integer(env.SCHEDULING_DAYS_AHEAD, 21, 1, 60),
      minNoticeMinutes: integer(env.SCHEDULING_MIN_NOTICE_HOURS, 3, 0, 168) * 60,
    },
  };
}

module.exports = { loadConfig };
