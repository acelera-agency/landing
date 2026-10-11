(() => {
  "use strict";

  const host = document.querySelector("[data-scheduler]");
  if (!host) return;
  const ENDPOINT = "/api/schedule";
  const BOOKING_LINK = "https://calendar.app.google/Ci3pYTwmLT6q3LMQ8";
  const fmtTime = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const fmtDay = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });
  const fmtMonth = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });
  const fmtZone = new Intl.DateTimeFormat("es-AR", { timeZoneName: "shortOffset" });
  const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
  const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const monthIndex = (date) => date.getFullYear() * 12 + date.getMonth();
  const fromMonth = (index) => new Date(Math.floor(index / 12), index % 12, 1);
  const zoneLabel = (date) => fmtZone.formatToParts(date).find((part) => part.type === "timeZoneName")?.value || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const state = { stage: "loading", availability: null, byDay: new Map(), month: null, selectedDay: null, slot: null, error: "", fallbackAllowed: false, booked: null, details: { name: "", email: "", company: "", website: "" } };
  const requestIds = new Map();
  let loadController = null;
  let requestInFlight = false;

  // Every API/user string is assigned as text or a controlled DOM property.
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function icon(kind) {
    const paths = { left: "m10 4-4 4 4 4", right: "m6 4 4 4-4 4", back: "M13 8H3m5-5L3 8l5 5", arrow: "M3 8h10M8 3l5 5-5 5", external: "M4 12 12 4M4 4h8v8", check: "m3 8 3 3 7-7", video: "M3 4h7v8H3zM10 6l3-2v8l-3-2" };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "booking-icon"); svg.setAttribute("viewBox", "0 0 16 16"); svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("d", paths[kind]); path.setAttribute("fill", "none"); path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.6"); path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round");
    svg.append(path); return svg;
  }
  function button(className, text, action) {
    const node = element("button", className, text);
    node.type = "button";
    if (action) node.addEventListener("click", action);
    return node;
  }
  function externalLink(className, text, url = BOOKING_LINK) {
    const link = element("a", className, text);
    link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
    link.append(icon("external")); return link;
  }
  const live = element("p", "booking-accessible");
  live.setAttribute("role", "status"); live.setAttribute("aria-live", "polite"); live.setAttribute("aria-atomic", "true");
  function announce(message) { live.textContent = message; }
  function focusElement(node) { if (node) node.focus({ preventScroll: true }); }
  function daySlots() { return state.byDay.get(state.selectedDay) || []; }
  function bounds() {
    const dates = [...state.byDay.values()].flat();
    return dates.length ? { min: monthIndex(dates[0]), max: monthIndex(dates[dates.length - 1]) } : null;
  }
  function parseInstant(value) {
    if (typeof value !== "string" || !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  function normalizeAvailability(data) {
    if (!data || typeof data.configured !== "boolean" || !Array.isArray(data.slots) || !Number.isInteger(data.slotMinutes) || data.slotMinutes < 1 || data.slotMinutes > 240) throw new Error("invalid_availability");
    const parsed = data.slots.map(parseInstant);
    if (parsed.some((date) => !date)) throw new Error("invalid_availability");
    const slots = [...new Set(parsed.filter((date) => date.getTime() > Date.now()).map((date) => date.toISOString()))].sort();
    return { configured: data.configured, timeZone: typeof data.timeZone === "string" ? data.timeZone : "", slotMinutes: data.slotMinutes, slots };
  }
  async function load(message = "") {
    if (requestInFlight) return;
    loadController?.abort();
    const controller = new AbortController();
    loadController = controller;
    state.stage = "loading"; state.error = message; state.slot = null;
    render(); announce("Consultando los horarios disponibles.");
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(ENDPOINT, { cache: "no-store", credentials: "same-origin", signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("availability_unavailable");
      const availability = normalizeAvailability(await response.json());
      if (loadController !== controller) return;
      state.availability = availability;
      state.byDay = new Map();
      if (availability.configured) {
        for (const iso of availability.slots) {
          const date = new Date(iso), key = dayKey(date);
          if (!state.byDay.has(key)) state.byDay.set(key, []);
          state.byDay.get(key).push(date);
        }
      }
      const first = state.byDay.values().next().value?.[0];
      if (!first) {
        state.stage = availability.configured ? "empty" : "unconfigured";
      } else {
        if (!state.byDay.has(state.selectedDay)) state.selectedDay = dayKey(first);
        state.month = monthIndex(state.byDay.get(state.selectedDay)[0]);
        state.stage = "pick";
      }
      render();
      announce(message || (first ? "Agenda disponible. Elegí un día y un horario." : fallbackMessage()));
    } catch (error) {
      if (loadController !== controller) return;
      state.stage = "unavailable"; render(); announce(fallbackMessage());
    } finally {
      clearTimeout(timeout);
      if (loadController === controller) loadController = null;
    }
  }
  function fallbackMessage() {
    if (state.stage === "empty") return "No quedan horarios libres en las próximas semanas.";
    if (state.stage === "unconfigured") return "Podés elegir un horario en nuestra agenda de Google Calendar.";
    return "No pudimos consultar los horarios en este momento.";
  }
  function skeleton() {
    const card = element("div", "booking-card"); card.dataset.stage = "loading"; card.setAttribute("aria-hidden", "true");
    const hours = element("div", "booking-hours"), calendar = element("div", "booking-calendar");
    hours.append(element("div", "booking-ghost-line"), element("div", "booking-ghost-line"));
    const list = element("div", "booking-ghost-list"), grid = element("div", "booking-ghost-grid");
    for (let i = 0; i < 6; i++) list.append(element("i"));
    for (let i = 0; i < 35; i++) grid.append(element("i"));
    hours.append(list); calendar.append(element("div", "booking-ghost-line"), grid); card.append(hours, calendar);
    return card;
  }
  function fallback() {
    const panel = element("div", "booking-fallback");
    const actions = element("div", "booking-fallback-actions");
    actions.append(externalLink("booking-button", "Elegí un horario"), button("booking-button booking-retry", "Volver a intentar", () => load()));
    panel.append(element("p", "", fallbackMessage()), actions); return panel;
  }
  function render() {
    host.setAttribute("aria-busy", String(state.stage === "loading" || state.stage === "sending"));
    if (state.stage === "loading") { host.replaceChildren(live, skeleton()); return; }
    if (["empty", "unavailable", "unconfigured"].includes(state.stage)) { host.replaceChildren(live, fallback()); return; }
    const card = element("div", "booking-card"); card.dataset.stage = state.stage;
    const hours = element("div", "booking-hours"), pane = element("div", "booking-pane");
    pane.append(state.stage === "done" ? confirmation() : state.stage === "pick" ? hoursPicker() : bookingForm());
    hours.append(pane); card.append(hours, calendar()); host.replaceChildren(live, card);
  }
  function errorMessage() { const error = element("p", "booking-error", state.error); error.setAttribute("role", "alert"); return error; }
  function hoursPicker() {
    const fragment = document.createDocumentFragment(), dates = daySlots(), date = dates[0];
    const head = element("div", "booking-day-head");
    head.append(element("h3", "", date ? capitalize(fmtDay.format(date)) : "Elegí un día"), element("p", "booking-meta", `${state.availability.slotMinutes} min · Google Meet${date ? ` · ${zoneLabel(date)}` : ""}`));
    fragment.append(head);
    if (state.error) fragment.append(errorMessage());
    const list = element("ul", "booking-slots"); list.setAttribute("aria-label", "Horarios disponibles");
    for (const date of dates) {
      const li = element("li"), iso = date.toISOString();
      const choice = button("booking-slot", fmtTime.format(date), () => pickSlot(iso));
      choice.setAttribute("aria-label", `${capitalize(fmtDay.format(date))}, ${fmtTime.format(date)}, ${zoneLabel(date)}`);
      li.append(choice); list.append(li);
    }
    fragment.append(list);
    if (!dates.length) fragment.append(element("p", "booking-hint", "Elegí otro mes para ver los días disponibles."));
    return fragment;
  }
  function pickDay(key, focus = true) {
    if (requestInFlight || state.stage === "done" || !state.byDay.has(key)) return;
    state.selectedDay = key; state.month = monthIndex(state.byDay.get(key)[0]); state.slot = null; state.stage = "pick"; state.error = ""; state.fallbackAllowed = false;
    render();
    if (focus) focusElement([...host.querySelectorAll("[data-booking-day]")].find((node) => node.dataset.bookingDay === key));
    announce(`${capitalize(fmtDay.format(state.byDay.get(key)[0]))}: ${daySlots().length} horarios disponibles.`);
  }
  function shiftMonth(delta, focus = true) {
    const limit = bounds();
    if (requestInFlight || state.stage === "done" || !limit) return;
    const next = Math.min(limit.max, Math.max(limit.min, state.month + delta));
    if (next === state.month) return;
    state.month = next;
    const first = [...state.byDay.entries()].find(([, dates]) => monthIndex(dates[0]) === next);
    state.selectedDay = first?.[0] || null; state.slot = null; state.stage = "pick"; state.error = ""; state.fallbackAllowed = false;
    render();
    if (focus) {
      const control = host.querySelector(`[data-booking-month="${delta < 0 ? "previous" : "next"}"]`);
      focusElement(control?.disabled ? host.querySelector(".booking-month-title") : control);
    }
    announce(capitalize(fmtMonth.format(fromMonth(state.month))));
  }
  function pickSlot(iso) {
    if (requestInFlight || state.stage === "done" || !daySlots().some((date) => date.toISOString() === iso)) return;
    state.slot = iso; state.stage = "form"; state.error = ""; state.fallbackAllowed = false;
    render(); focusElement(host.querySelector('[name="name"]'));
  }
  function calendarKey(event, key) {
    if (requestInFlight || state.stage === "done") return;
    const current = state.byDay.get(key)?.[0];
    if (!current) return;
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault(); shiftMonth(event.key === "PageUp" ? -1 : 1, false);
      focusElement(host.querySelector('[data-booking-day][tabindex="0"]') || host.querySelector(".booking-month-title")); return;
    }
    const movement = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    const entries = [...state.byDay.entries()];
    let target;
    if (event.key === "Home" || event.key === "End") {
      const monthEntries = entries.filter(([, dates]) => monthIndex(dates[0]) === state.month);
      target = event.key === "Home" ? monthEntries[0] : monthEntries[monthEntries.length - 1];
    } else if (movement) {
      const desired = new Date(current.getFullYear(), current.getMonth(), current.getDate() + movement);
      const desiredKey = dayKey(desired);
      target = movement > 0 ? entries.find(([dateKey]) => dateKey >= desiredKey) : entries.slice().reverse().find(([dateKey]) => dateKey <= desiredKey);
    } else return;
    event.preventDefault();
    if (target) pickDay(target[0]);
  }
  function calendar() {
    const panel = element("div", "booking-calendar"), header = element("div", "booking-month-head");
    const first = fromMonth(state.month), limit = bounds(), locked = requestInFlight || state.stage === "done";
    const heading = element("h3", "booking-month-title", capitalize(fmtMonth.format(first))); heading.tabIndex = -1;
    const nav = element("div", "booking-month-nav");
    for (const [delta, label, direction] of [[-1, "Mes anterior", "previous"], [1, "Mes siguiente", "next"]]) {
      const control = button("", "", () => shiftMonth(delta)); control.dataset.bookingMonth = direction;
      control.setAttribute("aria-label", label); control.append(icon(delta < 0 ? "left" : "right"));
      control.disabled = locked || (delta < 0 ? state.month <= limit.min : state.month >= limit.max); nav.append(control);
    }
    header.append(heading, nav);
    const weekdays = element("div", "booking-weekdays"); weekdays.setAttribute("aria-hidden", "true");
    for (const day of ["L", "M", "M", "J", "V", "S", "D"]) weekdays.append(element("span", "", day));
    const days = element("div", "booking-days"); days.setAttribute("role", "group"); days.setAttribute("aria-label", "Días con horarios disponibles. Usá las flechas para cambiar de día.");
    const leading = (first.getDay() + 6) % 7, count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cellCount = Math.ceil((leading + count) / 7) * 7, today = dayKey(new Date());
    for (let i = 0; i < cellCount; i++) {
      if (i < leading || i >= leading + count) { const blank = element("span"); blank.setAttribute("aria-hidden", "true"); days.append(blank); continue; }
      const date = new Date(first.getFullYear(), first.getMonth(), i - leading + 1), key = dayKey(date);
      const choice = button("booking-day", String(date.getDate()), () => pickDay(key));
      choice.dataset.bookingDay = key; choice.disabled = locked || !state.byDay.has(key); choice.tabIndex = key === state.selectedDay && !locked ? 0 : -1;
      choice.setAttribute("aria-label", capitalize(fmtDay.format(date))); choice.setAttribute("aria-pressed", String(key === state.selectedDay));
      if (key === today) { choice.dataset.today = ""; choice.setAttribute("aria-current", "date"); }
      choice.addEventListener("keydown", (event) => calendarKey(event, key)); days.append(choice);
    }
    panel.append(header, weekdays, days); return panel;
  }
  function when(start, end) {
    const description = element("p", "booking-when");
    description.append(document.createTextNode(capitalize(fmtDay.format(start))), element("br"), element("b", "", `${fmtTime.format(start)} – ${fmtTime.format(end)}`), document.createTextNode(` · ${zoneLabel(start)}`));
    return description;
  }
  function bookingForm() {
    const form = element("form", "booking-form"); form.setAttribute("data-ph-no-autocapture", ""); form.addEventListener("submit", submit);
    const back = button("booking-back", "", () => pickDay(state.selectedDay)); back.append(icon("back"), document.createTextNode("Cambiar horario"));
    form.append(back, when(new Date(state.slot), new Date(new Date(state.slot).getTime() + state.availability.slotMinutes * 60000)));
    const fields = [["name", "Nombre", "text", "name", 80], ["email", "Mail", "email", "email", 120], ["company", "Empresa", "text", "organization", 80]];
    for (const [name, labelText, type, autocomplete, maxLength] of fields) {
      const label = element("label", "booking-field"), caption = element("span", "", labelText);
      if (name === "company") caption.append(document.createTextNode(" "), element("em", "", "opcional"));
      const input = element("input"); input.name = name; input.type = type; input.autocomplete = autocomplete; input.maxLength = maxLength; input.required = name !== "company";
      if (name === "name") input.minLength = 2;
      input.value = state.details[name]; input.addEventListener("input", () => { state.details[name] = input.value; });
      label.append(caption, input); form.append(label);
    }
    const trap = element("div", "booking-trap"); trap.setAttribute("aria-hidden", "true");
    const label = element("label", "", "Sitio web"), field = element("input"); field.name = "website"; field.type = "text"; field.tabIndex = -1; field.autocomplete = "off"; field.value = state.details.website;
    field.addEventListener("input", () => { state.details.website = field.value; }); label.append(field); trap.append(label); form.append(trap);
    if (state.error) form.append(errorMessage());
    if (state.fallbackAllowed) form.append(externalLink("booking-meet", "Abrir la agenda de Google Calendar"));
    const confirm = button("booking-button booking-confirm", "Confirmar reunión"); confirm.type = "submit"; confirm.append(icon("arrow")); form.append(confirm);
    return form;
  }
  function newRequestId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  function safeMeetLink(value) {
    try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "meet.google.com" && !url.username && !url.password ? url.href : null; } catch { return null; }
  }
  async function submit(event) {
    event.preventDefault();
    if (requestInFlight || state.stage !== "form" || !state.slot) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const payload = { start: state.slot, name: String(values.get("name") || "").trim(), email: String(values.get("email") || "").trim(), company: String(values.get("company") || "").trim(), website: String(values.get("website") || "") };
    if (payload.name.length < 2 || !payload.email) { state.error = "Revisá el nombre y el mail."; render(); focusElement(host.querySelector('[name="name"]')); return; }
    Object.assign(state.details, { name: payload.name, email: payload.email, company: payload.company, website: payload.website });
    // Reuse the same key after a timeout/lost response: the server may have booked it.
    const fingerprint = JSON.stringify(payload);
    if (!requestIds.has(fingerprint)) requestIds.set(fingerprint, newRequestId());
    const requestId = requestIds.get(fingerprint);
    requestInFlight = true; state.stage = "sending"; state.error = ""; state.fallbackAllowed = false;
    host.setAttribute("aria-busy", "true"); form.setAttribute("aria-busy", "true");
    host.querySelectorAll("button, input").forEach((node) => { node.disabled = true; });
    form.querySelector(".booking-error")?.remove();
    form.querySelector(".booking-confirm").textContent = "Agendando…"; announce("Confirmando la reunión.");
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 25000);
    let shouldReload = false;
    try {
      const response = await fetch(ENDPOINT, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ ...payload, requestId }), signal: controller.signal });
      const result = await response.json().catch(() => ({}));
      const start = parseInstant(result.start), end = parseInstant(result.end);
      if (response.ok && result.ok === true && start && end && start.toISOString() === payload.start && end > start) {
        state.booked = { start, end, email: payload.email, meetLink: safeMeetLink(result.meetLink) }; state.stage = "done";
      } else if (response.status === 409 || result.error === "slot_taken") {
        state.error = "Ese horario se acaba de ocupar. Elegí otro, por favor."; state.slot = null; shouldReload = true;
      } else {
        state.stage = "form";
        state.fallbackAllowed = result.error === "calendar_unconfigured";
        state.error = result.error === "invalid_request" ? "Revisá el nombre y el mail."
          : result.error === "rate_limited" || response.status === 429 ? "Demasiados intentos seguidos. Probá de nuevo en un rato."
          : result.error === "calendar_unconfigured" ? "La agenda no está disponible aquí en este momento. Podés usar la agenda de Google Calendar."
          : "No pudimos confirmar la reserva. Volvé a intentarlo con los mismos datos para verificarla sin duplicarla.";
      }
    } catch {
      state.stage = "form"; state.error = "No pudimos confirmar la reserva. Volvé a intentarlo con los mismos datos para verificarla sin duplicarla.";
    } finally {
      clearTimeout(timeout); requestInFlight = false;
    }
    if (shouldReload) { await load(state.error); return; }
    render();
    if (state.stage === "done") { announce("Reunión agendada."); focusElement(host.querySelector(".booking-done h3")); }
    else { announce(state.error); focusElement(host.querySelector(".booking-confirm")); }
  }
  function confirmation() {
    const panel = element("div", "booking-done"), mark = element("i", "booking-done-mark"); mark.setAttribute("aria-hidden", "true"); mark.append(icon("check"));
    const heading = element("h3", "", "Reunión agendada."); heading.tabIndex = -1;
    const hint = element("p", "booking-hint", "La reunión quedó reservada con el correo "); hint.append(element("b", "", state.booked.email), document.createTextNode("."));
    panel.append(mark, heading, when(state.booked.start, state.booked.end), hint);
    if (state.booked.meetLink) {
      const meet = externalLink("booking-meet", "Abrir Google Meet", state.booked.meetLink); meet.replaceChildren(icon("video"), document.createTextNode("Abrir Google Meet")); panel.append(meet);
    }
    return panel;
  }

  render();
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { observer.disconnect(); void load(); } }, { rootMargin: "600px 0px" });
    observer.observe(host);
  } else void load();
})();
