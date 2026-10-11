const { createHash } = require("node:crypto");
const { generateSlots, excludeBusy, availabilityWindow } = require("./slots.js");
const { createGoogleClient } = require("./google.js");
const hash = value => createHash("sha256").update(value).digest("hex");
const eventId = (config, start) => hash(`acelera-schedule-v1:${config.calendarId}:${start.toISOString()}`);

function createSchedulingService({ google = createGoogleClient(), now = () => new Date() } = {}) {
  const cache = new Map();
  const locks = new Map();
  function configKey(config) { return hash(JSON.stringify([config.calendarId, config.google, config.rules])); }
  async function openSlots(config, date, signal, fresh = false) {
    const key = configKey(config), cached = cache.get(key);
    if (!fresh && cached && date.getTime() - cached.at < 60_000) return cached.slots.filter(s => s.getTime() >= date.getTime() + config.rules.minNoticeMinutes * 60_000);
    const [busy, reservedIds] = await Promise.all([
      google.busy(config, availabilityWindow(config.rules, date), signal),
      google.eventIds(config, signal),
    ]);
    const slots = excludeBusy(generateSlots(config.rules, date), config.rules.slotMinutes, busy).filter(start => !reservedIds.has(eventId(config, start)));
    if (cache.size > 8) cache.clear();
    cache.set(key, { slots, at: date.getTime() });
    return slots;
  }
  function outcome(event, fingerprint, input) {
    if (event.status === "cancelled" || event.extendedProperties?.private?.aceleraRequest !== fingerprint) return { ok: false, reason: "slot_taken" };
    const start = new Date(event.start?.dateTime), end = new Date(event.end?.dateTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) throw new Error("event_confirmation_invalid");
    if (start.getTime() !== input.start.getTime()) return { ok: false, reason: "slot_taken" };
    const candidate = event.hangoutLink || event.conferenceData?.entryPoints?.find(e => e.entryPointType === "video")?.uri;
    let meetLink;
    try { const url = new URL(candidate); if (url.protocol === "https:" && url.hostname === "meet.google.com") meetLink = url.href; } catch { /* Meet can still be pending. */ }
    return { ok: true, start: start.toISOString(), end: end.toISOString(), ...(meetLink ? { meetLink } : {}) };
  }
  async function book(config, input, signal) {
    if (!config.google) return { ok: false, reason: "calendar_unconfigured" };
    // A calendar/slot has one stable Google event ID, shared across workers. A 409
    // reconciles duplicate inserts; the local mutex serializes this worker. This
    // is not a distributed lock or a transaction with other booking channels.
    const id = eventId(config, input.start);
    const fingerprint = hash(JSON.stringify([input.requestId, input.start.toISOString(), input.name, input.email, input.company || "", input.note || ""]));
    const previous = locks.get(id) || Promise.resolve();
    const operation = previous.catch(() => {}).then(async () => {
      signal?.throwIfAborted();
      const existing = await google.getEvent(config, id, signal);
      if (existing) return outcome(existing, fingerprint, input);
      const date = now();
      if (!generateSlots(config.rules, date).some(s => s.getTime() === input.start.getTime())) return { ok: false, reason: "slot_taken" };
      const slots = await openSlots(config, date, signal, true);
      if (!slots.some(s => s.getTime() === input.start.getTime())) {
        // Another worker may have completed the very same request while we checked.
        const settled = await google.getEvent(config, id, signal);
        return settled ? outcome(settled, fingerprint, input) : { ok: false, reason: "slot_taken" };
      }
      const end = new Date(input.start.getTime() + config.rules.slotMinutes * 60_000);
      const event = {
        id,
        summary: `Acelera × ${input.name}`,
        description: ["Reunión pedida desde la página de Acelera.", "", `Nombre: ${input.name}`, `Email: ${input.email}`, ...(input.company ? [`Empresa: ${input.company}`] : []), ...(input.note ? ["", input.note] : [])].join("\n"),
        start: { dateTime: input.start.toISOString(), timeZone: config.rules.timeZone },
        end: { dateTime: end.toISOString(), timeZone: config.rules.timeZone },
        attendees: [{ email: input.email, displayName: input.name }],
        reminders: { useDefault: true }, guestsCanInviteOthers: false, guestsCanModify: false,
        source: { title: "Acelera", url: config.sourceUrl },
        extendedProperties: { private: { aceleraRequest: fingerprint } },
        conferenceData: { createRequest: { requestId: id, conferenceSolutionKey: { type: "hangoutsMeet" } } },
      };
      try {
        const created = await google.insertEvent(config, event, signal);
        return outcome(created, fingerprint, input);
      } catch (error) {
        // A 409 or an uncertain network outcome can mean the event already exists.
        // Never insert a different ID or send a second invitation on a retry.
        if (error.status === 409 || !error.status || error.status >= 500) {
          const settled = await google.getEvent(config, id, signal).catch(() => null);
          if (settled) return outcome(settled, fingerprint, input);
          if (error.status === 409) return { ok: false, reason: "slot_taken" };
        }
        throw error;
      } finally { cache.delete(configKey(config)); }
    });
    locks.set(id, operation);
    try { return await operation; } finally { if (locks.get(id) === operation) locks.delete(id); }
  }
  return {
    async availability(config, signal) {
      return { configured: !!config.google, timeZone: config.rules.timeZone, slotMinutes: config.rules.slotMinutes, slots: config.google ? (await openSlots(config, now(), signal)).map(s => s.toISOString()) : [] };
    },
    book,
  };
}

module.exports = { createSchedulingService };
