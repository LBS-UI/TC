/**
 * Opening hours helper.
 * Times are compared as minutes from midnight in Asia/Manila.
 * close "24:00" or "00:00" means midnight at the end of the day.
 */

export function parseClockToMinutes(value) {
  if (value == null) return null;
  const raw = String(value).trim();

  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (ampm) {
    let hours = Number(ampm[1]);
    const minutes = Number(ampm[2]);
    const period = ampm[3].toUpperCase();
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours === 12) hours = 0;
    if (period === "PM") hours += 12;
    return hours * 60 + minutes;
  }

  const military = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (military) {
    const hours = Number(military[1]);
    const minutes = Number(military[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours === 24 && minutes === 0) return 24 * 60;
    return hours * 60 + minutes;
  }

  return null;
}

export function minutesToLabel(total) {
  if (total == null) return "";
  if (total === 24 * 60 || total === 0) return "12:00 AM";
  const hours24 = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function getNowParts(timeZone = "Asia/Manila", date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);

  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  return {
    hours: Number(map.hour),
    minutes: Number(map.minute),
    weekday: map.weekday,
    totalMinutes: Number(map.hour) * 60 + Number(map.minute),
  };
}

function normalizeWindow(openValue, closeValue) {
  let open = parseClockToMinutes(openValue);
  let close = parseClockToMinutes(closeValue);
  if (open == null || close == null) return null;
  if (close === 0) close = 24 * 60;
  return { open, close };
}

export function getStatus(openValue, closeValue, options = {}) {
  const timeZone = options.timeZone || "Asia/Manila";
  const soonWindow = options.soonWindow ?? 20;
  const now = options.now || getNowParts(timeZone);
  const window = normalizeWindow(openValue, closeValue);

  if (!window) {
    return {
      code: "unknown",
      label: "Hours unavailable",
      open: false,
      minutesUntilOpen: null,
      minutesUntilClose: null,
    };
  }

  const { open, close } = window;
  const current = now.totalMinutes;

  if (current >= open && current < close) {
    return {
      code: "open",
      label: "Open now",
      open: true,
      minutesUntilOpen: 0,
      minutesUntilClose: close - current,
    };
  }

  if (current < open) {
    const until = open - current;
    if (until <= soonWindow) {
      return {
        code: "soon",
        label: "Opening soon",
        open: false,
        minutesUntilOpen: until,
        minutesUntilClose: null,
      };
    }
    return {
      code: "closed",
      label: "Closed",
      open: false,
      minutesUntilOpen: until,
      minutesUntilClose: null,
    };
  }

  return {
    code: "closed",
    label: "Closed",
    open: false,
    minutesUntilOpen: null,
    minutesUntilClose: null,
  };
}

export function formatHoursLabel(hours) {
  if (!hours) return "";
  if (hours.label) return hours.label;
  return `${minutesToLabel(parseClockToMinutes(hours.open))} – ${minutesToLabel(parseClockToMinutes(hours.close))}`;
}
