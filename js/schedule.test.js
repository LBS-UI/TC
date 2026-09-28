import { getStatus, parseClockToMinutes } from "./schedule.js";

function fakeNow(hours, minutes) {
  return { hours, minutes, weekday: "Mon", totalMinutes: hours * 60 + minutes };
}

const restaurant = { open: "10:00", close: "24:00" };
const cafe = { open: "13:00", close: "24:00" };

const cases = [
  ["11:00 restaurant OPEN", getStatus(restaurant.open, restaurant.close, { now: fakeNow(11, 0) }).code, "open"],
  ["23:30 restaurant OPEN", getStatus(restaurant.open, restaurant.close, { now: fakeNow(23, 30) }).code, "open"],
  ["00:00 restaurant CLOSED", getStatus(restaurant.open, restaurant.close, { now: fakeNow(0, 0) }).code, "closed"],
  ["12:30 cafe CLOSED", getStatus(cafe.open, cafe.close, { now: fakeNow(12, 30) }).code, "closed"],
  ["13:30 cafe OPEN", getStatus(cafe.open, cafe.close, { now: fakeNow(13, 30) }).code, "open"],
  ["23:30 cafe OPEN", getStatus(cafe.open, cafe.close, { now: fakeNow(23, 30) }).code, "open"],
  ["12:50 cafe SOON", getStatus(cafe.open, cafe.close, { now: fakeNow(12, 50) }).code, "soon"],
];

let failed = 0;
for (const [label, got, expected] of cases) {
  if (got !== expected) {
    console.error("FAIL", label, "got", got, "expected", expected);
    failed += 1;
  } else {
    console.log("OK", label);
  }
}

if (parseClockToMinutes("12:00 AM") !== 0) {
  console.error("FAIL midnight parse");
  failed += 1;
}

if (failed) {
  process.exit(1);
}
console.log("All schedule checks passed.");
