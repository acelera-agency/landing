const formatters = new Map();

function wallClockMillis(instant, timeZone) {
  if (!formatters.has(timeZone)) formatters.set(timeZone, new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
  }));
  const p = Object.fromEntries(formatters.get(timeZone).formatToParts(instant).filter(x => x.type !== "literal").map(x => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second);
}

function zoneOffsetMillis(instant, timeZone) {
  return wallClockMillis(instant, timeZone) - Math.floor(instant.getTime() / 1000) * 1000;
}

function zonedTimeToUtc(civil, minute, timeZone) {
  const naive = Date.UTC(civil.year, civil.month - 1, civil.day, 0, minute);
  const first = naive - zoneOffsetMillis(new Date(naive), timeZone);
  const second = naive - zoneOffsetMillis(new Date(first), timeZone);
  return new Date(wallClockMillis(new Date(second), timeZone) === naive ? second : Math.max(first, second));
}

function civilDateAt(instant, timeZone) {
  const wall = new Date(wallClockMillis(instant, timeZone));
  return { year: wall.getUTCFullYear(), month: wall.getUTCMonth() + 1, day: wall.getUTCDate() };
}

function addDays(civil, days) {
  const d = new Date(Date.UTC(civil.year, civil.month - 1, civil.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function generateSlots(rules, now) {
  const slots = new Set();
  const earliest = now.getTime() + rules.minNoticeMinutes * 60_000;
  const today = civilDateAt(now, rules.timeZone);
  for (let offset = 0; offset < rules.daysAhead; offset++) {
    const day = addDays(today, offset);
    const weekday = new Date(Date.UTC(day.year, day.month - 1, day.day)).getUTCDay() || 7;
    if (!rules.weekdays.includes(weekday)) continue;
    for (let minute = rules.dayStartMinutes; minute + rules.slotMinutes <= rules.dayEndMinutes; minute += rules.slotMinutes) {
      const start = zonedTimeToUtc(day, minute, rules.timeZone);
      if (start.getTime() >= earliest) slots.add(start.getTime());
    }
  }
  return [...slots].sort((a, b) => a - b).map(n => new Date(n));
}

function excludeBusy(slots, slotMinutes, busy) {
  return slots.filter(s => !busy.some(b => s.getTime() < b.end.getTime() && s.getTime() + slotMinutes * 60_000 > b.start.getTime()));
}

function availabilityWindow(rules, now) {
  return { start: now, end: zonedTimeToUtc(addDays(civilDateAt(now, rules.timeZone), rules.daysAhead), 0, rules.timeZone) };
}

module.exports = { generateSlots, excludeBusy, availabilityWindow, zonedTimeToUtc };
