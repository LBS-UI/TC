/* ===================================================================
   TAMBAYAN CAWAG — SCHEDULE LOGIC
   -------------------------------------------------------------------
   Pure functions for figuring out whether a service (Go-To or Cafe)
   is open, given the current time or a candidate dine-in time.
   Hours come from TCStorage so admin edits apply everywhere.
=================================================================== */

const TCSchedule = (function () {
  // Turn "HH:MM" into minutes-since-midnight. "24:00" -> 1440.
  function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  // Is `minutes` (0-1440ish) within [open, close)? Handles close === "24:00"
  // and close times past midnight (e.g. open 13:00 close 26:00 = 2AM) by
  // wrapping. All current defaults close at 24:00 (midnight) so this is
  // mostly future-proofing for the admin editing hours later.
  function isWithin(minutes, openMin, closeMin) {
    if (closeMin <= openMin) {
      // wraps past midnight
      return minutes >= openMin || minutes < closeMin;
    }
    return minutes >= openMin && minutes < closeMin;
  }

  function getServiceHours(serviceKey) {
    const schedule = window.TCStorage.getSchedule();
    return schedule[serviceKey] || null;
  }

  // Is a service open at a given JS Date? Defaults to now.
  function isServiceOpenAt(serviceKey, date) {
    const hours = getServiceHours(serviceKey);
    if (!hours) return true; // unknown service = don't block
    const d = date || new Date();
    const mins = minutesSinceMidnight(d);
    return isWithin(mins, toMinutes(hours.open), toMinutes(hours.close));
  }

  function isServiceOpenNow(serviceKey) {
    return isServiceOpenAt(serviceKey, new Date());
  }

  function formatHours(serviceKey) {
    const hours = getServiceHours(serviceKey);
    if (!hours) return "";
    return `${to12h(hours.open)} \u2013 ${hours.close === "24:00" ? "12:00 MN" : to12h(hours.close)}`;
  }

  function to12h(hhmm) {
    let [h, m] = hhmm.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${String(m).padStart(2, "0")} ${period}`;
  }

  return {
    isServiceOpenAt,
    isServiceOpenNow,
    getServiceHours,
    formatHours,
    toMinutes,
    minutesSinceMidnight,
    isWithin
  };
})();

window.TCSchedule = TCSchedule;
